import Link from "next/link";

import { deleteVehicleAction } from "@/app/admin/actions";
import { DeleteVehicleButton } from "@/components/admin/delete-vehicle-button";
import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

type VehicleRow = {
    id: number;
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: string;
    contratista: {
        razonSocial: string;
    } | null;
    _count: {
        vehiculoChoferes: number;
    };
};

type VehiculosPageProps = {
    searchParams: {
        success?: string | string[];
        error?: string | string[];
        savedVehicleId?: string | string[];
    };
};

export default async function VehiculosPage({ searchParams }: VehiculosPageProps) {
    const [vehicleRecords, totalVehicles, allowedVehicles, vehiclesWithoutContractor, vehiclesWithoutAuthorizedChoferes] = await Promise.all([
        prisma.vehicle.findMany({
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
            },
            orderBy: [{ licensePlate: "asc" }],
        }),
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { accessStatus: "YES" } }),
        prisma.vehicle.count({ where: { contratistaId: null } }),
        prisma.vehicle.count({ where: { vehiculoChoferes: { none: {} } } }),
    ]);
    const vehicles = vehicleRecords as VehicleRow[];
    const success = getQueryStringValue(searchParams.success);
    const error = getQueryStringValue(searchParams.error);
    const savedVehicleIdValue = Number(getQueryStringValue(searchParams.savedVehicleId));
    const savedVehicleId = Number.isInteger(savedVehicleIdValue) ? savedVehicleIdValue : null;

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Ingreso de vehículo
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Vehículos
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Registre, consulte y mantenga el padrón vehicular con su número interno y el estado de choferes autorizados para la operación real.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin/vehiculos/nuevo">
                            Ingresar vehículo
                        </Link>
                        <a className="button-secondary" href="/admin/vehicles/export?format=xlsx">
                            Exportar Excel
                        </a>
                        <a className="button-secondary" href="/admin/vehicles/export?format=csv">
                            Exportar CSV
                        </a>
                        <Link className="button-secondary" href="/admin/asignaciones">
                            Ver asignaciones
                        </Link>
                        <Link className="button-secondary" href="/admin">
                            Volver al menú
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehículos</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{totalVehicles}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Con acceso</p>
                    <p className="mt-3 text-4xl font-bold text-green-600">{allowedVehicles}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sin choferes autorizados</p>
                    <p className={`mt-3 text-4xl font-bold ${vehiclesWithoutAuthorizedChoferes > 0 ? "text-amber-700" : "text-green-700"}`}>{vehiclesWithoutAuthorizedChoferes}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pendientes de normalizar</p>
                    <p className={`mt-3 text-4xl font-bold ${vehiclesWithoutContractor > 0 ? "text-amber-700" : "text-green-700"}`}>{vehiclesWithoutContractor}</p>
                </div>
            </section>

            {success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {decodeURIComponent(success)}
                </div>
            ) : null}

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {decodeURIComponent(error)}
                </div>
            ) : null}

            <section className="panel overflow-hidden" id="vehiculos">
                <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                            Registro vehicular
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                            Vehículos ingresados
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="topbar-chip">{vehicles.length} registros</span>
                    </div>
                </div>

                {vehicles.length > 0 ? (
                    <div className="overflow-x-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="rounded-l-[20px] px-6 py-4">Patente</th>
                                    <th className="px-6 py-4">Contratista</th>
                                    <th className="px-6 py-4">Marca</th>
                                    <th className="px-6 py-4">Tipo de vehículo</th>
                                    <th className="px-6 py-4">Número interno</th>
                                    <th className="px-6 py-4">Choferes autorizados</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="rounded-r-[20px] px-6 py-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {vehicles.map((vehicle) => {
                                    const isSavedVehicle = savedVehicleId === vehicle.id;

                                    return (
                                        <tr className={`transition hover:bg-slate-50/80 ${isSavedVehicle ? "saved-vehicle-row" : ""}`} id={`vehiculo-${vehicle.id}`} key={vehicle.id}>
                                            <td className="px-6 py-5 font-semibold tracking-[0.18em] text-accent-700">{vehicle.licensePlate}</td>
                                            <td className="px-6 py-5 text-slate-700">{vehicle.contratista?.razonSocial ?? "Sin contratista asociado"}</td>
                                            <td className="px-6 py-5 text-slate-700">{vehicle.brand}</td>
                                            <td className="px-6 py-5 text-slate-700">{vehicle.vehicleType}</td>
                                            <td className="px-6 py-5 font-semibold tracking-[0.16em] text-slate-700">{vehicle.codigoInterno}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${vehicle._count.vehiculoChoferes > 0 ? "bg-accent-50 text-accent-700" : "bg-amber-50 text-amber-700"}`}>
                                                        {vehicle._count.vehiculoChoferes === 1
                                                            ? "1 chofer"
                                                            : `${vehicle._count.vehiculoChoferes} choferes`}
                                                    </span>
                                                    {vehicle._count.vehiculoChoferes === 0 ? (
                                                        <span className="text-xs text-slate-500">Aún sin autorización operativa</span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`status-pill ${vehicle.accessStatus === "YES" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                                                    {vehicle.accessStatus === "YES" ? "PERMITIDO" : "BLOQUEADO"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-2">
                                                    <Link className="inline-flex min-h-[44px] items-center rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-200" href={`/admin/asignaciones?vehicleId=${vehicle.id}#asignaciones`}>
                                                        Asignar choferes
                                                    </Link>
                                                    <Link className="inline-flex min-h-[44px] items-center rounded-full bg-accent-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 transition hover:bg-accent-100" href={`/admin/vehiculos/${vehicle.id}/editar`}>
                                                        Editar
                                                    </Link>
                                                    <DeleteVehicleButton action={deleteVehicleAction} licensePlate={vehicle.licensePlate} vehicleId={vehicle.id} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-16 text-center lg:px-8">
                        <p className="text-lg font-semibold text-slate-900">No hay vehículos ingresados.</p>
                        <p className="mt-2 text-sm text-slate-500">Use Ingresar vehículo para registrar el primero.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
