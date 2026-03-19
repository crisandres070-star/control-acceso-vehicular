import {
    IMPORT_HEADER_ALIASES,
    IMPORT_HEADER_SCAN_ROW_LIMIT,
    IMPORT_REQUIRED_HEADER_KEYS,
    IMPORT_REQUIRED_HEADER_LABELS,
    type ImportRequiredHeaderKey,
} from "@/lib/import/constants";
import {
    normalizeEmpresa,
    normalizeHeaderLabel,
    normalizeNumeroInterno,
    normalizePatente,
    normalizeText,
    normalizeTipoVehiculo,
    patenteWasNormalized,
} from "@/lib/import/normalizers";
import type { ImportIssue, ParsedExcelImport, ParsedExcelImportRow } from "@/lib/import/types";
import {
    hasCriticalImportIssues,
    validateExcelFile,
    validateParsedExcelRow,
    validateSingleSheetWorkbook,
    createImportIssue,
} from "@/lib/import/validators";

function getCellText(value: unknown) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value).replace(/[\r\n]+/g, " ").trim();
}

function buildHeaderAliasLookup() {
    const aliasLookup = new Map<string, ImportRequiredHeaderKey>();

    for (const headerKey of IMPORT_REQUIRED_HEADER_KEYS) {
        const aliases = [
            IMPORT_REQUIRED_HEADER_LABELS[headerKey],
            ...IMPORT_HEADER_ALIASES[headerKey],
        ];

        for (const alias of aliases) {
            const normalizedAlias = normalizeHeaderLabel(alias);

            if (!normalizedAlias) {
                continue;
            }

            aliasLookup.set(normalizedAlias, headerKey);
        }
    }

    return aliasLookup;
}

type HeaderInspection = {
    headerColumns: Map<ImportRequiredHeaderKey, number>;
    detectedHeaders: string[];
    unresolvedHeaders: string[];
    duplicateFields: Set<ImportRequiredHeaderKey>;
};

type HeaderCandidate = {
    rowNumber: number;
    inspection: HeaderInspection;
};

function inspectHeaderRow(headerRow: {
    eachCell: (
        options: { includeEmpty: boolean },
        callback: (cell: { text: unknown }, columnNumber: number) => void,
    ) => void;
}) {
    const aliasLookup = buildHeaderAliasLookup();
    const detectedHeaders: string[] = [];
    const unresolvedHeaders: string[] = [];
    const duplicateFields = new Set<ImportRequiredHeaderKey>();
    const headerColumns = new Map<ImportRequiredHeaderKey, number>();

    headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
        const rawHeader = normalizeText(getCellText(cell.text));

        if (!rawHeader) {
            return;
        }

        detectedHeaders.push(rawHeader);

        const headerKey = aliasLookup.get(normalizeHeaderLabel(rawHeader));

        if (!headerKey) {
            unresolvedHeaders.push(rawHeader);
            return;
        }

        if (headerColumns.has(headerKey)) {
            duplicateFields.add(headerKey);
            return;
        }

        headerColumns.set(headerKey, columnNumber);
    });

    return {
        headerColumns,
        detectedHeaders,
        unresolvedHeaders,
        duplicateFields,
    };
}

function shouldPreferHeaderCandidate(nextCandidate: HeaderCandidate, currentCandidate: HeaderCandidate) {
    const matchedDelta = nextCandidate.inspection.headerColumns.size - currentCandidate.inspection.headerColumns.size;

    if (matchedDelta !== 0) {
        return matchedDelta > 0;
    }

    const duplicateDelta = currentCandidate.inspection.duplicateFields.size - nextCandidate.inspection.duplicateFields.size;

    if (duplicateDelta !== 0) {
        return duplicateDelta > 0;
    }

    const detectedDelta = nextCandidate.inspection.detectedHeaders.length - currentCandidate.inspection.detectedHeaders.length;

    if (detectedDelta !== 0) {
        return detectedDelta > 0;
    }

    return nextCandidate.rowNumber < currentCandidate.rowNumber;
}

