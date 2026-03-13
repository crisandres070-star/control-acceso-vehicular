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

import {
    buildEventoAccesoWhereInput,
    formatChoferLabel,
    formatEstadoRecintoLabel,
    parseEventoAccesoReportFilters,
} from "../report-helpers";

export const runtime = "nodejs";

type EventoExportRow = {
    fecha: string;
    hora: string;
    patente: string;
    numeroInterno: string;
    empresa: string;
    contratista: string;
    chofer: string;
    rutChofer: string;
    porteria: string;
    tipoVehiculo: string;
    marca: string;
    estado: string;
    resultado: string;
    tipoEvento: string;
    usuarioOperador: string;
    rolOperador: string;
    porteriaOperador: string;
    observacion: string;
};

const columns = [
    { header: "Fecha", key: "fecha", width: 14, value: (row) => row.fecha, alignment: "center" },
    { header: "Hora", key: "hora", width: 12, value: (row) => row.hora, alignment: "center" },
    { header: "Patente", key: "patente", width: 16, value: (row) => row.patente },
    { header: "N° interno", key: "numeroInterno", width: 18, value: (row) => row.numeroInterno },
    { header: "Empresa", key: "empresa", width: 24, value: (row) => row.empresa },
    { header: "Contratista", key: "contratista", width: 28, value: (row) => row.contratista },
    { header: "Chofer", key: "chofer", width: 24, value: (row) => row.chofer },
    { header: "RUT chofer", key: "rutChofer", width: 18, value: (row) => row.rutChofer },
    { header: "Portería", key: "porteria", width: 18, value: (row) => row.porteria },
    { header: "Tipo de vehículo", key: "tipoVehiculo", width: 20, value: (row) => row.tipoVehiculo },
    { header: "Marca", key: "marca", width: 18, value: (row) => row.marca },
    { header: "Estado", key: "estado", width: 16, value: (row) => row.estado, alignment: "center" },
    {
        header: "Resultado",
        key: "resultado",
        width: 18,
        value: (row) => row.resultado,
        alignment: "center",
        tone: (_row, value) => inferStatusTone(value),
    },
    { header: "Tipo de evento", key: "tipoEvento", width: 16, value: (row) => row.tipoEvento, alignment: "center" },
    { header: "Usuario operador", key: "usuarioOperador", width: 24, value: (row) => row.usuarioOperador },
    { header: "Rol operador", key: "rolOperador", width: 16, value: (row) => row.rolOperador, alignment: "center" },
    { header: "Portería asociada operador", key: "porteriaOperador", width: 24, value: (row) => row.porteriaOperador },
    { header: "Observación", key: "observacion", width: 28, value: (row) => row.observacion, wrapText: true },
] satisfies ExportColumn<EventoExportRow>[];

export async function GET(request: Request) {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const filters = parseEventoAccesoReportFilters({
        plate: searchParams.get("plate"),
        contratistaId: searchParams.get("contratistaId"),
        choferId: searchParams.get("choferId"),
        porteriaId: searchParams.get("porteriaId"),
        tipoEvento: searchParams.get("tipoEvento"),
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
    });
    const whereInput = buildEventoAccesoWhereInput(filters);
    const eventos = await prisma.eventoAcceso.findMany({
        where: whereInput,
        select: {
            fechaHora: true,
            tipoEvento: true,
            observacion: true,
            operadoPorUsername: true,
            operadoPorRole: true,
            operadoPorPorteriaNombre: true,
            vehiculo: {
                select: {
                    licensePlate: true,
                    codigoInterno: true,
                    company: true,
                    vehicleType: true,
                    brand: true,
                    estadoRecinto: true,
                },
            },
            contratista: {
                select: {
                    razonSocial: true,
                },
            },
            chofer: {
                select: {
                    nombre: true,
                    rut: true,
                },
            },
            porteria: {
                select: {
                    nombre: true,
                },
            },
        },
        orderBy: {
            fechaHora: "desc",
        },
    });
    const suffixParts = [
        filters.plate,
        filters.tipoEvento ? filters.tipoEvento.toLowerCase() : "",
        filters.startDate ? `desde-${filters.startDate}` : "",
        filters.endDate ? `hasta-${filters.endDate}` : "",
    ].filter(Boolean);
    const format = parseExportFormat(searchParams.get("format"), "csv");
    const rows: EventoExportRow[] = eventos.map((evento) => ({
        fecha: formatExportDate(evento.fechaHora),
        hora: formatExportTime(evento.fechaHora),
        patente: evento.vehiculo.licensePlate,
        numeroInterno: evento.vehiculo.codigoInterno,
        empresa: evento.vehiculo.company,
        contratista: evento.contratista.razonSocial,
        chofer: formatChoferLabel(evento.chofer?.nombre),
        rutChofer: evento.chofer?.rut ?? "Sin RUT informado",
        porteria: evento.porteria.nombre,
        tipoVehiculo: evento.vehiculo.vehicleType,
        marca: evento.vehiculo.brand,
        estado: formatEstadoRecintoLabel(evento.vehiculo.estadoRecinto),
        resultado: evento.tipoEvento === "ENTRADA" ? "Entrada válida" : "Salida válida",
        tipoEvento: evento.tipoEvento,
        usuarioOperador: evento.operadoPorUsername ?? "No informado",
        rolOperador: evento.operadoPorRole === "ADMIN" ? "Administrador" : evento.operadoPorRole === "USER" ? "Portería" : "No informado",
        porteriaOperador: evento.operadoPorPorteriaNombre ?? "Sin asociación",
        observacion: evento.observacion?.trim() || "Sin observación",
    }));
    const suffix = buildExportSuffix(suffixParts);
    const filename = `eventos-acceso-v2${suffix}`;

    if (format === "xlsx") {
        return createExcelExportResponse({
            filename,
            sheetName: "Eventos de acceso",
            title: "Eventos de acceso V2",
            subtitle: `Generado el ${formatExportDateTime(new Date())}. Reporte operativo con vehículo, chofer, portería y resultado del movimiento.`,
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