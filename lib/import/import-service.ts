import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import {
    DEFAULT_IMPORTED_VEHICLE_ACCESS_STATUS,
    DEFAULT_IMPORTED_VEHICLE_BRAND,
    DEFAULT_IMPORTED_VEHICLE_NAME_PREFIX,
    IMPORT_PREVIEW_TTL_MS,
    SYNTHETIC_CONTRATISTA_RUT_MIN,
    SYNTHETIC_CONTRATISTA_RUT_RANGE,
} from "@/lib/import/constants";
import { parseSingleSheetExcel } from "@/lib/import/excel-single-sheet-parser";
import { normalizeEmpresa, normalizePatente } from "@/lib/import/normalizers";
import { buildImportPreview, buildNormalizedContratistaLookup } from "@/lib/import/preview-builder";
import type {
    ImportExecutionResult,
    ImportPreview,
    ParsedExcelImport,
    ParsedExcelImportRow,
    StoredImportPreview,
} from "@/lib/import/types";
import { prisma } from "@/lib/prisma";

type ContratistaTransactionRecord = {
    id: number;
    razonSocial: string;
    rut: string;
};

type ImportPreviewStoreClient = Prisma.TransactionClient | typeof prisma;
type ImportPersistenceClient = Prisma.TransactionClient | typeof prisma;

type ImportacionPreviewRecord = {
    id: string;
    ownerUsername: string;
    fileName: string;
    parsedJson: Prisma.JsonValue;
    previewJson: Prisma.JsonValue;
    createdAt: Date;
    expiresAt: Date;
};

const PREVIEW_NOT_FOUND_MESSAGE = "La vista previa ya no está disponible. Vuelva a cargar el archivo.";
const PREVIEW_EXPIRED_MESSAGE = "La vista previa expiró. Vuelva a cargar el archivo.";
const PREVIEW_ACCESS_DENIED_MESSAGE = "La vista previa no pertenece al usuario autenticado.";
const PREVIEW_INVALID_MESSAGE = "La vista previa temporal es inválida. Vuelva a cargar el archivo.";
const PREVIEW_CONFIRMATION_CONFLICT_MESSAGE = "La importación detectó un conflicto de datos duplicados al confirmar. Vuelva a validar el archivo.";

const IMPORT_PREVIEW_SELECT = {
    id: true,
    ownerUsername: true,
    fileName: true,
    parsedJson: true,
    previewJson: true,
    createdAt: true,
    expiresAt: true,
} satisfies Prisma.ImportacionPreviewSelect;

export class ImportPreviewNotFoundError extends Error { }

export class ImportPreviewExpiredError extends Error { }

export class ImportPreviewAccessDeniedError extends Error { }

export class ImportPreviewBlockedError extends Error {
    previewId: string;

    constructor(message: string, previewId: string) {
        super(message);
        this.previewId = previewId;
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidPreviewId(previewId: string) {
    return /^[A-Za-z0-9_-]{8,191}$/.test(previewId.trim());
}

function toInputJsonValue(value: ParsedExcelImport | ImportPreview) {
    return value as unknown as Prisma.InputJsonValue;
}

function parseStoredParsedJson(value: Prisma.JsonValue, fileName: string): ParsedExcelImport {
    if (!isPlainObject(value)) {
        throw new Error(PREVIEW_INVALID_MESSAGE);
    }

    const parsed = value as unknown as ParsedExcelImport;

    if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows) || !Array.isArray(parsed.issues)) {
        throw new Error(PREVIEW_INVALID_MESSAGE);
    }

    return {
        ...parsed,
        fileName: typeof parsed.fileName === "string" && parsed.fileName.trim() ? parsed.fileName : fileName,
        sheetName: typeof parsed.sheetName === "string" ? parsed.sheetName : null,
        nonEmptyRowCount: Number.isInteger(parsed.nonEmptyRowCount) ? parsed.nonEmptyRowCount : 0,
        blankRowNumbers: Array.isArray(parsed.blankRowNumbers) ? parsed.blankRowNumbers : [],
    };
}

