import Link from "next/link";
import { notFound } from "next/navigation";

import { updateVehicleAction } from "@/app/admin/actions";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type EditableVehicle = {
    id: number;
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: string;
    createdAt: Date;
    contratistaId: number | null;
    contratista: {
        razonSocial: string;
    } | null;
};

type ContratistaOption = {
    id: number;
    razonSocial: string;
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

    const [vehicleRecord, contratistaRecords] = await Promise.all([
        prisma.vehicle.findUnique({
            where: { id },
            include: {
                contratista: {
                    select: {
                        razonSocial: true,
                    },
                },
            },
        }),
        prisma.contratista.findMany({
            orderBy: [{ razonSocial: "asc" }],
            select: {
                id: true,
                razonSocial: true,
            },
        }),
    ]);
    const vehicle = vehicleRecord as EditableVehicle | null;
    const contratistas = contratistaRecords as ContratistaOption[];

    if (!vehicle) {
        notFound();
    }

    const error = getQueryStringValue(searchParams.error);
    const accessLabel = vehicle.accessStatus === "YES" ? "Acceso habilitado" : "Acceso bloqueado";
    const accessClasses = vehicle.accessStatus === "YES"
        ? "border-green-200 bg-green-50/80 text-green-700"
        : "border-red-200 bg-red-50/80 text-red-700";
    const contratistaClasses = vehicle.contratista
        ? "border-accent-100 bg-accent-50/70 text-accent-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
    const contratistaLabel = vehicle.contratista?.razonSocial ?? "Sin contratista asociado";

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden p-0">
                <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-6 py-6 lg:px-8 lg:py-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                                Vehículo manual
                            </p>
                            <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                                Actualizar vehículo {vehicle.licensePlate}
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Revise la ficha, confirme la empresa responsable y deje el vehículo coherente con el flujo de portería, historial y dashboard.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/vehiculos">
                                Volver al listado
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-3 lg:px-8 lg:py-8">
                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Identificación
                        </p>
                        <p className="mt-3 text-xl font-semibold tracking-[0.18em] text-slate-950">{vehicle.licensePlate}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Número interno</p>
                        <p className="mt-2 font-semibold tracking-[0.18em] text-slate-700">{vehicle.codigoInterno}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Creado</p>
                        <p className="mt-2 font-semibold text-slate-700">{formatDateTime(vehicle.createdAt)}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Registro operativo listo para control, historial y seguimiento administrativo.
                        </p>
                    </div>

                    <div className={`rounded-[28px] border p-5 shadow-sm ${contratistaClasses}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                            Contratista asociado
                        </p>
                        <p className="mt-3 text-xl font-semibold">{contratistaLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-current/80">
                            {vehicle.contratista
                                ? "La referencia de empresa del vehículo ya está alineada con el contratista seleccionado."
                                : `Este registro aún conserva la referencia histórica ${vehicle.company}. Seleccione ahora el contratista correcto para normalizarlo.`}
                        </p>
                    </div>

                    <div className={`rounded-[28px] border p-5 shadow-sm ${accessClasses}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                            Estado actual
                        </p>
                        <p className="mt-3 text-xl font-semibold">{accessLabel}</p>
                        <p className="mt-2 text-sm leading-6 text-current/80">
                            Puede ajustar este permiso sin modificar el flujo de validación ni el historial de accesos.
                        </p>
                    </div>
                </div>
            </section>

            <VehicleForm
                action={updateVehicleAction.bind(null, vehicle.id)}
                cancelHref="/admin/vehiculos"
                contratistas={contratistas}
                defaults={{
                    contratistaId: vehicle.contratistaId,
                    licensePlate: vehicle.licensePlate,
                    codigoInterno: vehicle.codigoInterno,
                    vehicleType: vehicle.vehicleType,
                    brand: vehicle.brand,
                    company: vehicle.company,
                    accessStatus: vehicle.accessStatus,
                }}
                description="Edite la ficha con una estructura clara para mantener patente, contratista y estado de acceso listos para operación."
                errorMessage={error}
                heading="Ficha del vehículo"
                id="edit-vehicle-form"
                submitLabel="Guardar cambios"
            />
        </div>
    );
}
