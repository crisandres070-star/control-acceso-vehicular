import "server-only";

import { Prisma } from "@prisma/client";
import OpenAI from "openai";

import {
    getOpenAiImportAssistantConfig,
    getOpenAiImportAssistantUnavailableMessage,
    isOpenAiImportAssistantEnabled,
} from "@/lib/import/ai-config";
import {
    IMPORT_AI_ANALYSIS_SAMPLE_ROWS,
    IMPORT_AI_ANALYSIS_TTL_MS,
    IMPORT_AI_REQUEST_TIMEOUT_MS,
    IMPORT_REQUIRED_HEADERS,
} from "@/lib/import/constants";
import { createImportPreviewFromParsedImport } from "@/lib/import/import-service";
import {
    normalizeEmpresa,
    normalizeNumeroInterno,
    normalizePatente,
    normalizeText,
    normalizeTipoVehiculo,
} from "@/lib/import/normalizers";
import { prisma } from "@/lib/prisma";
import type { ParsedExcelImport, ParsedExcelImportRow, StoredImportPreview } from "@/lib/import/types";
import { createImportIssue, hasCriticalImportIssues, validateExcelFile, validateParsedExcelRow } from "@/lib/import/validators";

import type {
    AiImportAnalysis,
    AiImportColumnMapping,
    AiImportDocumentType,
    AiImportNormalizationSuggestion,
    AiImportSheetMapping,
    AiImportSheetRole,
    AiImportTargetField,
    AiWorkbookRowSnapshot,
    AiWorkbookSheetSnapshot,
    AiWorkbookSnapshot,
    StoredAiImportAnalysis,
} from "./ai-types";

const AI_ANALYSIS_NOT_FOUND_MESSAGE = "El análisis IA ya no está disponible. Vuelva a cargar el archivo.";
const AI_ANALYSIS_EXPIRED_MESSAGE = "El análisis IA expiró. Vuelva a cargar el archivo.";
const AI_ANALYSIS_ACCESS_DENIED_MESSAGE = "El análisis IA no pertenece al usuario autenticado.";
const AI_ANALYSIS_INVALID_MESSAGE = "La sesión temporal del asistente IA es inválida. Vuelva a cargar el archivo.";

const VEHICLE_FIELD_LABELS: Record<"patente" | "numeroInterno" | "empresa" | "tipoVehiculo", string> = {
    patente: "Patente",
    numeroInterno: "N°Interno",
    empresa: "Empresa",
    tipoVehiculo: "Tipo vehiculo",
};

const AI_TARGET_FIELD_ENUM: AiImportTargetField[] = [
    "patente",
    "numeroInterno",
    "empresa",
    "tipoVehiculo",
    "nombreChofer",
    "rutChofer",
    "empresaChofer",
    "codigoInternoChofer",
    "patenteAsignada",
    "rutChoferAsignado",
    "desconocido",
];

const AI_SHEET_ROLE_ENUM: AiImportSheetRole[] = ["vehiculos", "choferes", "asignaciones", "desconocido"];
const AI_DOCUMENT_TYPE_ENUM: AiImportDocumentType[] = ["vehiculos", "choferes", "desconocido"];

const AI_IMPORT_ANALYSIS_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: [
        "documentType",
        "confidence",
        "sheetMappings",
        "columnMappings",
        "normalizations",
        "warnings",
        "criticalErrors",
    ],
    properties: {
        documentType: {
            type: "string",
            enum: AI_DOCUMENT_TYPE_ENUM,
        },
        confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
        },
        sheetMappings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["sheetName", "sheetRole", "confidence", "notes"],
                properties: {
                    sheetName: { type: "string" },
                    sheetRole: {
                        type: "string",
                        enum: AI_SHEET_ROLE_ENUM,
                    },
                    confidence: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                    },
                    notes: {
                        type: ["string", "null"],
                    },
                },
            },
        },
        columnMappings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["sheetName", "sourceColumn", "targetField", "confidence", "rationale"],
                properties: {
                    sheetName: { type: "string" },
                    sourceColumn: { type: "string" },
                    targetField: {
                        type: "string",
                        enum: AI_TARGET_FIELD_ENUM,
                    },
                    confidence: {
                        type: "number",
                        minimum: 0,
                        maximum: 1,
                    },
                    rationale: {
                        type: ["string", "null"],
                    },
                },
            },
        },
        normalizations: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["type", "original", "normalized", "reason"],
                properties: {
                    type: {
                        type: "string",
                        enum: ["patente", "rut", "texto"],
                    },
                    original: { type: "string" },
                    normalized: { type: "string" },
                    reason: { type: "string" },
                },
            },
        },
        warnings: {
            type: "array",
            items: { type: "string" },
        },
        criticalErrors: {
            type: "array",
            items: { type: "string" },
        },
    },
} as const;

