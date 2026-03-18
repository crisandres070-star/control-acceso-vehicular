import Link from "next/link";

import { createVehicleAction } from "@/app/admin/actions";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

type NuevoVehiculoPageProps = {
    searchParams: {
        error?: string | string[];
    };
};

export default async function NuevoVehiculoPage({ searchParams }: NuevoVehiculoPageProps) {
    const error = getQueryStringValue(searchParams.error);
    const contratistas = await prisma.contratista.findMany({
        orderBy: [{ razonSocial: "asc" }],
        select: {
            id: true,
            razonSocial: true,
        },
    });

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden p-0">
                <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-6 py-6 lg:px-8 lg:py-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                                Nuevo registro
                            </p>
                            <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                                Ingreso de vehículo
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Complete manualmente la información del vehículo, incluido su número interno, y relaciónelo con su contratista para dejarlo disponible en el sistema.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/vehiculos">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin">
                                Menú administración
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <VehicleForm
                action={createVehicleAction}
                cancelHref="/admin/vehiculos"
                contratistas={contratistas}
                description="Ingrese empresa, patente, número interno, tipo de vehículo y marca para dejar el registro listo para portería, historial y dashboard."
                errorMessage={error}
                heading="Datos del vehículo"
                id="vehiculo-form"
                submitLabel="Guardar vehículo"
            />
        </div>
    );
}