function detectHeaderCandidate(worksheet: {
    getRow: (rowNumber: number) => {
        eachCell: (
            options: { includeEmpty: boolean },
            callback: (cell: { text: unknown }, columnNumber: number) => void,
        ) => void;
    };
}, totalRows: number) {
    const scanRowLimit = Math.max(1, Math.min(totalRows, IMPORT_HEADER_SCAN_ROW_LIMIT));
    let bestCandidate: HeaderCandidate | null = null;

    for (let rowNumber = 1; rowNumber <= scanRowLimit; rowNumber += 1) {
        const candidate: HeaderCandidate = {
            rowNumber,
            inspection: inspectHeaderRow(worksheet.getRow(rowNumber)),
        };

        if (!bestCandidate || shouldPreferHeaderCandidate(candidate, bestCandidate)) {
            bestCandidate = candidate;
        }

        if (
            candidate.inspection.headerColumns.size === IMPORT_REQUIRED_HEADER_KEYS.length
            && candidate.inspection.duplicateFields.size === 0
        ) {
            return {
                candidate,
                scanRowLimit,
            };
        }
    }

    return {
        candidate: bestCandidate ?? {
            rowNumber: 1,
            inspection: inspectHeaderRow(worksheet.getRow(1)),
        },
        scanRowLimit,
    };
}

function buildHeaderIssues(candidate: HeaderCandidate, scanRowLimit: number) {
    const issues: ImportIssue[] = [];
    const { inspection, rowNumber } = candidate;

    if (inspection.detectedHeaders.length === 0) {
        issues.push(createImportIssue({
            code: "missing-header-row",
            severity: "critical",
            field: "Encabezados",
            message: scanRowLimit > 1
                ? `No se detectaron encabezados utilizables en las primeras ${scanRowLimit} filas del archivo.`
                : "No se detectaron encabezados utilizables en la primera fila del archivo.",
        }));

        return issues;
    }

    if (rowNumber > 1) {
        issues.push(createImportIssue({
            code: "header-row-offset",
            severity: "warning",
            field: "Encabezados",
            rowNumber,
            message: `Los encabezados se detectaron en la fila ${rowNumber}. Las filas anteriores se ignoraron automaticamente.`,
        }));
    }

    if (inspection.duplicateFields.size > 0) {
        issues.push(createImportIssue({
            code: "duplicate-header-fields",
            severity: "critical",
            field: "Encabezados",
            rowNumber,
            message: `Hay columnas repetidas para los mismos campos obligatorios: ${Array.from(inspection.duplicateFields)
                .map((headerKey) => IMPORT_REQUIRED_HEADER_LABELS[headerKey])
                .join(", ")}.`,
        }));
    }

    const missingFields = IMPORT_REQUIRED_HEADER_KEYS.filter((headerKey) => !inspection.headerColumns.has(headerKey));

    if (missingFields.length > 0) {
        issues.push(createImportIssue({
            code: "missing-required-headers",
            severity: "critical",
            field: "Encabezados",
            rowNumber,
            message: `Faltan columnas obligatorias: ${missingFields
                .map((headerKey) => IMPORT_REQUIRED_HEADER_LABELS[headerKey])
                .join(", ")}. Encabezados esperados: ${IMPORT_REQUIRED_HEADER_KEYS
                    .map((headerKey) => IMPORT_REQUIRED_HEADER_LABELS[headerKey])
                    .join(", ")}.`,
        }));
    }

    if (inspection.unresolvedHeaders.length > 0) {
        const uniqueUnresolvedHeaders = Array.from(new Set(inspection.unresolvedHeaders));

        issues.push(createImportIssue({
            code: "unresolved-headers",
            severity: "warning",
            field: "Encabezados",
            rowNumber,
            message: `Se detectaron columnas adicionales que no forman parte del formato obligatorio y seran ignoradas: ${uniqueUnresolvedHeaders.join(", ")}.`,
        }));
    }

    return issues;
}

