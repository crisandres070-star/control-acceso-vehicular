import Link from "next/link";

import { prisma } from "@/lib/prisma";

type MenuItem = {
    title: string;
    subtitle: string;
    href: string;
    accent: string;
    detail: string;
};

export default async function AdminPage() {
    const [contratistasCount, vehiculosCount, choferesCount, porteriasCount, asignacionesCount, eventosHoyCount] = await Promise.all([
        prisma.contratista.count(),
        prisma.vehicle.count(),
        prisma.chofer.count(),
        prisma.porteria.count(),
        prisma.vehiculoChofer.count(),
        prisma.eventoAcceso.count({
            where: {
                fechaHora: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
            },
        }),
    ]);

    const menuItems: MenuItem[] = [
        {
            title: "Seguimiento en línea",
            subtitle: "Operación diaria",
            href: "/admin/control-acceso-v2",
            accent: "border-green-200 bg-green-50/70 text-green-700",
            detail: "Registrar ENTRADA y SALIDA del recinto.",
        },
        {
            title: "Ingreso de contratista",
            subtitle: "Administración",
            href: "/admin/contratistas",
            accent: "border-slate-200 bg-white text-slate-700",
            detail: "Crear y mantener empresas contratistas.",
        },
        {
            title: "Ingreso de vehículo",
            subtitle: "Administración",
            href: "/admin/vehiculos",
            accent: "border-slate-200 bg-white text-slate-700",
            detail: "Registrar y consultar el padrón vehicular.",
        },
        {
            title: "Ingreso de chofer",
            subtitle: "Administración",
            href: "/admin/choferes",
            accent: "border-slate-200 bg-white text-slate-700",
            detail: "Administrar choferes asociados a contratistas.",
        },
        {
            title: "Ingreso de portería",
            subtitle: "Administración",
            href: "/admin/porterias",
            accent: "border-slate-200 bg-white text-slate-700",
            detail: "Mantener puntos de control y teléfonos.",
        },
        {
            title: "Búsqueda / reporte",
            subtitle: "Seguimiento",
            href: "/admin/eventos-acceso",
            accent: "border-slate-200 bg-white text-slate-700",
            detail: "Consultar eventos, filtros y exportaciones.",
        },
    ];

    return (
        <div className="space-y-8">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Menú administración
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Administración del sistema
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Seleccione el módulo que necesita para ingresar información manualmente desde la web o para revisar el seguimiento del sistema.
                        </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2 lg:min-w-[320px]">
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                            Flujo principal: administración manual
                        </div>
                        <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                            Excel e IA: fuera del flujo principal
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {menuItems.map((item) => (
                    <Link className="panel block px-5 py-5 transition hover:border-slate-300 hover:shadow-md lg:px-6 lg:py-6" href={item.href} key={item.title}>
                        <div className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${item.accent}`}>
                            {item.subtitle}
                        </div>
                        <h2 className="mt-4 text-xl font-semibold text-slate-950">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                        <p className="mt-5 text-sm font-semibold text-accent-700">Abrir módulo</p>
                    </Link>
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
                <section className="panel overflow-hidden">
                    <div className="border-b border-slate-200/70 px-6 py-5 lg:px-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                            Flujo operativo
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                            Secuencia recomendada
                        </h2>
                    </div>

                    <div className="grid gap-3 px-6 py-6 md:grid-cols-2 lg:px-8 lg:py-8">
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">1. Ingreso de contratista</div>
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">2. Ingreso de vehículo</div>
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">3. Ingreso de chofer</div>
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">4. Asignación de chofer</div>
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">5. Seguimiento en línea</div>
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm text-slate-700">6. Búsqueda y reporte</div>
                    </div>
                </section>

                <aside className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Resumen general
                    </p>
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">Contratistas</span>
                            <span className="text-lg font-semibold text-slate-950">{contratistasCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">Vehículos</span>
                            <span className="text-lg font-semibold text-slate-950">{vehiculosCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">Choferes</span>
                            <span className="text-lg font-semibold text-slate-950">{choferesCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">Porterías</span>
                            <span className="text-lg font-semibold text-slate-950">{porteriasCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">Asignaciones</span>
                            <span className="text-lg font-semibold text-slate-950">{asignacionesCount}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
                            <span className="text-sm text-slate-600">Eventos de hoy</span>
                            <span className="text-lg font-semibold text-slate-950">{eventosHoyCount}</span>
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}
