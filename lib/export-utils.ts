import { NextResponse } from "next/server";

export type ExportFormat = "csv" | "xlsx";
export type ExportTone = "positive" | "negative" | "warning" | "neutral";
export type ExportAlignment = "left" | "center" | "right";

type ExportCellValue = string | number | boolean | null | undefined;

export type ExportColumn<Row> = {
    key: string;
    header: string;
    width: number;
    value: (row: Row) => ExportCellValue;
    alignment?: ExportAlignment;
    wrapText?: boolean;
    tone?: (row: Row, renderedValue: string) => ExportTone | null;
};

type CreateTabularExportOptions<Row> = {
    filename: string;
    columns: readonly ExportColumn<Row>[];
    rows: readonly Row[];
};

type CreateExcelExportOptions<Row> = CreateTabularExportOptions<Row> & {
    sheetName: string;
    title: string;
    subtitle?: string;
};

const exportDateFormatter = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
});

const exportTimeFormatter = new Intl.DateTimeFormat("es-CL", {
    timeStyle: "short",
});

const exportDateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "medium",
});

function normalizeCellValue(value: ExportCellValue) {
    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value === "boolean") {
        return value ? "Sí" : "No";
    }

    return value;
}

function escapeCsvValue(value: string) {
    const normalized = value.replace(/"/g, '""');

    return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

function normalizeStatusText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
}

function resolveTonePalette(tone: ExportTone) {
    if (tone === "positive") {
        return {
            fill: "FFE8F5E9",
            font: "FF166534",
            border: "FF86EFAC",
        };
    }

    if (tone === "negative") {
        return {
            fill: "FFFDECEC",
            font: "FFB91C1C",
            border: "FFFCA5A5",
        };
    }

    if (tone === "warning") {
        return {
            fill: "FFFEF3C7",
            font: "FF92400E",
            border: "FFFCD34D",
        };
    }

    return {
        fill: "FFF1F5F9",
        font: "FF475569",
        border: "FFCBD5E1",
    };
}

export function parseExportFormat(value: string | null | undefined, fallback: ExportFormat) {
    if (value === "csv" || value === "xlsx") {
        return value;
    }

    return fallback;
}

export function buildExportSuffix(parts: Array<string | null | undefined>) {
    const sanitized = parts
        .map((part) => (part ?? "").trim())
        .filter(Boolean)
        .map((part) => part
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, ""));

    return sanitized.length > 0 ? `-${sanitized.join("-")}` : "";
}

export function formatExportDate(value: Date) {
    return exportDateFormatter.format(value);
}

export function formatExportTime(value: Date) {
    return exportTimeFormatter.format(value);
}

export function formatExportDateTime(value: Date) {
    return exportDateTimeFormatter.format(value);
}

export function inferStatusTone(value: string): ExportTone {
    const normalized = normalizeStatusText(value);

    if (
        normalized.includes("AUTORIZADO")
        || normalized.includes("PERMITIDO")
        || normalized.includes("ACCESO CORRECTO")
        || normalized.includes("ENTRADA VALIDA")
        || normalized.includes("SALIDA VALIDA")
        || normalized.includes("VALIDO")
        || normalized.includes("VALIDA")
    ) {
        return "positive";
    }

    if (
        normalized.includes("DENEGADO")
        || normalized.includes("SIN PERMISO")
        || normalized.includes("RECHAZADO")
        || normalized.includes("INCONSISTENCIA")
        || normalized.includes("BLOQUEADO")
        || normalized.includes("NO AUTORIZADO")
    ) {
        return "negative";
    }

    if (
        normalized.includes("PENDIENTE")
        || normalized.includes("SIN ESTADO")
        || normalized.includes("SIN CHOFER")
        || normalized.includes("NO INFORMADO")
    ) {
        return "warning";
    }

    return "neutral";
}

export function createCsvExportResponse<Row>({ filename, columns, rows }: CreateTabularExportOptions<Row>) {
    const headers = columns.map((column) => column.header);
    const bodyRows = rows.map((row) => columns.map((column) => normalizeCellValue(column.value(row))));
    const csvContent = [headers, ...bodyRows]
        .map((row) => row.map((value) => escapeCsvValue(String(value))).join(","))
        .join("\n");

    return new NextResponse(`\uFEFF${csvContent}`, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
    });
}

export async function createExcelExportResponse<Row>({
    filename,
    sheetName,
    title,
    subtitle,
    columns,
    rows,
}: CreateExcelExportOptions<Row>) {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ state: "frozen", ySplit: 4 }],
    });
    const totalColumns = Math.max(columns.length, 1);
    const headerRowIndex = 4;

    workbook.creator = "Verix";
    workbook.created = new Date();
    workbook.modified = new Date();

    columns.forEach((column, index) => {
        worksheet.getColumn(index + 1).width = column.width;
    });

    worksheet.mergeCells(1, 1, 1, totalColumns);
    worksheet.getCell(1, 1).value = title;
    worksheet.getRow(1).height = 28;

    for (let columnIndex = 1; columnIndex <= totalColumns; columnIndex += 1) {
        const cell = worksheet.getCell(1, columnIndex);
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF28334F" },
        };
        cell.font = {
            bold: true,
            size: 16,
            color: { argb: "FFFFFFFF" },
        };
        cell.alignment = {
            horizontal: "left",
            vertical: "middle",
        };
    }

    worksheet.mergeCells(2, 1, 2, totalColumns);
    worksheet.getCell(2, 1).value = subtitle ?? `Generado el ${formatExportDateTime(new Date())}`;
    worksheet.getRow(2).height = 22;

    for (let columnIndex = 1; columnIndex <= totalColumns; columnIndex += 1) {
        const cell = worksheet.getCell(2, columnIndex);
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
        };
        cell.font = {
            size: 11,
            color: { argb: "FF475569" },
        };
        cell.alignment = {
            horizontal: "left",
            vertical: "middle",
        };
    }

    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = [undefined, ...columns.map((column) => column.header)];
    headerRow.height = 24;
    headerRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
    };
    headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
    };

    headerRow.eachCell((cell) => {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF475569" },
        };
        cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
    });

    worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: columns.length },
    };

    rows.forEach((row, rowIndex) => {
        const renderedValues = columns.map((column) => normalizeCellValue(column.value(row)));
        const excelRow = worksheet.addRow(renderedValues);
        const isEvenRow = rowIndex % 2 === 1;

        excelRow.height = 22;

        excelRow.eachCell((cell, columnIndex) => {
            const column = columns[columnIndex - 1];
            const rawValue = String(renderedValues[columnIndex - 1] ?? "");
            const tone = column.tone?.(row, rawValue) ?? null;

            cell.alignment = {
                vertical: "middle",
                horizontal: column.alignment ?? "left",
                wrapText: column.wrapText ?? true,
            };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                left: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };

            if (tone) {
                const palette = resolveTonePalette(tone);

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: palette.fill },
                };
                cell.font = {
                    bold: true,
                    color: { argb: palette.font },
                };
                cell.border = {
                    top: { style: "thin", color: { argb: palette.border } },
                    left: { style: "thin", color: { argb: palette.border } },
                    bottom: { style: "thin", color: { argb: palette.border } },
                    right: { style: "thin", color: { argb: palette.border } },
                };

                return;
            }

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: isEvenRow ? "FFF8FAFC" : "FFFFFFFF" },
            };
            cell.font = {
                color: { argb: "FF0F172A" },
            };
        });
    });

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    const responseBody = workbookBuffer instanceof ArrayBuffer
        ? workbookBuffer
        : new Uint8Array(workbookBuffer);

    return new NextResponse(responseBody, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
    });
}