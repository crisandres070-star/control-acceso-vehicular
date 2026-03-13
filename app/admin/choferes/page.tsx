import Link from "next/link";

import { deleteChoferAction } from "@/app/admin/choferes/actions";
import { DeleteChoferButton } from "@/components/admin/delete-chofer-button";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type ChoferRow = {
    id: number;
    contratistaId: number;
    nombre: string;
    rut: string;
    codigoInterno: string | null;
    updatedAt: Date;
    contratista: {
        razonSocial: string;
    };
    _count: {
        vehiculoChoferes: number;
    };
};

type ChoferesPageProps = {
    searchParams: {
        success?: string | string[];
        error?: string | string[];
        savedChoferId?: string | string[];
    };
};

export default async function ChoferesPage({ searchParams }: ChoferesPageProps) {
    const choferRecords = await prisma.chofer.findMany({
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
        orderBy: [{ nombre: "asc" }],
    });
    const choferes = choferRecords as ChoferRow[];

    const success = getQueryStringValue(searchParams.success);
    const error = getQueryStringValue(searchParams.error);
    const savedChoferIdValue = Number(getQueryStringValue(searchParams.savedChoferId));
    const savedChoferId = Number.isInteger(savedChoferIdValue) ? savedChoferIdValue : null;

    const distinctContratistasCount = new Set(choferes.map((item) => item.contratistaId)).size;
    const withAssignedVehiclesCount = choferes.filter((item) => item._count.vehiculoChoferes > 0).length;
    const withoutAssignedVehiclesCount = choferes.length - withAssignedVehiclesCount;

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Ingreso de chofer
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Choferes
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Ingrese y mantenga choferes asociados a contratistas. Luego autorícelos en uno o varios vehículos desde el módulo de asignaciones.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin/choferes/nuevo">
                            Ingresar chofer
                        </Link>
                        <a className="button-secondary" href="/admin/choferes/export?format=xlsx">
                            Exportar Excel
                        </a>
                        <a className="button-secondary" href="/admin/choferes/export?format=csv">
                            Exportar CSV
                        </a>
                        <Link className="button-secondary" href="/admin">
                            Volver al menú
                        </Link>
                    </div>
                </div>

                <div className="border-t border-slate-200/70 bg-slate-50/60 px-6 py-4 lg:px-8">
                    <div className="flex flex-wrap gap-2">
                        <span className="topbar-chip">Total {choferes.length}</span>
                        <span className="topbar-chip">Con vehículos autorizados {withAssignedVehiclesCount}</span>
                        <span className="topbar-chip">Sin autorizaciones {withoutAssignedVehiclesCount}</span>
                        <span className="topbar-chip">Contratistas vinculados {distinctContratistasCount}</span>
                    </div>
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

            <section className="panel overflow-hidden" id="choferes">
                <div className="border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:px-8">
                    <h2 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                        Listado de choferes
                    </h2>
                </div>

                <div className="overflow-x-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="rounded-l-[20px] px-6 py-4">Contratista</th>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">RUT</th>
                                <th className="px-6 py-4">Vehículos autorizados</th>
                                <th className="px-6 py-4">Actualizado</th>
                                <th className="rounded-r-[20px] px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {choferes.map((chofer) => {
                                const isSaved = savedChoferId === chofer.id;

                                return (
                                    <tr className={`transition hover:bg-slate-50/80 ${isSaved ? "saved-row" : ""}`} id={`chofer-${chofer.id}`} key={chofer.id}>
                                        <td className="px-6 py-5 text-slate-700">{chofer.contratista.razonSocial}</td>
                                        <td className="px-6 py-5">
                                            <p className="font-semibold text-slate-950">{chofer.nombre}</p>
                                            {chofer.codigoInterno ? (
                                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                                    Dato interno opcional: {chofer.codigoInterno}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-5 font-semibold tracking-[0.14em] text-accent-700">{chofer.rut}</td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${chofer._count.vehiculoChoferes > 0 ? "bg-accent-50 text-accent-700" : "bg-slate-100 text-slate-600"}`}>
                                                {chofer._count.vehiculoChoferes === 1
                                                    ? "1 vehículo"
                                                    : `${chofer._count.vehiculoChoferes} vehículos`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-slate-600">{formatDateTime(chofer.updatedAt)}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                <Link className="inline-flex min-h-[44px] items-center rounded-full bg-accent-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 transition hover:bg-accent-100" href={`/admin/choferes/${chofer.id}/editar`}>
                                                    Editar
                                                </Link>
                                                <DeleteChoferButton action={deleteChoferAction} choferId={chofer.id} nombre={chofer.nombre} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {choferes.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={6}>
                                        No hay choferes ingresados todavía.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
