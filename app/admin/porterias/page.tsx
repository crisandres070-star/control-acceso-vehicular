import Link from "next/link";

import { deletePorteriaAction } from "@/app/admin/porterias/actions";
import { DeletePorteriaButton } from "@/components/admin/delete-porteria-button";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type PorteriaRow = {
    id: number;
    nombre: string;
    telefono: string | null;
    updatedAt: Date;
};

type PorteriasPageProps = {
    searchParams: {
        success?: string | string[];
        error?: string | string[];
        savedPorteriaId?: string | string[];
    };
};

export default async function PorteriasPage({ searchParams }: PorteriasPageProps) {
    const porteriaRecords = await prisma.porteria.findMany({
        orderBy: [{ nombre: "asc" }],
    });
    const porterias = porteriaRecords as PorteriaRow[];

    const success = getQueryStringValue(searchParams.success);
    const error = getQueryStringValue(searchParams.error);
    const savedPorteriaIdValue = Number(getQueryStringValue(searchParams.savedPorteriaId));
    const savedPorteriaId = Number.isInteger(savedPorteriaIdValue) ? savedPorteriaIdValue : null;
    const withTelefonoCount = porterias.filter((item) => item.telefono).length;

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Ingreso de portería
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Porterías
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Ingrese y mantenga los puntos de control utilizados por el sistema para el seguimiento de accesos.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin/porterias/nuevo">
                            Ingresar portería
                        </Link>
                        <Link className="button-secondary" href="/admin">
                            Volver al menú
                        </Link>
                    </div>
                </div>

                <div className="border-t border-slate-200/70 bg-slate-50/60 px-6 py-4 lg:px-8">
                    <div className="flex flex-wrap gap-2">
                        <span className="topbar-chip">Total {porterias.length}</span>
                        <span className="topbar-chip">Con teléfono {withTelefonoCount}</span>
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

            <section className="panel overflow-hidden" id="porterias">
                <div className="border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:px-8">
                    <h2 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                        Listado de porterías
                    </h2>
                </div>

                <div className="overflow-x-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="rounded-l-[20px] px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Teléfono</th>
                                <th className="px-6 py-4">Actualizado</th>
                                <th className="rounded-r-[20px] px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {porterias.map((porteria) => {
                                const isSaved = savedPorteriaId === porteria.id;

                                return (
                                    <tr className={`transition hover:bg-slate-50/80 ${isSaved ? "saved-row" : ""}`} id={`porteria-${porteria.id}`} key={porteria.id}>
                                        <td className="px-6 py-5 font-semibold text-slate-950">{porteria.nombre}</td>
                                        <td className="px-6 py-5 text-slate-600">{porteria.telefono ?? "-"}</td>
                                        <td className="px-6 py-5 text-slate-600">{formatDateTime(porteria.updatedAt)}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                <Link className="inline-flex min-h-[44px] items-center rounded-full bg-accent-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 transition hover:bg-accent-100" href={`/admin/porterias/${porteria.id}/editar`}>
                                                    Editar
                                                </Link>
                                                <DeletePorteriaButton action={deletePorteriaAction} nombre={porteria.nombre} porteriaId={porteria.id} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {porterias.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={4}>
                                        No hay porterías ingresadas todavía.
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