function parseStoredPreviewJson(value: Prisma.JsonValue, fallbackFileName: string): ImportPreview {
    if (!isPlainObject(value)) {
        throw new Error(PREVIEW_INVALID_MESSAGE);
    }

    const preview = value as unknown as ImportPreview;

    if (!isPlainObject(preview.summary) || !Array.isArray(preview.issues) || !Array.isArray(preview.importRows)) {
        throw new Error(PREVIEW_INVALID_MESSAGE);
    }

    return {
        ...preview,
        fileName: typeof preview.fileName === "string" && preview.fileName.trim() ? preview.fileName : fallbackFileName,
        sheetName: typeof preview.sheetName === "string" ? preview.sheetName : null,
        generatedAt: typeof preview.generatedAt === "string" && preview.generatedAt.trim()
            ? preview.generatedAt
            : new Date().toISOString(),
        duplicates: Array.isArray(preview.duplicates) ? preview.duplicates : [],
        contractors: {
            newItems: Array.isArray(preview.contractors?.newItems) ? preview.contractors.newItems : [],
            existingItems: Array.isArray(preview.contractors?.existingItems) ? preview.contractors.existingItems : [],
        },
        vehicles: {
            newItems: Array.isArray(preview.vehicles?.newItems) ? preview.vehicles.newItems : [],
            existingItems: Array.isArray(preview.vehicles?.existingItems) ? preview.vehicles.existingItems : [],
        },
    };
}

function buildStoredImportPreview(record: ImportacionPreviewRecord): StoredImportPreview {
    const parsed = parseStoredParsedJson(record.parsedJson, record.fileName);
    const preview = parseStoredPreviewJson(record.previewJson, record.fileName);

    return {
        id: record.id,
        ownerUsername: record.ownerUsername,
        fileName: record.fileName,
        createdAt: record.createdAt.toISOString(),
        expiresAt: record.expiresAt.toISOString(),
        parsed,
        preview,
    };
}

async function cleanupExpiredImportPreviews(client: ImportPreviewStoreClient = prisma) {
    await client.importacionPreview.deleteMany({
        where: {
            expiresAt: {
                lte: new Date(),
            },
        },
    });
}

async function getStoredImportPreviewRecordOrThrow(previewId: string, ownerUsername: string) {
    if (!isValidPreviewId(previewId)) {
        throw new ImportPreviewNotFoundError(PREVIEW_NOT_FOUND_MESSAGE);
    }

    const record = await prisma.importacionPreview.findUnique({
        where: { id: previewId },
        select: IMPORT_PREVIEW_SELECT,
    });

    if (!record) {
        await cleanupExpiredImportPreviews();
        throw new ImportPreviewNotFoundError(PREVIEW_NOT_FOUND_MESSAGE);
    }

    if (record.expiresAt <= new Date()) {
        await prisma.importacionPreview.deleteMany({ where: { id: previewId } });
        await cleanupExpiredImportPreviews();
        throw new ImportPreviewExpiredError(PREVIEW_EXPIRED_MESSAGE);
    }

    if (record.ownerUsername !== ownerUsername) {
        await cleanupExpiredImportPreviews();
        throw new ImportPreviewAccessDeniedError(PREVIEW_ACCESS_DENIED_MESSAGE);
    }

    try {
        await cleanupExpiredImportPreviews();
        return buildStoredImportPreview(record);
    } catch {
        await prisma.importacionPreview.deleteMany({ where: { id: previewId } });
        throw new ImportPreviewNotFoundError(PREVIEW_INVALID_MESSAGE);
    }
}

function computeRutVerifier(body: number) {
    const reversedDigits = String(body)
        .padStart(8, "0")
        .split("")
        .reverse()
        .map(Number);
    let factor = 2;
    let sum = 0;

    for (const digit of reversedDigits) {
        sum += digit * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }

    const remainder = 11 - (sum % 11);

    if (remainder === 11) {
        return "0";
    }

    if (remainder === 10) {
        return "K";
    }

    return String(remainder);
}

function hashText(value: string) {
    let hash = 0;

    for (const character of value) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return hash;
}