const IMPORT_AI_ANALYSIS_SELECT = {
    id: true,
    ownerUsername: true,
    fileName: true,
    workbookJson: true,
    analysisJson: true,
    createdAt: true,
    expiresAt: true,
} satisfies Prisma.ImportacionAiAnalisisSelect;

type ImportacionAiAnalisisRecord = {
    id: string;
    ownerUsername: string;
    fileName: string;
    workbookJson: Prisma.JsonValue;
    analysisJson: Prisma.JsonValue;
    createdAt: Date;
    expiresAt: Date;
};

export class ImportAiAnalysisNotFoundError extends Error { }

export class ImportAiAnalysisExpiredError extends Error { }

export class ImportAiAnalysisAccessDeniedError extends Error { }

export class ImportAiAssistantUnavailableError extends Error { }

export class ImportAiAnalysisBlockedError extends Error {
    analysisId: string;

    constructor(message: string, analysisId: string) {
        super(message);
        this.analysisId = analysisId;
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampConfidence(value: unknown) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.min(1, Math.max(0, numericValue));
}

function getCellText(value: unknown) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).replace(/[\r\n]+/g, " ").trim();
}

function toSafeString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => toSafeString(entry))
        .filter(Boolean);
}

function toDocumentType(value: unknown): AiImportDocumentType {
    return AI_DOCUMENT_TYPE_ENUM.includes(value as AiImportDocumentType)
        ? value as AiImportDocumentType
        : "desconocido";
}

function toSheetRole(value: unknown): AiImportSheetRole {
    return AI_SHEET_ROLE_ENUM.includes(value as AiImportSheetRole)
        ? value as AiImportSheetRole
        : "desconocido";
}

function toTargetField(value: unknown): AiImportTargetField {
    return AI_TARGET_FIELD_ENUM.includes(value as AiImportTargetField)
        ? value as AiImportTargetField
        : "desconocido";
}

function isValidAnalysisId(analysisId: string) {
    return /^[A-Za-z0-9_-]{8,191}$/.test(analysisId.trim());
}

function normalizeHeaderLookupValue(value: string) {
    return normalizeText(value).toUpperCase();
}

function toInputJsonValue(value: AiWorkbookSnapshot | AiImportAnalysis) {
    return value as unknown as Prisma.InputJsonValue;
}

function buildOpenAiClient() {
    const config = getOpenAiImportAssistantConfig();

    if (!config.enabled || !config.apiKey) {
        throw new ImportAiAssistantUnavailableError(getOpenAiImportAssistantUnavailableMessage());
    }

    return new OpenAI({
        apiKey: config.apiKey,
        timeout: IMPORT_AI_REQUEST_TIMEOUT_MS,
    });
}

function extractMessageContent(content: unknown) {
    if (typeof content === "string") {
        return content;
    }

    if (!Array.isArray(content)) {
        return "";
    }

    return content
        .map((item) => {
            if (!isPlainObject(item)) {
                return "";
            }

            const textValue = item.text;

            return typeof textValue === "string" ? textValue : "";
        })
        .join("")
        .trim();
}

