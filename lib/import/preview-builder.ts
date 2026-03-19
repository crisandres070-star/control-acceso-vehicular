import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
    normalizeEmpresa,
    normalizeNumeroInterno,
    normalizePatente,
    normalizeText,
    normalizeTipoVehiculo,
} from "@/lib/import/normalizers";
import type {
    ImportDuplicateItem,
    ImportIssue,
    ImportPreview,
    ParsedExcelImport,
    ParsedExcelImportRow,
} from "@/lib/import/types";
import { createImportIssue } from "@/lib/import/validators";

type ExistingContratistaLookupRecord = {
    id: number;
    razonSocial: string;
    rut?: string | null;
};

type ExistingVehicleRecord = {
    id: number;
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    company: string;
    contratistaId: number | null;
    contratista: {
        id: number;
        razonSocial: string;
    } | null;
};

function getExistingVehicleCompanyReference(vehicle: ExistingVehicleRecord) {
    return vehicle.contratista?.razonSocial ?? vehicle.company;
}

function resolveVehicleUpdateFields(
    vehicle: ExistingVehicleRecord,
    row: ParsedExcelImportRow,
): Array<"numeroInterno" | "empresa" | "tipoVehiculo"> {
    const updateFields: Array<"numeroInterno" | "empresa" | "tipoVehiculo"> = [];

    if (normalizeNumeroInterno(vehicle.codigoInterno) !== row.numeroInterno) {
        updateFields.push("numeroInterno");
    }

    if (normalizeTipoVehiculo(vehicle.vehicleType) !== row.tipoVehiculo) {
        updateFields.push("tipoVehiculo");
    }

    if (normalizeEmpresa(getExistingVehicleCompanyReference(vehicle)) !== row.empresaKey) {
        updateFields.push("empresa");
    }

    return updateFields;
}

function sortIssues(left: ImportIssue, right: ImportIssue) {
    if (left.severity !== right.severity) {
        return left.severity === "critical" ? -1 : 1;
    }

    return (left.rowNumber ?? 0) - (right.rowNumber ?? 0) || left.message.localeCompare(right.message, "es");
}

function groupRowsByKey(rows: ParsedExcelImportRow[], getKey: (row: ParsedExcelImportRow) => string) {
    const groups = new Map<string, ParsedExcelImportRow[]>();

    for (const row of rows) {
        const key = getKey(row);
        const group = groups.get(key);

        if (group) {
            group.push(row);
            continue;
        }

        groups.set(key, [row]);
    }

    return groups;
}

function chunkRows<T>(items: T[], chunkSize: number) {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
}

