import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
    buildExportSuffix,
    createCsvExportResponse,
    createExcelExportResponse,
    formatExportDateTime,
    inferStatusTone,
    parseExportFormat,
    type ExportColumn,
} from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatEstadoRecintoLabel(value: "DENTRO" | "FUERA" | null) {
    if (value === "DENTRO") {
        return "DENTRO";
    }

    if (value === "FUERA") {
        return "FUERA";
    }

    return "Sin estado";
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
    choferes: string;
    rutChoferes: string;
    estadoRecinto: string;
    estadoAcceso: string;
    actualizado: string;
};

const columns = [
    { header: "Patente", key: "patente", width: 16, value: (row) => row.patente },
    { header: "N° interno", key: "numeroInterno", width: 18, value: (row) => row.numeroInterno },
    { header: "Tipo de vehículo", key: "tipoVehiculo", width: 20, value: (row) => row.tipoVehiculo },
    { header: "Marca", key: "marca", width: 18, value: (row) => row.marca },
    { header: "Empresa", key: "empresa", width: 24, value: (row) => row.empresa },
    { header: "Contratista", key: "contratista", width: 28, value: (row) => row.contratista },
    { header: "RUT contratista", key: "rutContratista", width: 18, value: (row) => row.rutContratista },
    { header: "Choferes autorizados", key: "choferes", width: 34, value: (row) => row.choferes, wrapText: true },
    { header: "RUT choferes", key: "rutChoferes", width: 28, value: (row) => row.rutChoferes, wrapText: true },
    { header: "Estado recinto", key: "estadoRecinto", width: 18, value: (row) => row.estadoRecinto, alignment: "center" },
    {
        header: "Estado / resultado",
        key: "estadoAcceso",
        width: 18,
        value: (row) => row.estadoAcceso,
        alignment: "center",
        tone: (_row, value) => inferStatusTone(value),
    },
    { header: "Última actualización", key: "actualizado", width: 22, value: (row) => row.actualizado },
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
            vehiculoChoferes: {
                select: {
                    chofer: {
                        select: {
                            nombre: true,
                            rut: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            { updatedAt: "desc" },
            { licensePlate: "asc" },
        ],
    });

    const rows: VehicleExportRow[] = vehicles.map((vehicle) => {
        const authorizedChoferes = [...vehicle.vehiculoChoferes]
            .sort((left, right) => left.chofer.nombre.localeCompare(right.chofer.nombre, "es-CL"));

        return {
            patente: vehicle.licensePlate,
            numeroInterno: vehicle.codigoInterno,
            tipoVehiculo: vehicle.vehicleType,
            marca: vehicle.brand,
            empresa: vehicle.company,
            contratista: vehicle.contratista?.razonSocial ?? "Sin contratista asociado",
            rutContratista: vehicle.contratista?.rut ?? "Sin RUT",
            choferes: authorizedChoferes.length > 0
                ? authorizedChoferes.map((assignment) => assignment.chofer.nombre).join(" | ")
                : "Sin choferes autorizados",
            rutChoferes: authorizedChoferes.length > 0
                ? authorizedChoferes.map((assignment) => assignment.chofer.rut).join(" | ")
                : "Sin RUT asociado",
            estadoRecinto: formatEstadoRecintoLabel(vehicle.estadoRecinto),
            estadoAcceso: formatAccessStatusLabel(vehicle.accessStatus),
            actualizado: formatExportDateTime(vehicle.updatedAt),
        };
    });

    const filename = `vehiculos-manuales${buildExportSuffix([])}`;

    if (format === "xlsx") {
        return createExcelExportResponse({
            filename,
            sheetName: "Vehículos",
            title: "Padrón vehicular",
            subtitle: `Generado el ${formatExportDateTime(new Date())}. Incluye contratista, choferes autorizados y estado operativo del vehículo.`,
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