function parseAiImportAnalysis(value: unknown): AiImportAnalysis {
    if (!isPlainObject(value)) {
        throw new Error(AI_ANALYSIS_INVALID_MESSAGE);
    }

    const sheetMappings = Array.isArray(value.sheetMappings)
        ? value.sheetMappings
            .filter(isPlainObject)
            .map((entry): AiImportSheetMapping => ({
                sheetName: toSafeString(entry.sheetName),
                sheetRole: toSheetRole(entry.sheetRole),
                confidence: clampConfidence(entry.confidence),
                notes: toSafeString(entry.notes) || null,
            }))
            .filter((entry) => Boolean(entry.sheetName))
        : [];
    const columnMappings = Array.isArray(value.columnMappings)
        ? value.columnMappings
            .filter(isPlainObject)
            .map((entry): AiImportColumnMapping => ({
                sheetName: toSafeString(entry.sheetName),
                sourceColumn: toSafeString(entry.sourceColumn),
                targetField: toTargetField(entry.targetField),
                confidence: clampConfidence(entry.confidence),
                rationale: toSafeString(entry.rationale) || null,
            }))
            .filter((entry) => Boolean(entry.sheetName) && Boolean(entry.sourceColumn))
        : [];

    return {
        documentType: toDocumentType(value.documentType),
        confidence: clampConfidence(value.confidence),
        sheetMappings,
        columnMappings,
        normalizations: Array.isArray(value.normalizations)
            ? value.normalizations
                .filter(isPlainObject)
                .map((entry): AiImportNormalizationSuggestion => ({
                    type: entry.type === "patente" || entry.type === "rut" || entry.type === "texto"
                        ? entry.type
                        : "texto",
                    original: toSafeString(entry.original),
                    normalized: toSafeString(entry.normalized),
                    reason: toSafeString(entry.reason),
                }))
                .filter((entry) => Boolean(entry.original) || Boolean(entry.normalized))
            : [],
        warnings: toStringArray(value.warnings),
        criticalErrors: toStringArray(value.criticalErrors),
    };
}

function parseWorkbookSnapshot(value: Prisma.JsonValue, fallbackFileName: string): AiWorkbookSnapshot {
    if (!isPlainObject(value) || !Array.isArray(value.sheets)) {
        throw new Error(AI_ANALYSIS_INVALID_MESSAGE);
    }

    const sheets = value.sheets.reduce<AiWorkbookSheetSnapshot[]>((accumulator, sheetEntry) => {
        if (!isPlainObject(sheetEntry)) {
            return accumulator;
        }

        const sampleRows = Array.isArray(sheetEntry.sampleRows)
            ? sheetEntry.sampleRows.reduce<AiWorkbookRowSnapshot[]>((rowAccumulator, rowEntry) => {
                if (!isPlainObject(rowEntry)) {
                    return rowAccumulator;
                }

                rowAccumulator.push({
                    rowNumber: Number.isInteger(rowEntry.rowNumber) ? Number(rowEntry.rowNumber) : 0,
                    values: Array.isArray(rowEntry.values) ? rowEntry.values.map((item) => toSafeString(item)) : [],
                });

                return rowAccumulator;
            }, [])
            : [];
        const rows = Array.isArray(sheetEntry.rows)
            ? sheetEntry.rows.reduce<AiWorkbookRowSnapshot[]>((rowAccumulator, rowEntry) => {
                if (!isPlainObject(rowEntry)) {
                    return rowAccumulator;
                }

                rowAccumulator.push({
                    rowNumber: Number.isInteger(rowEntry.rowNumber) ? Number(rowEntry.rowNumber) : 0,
                    values: Array.isArray(rowEntry.values) ? rowEntry.values.map((item) => toSafeString(item)) : [],
                });

                return rowAccumulator;
            }, [])
            : [];

        accumulator.push({
            sheetName: toSafeString(sheetEntry.sheetName),
            headerRowNumber: Number.isInteger(sheetEntry.headerRowNumber) ? Number(sheetEntry.headerRowNumber) : null,
            headers: Array.isArray(sheetEntry.headers) ? sheetEntry.headers.map((header) => toSafeString(header)) : [],
            sampleRows,
            rows,
            nonEmptyRowCount: Number.isInteger(sheetEntry.nonEmptyRowCount) ? Number(sheetEntry.nonEmptyRowCount) : 0,
        });

        return accumulator;
    }, []);

    return {
        fileName: toSafeString(value.fileName) || fallbackFileName,
        sheetCount: Number.isInteger(value.sheetCount) ? Number(value.sheetCount) : value.sheets.length,
        sheets: sheets.filter((sheet) => Boolean(sheet.sheetName)),
    };
}