function buildSyntheticContratistaRut(companyKey: string, usedRuts: Set<string>) {
    const baseOffset = hashText(companyKey) % SYNTHETIC_CONTRATISTA_RUT_RANGE;

    for (let offset = 0; offset < SYNTHETIC_CONTRATISTA_RUT_RANGE; offset += 1) {
        const body = SYNTHETIC_CONTRATISTA_RUT_MIN + ((baseOffset + offset) % SYNTHETIC_CONTRATISTA_RUT_RANGE);
        const rut = `${String(body).padStart(8, "0")}-${computeRutVerifier(body)}`;

        if (!usedRuts.has(rut)) {
            return rut;
        }
    }

    throw new Error("No fue posible generar un RUT sintético único para el contratista importado.");
}

function buildImportedVehicleIdentity(licensePlate: string) {
    return {
        name: `${DEFAULT_IMPORTED_VEHICLE_NAME_PREFIX} ${licensePlate}`,
        rut: `AUTO-IMPORT-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`,
    };
}

function chunkRows<T>(items: T[], chunkSize: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

async function loadContratistaRecords(client: ImportPersistenceClient) {
    return client.contratista.findMany({
        select: {
            id: true,
            razonSocial: true,
            rut: true,
        },
    });
}

function rebuildContractorLookup(
    records: ContratistaTransactionRecord[],
    contractorLookup: Map<string, ContratistaTransactionRecord>,
    usedRuts: Set<string>,
) {
    contractorLookup.clear();
    usedRuts.clear();

    for (const record of records) {
        contractorLookup.set(normalizeEmpresa(record.razonSocial), record);
        usedRuts.add(record.rut);
    }
}

async function loadExistingVehicleRecordsByNormalizedPlates(
    client: ImportPersistenceClient,
    normalizedPlates: string[],
) {
    if (normalizedPlates.length === 0) {
        return [] as Array<{ licensePlate: string }>;
    }

    const foundVehicleIds = new Set<number>();

    for (const plateChunk of chunkRows(normalizedPlates, 400)) {
        const rows = await client.$queryRaw<Array<{ id: number }>>(
            Prisma.sql`
                SELECT id
                FROM vehicles
                WHERE UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) IN (${Prisma.join(plateChunk)})
            `,
        );

        for (const row of rows) {
            foundVehicleIds.add(row.id);
        }
    }

    if (foundVehicleIds.size === 0) {
        return [] as Array<{ licensePlate: string }>;
    }

    const records: Array<{ licensePlate: string }> = [];

    for (const idChunk of chunkRows(Array.from(foundVehicleIds), 500)) {
        const chunkRecords = await client.vehicle.findMany({
            where: {
                id: {
                    in: idChunk,
                },
            },
            select: {
                licensePlate: true,
            },
        });

        records.push(...chunkRecords);
    }

    return records;
}

function buildCompanyGroups(rows: ParsedExcelImportRow[]) {
    const groups = new Map<string, { empresa: string; empresaKey: string }>();

    for (const row of rows) {
        if (!row.empresaKey || groups.has(row.empresaKey)) {
            continue;
        }

        groups.set(row.empresaKey, {
            empresa: row.empresa,
            empresaKey: row.empresaKey,
        });
    }

    return Array.from(groups.values()).sort((left, right) => left.empresa.localeCompare(right.empresa, "es"));
}

async function ensureContratistaForImport(
    client: ImportPersistenceClient,
    company: { empresa: string; empresaKey: string },
    contractorLookup: Map<string, ContratistaTransactionRecord>,
    usedRuts: Set<string>,
) {
    const existingRecord = contractorLookup.get(company.empresaKey);

    if (existingRecord) {
        return {
            record: existingRecord,
            created: false,
        };
    }

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const rut = buildSyntheticContratistaRut(company.empresaKey, usedRuts);

        try {
            const createdRecord = await client.contratista.create({
                data: {
                    razonSocial: company.empresa,
                    rut,
                    email: null,
                    contacto: null,
                    telefono: null,
                },
                select: {
                    id: true,
                    razonSocial: true,
                    rut: true,
                },
            });

            usedRuts.add(rut);
            contractorLookup.set(company.empresaKey, createdRecord);

            return {
                record: createdRecord,
                created: true,
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                usedRuts.add(rut);

                const refreshedRecords = await loadContratistaRecords(client);
                const refreshedLookup = buildNormalizedContratistaLookup(refreshedRecords);

                if (refreshedLookup.ambiguousKeys.length > 0) {
                    throw new Error("La base de datos contiene contratistas ambiguos por razón social normalizada.");
                }

                rebuildContractorLookup(refreshedRecords, contractorLookup, usedRuts);

                const refreshedRecord = contractorLookup.get(company.empresaKey);

                if (refreshedRecord) {
                    return {
                        record: refreshedRecord,
                        created: false,
                    };
                }

                continue;
            }

            throw error;
        }
    }

    throw new Error(`No fue posible asegurar el contratista importado para ${company.empresa}.`);
}

