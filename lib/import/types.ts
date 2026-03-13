export type ImportIssueSeverity = "warning" | "critical";

export type ImportIssueField =
    | "Archivo"
    | "Hoja"
    | "Encabezados"
    | "Patente"
    | "N°Interno"
    | "Empresa"
    | "Tipo vehiculo"
    | "Base de datos"
    | "Importación";

export type ImportIssue = {
    code: string;
    severity: ImportIssueSeverity;
    message: string;
    rowNumber?: number;
    field?: ImportIssueField;
};

export type ParsedExcelImportRow = {
    patenteOriginal: string;
    patente: string;
    patenteFueNormalizada?: boolean;
    numeroInternoOriginal: string;
    numeroInterno: string;
    empresaOriginal: string;
    empresa: string;
    empresaKey: string;
    tipoVehiculoOriginal: string;
    tipoVehiculo: string;
    __row: number;
};

export type ParsedExcelImport = {
    fileName: string;
    sheetName: string | null;
    headers: string[];
    rows: ParsedExcelImportRow[];
    nonEmptyRowCount: number;
    blankRowNumbers: number[];
    issues: ImportIssue[];
};

export type ImportDuplicateItem = {
    patente: string;
    empresa: string;
    rowNumbers: number[];
    kind: "same-company" | "different-company";
    conflictingEmpresas?: string[];
    critical: boolean;
};

export type ImportPreviewContratistaItem = {
    empresa: string;
    empresaKey: string;
    rowNumbers: number[];
    status: "new" | "existing";
    contratistaId: number | null;
    razonSocialActual: string | null;
};

export type ImportPreviewVehicleItem = {
    patente: string;
    patenteOriginal?: string;
    patenteFueNormalizada?: boolean;
    empresa: string;
    numeroInterno: string;
    tipoVehiculo: string;
    rowNumber: number;
    status: "new" | "existing";
    vehicleId: number | null;
    companyMismatch: boolean;
    companyActual: string | null;
    contratistaActual: string | null;
};

export type ImportPreviewSummary = {
    totalRows: number;
    validRows: number;
    blankRows: number;
    newContractors: number;
    existingContractors: number;
    newVehicles: number;
    existingVehicles: number;
    duplicateInternal: number;
    warnings: number;
    criticalErrors: number;
    canImport: boolean;
};

export type ImportPreview = {
    fileName: string;
    sheetName: string | null;
    generatedAt: string;
    summary: ImportPreviewSummary;
    issues: ImportIssue[];
    duplicates: ImportDuplicateItem[];
    contractors: {
        newItems: ImportPreviewContratistaItem[];
        existingItems: ImportPreviewContratistaItem[];
    };
    vehicles: {
        newItems: ImportPreviewVehicleItem[];
        existingItems: ImportPreviewVehicleItem[];
    };
    importRows: ParsedExcelImportRow[];
};

export type StoredImportPreview = {
    id: string;
    ownerUsername: string;
    fileName: string;
    createdAt: string;
    expiresAt: string;
    parsed: ParsedExcelImport;
    preview: ImportPreview;
};

export type ImportExecutionResult = {
    createdContractors: number;
    existingContractors: number;
    createdVehicles: number;
    existingVehicles: number;
    duplicateInternal: number;
    warnings: number;
    totalRows: number;
};