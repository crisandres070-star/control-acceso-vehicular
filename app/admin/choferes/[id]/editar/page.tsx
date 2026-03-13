import Link from "next/link";
import { notFound } from "next/navigation";

import { updateChoferAction } from "@/app/admin/choferes/actions";
import { ChoferForm } from "@/components/admin/chofer-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type EditarChoferPageProps = {
    params: {
        id: string;
    };
    searchParams: {
        error?: string | string[];
    };
};

export default async function EditarChoferPage({ params, searchParams }: EditarChoferPageProps) {
    await requireRole("ADMIN");

    const id = Number(params.id);

    if (!Number.isInteger(id)) {
        notFound();
    }

    const [chofer, contratistas] = await Promise.all([
        prisma.chofer.findUnique({
            where: { id },
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
        }),
        prisma.contratista.findMany({
            orderBy: [{ razonSocial: "asc" }],
            select: {
                id: true,
                razonSocial: true,
            },
        }),
    ]);

    if (!chofer) {
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
                                Edición de chofer
                            </p>
                            <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                                Actualizar {chofer.nombre}
                            </h2>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                                Mantenga la ficha del chofer alineada con su empresa. El número interno operativo sigue perteneciendo al vehículo y las autorizaciones se administran por asignación.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link className="button-secondary" href="/admin/choferes">
                                Volver al listado
                            </Link>
                            <Link className="button-primary" href="/admin/choferes/nuevo">
                                Nuevo chofer
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-3 lg:px-8 lg:py-8">
                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Identificación
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{chofer.nombre}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">RUT</p>
                        <p className="mt-2 font-semibold tracking-[0.14em] text-accent-700">{chofer.rut}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Registro listo para asignaciones manuales y operación diaria en control de acceso.
                        </p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Vinculación
                        </p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">{chofer.contratista.razonSocial}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehículos autorizados</p>
                        <p className="mt-2 text-sm font-medium tracking-[0.18em] text-slate-700">
                            {chofer._count.vehiculoChoferes === 1
                                ? "1 vehículo"
                                : `${chofer._count.vehiculoChoferes} vehículos`}
                        </p>
                        {chofer.codigoInterno ? (
                            <p className="mt-3 text-sm text-slate-500">
                                Dato interno opcional: {chofer.codigoInterno}
                            </p>
                        ) : null}
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Seguimiento
                        </p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Creado</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDateTime(chofer.createdAt)}</p>
                        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Última actualización</p>
                        <p className="mt-2 text-base font-semibold text-slate-950">{formatDateTime(chofer.updatedAt)}</p>
                    </div>
                </div>
            </section>

            <ChoferForm
                action={updateChoferAction.bind(null, chofer.id)}
                cancelHref="/admin/choferes"
                contratistas={contratistas}
                defaults={{
                    contratistaId: chofer.contratistaId,
                    nombre: chofer.nombre,
                    rut: chofer.rut,
                    codigoInterno: chofer.codigoInterno,
                }}
                description="Edite nombre, RUT y empresa. Si existe, el código interno del chofer queda como dato opcional y secundario."
                errorMessage={error}
                heading="Ficha del chofer"
                id="edit-chofer-form"
                submitLabel="Guardar cambios"
            />
        </div>
    );
}