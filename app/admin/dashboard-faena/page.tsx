import Link from "next/link";

import { FaenaStats } from "@/components/admin/dashboard/faena-stats";
import { FaenaVehiclesTable } from "@/components/admin/dashboard/faena-vehicles-table";
import { requireRole } from "@/lib/auth";
import {
    type EstadoFaenaFilter,
    getFaenaDashboardData,
} from "@/lib/dashboard/faena";
import { getQueryStringValue } from "@/lib/utils";

type DashboardFaenaPageProps = {
    searchParams: {
        plate?: string | string[];
        contratistaId?: string | string[];
        estado?: string | string[];
    };
};

function parseEstadoFilter(value: string | undefined): EstadoFaenaFilter {
    if (value === "EN_FAENA" || value === "FUERA_DE_FAENA" || value === "EN_TRANSITO") {
        return value;
    }

    return "TODOS";
}

function parseContratistaFilter(value: string | undefined) {
    if (!value) {
        return null;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function DashboardFaenaPage({ searchParams }: DashboardFaenaPageProps) {
    await requireRole("ADMIN");

    const plate = String(getQueryStringValue(searchParams.plate) ?? "").trim();
    const estado = parseEstadoFilter(getQueryStringValue(searchParams.estado));
    const contratistaId = parseContratistaFilter(getQueryStringValue(searchParams.contratistaId));

    const data = await getFaenaDashboardData({
        plate,
        estado,
        contratistaId,
    });

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Dashboard de faena
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Estado actual del parque vehicular
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Visualice en tiempo real quién está en faena, fuera de faena o en tránsito según el ciclo
                            actual de 3 entradas y 3 salidas registradas por portería.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-secondary" href="/admin/control-acceso-v2">
                            Ir a control de acceso
                        </Link>
                        <Link className="button-secondary" href="/admin/eventos-acceso">
                            Ver eventos
                        </Link>
                        <Link className="button-secondary" href="/admin/importaciones/vehiculos">
                            Importar vehiculos
                        </Link>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-8">
                <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px_220px_auto_auto] xl:items-end" method="get">
                    <div>
                        <label className="field-label" htmlFor="dashboard-faena-plate">
                            Buscar por patente
                        </label>
                        <input
                            className="input-base"
                            id="dashboard-faena-plate"
                            name="plate"
                            placeholder="Ej: BBBL21"
                            type="text"
                            defaultValue={plate}
                        />
                    </div>

                    <div>
                        <label className="field-label" htmlFor="dashboard-faena-company">
                            Empresa
                        </label>
                        <select
                            className="input-base"
                            defaultValue={contratistaId ? String(contratistaId) : ""}
                            id="dashboard-faena-company"
                            name="contratistaId"
                        >
                            <option value="">Todas</option>
                            {data.options.contratistas.map((contratista) => (
                                <option key={contratista.id} value={contratista.id}>
                                    {contratista.razonSocial}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="field-label" htmlFor="dashboard-faena-state">
                            Estado
                        </label>
                        <select className="input-base" defaultValue={estado} id="dashboard-faena-state" name="estado">
                            <option value="TODOS">Todos</option>
                            <option value="EN_FAENA">En faena</option>
                            <option value="EN_TRANSITO">En tránsito</option>
                            <option value="FUERA_DE_FAENA">Fuera de faena</option>
                        </select>
                    </div>

                    <button className="button-primary" type="submit">
                        Aplicar filtros
                    </button>

                    <Link className="button-secondary" href="/admin/dashboard-faena">
                        Limpiar
                    </Link>
                </form>
            </section>

            <FaenaStats
                enFaenaVehicles={data.stats.enFaenaVehicles}
                fueraFaenaVehicles={data.stats.fueraFaenaVehicles}
                transitVehicles={data.stats.transitVehicles}
                totalVehicles={data.stats.totalVehicles}
            />

            {estado !== "FUERA_DE_FAENA" && estado !== "EN_TRANSITO" ? (
                <FaenaVehiclesTable
                    description={`Vehículos con 3 entradas registradas en su ciclo actual. Total listado: ${data.rows.enFaena.length}.`}
                    rows={data.rows.enFaena}
                    state="EN_FAENA"
                    title="Vehículos en faena"
                />
            ) : null}

            {estado !== "EN_FAENA" && estado !== "FUERA_DE_FAENA" ? (
                <FaenaVehiclesTable
                    description={`Vehículos con un ciclo abierto que aún no completa sus 3 entradas o 3 salidas. Total listado: ${data.rows.transit.length}.`}
                    rows={data.rows.transit}
                    state="EN_TRANSITO"
                    title="Vehículos en tránsito"
                />
            ) : null}

            {estado !== "EN_FAENA" && estado !== "EN_TRANSITO" ? (
                <FaenaVehiclesTable
                    description={`Vehículos fuera de faena o sin movimientos todavía. Total listado: ${data.rows.fueraFaena.length}.`}
                    rows={data.rows.fueraFaena}
                    state="FUERA_DE_FAENA"
                    title="Vehículos fuera de faena"
                />
            ) : null}
        </div>
    );
}