function buildStoredAiImportAnalysis(record: ImportacionAiAnalisisRecord): StoredAiImportAnalysis {
    const workbook = parseWorkbookSnapshot(record.workbookJson, record.fileName);
    const analysis = parseAiImportAnalysis(record.analysisJson);

    return {
        id: record.id,
        ownerUsername: record.ownerUsername,
        fileName: record.fileName,
        createdAt: record.createdAt.toISOString(),
        expiresAt: record.expiresAt.toISOString(),
        workbook,
        analysis,
    };
}

async function cleanupExpiredAiImportAnalyses(client: typeof prisma | Prisma.TransactionClient = prisma) {
    await client.importacionAiAnalisis.deleteMany({
        where: {
            expiresAt: {
                lte: new Date(),
            },
        },
    });
}

async function getStoredAiImportAnalysisRecordOrThrow(analysisId: string, ownerUsername: string) {
    if (!isValidAnalysisId(analysisId)) {
        throw new ImportAiAnalysisNotFoundError(AI_ANALYSIS_NOT_FOUND_MESSAGE);
    }

    const record = await prisma.importacionAiAnalisis.findUnique({
        where: { id: analysisId },
        select: IMPORT_AI_ANALYSIS_SELECT,
    });

    if (!record) {
        await cleanupExpiredAiImportAnalyses();
        throw new ImportAiAnalysisNotFoundError(AI_ANALYSIS_NOT_FOUND_MESSAGE);
    }

    if (record.expiresAt <= new Date()) {
        await prisma.importacionAiAnalisis.deleteMany({ where: { id: analysisId } });
        await cleanupExpiredAiImportAnalyses();
        throw new ImportAiAnalysisExpiredError(AI_ANALYSIS_EXPIRED_MESSAGE);
    }

    if (record.ownerUsername !== ownerUsername) {
        await cleanupExpiredAiImportAnalyses();
        throw new ImportAiAnalysisAccessDeniedError(AI_ANALYSIS_ACCESS_DENIED_MESSAGE);
    }

    try {
        await cleanupExpiredAiImportAnalyses();
        return buildStoredAiImportAnalysis(record);
    } catch {
        await prisma.importacionAiAnalisis.deleteMany({ where: { id: analysisId } });
        throw new ImportAiAnalysisNotFoundError(AI_ANALYSIS_INVALID_MESSAGE);
    }
}

function extractMaxColumnCount(worksheet: {
    rowCount: number;
    actualRowCount: number;
    getRow: (rowNumber: number) => { eachCell: (options: { includeEmpty: boolean }, callback: (_cell: unknown, columnNumber: number) => void) => void; text?: string };
}) {
    const totalRows = Math.max(worksheet.rowCount, worksheet.actualRowCount);
    let maxColumnCount = 0;

    for (let rowNumber = 1; rowNumber <= totalRows; rowNumber += 1) {
        const row = worksheet.getRow(rowNumber);

        row.eachCell({ includeEmpty: false }, (_cell, columnNumber) => {
            if (columnNumber > maxColumnCount) {
                maxColumnCount = columnNumber;
            }
        });
    }

    return maxColumnCount;
}

function extractRowValues(
    worksheetRow: { getCell: (columnNumber: number) => { text: unknown } },
    columnCount: number,
) {
    return Array.from({ length: columnCount }, (_, index) => getCellText(worksheetRow.getCell(index + 1).text));
}

export function isAiImportAssistantConfigured() {
    return isOpenAiImportAssistantEnabled();
}

