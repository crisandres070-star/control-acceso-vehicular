import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
    buildExportSuffix,
    createCsvExportResponse,
    createExcelExportResponse,
    formatExportDate,
    formatExportDateTime,
    formatExportTime,
    parseExportFormat,
    type ExportColumn,
} from "@/lib/export-utils";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ContratistaExportRow = {
    razonSocial: string;
    rut: string;
    email: string;
    contacto: string;
    telefono: string;
    vehiculosRelacionados: number;
    choferesRelacionados: number;
    fechaCreacion: string;
    horaCreacion: string;
    fechaActualizacion: string;
    horaActualizacion: string;
};

const columns = [
    { header: "Razón social", key: "razonSocial", width: 32, value: (row) => row.razonSocial },
    { header: "RUT", key: "rut", width: 18, value: (row) => row.rut },
    { header: "Email", key: "email", width: 28, value: (row) => row.email },
    { header: "Contacto", key: "contacto", width: 24, value: (row) => row.contacto },
    { header: "Teléfono", key: "telefono", width: 18, value: (row) => row.telefono },
    {
        header: "Vehículos relacionados",
        key: "vehiculosRelacionados",
        width: 18,
        value: (row) => row.vehiculosRelacionados,
        alignment: "center",
    },
    {
        header: "Choferes relacionados",
        key: "choferesRelacionados",
        width: 18,
        value: (row) => row.choferesRelacionados,
        alignment: "center",
    },
    { header: "Fecha creación", key: "fechaCreacion", width: 16, value: (row) => row.fechaCreacion, alignment: "center" },
    { header: "Hora creación", key: "horaCreacion", width: 14, value: (row) => row.horaCreacion, alignment: "center" },
    { header: "Fecha actualización", key: "fechaActualizacion", width: 18, value: (row) => row.fechaActualizacion, alignment: "center" },
    { header: "Hora actualización", key: "horaActualizacion", width: 16, value: (row) => row.horaActualizacion, alignment: "center" },
] satisfies ExportColumn<ContratistaExportRow>[];

export async function GET(request: Request) {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const format = parseExportFormat(searchParams.get("format"), "csv");

    const contratistas = await prisma.contratista.findMany({
        include: {
            _count: {
                select: {
                    vehiculos: true,
                    choferes: true,
                },
            },
        },
        orderBy: [{ razonSocial: "asc" }],
    });

    const rows: ContratistaExportRow[] = contratistas.map((contratista) => ({
        razonSocial: contratista.razonSocial,
        rut: contratista.rut,
        email: contratista.email ?? "Sin email",
        contacto: contratista.contacto ?? "Sin contacto",
        telefono: contratista.telefono ?? "Sin teléfono",
        vehiculosRelacionados: contratista._count.vehiculos,
        choferesRelacionados: contratista._count.choferes,
        fechaCreacion: formatExportDate(contratista.createdAt),
        horaCreacion: formatExportTime(contratista.createdAt),
        fechaActualizacion: formatExportDate(contratista.updatedAt),
        horaActualizacion: formatExportTime(contratista.updatedAt),
    }));

    const filename = `contratistas-manuales${buildExportSuffix([])}`;

    if (format === "xlsx") {
        return createExcelExportResponse({
            filename,
            sheetName: "Contratistas",
            title: "Contratistas manuales",
            subtitle: `Generado el ${formatExportDateTime(new Date())}. Incluye datos de contacto y volumen de relación con choferes y vehículos.`,
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