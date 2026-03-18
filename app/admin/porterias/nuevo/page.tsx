import Link from "next/link";

import { createPorteriaAction } from "@/app/admin/porterias/actions";
import { PorteriaForm } from "@/components/admin/porteria-form";
import { getQueryStringValue } from "@/lib/utils";

type NuevaPorteriaPageProps = {
    searchParams: {
        error?: string | string[];
    };
};

export default function NuevaPorteriaPage({ searchParams }: NuevaPorteriaPageProps) {
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
                                Crear portería
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Registre un nuevo punto de control sin alterar los módulos operativos ya existentes del sistema. Use los nombres reales de operación cuando corresponda.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/porterias">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin">
                                Ir al panel
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <PorteriaForm
                action={createPorteriaAction}
                cancelHref="/admin/porterias"
                description="Complete la ficha de la portería con una estructura clara, consistente y compatible con el resto del panel administrativo."
                errorMessage={error}
                heading="Ficha de la portería"
                id="porteria-form"
                submitLabel="Guardar portería"
            />
        </div>
    );
}