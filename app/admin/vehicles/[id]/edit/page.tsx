import Link from "next/link";
import { notFound } from "next/navigation";

import { updateVehicleAction } from "@/app/admin/actions";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

type EditableVehicle = {
    id: number;
    name: string;
    licensePlate: string;
    codigoInterno: string;
    rut: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: string;
    createdAt: Date;
};

type EditVehiclePageProps = {
    params: {
        id: string;
    };
    searchParams: {
        error?: string | string[];
    };
};

export default async function EditVehiclePage({ params, searchParams }: EditVehiclePageProps) {
    await requireRole("ADMIN");

    const id = Number(params.id);

    if (!Number.isInteger(id)) {
        notFound();
    }

    const vehicleRecord = await prisma.vehicle.findUnique({ where: { id } });
    const vehicle = vehicleRecord as EditableVehicle | null;

    if (!vehicle) {
        notFound();
    }

    const error = getQueryStringValue(searchParams.error);
    const accessLabel = vehicle.accessStatus === "YES" ? "Acceso habilitado" : "Acceso bloqueado";
    const accessClasses = vehicle.accessStatus === "YES"
        ? "border-green-200 bg-green-50/80 text-green-700"
        : "border-red-200 bg-red-50/80 text-red-700";

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden p-0">
                <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-6 py-6 lg:px-8 lg:py-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                                Edicion de vehiculo
                            </p>
                            <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                                Actualizar vehiculo {vehicle.licensePlate}
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Revise la ficha del vehiculo, mantenga la informacion operativa al dia y conserve una experiencia consistente con el resto del panel administrativo.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin#vehicles">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin/logs">
                                Ver bitacora
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-3 lg:px-8 lg:py-8">
                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Responsable
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{vehicle.name}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Código interno</p>
                        <p className="mt-2 font-semibold tracking-[0.18em] text-slate-700">{vehicle.codigoInterno}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RUT</p>
                        <p className="mt-2 font-semibold tracking-[0.12em] text-slate-700">{vehicle.rut}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Registro asociado a {vehicle.company} para control y seguimiento administrativo.
                        </p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Clasificacion
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{vehicle.vehicleType}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Marca registrada: {vehicle.brand}. Mantenga esta ficha precisa para una validacion visual mas rapida.
                        </p>
                    </div>

                    <div className={`rounded-[28px] border p-5 shadow-sm ${accessClasses}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                            Estado actual
                        </p>
                        <p className="mt-3 text-xl font-semibold">{accessLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-current/80">
                            Puede ajustar este permiso sin modificar el flujo de validacion ni el historial de accesos.
                        </p>
                    </div>
                </div>
            </section>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {decodeURIComponent(error)}
                </div>
            ) : null}

            <VehicleForm
                action={updateVehicleAction.bind(null, vehicle.id)}
                cancelHref="/admin#vehicles"
                defaults={{
                    name: vehicle.name,
                    licensePlate: vehicle.licensePlate,
                    codigoInterno: vehicle.codigoInterno,
                    rut: vehicle.rut,
                    vehicleType: vehicle.vehicleType,
                    brand: vehicle.brand,
                    company: vehicle.company,
                    accessStatus: vehicle.accessStatus,
                }}
                description="Edite la ficha con una estructura clara, etiquetas mas legibles y una distribucion coherente con el panel administrativo principal."
                heading="Ficha del vehiculo"
                submitLabel="Guardar cambios"
            />
        </div>
    );
}
