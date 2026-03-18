import type { FaenaDashboardVehicleRow } from "@/lib/dashboard/faena";
import { formatDateTime } from "@/lib/utils";

type FaenaVehiclesTableProps = {
    title: string;
    description: string;
    state: "EN_FAENA" | "FUERA_DE_FAENA" | "EN_TRANSITO";
    rows: FaenaDashboardVehicleRow[];
};

function getStateClasses(state: "EN_FAENA" | "FUERA_DE_FAENA" | "EN_TRANSITO") {
    if (state === "EN_FAENA") {
        return "bg-green-100 text-green-700";
    }

    if (state === "EN_TRANSITO") {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-sky-100 text-sky-700";
}

function getStateLabel(state: "EN_FAENA" | "FUERA_DE_FAENA" | "EN_TRANSITO") {
    if (state === "EN_FAENA") {
        return "EN FAENA";
    }

    if (state === "FUERA_DE_FAENA") {
        return "FUERA DE FAENA";
    }

    if (state === "EN_TRANSITO") {
        return "EN TRÁNSITO";
    }

    return state;
}

export function FaenaVehiclesTable({ title, description, state, rows }: FaenaVehiclesTableProps) {
    return (
        <section className="panel overflow-hidden">
            <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-5 lg:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Estado {getStateLabel(state)}</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
            </div>

            {rows.length === 0 ? (
                <div className="px-6 py-6 text-sm text-slate-600 lg:px-8">
                    No hay vehículos para este estado con los filtros actuales.
                </div>
            ) : (
                <div className="overflow-x-auto px-2 py-3 lg:px-4">
                    <table className="min-w-full border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <th className="px-4 py-2">Patente</th>
                                <th className="px-4 py-2">Contratista</th>
                                <th className="px-4 py-2">Tipo vehículo</th>
                                <th className="px-4 py-2">Última portería</th>
                                <th className="px-4 py-2">Último movimiento</th>
                                <th className="px-4 py-2">Estado actual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr className="rounded-2xl border border-slate-200 bg-white shadow-sm" key={row.id}>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.licensePlate}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{row.companyName}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">{row.vehicleType}</td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                        {row.ultimaPorteriaNombre ?? "Sin registro"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700">
                                        {row.ultimoMovimientoAt
                                            ? `${row.ultimoMovimientoTipo ?? "Movimiento"} · ${formatDateTime(row.ultimoMovimientoAt)}`
                                            : "Sin movimientos"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${getStateClasses(row.estadoOperativo)}`}>
                                            {getStateLabel(row.estadoOperativo)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
