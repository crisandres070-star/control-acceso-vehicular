import Link from "next/link";
import { notFound } from "next/navigation";

import { updateContratistaAction } from "@/app/admin/contratistas/actions";
import { ContratistaForm } from "@/components/admin/contratista-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type EditableContratista = {
    id: number;
    razonSocial: string;
    rut: string;
    email: string | null;
    contacto: string | null;
    telefono: string | null;
    createdAt: Date;
    updatedAt: Date;
};

type EditarContratistaPageProps = {
    params: {
        id: string;
    };
    searchParams: {
        error?: string | string[];
    };
};

export default async function EditarContratistaPage({ params, searchParams }: EditarContratistaPageProps) {
    await requireRole("ADMIN");

    const id = Number(params.id);

    if (!Number.isInteger(id)) {
        notFound();
    }

    const contratistaRecord = await prisma.contratista.findUnique({ where: { id } });
    const contratista = contratistaRecord as EditableContratista | null;

    if (!contratista) {
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
                                Edición de contratista
                            </p>
                            <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                                Actualizar {contratista.razonSocial}
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Mantenga la ficha administrativa al día sin romper el flujo manual actual ni las relaciones operativas ya consolidadas.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/contratistas">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin/contratistas/nuevo">
                                Nuevo contratista
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-3 lg:px-8 lg:py-8">
                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Identificación
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{contratista.razonSocial}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RUT</p>
                        <p className="mt-2 font-semibold tracking-[0.14em] text-accent-700">{contratista.rut}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Ficha base usada hoy para relacionar vehículos, choferes, asignaciones y eventos de acceso.
                        </p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Contacto principal
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{contratista.contacto ?? "Sin contacto registrado"}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email</p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{contratista.email ?? "Sin email"}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Teléfono</p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{contratista.telefono ?? "Sin teléfono"}</p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Seguimiento
                        </p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Creado</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDateTime(contratista.createdAt)}</p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Última actualización</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDateTime(contratista.updatedAt)}</p>
                    </div>
                </div>
            </section>

            <ContratistaForm
                action={updateContratistaAction.bind(null, contratista.id)}
                cancelHref="/admin/contratistas"
                defaults={{
                    razonSocial: contratista.razonSocial,
                    rut: contratista.rut,
                    email: contratista.email,
                    contacto: contratista.contacto,
                    telefono: contratista.telefono,
                }}
                description="Edite la información del contratista con una distribución clara, compatible con el resto del panel y lista para la operación manual diaria."
                errorMessage={error}
                heading="Ficha del contratista"
                id="edit-contratista-form"
                submitLabel="Guardar cambios"
            />
        </div>
    );
}