export type AiImportDocumentType = "vehiculos" | "choferes" | "desconocido";

export type AiImportSheetRole = "vehiculos" | "choferes" | "asignaciones" | "desconocido";

export type AiImportTargetField =
    | "patente"
    | "numeroInterno"
    | "empresa"
    | "tipoVehiculo"
    | "nombreChofer"
    | "rutChofer"
    | "empresaChofer"
    | "codigoInternoChofer"
    | "patenteAsignada"
    | "rutChoferAsignado"
    | "desconocido";

export type AiImportNormalizationType = "patente" | "rut" | "texto";

export type AiWorkbookRowSnapshot = {
    rowNumber: number;
    values: string[];
};

export type AiWorkbookSheetSnapshot = {
    sheetName: string;
    headerRowNumber: number | null;
    headers: string[];
    sampleRows: AiWorkbookRowSnapshot[];
    rows: AiWorkbookRowSnapshot[];
    nonEmptyRowCount: number;
};

export type AiWorkbookSnapshot = {
    fileName: string;
    sheetCount: number;
    sheets: AiWorkbookSheetSnapshot[];
};

export type AiImportSheetMapping = {
    sheetName: string;
    sheetRole: AiImportSheetRole;
    confidence: number;
    notes: string | null;
};

export type AiImportColumnMapping = {
    sheetName: string;
    sourceColumn: string;
    targetField: AiImportTargetField;
    confidence: number;
    rationale: string | null;
};

export type AiImportNormalizationSuggestion = {
    type: AiImportNormalizationType;
    original: string;
    normalized: string;
    reason: string;
};

export type AiImportAnalysis = {
    documentType: AiImportDocumentType;
    confidence: number;
    sheetMappings: AiImportSheetMapping[];
    columnMappings: AiImportColumnMapping[];
    normalizations: AiImportNormalizationSuggestion[];
    warnings: string[];
    criticalErrors: string[];
};

export type StoredAiImportAnalysis = {
    id: string;
    ownerUsername: string;
    fileName: string;
    createdAt: string;
    expiresAt: string;
    workbook: AiWorkbookSnapshot;
    analysis: AiImportAnalysis;
};