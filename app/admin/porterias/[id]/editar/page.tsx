import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePorteriaAction } from "@/app/admin/porterias/actions";
import { PorteriaForm } from "@/components/admin/porteria-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type EditarPorteriaPageProps = {
    params: {
        id: string;
    };
    searchParams: {
        error?: string | string[];
    };
};

export default async function EditarPorteriaPage({ params, searchParams }: EditarPorteriaPageProps) {
    await requireRole("ADMIN");

    const id = Number(params.id);

    if (!Number.isInteger(id)) {
        notFound();
    }

    const porteria = await prisma.porteria.findUnique({ where: { id } });

    if (!porteria) {
        notFound();
    }

    const error = getQueryStringValue(searchParams.error);

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden p-0">
                <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-6 py-6 lg:px-8 lg:py-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                                Edición de portería
                            </p>
                            <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                                Actualizar {porteria.nombre}
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Mantenga la ficha del punto de control al día sin alterar los módulos administrativos y operativos ya implementados.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/porterias">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin/porterias/nuevo">
                                Nueva portería
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-3 lg:px-8 lg:py-8">
                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Identificación
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{porteria.nombre}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Punto de control disponible para futuras relaciones con eventos de acceso y operación del recinto.
                        </p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Contacto
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{porteria.telefono ?? "Sin teléfono registrado"}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Mantenga este dato actualizado para coordinación rápida durante la operación diaria.
                        </p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Seguimiento
                        </p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Creado</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDateTime(porteria.createdAt)}</p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Última actualización</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDateTime(porteria.updatedAt)}</p>
                    </div>
                </div>
            </section>

            <PorteriaForm
                action={updatePorteriaAction.bind(null, porteria.id)}
                cancelHref="/admin/porterias"
                defaults={{
                    nombre: porteria.nombre,
                    telefono: porteria.telefono,
                }}
                description="Edite la ficha de la portería con una distribución consistente, clara y compatible con el resto del panel administrativo."
                errorMessage={error}
                heading="Ficha de la portería"
                id="edit-porteria-form"
                submitLabel="Guardar cambios"
            />
        </div>
    );
}