async function executeImportRows(
    client: ImportPersistenceClient,
    rows: ParsedExcelImportRow[],
    preview: ImportPreview,
): Promise<ImportExecutionResult> {
    const uniquePlates = Array.from(new Set(rows.map((row) => row.patente))).filter(Boolean);
    const companyGroups = buildCompanyGroups(rows);
    const existingContractorRecords = await loadContratistaRecords(client);
    const contractorLookupResult = buildNormalizedContratistaLookup(existingContractorRecords);

    if (contractorLookupResult.ambiguousKeys.length > 0) {
        throw new Error("La base de datos contiene contratistas ambiguos por razón social normalizada.");
    }

    const contractorLookup = new Map<string, ContratistaTransactionRecord>();
    const usedRuts = new Set<string>();

    rebuildContractorLookup(existingContractorRecords, contractorLookup, usedRuts);

    const missingCompanies = companyGroups.filter((company) => !contractorLookup.has(company.empresaKey));
    let createdContractors = 0;

    if (missingCompanies.length > 0) {
        const contractorCreateData = missingCompanies.map((company) => {
            const rut = buildSyntheticContratistaRut(company.empresaKey, usedRuts);

            usedRuts.add(rut);

            return {
                razonSocial: company.empresa,
                rut,
                email: null,
                contacto: null,
                telefono: null,
            };
        });

        for (const chunk of chunkRows(contractorCreateData, 250)) {
            if (chunk.length === 0) {
                continue;
            }

            const result = await client.contratista.createMany({
                data: chunk,
                skipDuplicates: true,
            });

            createdContractors += result.count;
        }

        const refreshedRecords = await loadContratistaRecords(client);
        const refreshedLookup = buildNormalizedContratistaLookup(refreshedRecords);

        if (refreshedLookup.ambiguousKeys.length > 0) {
            throw new Error("La base de datos contiene contratistas ambiguos por razón social normalizada.");
        }

        rebuildContractorLookup(refreshedRecords, contractorLookup, usedRuts);

        const unresolvedCompanies = companyGroups.filter((company) => !contractorLookup.has(company.empresaKey));

        for (const company of unresolvedCompanies) {
            const ensuredRecord = await ensureContratistaForImport(client, company, contractorLookup, usedRuts);

            if (ensuredRecord.created) {
                createdContractors += 1;
            }
        }
    }

    const existingVehicleRecords = await loadExistingVehicleRecordsByNormalizedPlates(client, uniquePlates);
    const existingVehicleSet = new Set(
        existingVehicleRecords
            .map((record) => normalizePatente(record.licensePlate))
            .filter(Boolean),
    );
    const rowsToCreate = rows.filter((row) => !existingVehicleSet.has(row.patente));
    const vehicleCreateData = rowsToCreate.map((row) => {
        const contractor = contractorLookup.get(row.empresaKey);

        if (!contractor) {
            throw new Error(`No se pudo resolver el contratista para la empresa ${row.empresa}.`);
        }

        return {
            ...buildImportedVehicleIdentity(row.patente),
            licensePlate: row.patente,
            codigoInterno: row.numeroInterno,
            vehicleType: row.tipoVehiculo,
            brand: DEFAULT_IMPORTED_VEHICLE_BRAND,
            company: contractor.razonSocial,
            accessStatus: DEFAULT_IMPORTED_VEHICLE_ACCESS_STATUS,
            contratistaId: contractor.id,
            estadoRecinto: "FUERA" as const,
            modelo: null,
        };
    });

    let createdVehicles = 0;

    for (const chunk of chunkRows(vehicleCreateData, 250)) {
        if (chunk.length === 0) {
            continue;
        }

        const result = await client.vehicle.createMany({
            data: chunk,
            skipDuplicates: true,
        });

        createdVehicles += result.count;
    }

    return {
        createdContractors,
        existingContractors: companyGroups.length - createdContractors,
        createdVehicles,
        existingVehicles: uniquePlates.length - createdVehicles,
        validRows: preview.summary.validRows,
        invalidRows: preview.summary.invalidRows,
        omittedDuplicates: (uniquePlates.length - createdVehicles) + preview.summary.duplicateInternal,
        duplicateInternal: preview.summary.duplicateInternal,
        warnings: preview.summary.warnings,
        totalRows: preview.summary.totalRows,
    };
}