async function loadExistingVehicleRecordsByNormalizedPlates(normalizedPlates: string[]) {
    if (normalizedPlates.length === 0) {
        return [] as ExistingVehicleRecord[];
    }

    const foundVehicleIds = new Set<number>();

    for (const plateChunk of chunkRows(normalizedPlates, 400)) {
        const rows = await prisma.$queryRaw<Array<{ id: number }>>(
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
        return [] as ExistingVehicleRecord[];
    }

    const records: ExistingVehicleRecord[] = [];

    for (const idChunk of chunkRows(Array.from(foundVehicleIds), 500)) {
        const chunkRecords = await prisma.vehicle.findMany({
            where: {
                id: {
                    in: idChunk,
                },
            },
            select: {
                id: true,
                licensePlate: true,
                codigoInterno: true,
                vehicleType: true,
                company: true,
                contratistaId: true,
                contratista: {
                    select: {
                        id: true,
                        razonSocial: true,
                    },
                },
            },
        });

        records.push(...chunkRecords);
    }

    return records;
}

export function buildNormalizedContratistaLookup(records: ExistingContratistaLookupRecord[]) {
    const lookup = new Map<string, ExistingContratistaLookupRecord>();
    const ambiguousKeys = new Set<string>();

    for (const record of records) {
        const key = normalizeEmpresa(record.razonSocial);

        if (!key) {
            continue;
        }

        if (lookup.has(key)) {
            ambiguousKeys.add(key);
            continue;
        }

        lookup.set(key, record);
    }

    return {
        lookup,
        ambiguousKeys: Array.from(ambiguousKeys),
    };
}

export async function buildImportPreview(parsed: ParsedExcelImport): Promise<ImportPreview> {
    const issues: ImportIssue[] = [...parsed.issues];
    const duplicates: ImportDuplicateItem[] = [];
    const empresaGroups = groupRowsByKey(parsed.rows, (row) => row.empresaKey);
    const patenteGroups = groupRowsByKey(parsed.rows, (row) => row.patente);
    const uniqueRows: ParsedExcelImportRow[] = [];
    const conflictingPlateKeys = new Set<string>();
    const baseCriticalIssueRowNumbers = new Set(
        parsed.issues
            .filter((issue) => issue.severity === "critical" && typeof issue.rowNumber === "number")
            .map((issue) => issue.rowNumber as number),
    );

    const contractorRecords = await prisma.contratista.findMany({
        select: {
            id: true,
            razonSocial: true,
            rut: true,
        },
        orderBy: {
            razonSocial: "asc",
        },
    });
    const contractorLookupResult = buildNormalizedContratistaLookup(contractorRecords);

    for (const ambiguousKey of contractorLookupResult.ambiguousKeys) {
        const conflictingRecords = contractorRecords
            .filter((record) => normalizeEmpresa(record.razonSocial) === ambiguousKey)
            .map((record) => record.razonSocial)
            .join(", ");

        issues.push(createImportIssue({
            code: "ambiguous-contractor-in-database",
            severity: "critical",
            field: "Base de datos",
            message: `La base de datos tiene contratistas duplicados para la empresa normalizada ${ambiguousKey}: ${conflictingRecords}.`,
        }));
    }

    for (const [patente, rows] of Array.from(patenteGroups.entries())) {
        if (!patente) {
            continue;
        }

        const sortedRows = [...rows].sort((left, right) => left.__row - right.__row);
        const preferredRow = sortedRows.find((row) => !baseCriticalIssueRowNumbers.has(row.__row)) ?? sortedRows[0];
        const uniqueCompanyKeys = Array.from(new Set(sortedRows.map((row) => row.empresaKey))).filter(Boolean);
        const firstRow = preferredRow;

        if (uniqueCompanyKeys.length > 1) {
            conflictingPlateKeys.add(patente);
            duplicates.push({
                patente,
                empresa: firstRow.empresa,
                rowNumbers: sortedRows.map((row) => row.__row),
                kind: "different-company",
                conflictingEmpresas: Array.from(new Set(sortedRows.map((row) => row.empresa))),
                critical: true,
            });
            issues.push(createImportIssue({
                code: "conflicting-duplicate-license-plate",
                severity: "critical",
                field: "Patente",
                rowNumber: firstRow.__row,
                message: `La patente ${patente} aparece con empresas distintas dentro del Excel y bloquea toda la importación.`,
            }));
            continue;
        }

        uniqueRows.push(firstRow);

        if (sortedRows.length > 1) {
            duplicates.push({
                patente,
                empresa: firstRow.empresa,
                rowNumbers: sortedRows.map((row) => row.__row),
                kind: "same-company",
                critical: false,
            });
            issues.push(createImportIssue({
                code: "internal-duplicate-license-plate",
                severity: "warning",
                field: "Patente",
                rowNumber: firstRow.__row,
                message: `La patente ${patente} está repetida dentro del Excel para la misma empresa. Solo se considerará una fila.`,
            }));
        }
    }

    const hasGlobalCriticalIssues = issues.some(
        (issue) => issue.severity === "critical" && typeof issue.rowNumber !== "number",
    );
    const criticalIssueRowNumbers = new Set(
        issues
            .filter((issue) => issue.severity === "critical" && typeof issue.rowNumber === "number")
            .map((issue) => issue.rowNumber as number),
    );
    const importRows = hasGlobalCriticalIssues
        ? []
        : uniqueRows.filter(
            (row) => !conflictingPlateKeys.has(row.patente) && !criticalIssueRowNumbers.has(row.__row),
        );
    const uniquePlates = Array.from(new Set(importRows.map((row) => row.patente))).filter(Boolean);
    const existingVehicleRecords = await loadExistingVehicleRecordsByNormalizedPlates(uniquePlates);
    const existingVehicleLookup = new Map<string, ExistingVehicleRecord>();

    for (const vehicleRecord of existingVehicleRecords) {
        const normalizedPlate = normalizePatente(vehicleRecord.licensePlate);

        if (!normalizedPlate || existingVehicleLookup.has(normalizedPlate)) {
            continue;
        }

        existingVehicleLookup.set(normalizedPlate, vehicleRecord);
    }

    const contractorItems = Array.from(empresaGroups.entries())
        .filter(([empresaKey]) => Boolean(empresaKey))
        .map(([empresaKey, rows]) => {
            const firstRow = [...rows].sort((left, right) => left.__row - right.__row)[0];
            const existingContractor = contractorLookupResult.lookup.get(empresaKey) ?? null;

            return {
                empresa: firstRow.empresa,
                empresaKey,
                rowNumbers: rows.map((row) => row.__row).sort((left, right) => left - right),
                status: existingContractor ? "existing" as const : "new" as const,
                contratistaId: existingContractor?.id ?? null,
                razonSocialActual: existingContractor?.razonSocial ?? null,
            };
        })
        .sort((left, right) => left.empresa.localeCompare(right.empresa, "es"));

    const vehicleItems = importRows
        .map((row) => {
            const existingVehicle = existingVehicleLookup.get(row.patente) ?? null;
            const patenteFueNormalizada = row.patenteFueNormalizada ?? (Boolean(row.patenteOriginal) && normalizeText(row.patenteOriginal) !== row.patente);
            const updateFields = existingVehicle
                ? resolveVehicleUpdateFields(existingVehicle, row)
                : [];
            const status: "new" | "updatable" | "existing" = existingVehicle
                ? updateFields.length > 0
                    ? "updatable"
                    : "existing"
                : "new";

            return {
                patente: row.patente,
                patenteOriginal: row.patenteOriginal,
                patenteFueNormalizada,
                empresa: row.empresa,
                numeroInterno: row.numeroInterno,
                tipoVehiculo: row.tipoVehiculo,
                rowNumber: row.__row,
                status,
                vehicleId: existingVehicle?.id ?? null,
                updateFields,
                companyActual: existingVehicle?.company ?? null,
                contratistaActual: existingVehicle?.contratista?.razonSocial ?? null,
            };
        })
        .sort((left, right) => left.patente.localeCompare(right.patente, "es"));

    if (
        parsed.nonEmptyRowCount > 0
        && importRows.length === 0
        && !issues.some((issue) => issue.severity === "critical" && typeof issue.rowNumber !== "number")
    ) {
        issues.push(createImportIssue({
            code: "no-importable-rows",
            severity: "warning",
            field: "Importación",
            message: "No se encontraron filas válidas para importar despues de aplicar validaciones por fila y duplicados internos.",
        }));
    }

    const contractorNewItems = contractorItems.filter((item) => item.status === "new");
    const contractorExistingItems = contractorItems.filter((item) => item.status === "existing");
    const vehicleNewItems = vehicleItems.filter((item) => item.status === "new");
    const vehicleUpdatableItems = vehicleItems.filter((item) => item.status === "updatable");
    const vehicleExistingItems = vehicleItems.filter((item) => item.status === "existing");
    const globalCriticalErrors = issues.filter(
        (issue) => issue.severity === "critical" && typeof issue.rowNumber !== "number",
    ).length;
    const rowCriticalErrors = new Set(
        issues
            .filter((issue) => issue.severity === "critical" && typeof issue.rowNumber === "number")
            .map((issue) => issue.rowNumber as number),
    ).size;
    const canImport = globalCriticalErrors === 0
        && importRows.length > 0
        && (contractorNewItems.length > 0 || vehicleNewItems.length > 0 || vehicleUpdatableItems.length > 0);

    if (!canImport && globalCriticalErrors === 0 && importRows.length > 0) {
        issues.push(createImportIssue({
            code: "nothing-to-import",
            severity: "warning",
            field: "Importación",
            message: "El archivo fue validado, pero no contiene registros nuevos ni cambios para actualizar.",
        }));
    }

    return {
        fileName: parsed.fileName,
        sheetName: parsed.sheetName,
        generatedAt: new Date().toISOString(),
        summary: {
            totalRows: parsed.nonEmptyRowCount,
            validRows: importRows.length,
            invalidRows: rowCriticalErrors,
            blankRows: parsed.blankRowNumbers.length,
            newContractors: contractorNewItems.length,
            existingContractors: contractorExistingItems.length,
            newVehicles: vehicleNewItems.length,
            updatableVehicles: vehicleUpdatableItems.length,
            existingVehicles: vehicleExistingItems.length,
            duplicateInternal: duplicates.filter((duplicate) => !duplicate.critical).length,
            warnings: issues.filter((issue) => issue.severity === "warning").length,
            criticalErrors: issues.filter((issue) => issue.severity === "critical").length,
            globalCriticalErrors,
            rowCriticalErrors,
            canImport,
        },
        issues: [...issues].sort(sortIssues),
        duplicates: duplicates.sort((left, right) => left.patente.localeCompare(right.patente, "es")),
        contractors: {
            newItems: contractorNewItems,
            existingItems: contractorExistingItems,
        },
        vehicles: {
            newItems: vehicleNewItems,
            updatableItems: vehicleUpdatableItems,
            existingItems: vehicleExistingItems,
        },
        importRows,
    };
}