export function canCreateVehiclePreviewFromAiAnalysis(analysis: AiImportAnalysis) {
    if (analysis.documentType !== "vehiculos" || analysis.criticalErrors.length > 0) {
        return false;
    }

    const vehicleSheets = analysis.sheetMappings.filter((sheet) => sheet.sheetRole === "vehiculos");

    if (vehicleSheets.length !== 1) {
        return false;
    }

    const selectedSheetName = vehicleSheets[0].sheetName;
    const targetFields = new Set(
        analysis.columnMappings
            .filter((mapping) => mapping.sheetName === selectedSheetName)
            .map((mapping) => mapping.targetField),
    );

    return targetFields.has("patente") && targetFields.has("empresa");
}

async function extractWorkbookSnapshotFromFile(file: File): Promise<AiWorkbookSnapshot> {
    const fileIssues = validateExcelFile(file);

    if (hasCriticalImportIssues(fileIssues)) {
        throw new Error(fileIssues.map((issue) => issue.message).join(" "));
    }

    const ExcelJsModule = await import("exceljs");
    const WorkbookConstructor = ExcelJsModule.default?.Workbook ?? ExcelJsModule.Workbook;
    const workbook = new WorkbookConstructor();
    const fileBuffer = Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0];

    try {
        await workbook.xlsx.load(fileBuffer);
    } catch {
        throw new Error("No fue posible leer el archivo Excel para el análisis IA. Verifique que sea un .xlsx válido.");
    }

    if (workbook.worksheets.length === 0) {
        throw new Error("El archivo Excel no contiene hojas utilizables para el análisis IA.");
    }

    const sheets = workbook.worksheets.map((worksheet): AiWorkbookSheetSnapshot => {
        const totalRows = Math.max(worksheet.rowCount, worksheet.actualRowCount);
        const maxColumnCount = extractMaxColumnCount(worksheet);
        let headerRowNumber: number | null = null;

        for (let rowNumber = 1; rowNumber <= totalRows; rowNumber += 1) {
            const rowValues = extractRowValues(worksheet.getRow(rowNumber), maxColumnCount);

            if (rowValues.some((value) => Boolean(normalizeText(value)))) {
                headerRowNumber = rowNumber;
                break;
            }
        }

        if (!headerRowNumber) {
            return {
                sheetName: worksheet.name,
                headerRowNumber: null,
                headers: [],
                sampleRows: [],
                rows: [],
                nonEmptyRowCount: 0,
            };
        }

        const headers = extractRowValues(worksheet.getRow(headerRowNumber), maxColumnCount);
        const rows: AiWorkbookRowSnapshot[] = [];

        for (let rowNumber = headerRowNumber + 1; rowNumber <= totalRows; rowNumber += 1) {
            const values = extractRowValues(worksheet.getRow(rowNumber), maxColumnCount);

            if (!values.some((value) => Boolean(normalizeText(value)))) {
                continue;
            }

            rows.push({
                rowNumber,
                values,
            });
        }

        return {
            sheetName: worksheet.name,
            headerRowNumber,
            headers,
            sampleRows: rows.slice(0, IMPORT_AI_ANALYSIS_SAMPLE_ROWS),
            rows,
            nonEmptyRowCount: rows.length,
        };
    });

    return {
        fileName: file.name,
        sheetCount: sheets.length,
        sheets,
    };
}

