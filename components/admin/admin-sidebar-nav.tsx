"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationSections = [
    {
        title: "Menú administración",
        items: [
            {
                key: "admin-menu",
                href: "/admin",
                label: "Inicio",
                short: "IN",
                description: "Acceso al menú principal del sistema.",
                matches: ["/admin"],
            },
            {
                key: "reportes",
                href: "/admin/eventos-acceso",
                label: "Búsqueda / reporte",
                short: "RP",
                description: "Consulta de eventos y exportaciones.",
                matches: ["/admin/eventos-acceso"],
            },
            {
                key: "seguimiento",
                href: "/admin/control-acceso-v2",
                label: "Seguimiento en línea",
                short: "SG",
                description: "Operación diaria del control de acceso.",
                matches: ["/admin/control-acceso-v2"],
            },
        ],
    },
    {
        title: "Ingresos",
        items: [
            {
                key: "contratistas",
                href: "/admin/contratistas",
                label: "Ingreso de contratista",
                short: "CT",
                description: "Empresas y datos de contacto.",
                matches: ["/admin/contratistas"],
            },
            {
                key: "vehiculos",
                href: "/admin/vehiculos",
                label: "Ingreso de vehículo",
                short: "VH",
                description: "Padrón vehicular y edición de fichas.",
                matches: ["/admin/vehiculos", "/admin/vehicles"],
            },
            {
                key: "choferes",
                href: "/admin/choferes",
                label: "Ingreso de chofer",
                short: "CH",
                description: "Choferes asociados a contratistas.",
                matches: ["/admin/choferes"],
            },
            {
                key: "porterias",
                href: "/admin/porterias",
                label: "Ingreso de portería",
                short: "PT",
                description: "Puntos de control y teléfonos.",
                matches: ["/admin/porterias"],
            },
        ],
    },
    {
        title: "Operación interna",
        items: [
            {
                key: "asignaciones",
                href: "/admin/asignaciones",
                label: "Asignaciones",
                short: "AS",
                description: "Relación entre choferes y vehículos.",
                matches: ["/admin/asignaciones"],
            },
            {
                key: "logs",
                href: "/admin/logs",
                label: "Historial administrativo",
                short: "LG",
                description: "Movimientos V2 y bitácora legacy del sistema.",
                matches: ["/admin/logs"],
            },
            {
                key: "importaciones",
                href: "/admin/importaciones",
                label: "Importaciones",
                short: "IMP",
                description: "Módulo secundario fuera del flujo principal.",
                matches: ["/admin/importaciones"],
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
                    Navegación simple para ingresar información manualmente y consultar el seguimiento.
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
