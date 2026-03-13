import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

import {
    buildEventoAccesoExportSearchParams,
    buildEventoAccesoWhereInput,
    buildTodayDateRange,
    formatChoferLabel,
    formatEstadoRecintoLabel,
    parseEventoAccesoReportFilters,
} from "./report-helpers";

type EventoAccesoRow = {
    id: number;
    fechaHora: Date;
    tipoEvento: "ENTRADA" | "SALIDA";
    operadoPorUsername: string | null;
    operadoPorRole: "ADMIN" | "USER" | null;
    operadoPorPorteriaNombre: string | null;
    vehiculo: {
        licensePlate: string;
        estadoRecinto: "DENTRO" | "FUERA" | null;
    };
    contratista: {
        razonSocial: string;
    };
    chofer: {
        nombre: string;
    } | null;
    porteria: {
        nombre: string;
    };
};

type ContratistaOption = {
    id: number;
    razonSocial: string;
};

type ChoferOption = {
    id: number;
    nombre: string;
    contratista: {
        razonSocial: string;
    };
};

type PorteriaOption = {
    id: number;
    nombre: string;
};

type EventosAccesoPageProps = {
    searchParams: {
        plate?: string | string[];
        contratistaId?: string | string[];
        choferId?: string | string[];
        porteriaId?: string | string[];
        tipoEvento?: string | string[];
        startDate?: string | string[];
        endDate?: string | string[];
    };
};

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
});

function getStatusClasses(tipoEvento: "ENTRADA" | "SALIDA") {
    return tipoEvento === "ENTRADA"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-sky-50 text-sky-700 border-sky-200";
}