function buildAnalysisPayload(snapshot: AiWorkbookSnapshot) {
    return {
        fileName: snapshot.fileName,
        expectedRules: {
            vehicles: {
                currentSystemSupportsAutomatedPreview: true,
                logicalFields: [
                    { targetField: "patente", description: "Patente del vehículo" },
                    { targetField: "numeroInterno", description: "Código o número interno del vehículo" },
                    { targetField: "empresa", description: "Empresa o contratista responsable" },
                    { targetField: "tipoVehiculo", description: "Tipo o clase del vehículo" },
                ],
                examples: [
                    "Patente",
                    "Pat.",
                    "Interno",
                    "Empresa contratista",
                    "Tipo",
                    "Vehículo",
                ],
            },
            drivers: {
                currentSystemSupportsAutomatedPreview: false,
                expectedSheets: ["CHOFERES", "ASIGNACIONES"],
                logicalFields: [
                    { targetField: "nombreChofer", description: "Nombre del chofer" },
                    { targetField: "rutChofer", description: "RUT del chofer" },
                    { targetField: "empresaChofer", description: "Empresa del chofer" },
                    { targetField: "codigoInternoChofer", description: "Código interno del chofer" },
                    { targetField: "patenteAsignada", description: "Patente asociada a un chofer" },
                    { targetField: "rutChoferAsignado", description: "RUT del chofer asociado a una patente" },
                ],
            },
        },
        workbook: snapshot.sheets.map((sheet) => ({
            sheetName: sheet.sheetName,
            headerRowNumber: sheet.headerRowNumber,
            headers: sheet.headers,
            sampleRows: sheet.sampleRows.map((row) => ({
                rowNumber: row.rowNumber,
                values: row.values,
            })),
            nonEmptyRowCount: sheet.nonEmptyRowCount,
        })),
        instructions: [
            "Reconozca el tipo de documento: vehiculos, choferes o desconocido.",
            "Mapee hojas y columnas aunque los nombres no coincidan exactamente.",
            "Si no está seguro, use menor confidence y agregue warnings.",
            "Nunca resuelva silenciosamente conflictos de negocio.",
            "Si observa la misma patente normalizada con empresas distintas en las muestras, agréguelo a criticalErrors.",
        ],
    };
}

async function analyzeWorkbookWithAi(snapshot: AiWorkbookSnapshot) {
    const client = buildOpenAiClient();
    const config = getOpenAiImportAssistantConfig();
    const payload = buildAnalysisPayload(snapshot);
    const completion = await client.chat.completions.create({
        model: config.model,
        temperature: 0,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "import_ai_analysis",
                strict: true,
                schema: AI_IMPORT_ANALYSIS_SCHEMA,
            },
        },
        messages: [
            {
                role: "system",
                content: [
                    "Eres un asistente de interpretación de Excel para un sistema de control de acceso.",
                    "Tu trabajo es reconocer hojas, columnas y patrones operativos, no decidir importaciones por cuenta propia.",
                    "Debes devolver solo JSON válido según el schema indicado.",
                    "Si el archivo parece de choferes o asignaciones, reconócelo, pero no inventes campos inexistentes.",
                    "Si detectas baja certeza o conflictos de negocio visibles, refléjalos en warnings o criticalErrors.",
                ].join(" "),
            },
            {
                role: "user",
                content: JSON.stringify(payload),
            },
        ],
    });
    const rawContent = extractMessageContent(completion.choices[0]?.message?.content);

    if (!rawContent) {
        throw new Error("La IA no devolvió una respuesta interpretable para el archivo cargado.");
    }

    return parseAiImportAnalysis(JSON.parse(rawContent));
}

function getVehicleSheetOrThrow(storedAnalysis: StoredAiImportAnalysis) {
    const vehicleSheets = storedAnalysis.analysis.sheetMappings
        .filter((sheet) => sheet.sheetRole === "vehiculos")
        .sort((left, right) => right.confidence - left.confidence || left.sheetName.localeCompare(right.sheetName, "es"));

    if (storedAnalysis.analysis.documentType !== "vehiculos") {
        throw new ImportAiAnalysisBlockedError(
            "La IA no reconoció un archivo de contratistas + vehículos compatible con el preview automático actual.",
            storedAnalysis.id,
        );
    }

    if (storedAnalysis.analysis.criticalErrors.length > 0) {
        throw new ImportAiAnalysisBlockedError(
            "La IA detectó errores críticos en la interpretación. Revise el análisis o use el flujo manual actual.",
            storedAnalysis.id,
        );
    }

    if (vehicleSheets.length !== 1) {
        throw new ImportAiAnalysisBlockedError(
            "La IA no pudo aislar una única hoja de vehículos para continuar con el preview automático.",
            storedAnalysis.id,
        );
    }

    const selectedSheet = storedAnalysis.workbook.sheets.find((sheet) => sheet.sheetName === vehicleSheets[0].sheetName) ?? null;

    if (!selectedSheet) {
        throw new ImportAiAnalysisBlockedError(
            "La hoja seleccionada por la IA ya no está disponible en la sesión temporal.",
            storedAnalysis.id,
        );
    }

    return selectedSheet;
}

