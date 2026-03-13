import Link from "next/link";

import {
    createChoferAction,
    createQuickContratistaForChoferAction,
} from "@/app/admin/choferes/actions";
import { ChoferForm } from "@/components/admin/chofer-form";
import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

type NuevoChoferPageProps = {
    searchParams: {
        error?: string | string[];
    };
};

export default async function NuevoChoferPage({ searchParams }: NuevoChoferPageProps) {
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
                                Crear chofer
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Registre un chofer y su relación obligatoria con un contratista. El número interno operativo queda en el vehículo; aquí solo puede mantener un dato interno opcional si su operación realmente lo usa.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/choferes">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin/contratistas">
                                Ver contratistas
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {contratistas.length === 0 ? (
                <section className="panel p-6 lg:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                        Flujo unificado
                    </p>
                    <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        Puede crear el contratista sin salir de esta pantalla
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        El chofer seguirá quedando asociado obligatoriamente a un contratista, pero ahora puede crear esa empresa en línea y continuar de inmediato con el alta.
                    </p>
                </section>

            ) : null}

            <ChoferForm
                action={createChoferAction}
                cancelHref="/admin/choferes"
                contratistas={contratistas}
                description="Complete nombre, RUT y empresa. Después podrá autorizar este chofer en uno o varios vehículos desde asignaciones."
                errorMessage={error}
                heading="Ficha del chofer"
                id="chofer-form"
                quickCreateContratistaAction={createQuickContratistaForChoferAction}
                submitLabel="Guardar chofer"
            />
        </div>
    );
}