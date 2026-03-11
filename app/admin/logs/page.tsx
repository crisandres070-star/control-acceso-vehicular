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

    const [logs, totalChecks, grantedChecks, deniedChecks] = await Promise.all([
        prisma.accessLog.findMany({
            where: whereInput,
            orderBy: { createdAt: "desc" },
        }),
        prisma.accessLog.count({ where: whereInput }),
        prisma.accessLog.count({ where: { ...(whereInput ?? {}), result: "YES" } }),
        prisma.accessLog.count({ where: { ...(whereInput ?? {}), result: "NO" } }),
    ]);

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

    const exportHref = exportParams.toString()
        ? `/admin/logs/export?${exportParams.toString()}`
        : "/admin/logs/export";
    const hasFilters = Boolean(plate || startDate || endDate);

    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                            Auditoria
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Registro de accesos
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            {plate
                                ? `La patente ${plate} registra ${totalChecks} consulta${totalChecks === 1 ? "" : "s"} dentro del rango seleccionado.`
                                : "Revise cada validacion realizada en porteria y exporte la bitacora cuando necesite reportes."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <a className="button-primary" download href={exportHref}>
                            Exportar CSV
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
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Total registros</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{totalChecks}</p>
                    <p className="mt-2 text-sm text-slate-500">Resultado acumulado segun los filtros activos.</p>
                </div>
                <div className="panel border-green-100 bg-green-50/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Permitidos</p>
                    <p className="mt-3 text-4xl font-bold text-green-600">{grantedChecks}</p>
                    <p className="mt-2 text-sm text-slate-500">Entradas autorizadas en el periodo consultado.</p>
                </div>
                <div className="panel border-red-100 bg-red-50/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Denegados</p>
                    <p className="mt-3 text-4xl font-bold text-red-600">{deniedChecks}</p>
                    <p className="mt-2 text-sm text-slate-500">Intentos rechazados o patentes no registradas.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Rango activo</p>
                    <p className="mt-3 text-lg font-bold text-slate-950">
                        {startDate || endDate ? `${startDate || "Inicio"} - ${endDate || "Hoy"}` : "Sin filtro"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        {plate ? `Consulta centrada en ${plate}.` : "Vista general de toda la operacion registrada."}
                    </p>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6">
                    <h3 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        Historial de accesos
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Cada consulta queda registrada con fecha, patente, Código interno, nombre y resultado final.
                    </p>
                </div>

                <div className="overflow-x-auto px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                    <table className="min-w-full overflow-hidden rounded-[24px] text-sm">
                        <thead className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Patente</th>
                                <th className="px-6 py-4">Código interno</th>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Resultado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {logs.map((log) => (
                                <tr className="transition hover:bg-slate-50/80" key={log.id}>
                                    <td className="px-6 py-5 text-slate-600">{formatDateTime(log.createdAt)}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-accent-700">{log.licensePlate}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-slate-700">{log.codigoInterno ?? "No registrado"}</td>
                                    <td className="px-6 py-5 text-slate-700">{log.name}</td>
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
