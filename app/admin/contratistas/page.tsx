import Link from "next/link";

import { deleteContratistaAction } from "@/app/admin/contratistas/actions";
import { DeleteContratistaButton } from "@/components/admin/delete-contratista-button";
import { prisma } from "@/lib/prisma";
import { formatDateTime, getQueryStringValue } from "@/lib/utils";

type ContratistaRow = {
    id: number;
    razonSocial: string;
    rut: string;
    email: string | null;
    contacto: string | null;
    telefono: string | null;
    updatedAt: Date;
};

type ContratistasPageProps = {
    searchParams: {
        success?: string | string[];
        error?: string | string[];
        savedContratistaId?: string | string[];
    };
};

export default async function ContratistasPage({ searchParams }: ContratistasPageProps) {
    const contratistaRecords = await prisma.contratista.findMany({
        orderBy: [{ razonSocial: "asc" }],
    });
    const contratistas = contratistaRecords as ContratistaRow[];

    const success = getQueryStringValue(searchParams.success);
    const error = getQueryStringValue(searchParams.error);
    const savedContratistaIdValue = Number(getQueryStringValue(searchParams.savedContratistaId));
    const savedContratistaId = Number.isInteger(savedContratistaIdValue) ? savedContratistaIdValue : null;

    const withEmailCount = contratistas.filter((item) => item.email).length;
    const withContactCount = contratistas.filter((item) => item.contacto).length;
    const withPhoneCount = contratistas.filter((item) => item.telefono).length;

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Ingreso de contratista
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Contratistas
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Ingrese y mantenga la información de empresas contratistas para relacionarlas con vehículos, choferes y reportes.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin/contratistas/nuevo">
                            Ingresar contratista
                        </Link>
                        <a className="button-secondary" href="/admin/contratistas/export?format=xlsx">
                            Exportar Excel
                        </a>
                        <a className="button-secondary" href="/admin/contratistas/export?format=csv">
                            Exportar CSV
                        </a>
                        <Link className="button-secondary" href="/admin">
                            Volver al menú
                        </Link>
                    </div>
                </div>

                <div className="border-t border-slate-200/70 bg-slate-50/60 px-6 py-4 lg:px-8">
                    <div className="flex flex-wrap gap-2">
                        <span className="topbar-chip">Total {contratistas.length}</span>
                        <span className="topbar-chip">Con email {withEmailCount}</span>
                        <span className="topbar-chip">Con contacto {withContactCount}</span>
                        <span className="topbar-chip">Con teléfono {withPhoneCount}</span>
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

            <section className="panel overflow-hidden" id="contratistas">
                <div className="border-b border-slate-200/70 bg-slate-50/60 px-6 py-5 lg:px-8">
                    <h2 className="font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                        Listado de contratistas
                    </h2>
                </div>

                <div className="overflow-x-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <tr>
                                <th className="rounded-l-[20px] px-6 py-4">Razón social</th>
                                <th className="px-6 py-4">RUT</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Teléfono</th>
                                <th className="px-6 py-4">Actualizado</th>
                                <th className="rounded-r-[20px] px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {contratistas.map((contratista) => {
                                const isSaved = savedContratistaId === contratista.id;

                                return (
                                    <tr className={`transition hover:bg-slate-50/80 ${isSaved ? "saved-row" : ""}`} id={`contratista-${contratista.id}`} key={contratista.id}>
                                        <td className="px-6 py-5 font-semibold text-slate-950">{contratista.razonSocial}</td>
                                        <td className="px-6 py-5 font-semibold tracking-[0.14em] text-accent-700">{contratista.rut}</td>
                                        <td className="px-6 py-5 text-slate-600">{contratista.email ?? "-"}</td>
                                        <td className="px-6 py-5 text-slate-600">{contratista.contacto ?? "-"}</td>
                                        <td className="px-6 py-5 text-slate-600">{contratista.telefono ?? "-"}</td>
                                        <td className="px-6 py-5 text-slate-600">{formatDateTime(contratista.updatedAt)}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-2">
                                                <Link className="inline-flex min-h-[44px] items-center rounded-full bg-accent-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 transition hover:bg-accent-100" href={`/admin/contratistas/${contratista.id}/editar`}>
                                                    Editar
                                                </Link>
                                                <DeleteContratistaButton action={deleteContratistaAction} contratistaId={contratista.id} razonSocial={contratista.razonSocial} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {contratistas.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>
                                        No hay contratistas ingresados todavía.
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
