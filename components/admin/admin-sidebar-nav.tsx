"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationSections = [
    {
        title: "Operación",
        items: [
            {
                key: "dashboard-faena",
                href: "/admin/dashboard-faena",
                label: "Dashboard de faena",
                short: "DF",
                description: "Vehículos en faena, fuera o en tránsito.",
                matches: ["/admin/dashboard-faena"],
            },
            {
                key: "seguimiento",
                href: "/admin/control-acceso-v2",
                label: "Control de acceso",
                short: "CA",
                description: "Registro operativo de ENTRADA y SALIDA.",
                matches: ["/admin/control-acceso-v2"],
            },
            {
                key: "reportes",
                href: "/admin/eventos-acceso",
                label: "Reportes",
                short: "RP",
                description: "Historial por patente, portería y evento.",
                matches: ["/admin/eventos-acceso"],
            },
            {
                key: "importaciones",
                href: "/admin/importaciones/vehiculos",
                label: "Importación Excel",
                short: "IMP",
                description: "Carga autónoma de empresas y vehículos.",
                matches: ["/admin/importaciones", "/admin/importaciones/vehiculos"],
            },
        ],
    },
    {
        title: "Maestros",
        items: [
            {
                key: "contratistas",
                href: "/admin/contratistas",
                label: "Contratistas",
                short: "CT",
                description: "Alta y corrección puntual, complementaria al Excel.",
                matches: ["/admin/contratistas"],
            },
            {
                key: "vehiculos",
                href: "/admin/vehiculos",
                label: "Vehículos",
                short: "VH",
                description: "Padrón vehicular y edición de fichas.",
                matches: ["/admin/vehiculos", "/admin/vehicles"],
            },
            {
                key: "porterias",
                href: "/admin/porterias",
                label: "Porterías",
                short: "PT",
                description: "Puntos de control y teléfonos.",
                matches: ["/admin/porterias"],
            },
        ],
    },
] as const;

export function AdminSidebarNav() {
    const pathname = usePathname();

    return (
        <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                    <Image
                        alt="COSAYACH"
                        className="h-10 w-auto"
                        height={40}
                        priority
                        src="/logo/cosayach.png"
                        width={170}
                    />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-950">Menú del sistema</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Navegación simple para operar por patente, consultar reportes y administrar el padrón vehicular.
                </p>
            </div>

            {navigationSections.map((section) => (
                <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-sm" key={section.title}>
                    <div className="px-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                            {section.title}
                        </p>
                    </div>

                    <nav className="mt-4 space-y-2.5">
                        {section.items.map((item) => {
                            const isActive = item.matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));

                            return (
                                <Link
                                    className={`sidebar-link ${isActive ? "sidebar-link-active" : "sidebar-link-idle"}`}
                                    href={item.href}
                                    key={item.key}
                                >
                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-xs font-bold uppercase tracking-[0.16em] ${isActive ? "bg-white text-accent-700" : "bg-slate-100 text-accent-700"}`}>
                                        {item.short}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold">{item.label}</span>
                                        <span className={`mt-1 block text-xs leading-5 ${isActive ? "text-accent-900/80" : "text-slate-500"}`}>
                                            {item.description}
                                        </span>
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </section>
            ))}
        </div>
    );
}