function getBestColumnMapping(
    analysis: AiImportAnalysis,
    sheetName: string,
    targetField: AiImportTargetField,
) {
    return analysis.columnMappings
        .filter((mapping) => mapping.sheetName === sheetName && mapping.targetField === targetField)
        .sort((left, right) => right.confidence - left.confidence || left.sourceColumn.localeCompare(right.sourceColumn, "es"))[0] ?? null;
}

function resolveColumnIndex(headers: string[], sourceColumn: string) {
    const normalizedSource = normalizeHeaderLookupValue(sourceColumn);

    return headers.findIndex((header) => normalizeHeaderLookupValue(header) === normalizedSource);
}

function buildParsedImportFromAiAnalysis(storedAnalysis: StoredAiImportAnalysis): ParsedExcelImport {
    const selectedSheet = getVehicleSheetOrThrow(storedAnalysis);
    const patenteMapping = getBestColumnMapping(storedAnalysis.analysis, selectedSheet.sheetName, "patente");
    const empresaMapping = getBestColumnMapping(storedAnalysis.analysis, selectedSheet.sheetName, "empresa");
    const numeroInternoMapping = getBestColumnMapping(storedAnalysis.analysis, selectedSheet.sheetName, "numeroInterno");
    const tipoVehiculoMapping = getBestColumnMapping(storedAnalysis.analysis, selectedSheet.sheetName, "tipoVehiculo");

    if (!patenteMapping || !empresaMapping) {
        throw new ImportAiAnalysisBlockedError(
            "La IA no pudo mapear las columnas mínimas requeridas de patente y empresa para generar el preview automático.",
            storedAnalysis.id,
        );
    }

    const patenteIndex = resolveColumnIndex(selectedSheet.headers, patenteMapping.sourceColumn);
    const empresaIndex = resolveColumnIndex(selectedSheet.headers, empresaMapping.sourceColumn);
    const numeroInternoIndex = numeroInternoMapping ? resolveColumnIndex(selectedSheet.headers, numeroInternoMapping.sourceColumn) : -1;
    const tipoVehiculoIndex = tipoVehiculoMapping ? resolveColumnIndex(selectedSheet.headers, tipoVehiculoMapping.sourceColumn) : -1;

    if (patenteIndex < 0 || empresaIndex < 0) {
        throw new ImportAiAnalysisBlockedError(
            "La IA propuso columnas que no pudieron resolverse contra los encabezados reales del archivo.",
            storedAnalysis.id,
        );
    }

    const issues = [
        patenteMapping,
        empresaMapping,
        numeroInternoMapping,
        tipoVehiculoMapping,
    ]
        .filter(Boolean)
        .flatMap((mapping) => {
            if (!mapping) {
                return [];
            }

            const expectedLabel = mapping.targetField in VEHICLE_FIELD_LABELS
                ? VEHICLE_FIELD_LABELS[mapping.targetField as keyof typeof VEHICLE_FIELD_LABELS]
                : null;

            if (!expectedLabel || normalizeHeaderLookupValue(mapping.sourceColumn) === normalizeHeaderLookupValue(expectedLabel)) {
                return [];
            }

            return [createImportIssue({
                code: `ai-mapped-header-${mapping.targetField}`,
                severity: "warning",
                field: "Encabezados",
                message: `La columna '${mapping.sourceColumn}' fue interpretada como '${expectedLabel}' por la capa IA antes de aplicar la validación dura.`,
            })];
        });
    const rows: ParsedExcelImportRow[] = [];
    const blankRowNumbers: number[] = [];
    let nonEmptyRowCount = 0;

    for (const sourceRow of selectedSheet.rows) {
        const patenteOriginal = patenteIndex >= 0 ? sourceRow.values[patenteIndex] ?? "" : "";
        const numeroInternoOriginal = numeroInternoIndex >= 0 ? sourceRow.values[numeroInternoIndex] ?? "" : "";
        const empresaOriginal = empresaIndex >= 0 ? sourceRow.values[empresaIndex] ?? "" : "";
        const tipoVehiculoOriginal = tipoVehiculoIndex >= 0 ? sourceRow.values[tipoVehiculoIndex] ?? "" : "";
        const isBlankRow = !normalizeText(patenteOriginal)
            && !normalizeText(numeroInternoOriginal)
            && !normalizeText(empresaOriginal)
            && !normalizeText(tipoVehiculoOriginal);

        if (isBlankRow) {
            blankRowNumbers.push(sourceRow.rowNumber);
            issues.push(createImportIssue({
                code: "blank-row-ai-mapped",
                severity: "warning",
                field: "Importación",
                rowNumber: sourceRow.rowNumber,
                message: "La fila quedó vacía después del mapeo asistido por IA y será ignorada.",
            }));
            continue;
        }

        nonEmptyRowCount += 1;

        const parsedRow: ParsedExcelImportRow = {
            patenteOriginal,
            patente: normalizePatente(patenteOriginal),
            patenteFueNormalizada: normalizeText(patenteOriginal) !== normalizePatente(patenteOriginal),
            numeroInternoOriginal,
            numeroInterno: normalizeNumeroInterno(numeroInternoOriginal),
            empresaOriginal,
            empresa: normalizeText(empresaOriginal),
            empresaKey: normalizeEmpresa(empresaOriginal),
            tipoVehiculoOriginal,
            tipoVehiculo: normalizeTipoVehiculo(tipoVehiculoOriginal),
            __row: sourceRow.rowNumber,
        };

        rows.push(parsedRow);
        issues.push(...validateParsedExcelRow(parsedRow));
    }

    if (nonEmptyRowCount === 0) {
        issues.push(createImportIssue({
            code: "no-data-rows-ai-mapped",
            severity: "critical",
            field: "Importación",
            message: "El archivo no contiene filas útiles después del mapeo asistido por IA.",
        }));
    }

    return {
        fileName: storedAnalysis.fileName,
        sheetName: selectedSheet.sheetName,
        headers: [...IMPORT_REQUIRED_HEADERS],
        rows,
        nonEmptyRowCount,
        blankRowNumbers,
        issues,
    };
}

