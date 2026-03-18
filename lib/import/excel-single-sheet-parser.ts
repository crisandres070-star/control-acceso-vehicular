import {
    IMPORT_HEADER_ALIASES,
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

function resolveHeaderColumns(headerRow: {
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
    const issues: ImportIssue[] = [];

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

    if (detectedHeaders.length === 0) {
        issues.push(createImportIssue({
            code: "missing-header-row",
            severity: "critical",
            field: "Encabezados",
            message: "No se detectaron encabezados en la primera fila del archivo.",
        }));
    }

    if (duplicateFields.size > 0) {
        issues.push(createImportIssue({
            code: "duplicate-header-fields",
            severity: "critical",
            field: "Encabezados",
            message: `Hay columnas repetidas para los mismos campos obligatorios: ${Array.from(duplicateFields)
                .map((headerKey) => IMPORT_REQUIRED_HEADER_LABELS[headerKey])
                .join(", ")}.`,
        }));
    }

    const missingFields = IMPORT_REQUIRED_HEADER_KEYS.filter((headerKey) => !headerColumns.has(headerKey));

    if (missingFields.length > 0) {
        issues.push(createImportIssue({
            code: "missing-required-headers",
            severity: "critical",
            field: "Encabezados",
            message: `Faltan columnas obligatorias: ${missingFields
                .map((headerKey) => IMPORT_REQUIRED_HEADER_LABELS[headerKey])
                .join(", ")}. Encabezados esperados: ${IMPORT_REQUIRED_HEADER_KEYS
                    .map((headerKey) => IMPORT_REQUIRED_HEADER_LABELS[headerKey])
                    .join(", ")}.`,
        }));
    }

    if (unresolvedHeaders.length > 0) {
        const uniqueUnresolvedHeaders = Array.from(new Set(unresolvedHeaders));

        issues.push(createImportIssue({
            code: "unresolved-headers",
            severity: "warning",
            field: "Encabezados",
            message: `Se detectaron columnas adicionales que no forman parte del formato obligatorio y seran ignoradas: ${uniqueUnresolvedHeaders.join(", ")}.`,
        }));
    }

    return {
        headerColumns,
        detectedHeaders,
        issues,
    };
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

    const headerResolution = resolveHeaderColumns(worksheet.getRow(1));

    issues.push(...headerResolution.issues);

    if (hasCriticalImportIssues(issues)) {
        return {
            fileName: file.name,
            sheetName: worksheet.name,
            headers: headerResolution.detectedHeaders,
            rows: [],
            nonEmptyRowCount: 0,
            blankRowNumbers: [],
            issues,
        };
    }

    const patenteColumn = headerResolution.headerColumns.get("patente") as number;
    const numeroInternoColumn = headerResolution.headerColumns.get("numeroInterno") as number;
    const empresaColumn = headerResolution.headerColumns.get("empresa") as number;
    const tipoVehiculoColumn = headerResolution.headerColumns.get("tipoVehiculo") as number;
    const rows: ParsedExcelImportRow[] = [];
    const blankRowNumbers: number[] = [];
    let nonEmptyRowCount = 0;

    const totalRows = Math.max(worksheet.rowCount, worksheet.actualRowCount);

    for (let rowNumber = 2; rowNumber <= totalRows; rowNumber += 1) {
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
        headers: headerResolution.detectedHeaders.map((header) => normalizeHeaderLabel(header)),
        rows,
        nonEmptyRowCount,
        blankRowNumbers,
        issues,
    };
}