export async function parseSingleSheetExcel(file: File): Promise<ParsedExcelImport> {
    const issues = validateExcelFile(file);

    if (hasCriticalImportIssues(issues)) {
        return {
            fileName: file.name,
            sheetName: null,
            headers: [],
            rows: [],
            nonEmptyRowCount: 0,
            blankRowNumbers: [],
            issues,
        };
    }

    const ExcelJsModule = await import("exceljs");
    const WorkbookConstructor = ExcelJsModule.default?.Workbook ?? ExcelJsModule.Workbook;
    const workbook = new WorkbookConstructor();
    const fileBuffer = Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0];

    try {
        await workbook.xlsx.load(fileBuffer);
    } catch {
        issues.push(createImportIssue({
            code: "invalid-workbook",
            severity: "critical",
            field: "Archivo",
            message: "No fue posible leer el archivo Excel. Verifique que sea un .xlsx valido y que no este danado.",
        }));

        return {
            fileName: file.name,
            sheetName: null,
            headers: [],
            rows: [],
            nonEmptyRowCount: 0,
            blankRowNumbers: [],
            issues,
        };
    }

    issues.push(...validateSingleSheetWorkbook(workbook.worksheets.length));

    const worksheet = workbook.worksheets[0];

    if (!worksheet || hasCriticalImportIssues(issues)) {
        return {
            fileName: file.name,
            sheetName: worksheet?.name ?? null,
            headers: [],
            rows: [],
            nonEmptyRowCount: 0,
            blankRowNumbers: [],
            issues,
        };
    }

    const totalRows = Math.max(worksheet.rowCount, worksheet.actualRowCount);
    const headerCandidateResult = detectHeaderCandidate(worksheet, totalRows);
    const headerResolution = headerCandidateResult.candidate;

    issues.push(...buildHeaderIssues(headerResolution, headerCandidateResult.scanRowLimit));

    if (hasCriticalImportIssues(issues)) {
        return {
            fileName: file.name,
            sheetName: worksheet.name,
            headers: headerResolution.inspection.detectedHeaders.map((header) => normalizeHeaderLabel(header)),
            rows: [],
            nonEmptyRowCount: 0,
            blankRowNumbers: [],
            issues,
        };
    }

    const patenteColumn = headerResolution.inspection.headerColumns.get("patente") as number;
    const numeroInternoColumn = headerResolution.inspection.headerColumns.get("numeroInterno") as number;
    const empresaColumn = headerResolution.inspection.headerColumns.get("empresa") as number;
    const tipoVehiculoColumn = headerResolution.inspection.headerColumns.get("tipoVehiculo") as number;
    const rows: ParsedExcelImportRow[] = [];
    const blankRowNumbers: number[] = [];
    let nonEmptyRowCount = 0;

    for (let rowNumber = headerResolution.rowNumber + 1; rowNumber <= totalRows; rowNumber += 1) {
        const worksheetRow = worksheet.getRow(rowNumber);
        const patenteOriginal = getCellText(worksheetRow.getCell(patenteColumn).text);
        const numeroInternoOriginal = getCellText(worksheetRow.getCell(numeroInternoColumn).text);
        const empresaOriginal = getCellText(worksheetRow.getCell(empresaColumn).text);
        const tipoVehiculoOriginal = getCellText(worksheetRow.getCell(tipoVehiculoColumn).text);
        const isBlankRow = !normalizeText(patenteOriginal)
            && !normalizeText(numeroInternoOriginal)
            && !normalizeText(empresaOriginal)
            && !normalizeText(tipoVehiculoOriginal);

        if (isBlankRow) {
            blankRowNumbers.push(rowNumber);
            issues.push(createImportIssue({
                code: "blank-row",
                severity: "warning",
                field: "Importación",
                rowNumber,
                message: "La fila esta vacia y sera ignorada.",
            }));
            continue;
        }

        nonEmptyRowCount += 1;

        const parsedRow: ParsedExcelImportRow = {
            patenteOriginal,
            patente: normalizePatente(patenteOriginal),
            patenteFueNormalizada: patenteWasNormalized(patenteOriginal),
            numeroInternoOriginal,
            numeroInterno: normalizeNumeroInterno(numeroInternoOriginal),
            empresaOriginal,
            empresa: normalizeText(empresaOriginal),
            empresaKey: normalizeEmpresa(empresaOriginal),
            tipoVehiculoOriginal,
            tipoVehiculo: normalizeTipoVehiculo(tipoVehiculoOriginal),
            __row: rowNumber,
        };

        rows.push(parsedRow);
        issues.push(...validateParsedExcelRow(parsedRow));
    }

    if (nonEmptyRowCount === 0) {
        issues.push(createImportIssue({
            code: "no-data-rows",
            severity: "critical",
            field: "Importación",
            message: "El archivo no contiene filas con datos para importar.",
        }));
    }

    return {
        fileName: file.name,
        sheetName: worksheet.name,
        headers: headerResolution.inspection.detectedHeaders.map((header) => normalizeHeaderLabel(header)),
        rows,
        nonEmptyRowCount,
        blankRowNumbers,
        issues,
    };
}