import {
    IMPORT_ALLOWED_EXTENSION,
    IMPORT_ALLOWED_MIME_TYPES,
    IMPORT_MAX_FILE_SIZE_BYTES,
    IMPORT_MAX_FILE_SIZE_LABEL,
    IMPORT_REQUIRED_HEADERS,
} from "@/lib/import/constants";
import {
    normalizeHeaderLabel,
    normalizeText,
    patenteWasNormalized,
} from "@/lib/import/normalizers";
import type {
    ImportIssue,
    ImportIssueField,
    ImportIssueSeverity,
    ParsedExcelImportRow,
} from "@/lib/import/types";

export function createImportIssue(options: {
    code: string;
    severity: ImportIssueSeverity;
    message: string;
    rowNumber?: number;
    field?: ImportIssueField;
}) {
    return options satisfies ImportIssue;
}

export function hasCriticalImportIssues(issues: ImportIssue[]) {
    return issues.some((issue) => issue.severity === "critical");
}

export function validateExcelFile(file: File) {
    const issues: ImportIssue[] = [];
    const fileName = String(file.name ?? "").trim();
    const extension = fileName.includes(".")
        ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
        : "";

    if (!fileName) {
        issues.push(createImportIssue({
            code: "missing-file-name",
            severity: "critical",
            field: "Archivo",
            message: "El archivo no tiene un nombre válido.",
        }));
    }

    if (extension !== IMPORT_ALLOWED_EXTENSION) {
        issues.push(createImportIssue({
            code: "invalid-file-extension",
            severity: "critical",
            field: "Archivo",
            message: "Solo se permiten archivos .xlsx.",
        }));
    }

    if (file.type && !IMPORT_ALLOWED_MIME_TYPES.includes(file.type as (typeof IMPORT_ALLOWED_MIME_TYPES)[number])) {
        issues.push(createImportIssue({
            code: "invalid-file-type",
            severity: "critical",
            field: "Archivo",
            message: "El archivo no corresponde a un Excel .xlsx válido.",
        }));
    }

    if (file.size <= 0) {
        issues.push(createImportIssue({
            code: "empty-file",
            severity: "critical",
            field: "Archivo",
            message: "El archivo Excel está vacío.",
        }));
    }

    if (file.size > IMPORT_MAX_FILE_SIZE_BYTES) {
        issues.push(createImportIssue({
            code: "file-too-large",
            severity: "critical",
            field: "Archivo",
            message: `El archivo supera el tamaño máximo permitido de ${IMPORT_MAX_FILE_SIZE_LABEL}.`,
        }));
    }

    return issues;
}

export function validateSingleSheetWorkbook(sheetCount: number) {
    if (sheetCount === 1) {
        return [] satisfies ImportIssue[];
    }

    if (sheetCount === 0) {
        return [createImportIssue({
            code: "missing-sheet",
            severity: "critical",
            field: "Hoja",
            message: "El archivo Excel no contiene ninguna hoja utilizable.",
        })];
    }

    return [createImportIssue({
        code: "invalid-sheet-count",
        severity: "critical",
        field: "Hoja",
        message: "El archivo debe contener una sola hoja para poder importarse.",
    })];
}

export function validateExactHeaders(headers: string[]) {
    const expectedHeaders = IMPORT_REQUIRED_HEADERS.map((header) => normalizeHeaderLabel(header));
    const normalizedHeaders = headers.map((header) => normalizeHeaderLabel(header));
    const headerCountMatches = headers.length === IMPORT_REQUIRED_HEADERS.length;
    const headerContentMatches = expectedHeaders.every((header, index) => normalizedHeaders[index] === header);

    if (headerCountMatches && headerContentMatches) {
        return [] satisfies ImportIssue[];
    }

    const detectedHeadersLabel = headers.length > 0
        ? headers.map((header) => header || "(vacío)").join(", ")
        : "sin encabezados detectables";

    return [createImportIssue({
        code: "invalid-headers",
        severity: "critical",
        field: "Encabezados",
        message: `Los encabezados son inválidos. El archivo debe tener exactamente estas columnas y en este orden: ${IMPORT_REQUIRED_HEADERS.join(", ")}. Encabezados detectados: ${detectedHeadersLabel}.`,
    })];
}

export function validateChileanLicensePlate(licensePlate: string) {
    if (!licensePlate) {
        return {
            isValid: false,
            message: "La patente es obligatoria.",
        };
    }

    return {
        isValid: true,
    };
}

export function validateParsedExcelRow(row: ParsedExcelImportRow) {
    const issues: ImportIssue[] = [];
    const normalizedPatenteOriginal = normalizeText(row.patenteOriginal);
    const normalizedNumeroInternoOriginal = normalizeText(row.numeroInternoOriginal);
    const normalizedTipoVehiculoOriginal = normalizeText(row.tipoVehiculoOriginal);

    if (!normalizedPatenteOriginal) {
        issues.push(createImportIssue({
            code: "missing-license-plate",
            severity: "critical",
            field: "Patente",
            rowNumber: row.__row,
            message: "La patente es obligatoria.",
        }));
    } else {
        const validation = validateChileanLicensePlate(row.patente);

        if (!validation.isValid) {
            issues.push(createImportIssue({
                code: "invalid-license-plate",
                severity: "critical",
                field: "Patente",
                rowNumber: row.__row,
                message: validation.message ?? "La patente es obligatoria.",
            }));
        } else if (patenteWasNormalized(row.patenteOriginal)) {
            issues.push(createImportIssue({
                code: "normalized-license-plate",
                severity: "warning",
                field: "Patente",
                rowNumber: row.__row,
                message: `La patente fue normalizada automáticamente de '${normalizedPatenteOriginal}' a '${row.patente}'.`,
            }));
        }
    }

    if (!row.empresaKey) {
        issues.push(createImportIssue({
            code: "missing-company",
            severity: "critical",
            field: "Empresa",
            rowNumber: row.__row,
            message: "La empresa es obligatoria.",
        }));
    }

    if (!row.numeroInterno && normalizedNumeroInternoOriginal) {
        issues.push(createImportIssue({
            code: "invalid-internal-code",
            severity: "warning",
            field: "N°Interno",
            rowNumber: row.__row,
            message: "El N°Interno contiene caracteres no válidos y se usará PENDIENTE al crear el vehículo.",
        }));
    }

    if (!normalizedNumeroInternoOriginal) {
        issues.push(createImportIssue({
            code: "missing-internal-code",
            severity: "warning",
            field: "N°Interno",
            rowNumber: row.__row,
            message: "La fila no informa N°Interno y se usará PENDIENTE al crear el vehículo.",
        }));
    }

    if (!normalizedTipoVehiculoOriginal) {
        issues.push(createImportIssue({
            code: "missing-vehicle-type",
            severity: "warning",
            field: "Tipo vehiculo",
            rowNumber: row.__row,
            message: "La fila no informa Tipo vehiculo y se usará NO INFORMADO al crear el vehículo.",
        }));
    }

    return issues;
}