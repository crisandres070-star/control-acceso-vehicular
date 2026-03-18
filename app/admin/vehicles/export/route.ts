import { type EstadoRecintoVehiculo } from "@prisma/client";
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
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatEstadoRecintoLabel(value: EstadoRecintoVehiculo | null) {
    if (value === "DENTRO") {
        return "EN FAENA";
    }

    if (value === "EN_TRANSITO") {
        return "EN TRÁNSITO";
    }

    return "FUERA DE FAENA";
}

function formatAccessStatusLabel(value: string) {
    return value === "YES" ? "Permitido" : "Bloqueado";
}

type VehicleExportRow = {
    patente: string;
    numeroInterno: string;
    tipoVehiculo: string;
    marca: string;
    empresa: string;
    contratista: string;
    rutContratista: string;
    estadoRecinto: string;
    estadoAcceso: string;
    fechaActualizacion: string;
    horaActualizacion: string;
};

const columns = [
    { header: "Patente", key: "patente", width: 16, value: (row) => row.patente },
    { header: "N° interno", key: "numeroInterno", width: 18, value: (row) => row.numeroInterno },
    { header: "Tipo de vehículo", key: "tipoVehiculo", width: 20, value: (row) => row.tipoVehiculo },
    { header: "Marca", key: "marca", width: 18, value: (row) => row.marca },
    { header: "Empresa", key: "empresa", width: 24, value: (row) => row.empresa },
    { header: "Contratista", key: "contratista", width: 28, value: (row) => row.contratista },
    { header: "RUT contratista", key: "rutContratista", width: 18, value: (row) => row.rutContratista },
    { header: "Estado recinto", key: "estadoRecinto", width: 18, value: (row) => row.estadoRecinto, alignment: "center" },
    {
        header: "Estado / resultado",
        key: "estadoAcceso",
        width: 18,
        value: (row) => row.estadoAcceso,
        alignment: "center",
        tone: (_row, value) => inferStatusTone(value),
    },
    { header: "Fecha actualización", key: "fechaActualizacion", width: 18, value: (row) => row.fechaActualizacion, alignment: "center" },
    { header: "Hora actualización", key: "horaActualizacion", width: 16, value: (row) => row.horaActualizacion, alignment: "center" },
] satisfies ExportColumn<VehicleExportRow>[];

export async function GET(request: Request) {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const format = parseExportFormat(searchParams.get("format"), "csv");

    const vehicles = await prisma.vehicle.findMany({
        include: {
            contratista: {
                select: {
                    razonSocial: true,
                    rut: true,
                },
            },
        },
        orderBy: [
            { updatedAt: "desc" },
            { licensePlate: "asc" },
        ],
    });

    const rows: VehicleExportRow[] = vehicles.map((vehicle) => ({
        patente: vehicle.licensePlate,
        numeroInterno: vehicle.codigoInterno,
        tipoVehiculo: vehicle.vehicleType,
        marca: vehicle.brand,
        empresa: vehicle.company,
        contratista: vehicle.contratista?.razonSocial ?? "Sin contratista asociado",
        rutContratista: vehicle.contratista?.rut ?? "Sin RUT",
        estadoRecinto: formatEstadoRecintoLabel(vehicle.estadoRecinto),
        estadoAcceso: formatAccessStatusLabel(vehicle.accessStatus),
        fechaActualizacion: formatExportDate(vehicle.updatedAt),
        horaActualizacion: formatExportTime(vehicle.updatedAt),
    }));

    const filename = `vehiculos-manuales${buildExportSuffix([])}`;

    if (format === "xlsx") {
        return createExcelExportResponse({
            filename,
            sheetName: "Vehículos",
            title: "Padrón vehicular",
            subtitle: `Generado el ${formatExportDateTime(new Date())}. Incluye contratista y estado operativo actual del vehículo.`,
            columns,
            rows,
        });
    }

    return createCsvExportResponse({
        filename,
        columns,
        rows,
    });
}