import { Prisma } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import {
    buildCreatedAtFilter,
    formatDateTime,
    getQueryStringValue,
    normalizeLicensePlate,
    parseDateInput,
} from "@/lib/utils";

type AccessLogRow = {
    id: number;
    licensePlate: string;
    codigoInterno: string | null;
    result: string;
    operatorUsername: string | null;
    operatorRole: "ADMIN" | "USER" | null;
    operatorPorteriaNombre: string | null;
    createdAt: Date;
};

type EventoAccesoHistoryRow = {
    id: number;
    fechaHora: Date;
    tipoEvento: "ENTRADA" | "SALIDA";
    operadoPorUsername: string | null;
    operadoPorRole: "ADMIN" | "USER" | null;
    operadoPorPorteriaNombre: string | null;
    vehiculo: {
        licensePlate: string;
        codigoInterno: string;
        estadoRecinto: "DENTRO" | "FUERA" | null;
    };
    contratista: {
        razonSocial: string;
    };
    chofer: {
        nombre: string;
        rut: string;
    } | null;
    porteria: {
        nombre: string;
    };
};

type LogsPageProps = {
    searchParams: {
        plate?: string | string[];
        startDate?: string | string[];
        endDate?: string | string[];
    };
};

export default async function LogsPage({ searchParams }: LogsPageProps) {
    const rawPlate = getQueryStringValue(searchParams.plate) ?? "";
    const plate = normalizeLicensePlate(rawPlate);
    const startDate = parseDateInput(searchParams.startDate);
    const endDate = parseDateInput(searchParams.endDate);

    const where: Prisma.AccessLogWhereInput = {};

    if (plate) {
        where.licensePlate = plate;
    }

    const createdAtFilter = buildCreatedAtFilter(startDate, endDate);

    if (createdAtFilter) {
        where.createdAt = createdAtFilter;
    }

    const whereInput = Object.keys(where).length > 0 ? where : undefined;
    const eventWhere: Prisma.EventoAccesoWhereInput = {};

    if (plate) {
        eventWhere.vehiculo = {
            licensePlate: plate,
        };
    }

    if (createdAtFilter) {
        eventWhere.fechaHora = createdAtFilter;
    }

    const eventWhereInput = Object.keys(eventWhere).length > 0 ? eventWhere : undefined;

    const [eventRecords, logRecords, totalMovements, entradasCount, salidasCount, totalChecks, grantedChecks, deniedChecks] = await Promise.all([
        prisma.eventoAcceso.findMany({
            where: eventWhereInput,
            orderBy: { fechaHora: "desc" },
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
                        codigoInterno: true,
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
        }),
        prisma.accessLog.findMany({
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
        }),
        prisma.eventoAcceso.count({ where: eventWhereInput }),
        prisma.eventoAcceso.count({ where: { ...(eventWhereInput ?? {}), tipoEvento: "ENTRADA" } }),
        prisma.eventoAcceso.count({ where: { ...(eventWhereInput ?? {}), tipoEvento: "SALIDA" } }),
        prisma.accessLog.count({ where: whereInput }),
        prisma.accessLog.count({ where: { ...(whereInput ?? {}), result: "YES" } }),
        prisma.accessLog.count({ where: { ...(whereInput ?? {}), result: "NO" } }),
    ]);
    const movimientos = eventRecords as unknown as EventoAccesoHistoryRow[];
    const logs = logRecords as unknown as AccessLogRow[];

    const exportParams = new URLSearchParams();

    if (plate) {
        exportParams.set("plate", plate);
    }

    if (startDate) {
        exportParams.set("startDate", startDate);
    }

    if (endDate) {
        exportParams.set("endDate", endDate);
    }

    const exportCsvParams = new URLSearchParams(exportParams);
    const exportExcelParams = new URLSearchParams(exportParams);
    const eventExportCsvParams = new URLSearchParams(exportParams);
    const eventExportExcelParams = new URLSearchParams(exportParams);

    exportCsvParams.set("format", "csv");
    exportExcelParams.set("format", "xlsx");
    eventExportCsvParams.set("format", "csv");
    eventExportExcelParams.set("format", "xlsx");

    const exportCsvHref = `/admin/logs/export?${exportCsvParams.toString()}`;
    const exportExcelHref = `/admin/logs/export?${exportExcelParams.toString()}`;
    const eventExportCsvHref = `/admin/eventos-acceso/export?${eventExportCsvParams.toString()}`;
    const eventExportExcelHref = `/admin/eventos-acceso/export?${eventExportExcelParams.toString()}`;
    const hasFilters = Boolean(plate || startDate || endDate);
    const detailedReportParams = new URLSearchParams();

    if (plate) {
        detailedReportParams.set("plate", plate);
    }

    if (startDate) {
        detailedReportParams.set("startDate", startDate);
    }

    if (endDate) {
        detailedReportParams.set("endDate", endDate);
    }

    const detailedReportHref = `/admin/eventos-acceso${detailedReportParams.toString() ? `?${detailedReportParams.toString()}` : ""}`;

    function getEventStatusClasses(tipoEvento: "ENTRADA" | "SALIDA") {
        return tipoEvento === "ENTRADA"
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-sky-50 text-sky-700 border-sky-200";
    }

    function formatEstadoRecinto(value: "DENTRO" | "FUERA" | null) {
        if (value === "DENTRO") {
            return "DENTRO";
        }

        if (value === "FUERA") {
            return "FUERA";
        }

        return "Sin estado";
    }

    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                            Auditoría
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Registro de accesos
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            {plate
                                ? `La patente ${plate} registra ${totalMovements} movimiento${totalMovements === 1 ? "" : "s"} operativos y ${totalChecks} validación${totalChecks === 1 ? "" : "es"} legacy dentro del rango seleccionado.`
                                : "Revise los movimientos operativos guardados en EventoAcceso y, más abajo, la bitácora legacy de validaciones."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href={detailedReportHref}>
                            Ver reporte V2
                        </Link>
                        <a className="button-primary" href={eventExportExcelHref}>
                            Exportar Excel V2
                        </a>
                        <a className="button-secondary" href={eventExportCsvHref}>
                            Exportar CSV V2
                        </a>
                        <a className="button-primary" href={exportExcelHref}>
                            Exportar Excel legacy
                        </a>
                        <a className="button-secondary" href={exportCsvHref}>
                            Exportar CSV legacy
                        </a>
                        {hasFilters ? (
                            <Link className="button-secondary" href="/admin/logs">
                                Limpiar filtros
                            </Link>
                        ) : null}
                    </div>
                </div>

                <form className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" method="get">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                        <label className="field-label" htmlFor="plate">
                            Buscar por patente
                        </label>
                        <input
                            autoCapitalize="characters"
                            className="input-base uppercase tracking-[0.18em]"
                            defaultValue={plate}
                            id="plate"
                            name="plate"
                            placeholder="ABC123"
                            spellCheck={false}
                            type="text"
                        />
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                        <label className="field-label" htmlFor="startDate">
                            Fecha desde
                        </label>
                        <input className="input-base" defaultValue={startDate} id="startDate" name="startDate" type="date" />
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                        <label className="field-label" htmlFor="endDate">
                            Fecha hasta
                        </label>
                        <input className="input-base" defaultValue={endDate} id="endDate" name="endDate" type="date" />
                    </div>

                    <div className="flex items-end">
                        <button className="button-primary w-full lg:min-w-[170px]" type="submit">
                            Aplicar filtros
                        </button>
                    </div>
                </form>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Movimientos V2</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{totalMovements}</p>
                    <p className="mt-2 text-sm text-slate-500">Eventos operativos guardados en EventoAcceso con los filtros activos.</p>
                </div>
                <div className="panel border-green-100 bg-green-50/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Entradas</p>
                    <p className="mt-3 text-4xl font-bold text-green-600">{entradasCount}</p>
                    <p className="mt-2 text-sm text-slate-500">Movimientos ENTRADA guardados en el historial operativo.</p>
                </div>
                <div className="panel border-sky-100 bg-sky-50/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Salidas</p>
                    <p className="mt-3 text-4xl font-bold text-sky-700">{salidasCount}</p>
                    <p className="mt-2 text-sm text-slate-500">Movimientos SALIDA guardados en el historial operativo.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Bitácora legacy</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{totalChecks}</p>
                    <p className="mt-2 text-sm text-slate-500">Validaciones históricas del flujo anterior para mantener compatibilidad.</p>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6">
                    <h3 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        Historial operativo V2
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Esta tabla lee exactamente `EventoAcceso`, la misma fuente donde se guardan ENTRADA y SALIDA desde portería.
                    </p>
                </div>

                <div className="overflow-x-auto px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                    <table className="min-w-full overflow-hidden rounded-[24px] text-sm">
                        <thead className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Patente</th>
                                <th className="px-6 py-4">Contratista</th>
                                <th className="px-6 py-4">Chofer</th>
                                <th className="px-6 py-4">Portería</th>
                                <th className="px-6 py-4">Operador</th>
                                <th className="px-6 py-4">Estado recinto</th>
                                <th className="px-6 py-4">Evento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {movimientos.map((movimiento) => (
                                <tr className="transition hover:bg-slate-50/80" key={movimiento.id}>
                                    <td className="px-6 py-5 text-slate-600">{formatDateTime(movimiento.fechaHora)}</td>
                                    <td className="px-6 py-5 text-slate-700">
                                        <p className="font-semibold tracking-[0.18em] text-accent-700">{movimiento.vehiculo.licensePlate}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{movimiento.vehiculo.codigoInterno}</p>
                                    </td>
                                    <td className="px-6 py-5 text-slate-700">{movimiento.contratista.razonSocial}</td>
                                    <td className="px-6 py-5 text-slate-700">
                                        <p className="font-semibold text-slate-950">{movimiento.chofer?.nombre ?? "Sin chofer"}</p>
                                        <p className="mt-1 text-xs text-slate-500">{movimiento.chofer?.rut ?? "Sin RUT"}</p>
                                    </td>
                                    <td className="px-6 py-5 text-slate-700">{movimiento.porteria.nombre}</td>
                                    <td className="px-6 py-5 text-slate-700">
                                        <p className="font-semibold text-slate-950">{movimiento.operadoPorUsername ?? "No informado"}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                            {movimiento.operadoPorRole === "ADMIN" ? "Administrador" : movimiento.operadoPorRole === "USER" ? "Portería" : "Sin rol"}
                                        </p>
                                        {movimiento.operadoPorPorteriaNombre ? (
                                            <p className="mt-1 text-xs text-slate-500">Cuenta: {movimiento.operadoPorPorteriaNombre}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-6 py-5 text-slate-700">{formatEstadoRecinto(movimiento.vehiculo.estadoRecinto)}</td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${getEventStatusClasses(movimiento.tipoEvento)}`}>
                                            {movimiento.tipoEvento}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {movimientos.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={8}>
                                        No hay movimientos V2 para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel border-green-100 bg-green-50/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Permitidos legacy</p>
                    <p className="mt-3 text-4xl font-bold text-green-600">{grantedChecks}</p>
                    <p className="mt-2 text-sm text-slate-500">Consultas legacy resueltas como permitidas.</p>
                </div>
                <div className="panel border-red-100 bg-red-50/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Denegados legacy</p>
                    <p className="mt-3 text-4xl font-bold text-red-600">{deniedChecks}</p>
                    <p className="mt-2 text-sm text-slate-500">Consultas legacy rechazadas o no registradas.</p>
                </div>
                <div className="panel p-5 md:col-span-2 xl:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Rango activo</p>
                    <p className="mt-3 text-lg font-bold text-slate-950">
                        {startDate || endDate ? `${startDate || "Inicio"} - ${endDate || "Hoy"}` : "Sin filtro"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        {plate ? `Consulta centrada en ${plate}.` : "Vista general de toda la operación registrada."}
                    </p>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6">
                    <h3 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        Bitácora legacy de validaciones
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Esta sección mantiene la auditoría histórica del flujo anterior basada en `AccessLog`.
                    </p>
                </div>

                <div className="overflow-x-auto px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                    <table className="min-w-full overflow-hidden rounded-[24px] text-sm">
                        <thead className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Patente</th>
                                <th className="px-6 py-4">Código interno</th>
                                <th className="px-6 py-4">Operador</th>
                                <th className="px-6 py-4">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {logs.map((log) => (
                                <tr className="transition hover:bg-slate-50/80" key={log.id}>
                                    <td className="px-6 py-5 text-slate-600">{formatDateTime(log.createdAt)}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-accent-700">{log.licensePlate}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-slate-700">{log.codigoInterno ?? "No registrado"}</td>
                                    <td className="px-6 py-5 text-slate-700">
                                        <p className="font-semibold text-slate-950">{log.operatorUsername ?? "No informado"}</p>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                            {log.operatorRole === "ADMIN" ? "Administrador" : log.operatorRole === "USER" ? "Portería" : "Sin rol"}
                                        </p>
                                        {log.operatorPorteriaNombre ? (
                                            <p className="mt-1 text-xs text-slate-500">Cuenta: {log.operatorPorteriaNombre}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span
                                            className={`status-pill ${log.result === "YES"
                                                ? "bg-green-500 text-white"
                                                : "bg-red-500 text-white"
                                                }`}
                                        >
                                            {log.result === "YES" ? "PERMITIDO" : "DENEGADO"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={5}>
                                        No hay registros para los filtros seleccionados.
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