export async function createAiImportAnalysisFromFile(file: File, ownerUsername: string) {
    await cleanupExpiredAiImportAnalyses();

    const workbook = await extractWorkbookSnapshotFromFile(file);
    const analysis = await analyzeWorkbookWithAi(workbook);
    const record = await prisma.importacionAiAnalisis.create({
        data: {
            ownerUsername,
            fileName: workbook.fileName,
            workbookJson: toInputJsonValue(workbook),
            analysisJson: toInputJsonValue(analysis),
            expiresAt: new Date(Date.now() + IMPORT_AI_ANALYSIS_TTL_MS),
        },
        select: IMPORT_AI_ANALYSIS_SELECT,
    });

    return buildStoredAiImportAnalysis(record);
}

export async function loadStoredAiImportAnalysis(analysisId: string, ownerUsername: string) {
    return getStoredAiImportAnalysisRecordOrThrow(analysisId, ownerUsername);
}

export async function deleteStoredAiImportAnalysis(analysisId: string) {
    if (!isValidAnalysisId(analysisId)) {
        return;
    }

    await prisma.importacionAiAnalisis.deleteMany({
        where: {
            id: analysisId,
        },
    });
}

export async function createImportPreviewFromAiAnalysis(analysisId: string, ownerUsername: string): Promise<StoredImportPreview> {
    const storedAnalysis = await loadStoredAiImportAnalysis(analysisId, ownerUsername);
    const parsedImport = buildParsedImportFromAiAnalysis(storedAnalysis);
    const preview = await createImportPreviewFromParsedImport(parsedImport, ownerUsername);

    await deleteStoredAiImportAnalysis(analysisId);

    return preview;
}