export default async function EventosAccesoPage({ searchParams }: EventosAccesoPageProps) {
    const filters = parseEventoAccesoReportFilters({
        plate: getQueryStringValue(searchParams.plate),
        contratistaId: getQueryStringValue(searchParams.contratistaId),
        choferId: getQueryStringValue(searchParams.choferId),
        porteriaId: getQueryStringValue(searchParams.porteriaId),
        tipoEvento: getQueryStringValue(searchParams.tipoEvento),
        startDate: getQueryStringValue(searchParams.startDate),
        endDate: getQueryStringValue(searchParams.endDate),
    });
    const whereInput = buildEventoAccesoWhereInput(filters);
    const todayDateRange = buildTodayDateRange();

    const [
        eventRecords,
        contratistaRecords,
        choferRecords,
        porteriaRecords,
        eventosHoy,
        entradasHoy,
        salidasHoy,
        vehiculosDentro,
        vehiculosFuera,
    ] = await Promise.all([
        prisma.eventoAcceso.findMany({
            where: whereInput,
            select: {
                id: true,
                fechaHora: true,
                tipoEvento: true,
                operadoPorUsername: true,
                operadoPorRole: true,
                operadoPorPorteriaNombre: true,
                vehiculo: {
                    select: {
                        licensePlate: true,
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
        }),
        prisma.contratista.findMany({
            select: {
                id: true,
                razonSocial: true,
            },
            orderBy: {
                razonSocial: "asc",
            },
        }),
        prisma.chofer.findMany({
            select: {
                id: true,
                nombre: true,
                contratista: {
                    select: {
                        razonSocial: true,
                    },
                },
            },
            orderBy: {
                nombre: "asc",
            },
        }),
        prisma.porteria.findMany({
            select: {
                id: true,
                nombre: true,
            },
            orderBy: {
                nombre: "asc",
            },
        }),
        prisma.eventoAcceso.count({
            where: {
                fechaHora: todayDateRange,
            },
        }),
        prisma.eventoAcceso.count({
            where: {
                fechaHora: todayDateRange,
                tipoEvento: "ENTRADA",
            },
        }),
        prisma.eventoAcceso.count({
            where: {
                fechaHora: todayDateRange,
                tipoEvento: "SALIDA",
            },
        }),
        prisma.vehicle.count({
            where: {
                estadoRecinto: "DENTRO",
            },
        }),
        prisma.vehicle.count({
            where: {
                estadoRecinto: "FUERA",
            },
        }),
    ]);

    const eventos = eventRecords as unknown as EventoAccesoRow[];
    const contratistas = contratistaRecords as ContratistaOption[];
    const choferes = choferRecords as ChoferOption[];
    const porterias = porteriaRecords as PorteriaOption[];
    const hasFilters = Boolean(
        filters.plate
        || filters.contratistaId
        || filters.choferId
        || filters.porteriaId
        || filters.tipoEvento
        || filters.startDate
        || filters.endDate,
    );
    const exportSearchParams = buildEventoAccesoExportSearchParams(filters);
    const exportCsvSearchParams = new URLSearchParams(exportSearchParams);
    const exportExcelSearchParams = new URLSearchParams(exportSearchParams);

    exportCsvSearchParams.set("format", "csv");
    exportExcelSearchParams.set("format", "xlsx");

    const exportCsvHref = `/admin/eventos-acceso/export?${exportCsvSearchParams.toString()}`;
    const exportExcelHref = `/admin/eventos-acceso/export?${exportExcelSearchParams.toString()}`;

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Búsqueda / reporte
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Seguimiento y reportes
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Busque movimientos por patente, contratista, chofer o portería y exporte la información cuando lo necesite.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <a className="button-primary" href={exportExcelHref}>
                            Exportar Excel
                        </a>
                        <a className="button-secondary" href={exportCsvHref}>
                            Exportar CSV
                        </a>
                        <Link className="button-secondary" href="/admin/control-acceso-v2">
                            Seguimiento en línea
                        </Link>
                        <Link className="button-secondary" href="/admin">
                            Volver al menú
                        </Link>
                    </div>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:px-8">
                    <h2 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                        Filtros de búsqueda
                    </h2>
                </div>

                <form className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4 lg:px-8 lg:py-8" method="get">
                    <div className="space-y-2 xl:col-span-2">
                        <label className="field-label" htmlFor="plate">
                            Patente
                        </label>
                        <input
                            autoCapitalize="characters"
                            className="input-base uppercase tracking-[0.18em]"
                            defaultValue={filters.plate}
                            id="plate"
                            name="plate"
                            placeholder="ABC123"
                            spellCheck={false}
                            type="text"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="field-label" htmlFor="contratistaId">
                            Contratista
                        </label>
                        <select className="input-base" defaultValue={filters.contratistaId ? String(filters.contratistaId) : ""} id="contratistaId" name="contratistaId">
                            <option value="">Todos los contratistas</option>
                            {contratistas.map((contratista) => (
                                <option key={contratista.id} value={contratista.id}>
                                    {contratista.razonSocial}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="field-label" htmlFor="choferId">
                            Chofer
                        </label>
                        <select className="input-base" defaultValue={filters.choferId ? String(filters.choferId) : ""} id="choferId" name="choferId">
                            <option value="">Todos los choferes</option>
                            {choferes.map((chofer) => (
                                <option key={chofer.id} value={chofer.id}>
                                    {chofer.nombre} · {chofer.contratista.razonSocial}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="field-label" htmlFor="porteriaId">
                            Portería
                        </label>
                        <select className="input-base" defaultValue={filters.porteriaId ? String(filters.porteriaId) : ""} id="porteriaId" name="porteriaId">
                            <option value="">Todas las porterías</option>
                            {porterias.map((porteria) => (
                                <option key={porteria.id} value={porteria.id}>
                                    {porteria.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="field-label" htmlFor="tipoEvento">
                            Status
                        </label>
                        <select className="input-base" defaultValue={filters.tipoEvento} id="tipoEvento" name="tipoEvento">
                            <option value="">Todos</option>
                            <option value="ENTRADA">ENTRADA</option>
                            <option value="SALIDA">SALIDA</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="field-label" htmlFor="startDate">
                            Fecha desde
                        </label>
                        <input className="input-base" defaultValue={filters.startDate} id="startDate" name="startDate" type="date" />
                    </div>

                    <div className="space-y-2">
                        <label className="field-label" htmlFor="endDate">
                            Fecha hasta
                        </label>
                        <input className="input-base" defaultValue={filters.endDate} id="endDate" name="endDate" type="date" />
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <button className="button-primary flex-1" type="submit">
                            Buscar
                        </button>
                        {hasFilters ? (
                            <Link className="button-secondary flex-1" href="/admin/eventos-acceso">
                                Limpiar
                            </Link>
                        ) : null}
                    </div>
                </form>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Eventos de hoy</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{eventosHoy}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Entradas</p>
                    <p className="mt-3 text-4xl font-bold text-green-600">{entradasHoy}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Salidas</p>
                    <p className="mt-3 text-4xl font-bold text-sky-700">{salidasHoy}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estado del recinto</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">Dentro: {vehiculosDentro}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">Fuera: {vehiculosFuera}</p>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:px-8">
                    <h2 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                        Resultados
                    </h2>
                </div>

                <div className="overflow-x-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="rounded-l-[20px] px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Hora</th>
                                <th className="px-6 py-4">Patente</th>
                                <th className="px-6 py-4">Contratista</th>
                                <th className="px-6 py-4">Chofer</th>
                                <th className="px-6 py-4">Portería</th>
                                <th className="px-6 py-4">Operador</th>
                                <th className="rounded-r-[20px] px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {eventos.map((evento) => (
                                <tr className="transition hover:bg-slate-50/80" key={evento.id}>
                                    <td className="px-6 py-5 text-slate-700">{dateFormatter.format(evento.fechaHora)}</td>
                                    <td className="px-6 py-5 text-slate-700">{timeFormatter.format(evento.fechaHora)}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-accent-700">{evento.vehiculo.licensePlate}</td>
                                    <td className="px-6 py-5 text-slate-700">{evento.contratista.razonSocial}</td>
                                    <td className="px-6 py-5 text-slate-700">{formatChoferLabel(evento.chofer?.nombre)}</td>
                                    <td className="px-6 py-5 text-slate-700">{evento.porteria.nombre}</td>
                                    <td className="px-6 py-5 text-slate-700">
                                        <p className="font-semibold text-slate-950">{evento.operadoPorUsername ?? "No informado"}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                            {evento.operadoPorRole === "ADMIN" ? "Administrador" : evento.operadoPorRole === "USER" ? "Portería" : "Sin rol"}
                                        </p>
                                        {evento.operadoPorPorteriaNombre ? (
                                            <p className="mt-1 text-xs text-slate-500">Cuenta: {evento.operadoPorPorteriaNombre}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-2">
                                            <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getStatusClasses(evento.tipoEvento)}`}>
                                                {evento.tipoEvento}
                                            </span>
                                            <p className="text-xs text-slate-500">{formatEstadoRecintoLabel(evento.vehiculo.estadoRecinto)}</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {eventos.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={8}>
                                        No hay resultados para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
