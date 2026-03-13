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

type ContratistaExportRow = {
    razonSocial: string;
    rut: string;
    email: string;
    contacto: string;
    telefono: string;
    vehiculosRelacionados: number;
    choferesRelacionados: number;
    creado: string;
    actualizado: string;
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
    { header: "Creado", key: "creado", width: 20, value: (row) => row.creado },
    { header: "Última actualización", key: "actualizado", width: 22, value: (row) => row.actualizado },
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
        creado: formatExportDateTime(contratista.createdAt),
        actualizado: formatExportDateTime(contratista.updatedAt),
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