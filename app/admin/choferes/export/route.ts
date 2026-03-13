import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
    buildExportSuffix,
    createCsvExportResponse,
    createExcelExportResponse,
    formatExportDateTime,
    parseExportFormat,
    type ExportColumn,
} from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ChoferExportRow = {
    nombre: string;
    rut: string;
    contratista: string;
    codigoInterno: string;
    vehiculosAutorizados: number;
    detalleVehiculos: string;
    creado: string;
    actualizado: string;
};

const columns = [
    { header: "Chofer", key: "nombre", width: 28, value: (row) => row.nombre },
    { header: "RUT chofer", key: "rut", width: 18, value: (row) => row.rut },
    { header: "Contratista", key: "contratista", width: 28, value: (row) => row.contratista },
    { header: "Código interno", key: "codigoInterno", width: 18, value: (row) => row.codigoInterno },
    {
        header: "Vehículos autorizados",
        key: "vehiculosAutorizados",
        width: 18,
        value: (row) => row.vehiculosAutorizados,
        alignment: "center",
    },
    {
        header: "Patentes / N° internos autorizados",
        key: "detalleVehiculos",
        width: 42,
        value: (row) => row.detalleVehiculos,
        wrapText: true,
    },
    { header: "Creado", key: "creado", width: 20, value: (row) => row.creado },
    { header: "Última actualización", key: "actualizado", width: 22, value: (row) => row.actualizado },
] satisfies ExportColumn<ChoferExportRow>[];

export async function GET(request: Request) {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const format = parseExportFormat(searchParams.get("format"), "csv");

    const choferes = await prisma.chofer.findMany({
        include: {
            contratista: {
                select: {
                    razonSocial: true,
                },
            },
            _count: {
                select: {
                    vehiculoChoferes: true,
                },
            },
            vehiculoChoferes: {
                select: {
                    vehiculo: {
                        select: {
                            licensePlate: true,
                            codigoInterno: true,
                        },
                    },
                },
            },
        },
        orderBy: [
            {
                contratista: {
                    razonSocial: "asc",
                },
            },
            { nombre: "asc" },
        ],
    });

    const rows: ChoferExportRow[] = choferes.map((chofer) => {
        const assignedVehicles = [...chofer.vehiculoChoferes]
            .sort((left, right) => left.vehiculo.licensePlate.localeCompare(right.vehiculo.licensePlate, "es-CL"))
            .map((assignment) => `${assignment.vehiculo.licensePlate} (${assignment.vehiculo.codigoInterno})`)
            .join(" | ");

        return {
            nombre: chofer.nombre,
            rut: chofer.rut,
            contratista: chofer.contratista.razonSocial,
            codigoInterno: chofer.codigoInterno ?? "Sin código",
            vehiculosAutorizados: chofer._count.vehiculoChoferes,
            detalleVehiculos: assignedVehicles || "Sin vehículos autorizados",
            creado: formatExportDateTime(chofer.createdAt),
            actualizado: formatExportDateTime(chofer.updatedAt),
        };
    });

    const filename = `choferes-manuales${buildExportSuffix([])}`;

    if (format === "xlsx") {
        return createExcelExportResponse({
            filename,
            sheetName: "Choferes",
            title: "Choferes manuales",
            subtitle: `Generado el ${formatExportDateTime(new Date())}. Incluye contratista, RUT y vehículos donde cada chofer está autorizado.`,
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