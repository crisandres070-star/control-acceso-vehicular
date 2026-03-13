import {
    IMPORT_REQUIRED_HEADERS,
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
import type { ParsedExcelImport, ParsedExcelImportRow } from "@/lib/import/types";
import {
    hasCriticalImportIssues,
    validateExactHeaders,
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
            message: "No fue posible leer el archivo Excel. Verifique que sea un .xlsx válido y que no esté dañado.",
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

    const headerRow = worksheet.getRow(1);
    const expectedColumnCount = IMPORT_REQUIRED_HEADERS.length;
    const getUnexpectedNonEmptyColumnNumbers = (worksheetRow: typeof headerRow) => {
        const columnNumbers: number[] = [];

        worksheetRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
            if (columnNumber <= expectedColumnCount) {
                return;
            }

            const normalizedValue = normalizeText(getCellText(cell.text));

            if (normalizedValue) {
                columnNumbers.push(columnNumber);
            }
        });

        return columnNumbers;
    };
    const normalizedHeaders = IMPORT_REQUIRED_HEADERS.map((_, index) => normalizeText(getCellText(headerRow.getCell(index + 1).text)));
    const unexpectedHeaderColumns = getUnexpectedNonEmptyColumnNumbers(headerRow);

    issues.push(...validateExactHeaders(normalizedHeaders));

    if (unexpectedHeaderColumns.length > 0) {
        issues.push(createImportIssue({
            code: "unexpected-header-columns",
            severity: "critical",
            field: "Encabezados",
            message: `El archivo contiene columnas adicionales fuera del formato esperado en la fila de encabezados: ${unexpectedHeaderColumns.join(", ")}.`,
        }));
    }

    if (hasCriticalImportIssues(issues)) {
        return {
            fileName: file.name,
            sheetName: worksheet.name,
            headers: normalizedHeaders,
            rows: [],
            nonEmptyRowCount: 0,
            blankRowNumbers: [],
            issues,
        };
    }

    const rows: ParsedExcelImportRow[] = [];
    const blankRowNumbers: number[] = [];
    let nonEmptyRowCount = 0;

    const totalRows = Math.max(worksheet.rowCount, worksheet.actualRowCount);

    for (let rowNumber = 2; rowNumber <= totalRows; rowNumber += 1) {
        const worksheetRow = worksheet.getRow(rowNumber);
        const patenteOriginal = getCellText(worksheetRow.getCell(1).text);
        const numeroInternoOriginal = getCellText(worksheetRow.getCell(2).text);
        const empresaOriginal = getCellText(worksheetRow.getCell(3).text);
        const tipoVehiculoOriginal = getCellText(worksheetRow.getCell(4).text);
        const unexpectedDataColumns = getUnexpectedNonEmptyColumnNumbers(worksheetRow);
        const isBlankRow = !normalizeText(patenteOriginal)
            && !normalizeText(numeroInternoOriginal)
            && !normalizeText(empresaOriginal)
            && !normalizeText(tipoVehiculoOriginal)
            && unexpectedDataColumns.length === 0;

        if (isBlankRow) {
            blankRowNumbers.push(rowNumber);
            issues.push(createImportIssue({
                code: "blank-row",
                severity: "warning",
                field: "Importación",
                rowNumber,
                message: "La fila está vacía y será ignorada.",
            }));
            continue;
        }

        nonEmptyRowCount += 1;

        if (unexpectedDataColumns.length > 0) {
            issues.push(createImportIssue({
                code: "unexpected-row-columns",
                severity: "critical",
                field: "Importación",
                rowNumber,
                message: `La fila contiene datos en columnas adicionales fuera del formato esperado: ${unexpectedDataColumns.join(", ")}.`,
            }));
        }

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
        headers: normalizedHeaders.map((header) => normalizeHeaderLabel(header)),
        rows,
        nonEmptyRowCount,
        blankRowNumbers,
        issues,
    };
}