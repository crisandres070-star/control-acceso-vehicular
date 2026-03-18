import Link from "next/link";

import { createContratistaAction } from "@/app/admin/contratistas/actions";
import { ContratistaForm } from "@/components/admin/contratista-form";
import { getQueryStringValue } from "@/lib/utils";

type NuevoContratistaPageProps = {
    searchParams: {
        error?: string | string[];
    };
};

export default function NuevoContratistaPage({ searchParams }: NuevoContratistaPageProps) {
    const error = getQueryStringValue(searchParams.error);

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
                                Crear contratista
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Ingrese la información base para resolver casos puntuales sin volver a subir el Excel completo.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/contratistas">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin">
                                Ir al panel
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <ContratistaForm
                action={createContratistaAction}
                cancelHref="/admin/contratistas"
                description="Complete los datos principales del contratista con una ficha clara y consistente, compatible con la importación autónoma por Excel."
                errorMessage={error}
                heading="Ficha del contratista"
                id="contratista-form"
                submitLabel="Guardar contratista"
            />
        </div>
    );
}