export async function createImportPreviewFromFile(file: File, ownerUsername: string) {
    await cleanupExpiredImportPreviews();

    const parsed = await parseSingleSheetExcel(file);
    return createImportPreviewFromParsedImport(parsed, ownerUsername);
}

export async function createImportPreviewFromParsedImport(parsed: ParsedExcelImport, ownerUsername: string) {
    await cleanupExpiredImportPreviews();

    const preview = await buildImportPreview(parsed);
    const record = await prisma.importacionPreview.create({
        data: {
            ownerUsername,
            fileName: parsed.fileName,
            parsedJson: toInputJsonValue(parsed),
            previewJson: toInputJsonValue(preview),
            expiresAt: new Date(Date.now() + IMPORT_PREVIEW_TTL_MS),
        },
        select: IMPORT_PREVIEW_SELECT,
    });

    return buildStoredImportPreview(record);
}

export async function loadStoredImportPreview(previewId: string, ownerUsername: string) {
    return getStoredImportPreviewRecordOrThrow(previewId, ownerUsername);
}

export async function deleteStoredImportPreview(previewId: string) {
    if (!isValidPreviewId(previewId)) {
        return;
    }

    await prisma.importacionPreview.deleteMany({
        where: {
            id: previewId,
        },
    });
}

export async function refreshStoredImportPreview(previewId: string, ownerUsername: string) {
    const storedPreview = await loadStoredImportPreview(previewId, ownerUsername);
    const refreshedPreview = await buildImportPreview(storedPreview.parsed);
    const record = await prisma.importacionPreview.update({
        where: {
            id: storedPreview.id,
        },
        data: {
            fileName: storedPreview.fileName,
            parsedJson: toInputJsonValue(storedPreview.parsed),
            previewJson: toInputJsonValue(refreshedPreview),
            expiresAt: new Date(Date.now() + IMPORT_PREVIEW_TTL_MS),
        },
        select: IMPORT_PREVIEW_SELECT,
    });

    return buildStoredImportPreview(record);
}

export async function confirmImportPreview(previewId: string, ownerUsername: string) {
    const storedPreview = await refreshStoredImportPreview(previewId, ownerUsername);

    if (!storedPreview.preview.summary.canImport) {
        throw new ImportPreviewBlockedError(
            storedPreview.preview.summary.globalCriticalErrors > 0
                ? "La vista previa contiene errores estructurales o de integridad que bloquean la importación. Corrija el archivo y vuelva a validarlo."
                : storedPreview.preview.summary.validRows === 0
                    ? "El archivo no contiene filas válidas para importar despues de aplicar validaciones por fila."
                    : "El archivo fue validado, pero no contiene registros nuevos para importar.",
            storedPreview.id,
        );
    }

    try {
        await cleanupExpiredImportPreviews();

        const result = await executeImportRows(prisma, storedPreview.preview.importRows, storedPreview.preview);
        const deletedPreview = await prisma.importacionPreview.deleteMany({
            where: {
                id: storedPreview.id,
                ownerUsername,
            },
        });

        if (deletedPreview.count !== 1) {
            throw new ImportPreviewBlockedError(PREVIEW_NOT_FOUND_MESSAGE, storedPreview.id);
        }

        return result;
    } catch (error) {
        if (
            error instanceof ImportPreviewBlockedError
            || error instanceof ImportPreviewNotFoundError
            || error instanceof ImportPreviewExpiredError
            || error instanceof ImportPreviewAccessDeniedError
        ) {
            throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new ImportPreviewBlockedError(
                PREVIEW_CONFIRMATION_CONFLICT_MESSAGE,
                storedPreview.id,
            );
        }

        throw error;
    }
}