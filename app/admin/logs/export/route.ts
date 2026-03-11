import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCreatedAtFilter, normalizeLicensePlate, parseDateInput } from "@/lib/utils";

export const runtime = "nodejs";

type AccessLogExportRow = {
    id: number;
    licensePlate: string;
    codigoInterno: string | null;
    name: string;
    result: string;
    createdAt: Date;
};

type VehicleExportLookup = {
    licensePlate: string;
    codigoInterno: string;
    rut: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: string;
};

function formatVehicleValue(value: string | null | undefined) {
    if (!value || value === "Not registered") {
        return "No registrado";
    }

    if (value === "Unknown vehicle") {
        return "Vehículo no registrado";
    }

    return value;
}

function formatResultLabel(result: string) {
    return result === "YES" ? "Permitido" : "Denegado";
}

function formatAccessStatusLabel(accessStatus: string | undefined) {
    if (accessStatus === "YES") {
        return "Permitido";
    }

    if (accessStatus === "NO") {
        return "Denegado";
    }

    return "No registrado";
}

function formatExportDate(value: Date) {
    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "short",
    }).format(value);
}

function formatExportTime(value: Date) {
    return new Intl.DateTimeFormat("es-CL", {
        timeStyle: "short",
    }).format(value);
}

export async function GET(request: Request) {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const plate = normalizeLicensePlate(searchParams.get("plate") ?? "");
    const startDate = parseDateInput(searchParams.get("startDate"));
    const endDate = parseDateInput(searchParams.get("endDate"));

    const where: Prisma.AccessLogWhereInput = {};

    if (plate) {
        where.licensePlate = plate;
    }

    const createdAtFilter = buildCreatedAtFilter(startDate, endDate);

    if (createdAtFilter) {
        where.createdAt = createdAtFilter;
    }

    const whereInput = Object.keys(where).length > 0 ? where : undefined;

    const logRecords = await prisma.accessLog.findMany({
        where: whereInput,
        orderBy: { createdAt: "desc" },
    });
    const logs = logRecords as AccessLogExportRow[];
    const uniquePlates = Array.from(new Set(logs.map((log) => log.licensePlate)));
    const vehicleRecords = uniquePlates.length > 0
        ? await prisma.vehicle.findMany({
            where: { licensePlate: { in: uniquePlates } },
            select: {
                licensePlate: true,
                codigoInterno: true,
                rut: true,
                vehicleType: true,
                brand: true,
                company: true,
                accessStatus: true,
            },
        })
        : [];
    const vehicles = vehicleRecords as VehicleExportLookup[];
    const vehicleByPlate = new Map(
        vehicles.map((vehicle) => [vehicle.licensePlate, vehicle]),
    );

    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    workbook.creator = "Verix";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Bitácora de accesos", {
        views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = [
        { header: "Código interno", key: "codigoInterno", width: 18 },
        { header: "RUT", key: "rut", width: 16 },
        { header: "Nombre", key: "name", width: 28 },
        { header: "Patente", key: "licensePlate", width: 14 },
        { header: "Tipo de vehículo", key: "vehicleType", width: 20 },
        { header: "Marca", key: "brand", width: 18 },
        { header: "Empresa", key: "company", width: 24 },
        { header: "Estado de acceso", key: "accessStatus", width: 18 },
        { header: "Resultado", key: "result", width: 16 },
        { header: "Fecha", key: "date", width: 14 },
        { header: "Hora", key: "time", width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };

    headerRow.eachCell((cell) => {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4E0BD9" },
        };
        cell.border = {
            top: { style: "thin", color: { argb: "FFD9E2EC" } },
            left: { style: "thin", color: { argb: "FFD9E2EC" } },
            bottom: { style: "thin", color: { argb: "FFD9E2EC" } },
            right: { style: "thin", color: { argb: "FFD9E2EC" } },
        };
    });

    worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
    };

    for (const log of logs) {
        const vehicle = vehicleByPlate.get(log.licensePlate);
        const isGranted = log.result === "YES";
        const row = worksheet.addRow({
            codigoInterno: formatVehicleValue(log.codigoInterno ?? vehicle?.codigoInterno),
            rut: formatVehicleValue(vehicle?.rut),
            name: formatVehicleValue(log.name),
            licensePlate: formatVehicleValue(log.licensePlate),
            vehicleType: formatVehicleValue(vehicle?.vehicleType),
            brand: formatVehicleValue(vehicle?.brand),
            company: formatVehicleValue(vehicle?.company),
            accessStatus: formatAccessStatusLabel(vehicle?.accessStatus),
            result: formatResultLabel(log.result),
            date: formatExportDate(log.createdAt),
            time: formatExportTime(log.createdAt),
        });

        row.eachCell((cell, columnNumber) => {
            cell.alignment = {
                vertical: "middle",
                horizontal: columnNumber >= 8 ? "center" : "left",
            };
            cell.border = {
                top: { style: "thin", color: { argb: "FFE2E8F0" } },
                left: { style: "thin", color: { argb: "FFE2E8F0" } },
                bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                right: { style: "thin", color: { argb: "FFE2E8F0" } },
            };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: isGranted ? "FFE8F5E9" : "FFFDECEC" },
            };
        });

        row.getCell(9).font = {
            bold: true,
            color: { argb: isGranted ? "FF166534" : "FFB91C1C" },
        };
    }

    const suffixParts = [
        plate,
        startDate ? `from-${startDate}` : "",
        endDate ? `to-${endDate}` : "",
    ].filter(Boolean);
    const suffix = suffixParts.length > 0 ? `-${suffixParts.join("-")}` : "";
    const workbookBuffer = await workbook.xlsx.writeBuffer();
    const responseBody = workbookBuffer instanceof ArrayBuffer
        ? workbookBuffer
        : new Uint8Array(workbookBuffer);

    return new NextResponse(responseBody, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="bitacora-accesos${suffix}.xlsx"`,
        },
    });
}
