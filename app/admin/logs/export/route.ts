import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
    buildExportSuffix,
    createCsvExportResponse,
    createExcelExportResponse,
    formatExportDate,
    formatExportDateTime,
    formatExportTime,
    inferStatusTone,
    parseExportFormat,
    type ExportColumn,
} from "@/lib/export-utils";
import { getOperationalPorteriaName } from "@/lib/porterias";
import { prisma } from "@/lib/prisma";
import { buildCreatedAtFilter, normalizeLicensePlate, parseDateInput } from "@/lib/utils";

export const runtime = "nodejs";

type AccessLogExportRow = {
    id: number;
    licensePlate: string;
    codigoInterno: string | null;
    result: string;
    operatorUsername: string | null;
    operatorRole: "ADMIN" | "USER" | null;
    operatorPorteriaNombre: string | null;
    createdAt: Date;
};

type VehicleExportLookup = {
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: string;
    contratista: {
        razonSocial: string;
    } | null;
};

type AccessLogSheetRow = {
    fecha: string;
    hora: string;
    patente: string;
    numeroInterno: string;
    empresa: string;
    contratista: string;
    porteria: string;
    tipoVehiculo: string;
    marca: string;
    estadoAcceso: string;
    resultado: string;
    tipoEvento: string;
    usuarioOperador: string;
    rolOperador: string;
    porteriaOperador: string;
};

const columns = [
    { header: "Fecha", key: "fecha", width: 14, value: (row) => row.fecha, alignment: "center" },
    { header: "Hora", key: "hora", width: 12, value: (row) => row.hora, alignment: "center" },
    { header: "Patente", key: "patente", width: 16, value: (row) => row.patente },
    { header: "N° interno", key: "numeroInterno", width: 18, value: (row) => row.numeroInterno },
    { header: "Empresa", key: "empresa", width: 24, value: (row) => row.empresa },
    { header: "Contratista", key: "contratista", width: 28, value: (row) => row.contratista },
    { header: "Portería", key: "porteria", width: 18, value: (row) => row.porteria },
    { header: "Tipo de vehículo", key: "tipoVehiculo", width: 20, value: (row) => row.tipoVehiculo },
    { header: "Marca", key: "marca", width: 18, value: (row) => row.marca },
    {
        header: "Estado / resultado",
        key: "estadoAcceso",
        width: 18,
        value: (row) => row.estadoAcceso,
        alignment: "center",
        tone: (_row, value) => inferStatusTone(value),
    },
    {
        header: "Resultado final",
        key: "resultado",
        width: 18,
        value: (row) => row.resultado,
        alignment: "center",
        tone: (_row, value) => inferStatusTone(value),
    },
    { header: "Tipo de evento", key: "tipoEvento", width: 20, value: (row) => row.tipoEvento, alignment: "center" },
    { header: "Usuario operador", key: "usuarioOperador", width: 24, value: (row) => row.usuarioOperador },
    { header: "Rol operador", key: "rolOperador", width: 16, value: (row) => row.rolOperador, alignment: "center" },
    { header: "Portería asociada operador", key: "porteriaOperador", width: 24, value: (row) => row.porteriaOperador },
] satisfies ExportColumn<AccessLogSheetRow>[];

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
    const format = parseExportFormat(searchParams.get("format"), "xlsx");

    const logRecords = await prisma.accessLog.findMany({
        where: whereInput,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            licensePlate: true,
            codigoInterno: true,
            result: true,
            operatorUsername: true,
            operatorRole: true,
            operatorPorteriaNombre: true,
            createdAt: true,
        },
    });
    const logs = logRecords as unknown as AccessLogExportRow[];
    const uniquePlates = Array.from(new Set(logs.map((log) => log.licensePlate)));
    const vehicleRecords = uniquePlates.length > 0
        ? await prisma.vehicle.findMany({
            where: { licensePlate: { in: uniquePlates } },
            select: {
                licensePlate: true,
                codigoInterno: true,
                vehicleType: true,
                brand: true,
                company: true,
                accessStatus: true,
                contratista: {
                    select: {
                        razonSocial: true,
                    },
                },
            },
        })
        : [];
    const vehicles = vehicleRecords as VehicleExportLookup[];
    const vehicleByPlate = new Map(
        vehicles.map((vehicle) => [vehicle.licensePlate, vehicle]),
    );

    const suffixParts = [
        plate,
        startDate ? `from-${startDate}` : "",
        endDate ? `to-${endDate}` : "",
    ].filter(Boolean);
    const suffix = buildExportSuffix(suffixParts);
    const filename = `bitacora-accesos${suffix}`;
    const rows: AccessLogSheetRow[] = logs.map((log) => {
        const vehicle = vehicleByPlate.get(log.licensePlate);

        return {
            fecha: formatExportDate(log.createdAt),
            hora: formatExportTime(log.createdAt),
            patente: formatVehicleValue(log.licensePlate),
            numeroInterno: formatVehicleValue(log.codigoInterno ?? vehicle?.codigoInterno),
            empresa: formatVehicleValue(vehicle?.company),
            contratista: vehicle?.contratista?.razonSocial ?? "No informado",
            porteria: "No informada",
            tipoVehiculo: formatVehicleValue(vehicle?.vehicleType),
            marca: formatVehicleValue(vehicle?.brand),
            estadoAcceso: formatAccessStatusLabel(vehicle?.accessStatus),
            resultado: formatResultLabel(log.result),
            tipoEvento: "Validación de acceso",
            usuarioOperador: log.operatorUsername ?? "No informado",
            rolOperador: log.operatorRole === "ADMIN" ? "Administrador" : log.operatorRole === "USER" ? "Portería" : "No informado",
            porteriaOperador: log.operatorPorteriaNombre
                ? getOperationalPorteriaName(log.operatorPorteriaNombre)
                : "Sin asociación",
        };
    });

    if (format === "csv") {
        return createCsvExportResponse({
            filename,
            columns,
            rows,
        });
    }

    return createExcelExportResponse({
        filename,
        sheetName: "Bitácora de accesos",
        title: "Bitácora de accesos",
        subtitle: `Generado el ${formatExportDateTime(new Date())}. Consolidado de validaciones legacy con información del vehículo relacionada cuando existe.`,
        columns,
        rows,
    });
}
