import Link from "next/link";

import { createVehicleAction, deleteVehicleAction } from "@/app/admin/actions";
import { DeleteVehicleButton } from "@/components/admin/delete-vehicle-button";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

type AdminPageProps = {
    searchParams: {
        success?: string | string[];
        error?: string | string[];
    };
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
    const [vehicles, totalVehicles, allowedVehicles] = await Promise.all([
        prisma.vehicle.findMany({
            orderBy: { createdAt: "desc" },
        }),
        prisma.vehicle.count(),
        prisma.vehicle.count({ where: { accessStatus: "YES" } }),
    ]);

    const blockedVehicles = totalVehicles - allowedVehicles;
    const companiesCount = new Set(vehicles.map((vehicle) => vehicle.company)).size;
    const success = getQueryStringValue(searchParams.success);
    const error = getQueryStringValue(searchParams.error);

    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Panel general
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Panel de control de vehiculos
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            Administre altas, ediciones y bloqueos de acceso desde una vista limpia y preparada para operacion diaria.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <a className="button-primary" href="#vehicle-form">
                            Agregar vehiculo
                        </a>
                        <a className="button-secondary" href="#vehicles">
                            Ver vehiculos
                        </a>
                        <Link className="button-secondary" href="/admin/logs">
                            Ver accesos
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Vehiculos totales</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{totalVehicles}</p>
                    <p className="mt-2 text-sm text-slate-500">Base actual de registros habilitados para consulta.</p>
                </div>
                <div className="panel border-green-100 bg-green-50/60 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Con acceso</p>
                    <p className="mt-3 text-4xl font-bold text-green-600">{allowedVehicles}</p>
                    <p className="mt-2 text-sm text-slate-500">Vehiculos configurados para ingreso permitido.</p>
                </div>
                <div className="panel border-red-100 bg-red-50/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Sin acceso</p>
                    <p className="mt-3 text-4xl font-bold text-red-600">{blockedVehicles}</p>
                    <p className="mt-2 text-sm text-slate-500">Patentes registradas con denegacion de entrada.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Empresas</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{companiesCount}</p>
                    <p className="mt-2 text-sm text-slate-500">Organizaciones asociadas a los registros activos.</p>
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

            <section className="panel overflow-hidden scroll-mt-28" id="vehicles">
                <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-slate-50/70 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                            Registros
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                            Gestion de vehiculos
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Visualice cada patente con acciones rapidas de edicion y eliminacion.
                        </p>
                    </div>
                    <Link className="button-secondary" href="/admin/logs">
                        Registros de acceso
                    </Link>
                </div>

                <div className="overflow-x-auto px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                    <table className="min-w-full overflow-hidden rounded-[24px] text-sm">
                        <thead className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Patente</th>
                                <th className="px-6 py-4">Código interno</th>
                                <th className="px-6 py-4">Tipo de vehiculo</th>
                                <th className="px-6 py-4">Marca</th>
                                <th className="px-6 py-4">Empresa</th>
                                <th className="px-6 py-4">Estado de acceso</th>
                                <th className="px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {vehicles.map((vehicle) => (
                                <tr className="transition hover:bg-slate-50/80" key={vehicle.id}>
                                    <td className="px-6 py-5 font-medium text-slate-900">{vehicle.name}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-accent-700">{vehicle.licensePlate}</td>
                                    <td className="px-6 py-5 font-semibold tracking-[0.18em] text-slate-700">{vehicle.codigoInterno}</td>
                                    <td className="px-6 py-5 text-slate-600">{vehicle.vehicleType}</td>
                                    <td className="px-6 py-5 text-slate-600">{vehicle.brand}</td>
                                    <td className="px-6 py-5 text-slate-600">{vehicle.company}</td>
                                    <td className="px-6 py-5">
                                        <span
                                            className={`status-pill ${vehicle.accessStatus === "YES"
                                                ? "bg-green-500 text-white"
                                                : "bg-red-500 text-white"
                                                }`}
                                        >
                                            {vehicle.accessStatus === "YES" ? "PERMITIDO" : "BLOQUEADO"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-wrap gap-3">
                                            <Link className="inline-flex items-center rounded-full bg-accent-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 transition hover:bg-accent-100" href={`/admin/vehicles/${vehicle.id}/edit`}>
                                                Editar
                                            </Link>
                                            <DeleteVehicleButton action={deleteVehicleAction} licensePlate={vehicle.licensePlate} vehicleId={vehicle.id} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {vehicles.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={8}>
                                        No hay vehiculos registrados todavia.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>

            <VehicleForm
                action={createVehicleAction}
                description="Complete la ficha del vehiculo con datos claros para una operacion rapida en porteria y auditoria administrativa."
                heading="Agregar vehiculo"
                id="vehicle-form"
                submitLabel="Guardar vehiculo"
            />
        </div>
    );
}
