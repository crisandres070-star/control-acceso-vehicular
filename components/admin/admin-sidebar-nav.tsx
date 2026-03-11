"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigationItems = [
    {
        key: "dashboard",
        href: "/admin",
        label: "Panel general",
        short: "PG",
        description: "Resumen operativo y estado general.",
    },
    {
        key: "vehicles",
        href: "/admin#vehicles",
        label: "Vehiculos",
        short: "VH",
        description: "Altas, edicion y administracion de registros.",
    },
    {
        key: "logs",
        href: "/admin/logs",
        label: "Registros de acceso",
        short: "RA",
        description: "Auditoria, filtros y trazabilidad diaria.",
    },
    {
        key: "export",
        href: "/admin/logs/export",
        label: "Exportar datos",
        short: "CSV",
        description: "Descarga inmediata de bitacoras en CSV.",
    },
] as const;

function isActiveRoute(pathname: string, hash: string, key: string) {
    if (key === "dashboard") {
        return pathname === "/admin" && hash !== "#vehicles" && hash !== "#vehicle-form";
    }

    if (key === "vehicles") {
        return pathname.startsWith("/admin/vehicles") || (pathname === "/admin" && (hash === "#vehicles" || hash === "#vehicle-form"));
    }

    if (key === "logs") {
        return pathname.startsWith("/admin/logs");
    }

    return false;
}

export function AdminSidebarNav() {
    const pathname = usePathname();
    const [hash, setHash] = useState("");

    useEffect(() => {
        const updateHash = () => {
            setHash(window.location.hash);
        };

        updateHash();
        window.addEventListener("hashchange", updateHash);

        return () => {
            window.removeEventListener("hashchange", updateHash);
        };
    }, []);

    return (
        <div>
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Navegacion
            </p>

            <nav className="mt-4 space-y-2">
                {navigationItems.map((item) => {
                    const isActive = isActiveRoute(pathname, hash, item.key);
                    const className = `sidebar-link ${isActive ? "sidebar-link-active" : "sidebar-link-idle"}`;

                    const content = (
                        <>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold uppercase tracking-[0.16em] ${isActive ? "bg-white/10 text-white" : "bg-slate-100 text-accent-700"}`}>
                                {item.short}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold">{item.label}</span>
                                <span className={`mt-1 block text-xs leading-5 ${isActive ? "text-white/75" : "text-slate-500"}`}>
                                    {item.description}
                                </span>
                            </span>
                        </>
                    );

                    if (item.key === "export") {
                        return (
                            <a className={className} download href={item.href} key={item.key}>
                                {content}
                            </a>
                        );
                    }

                    return (
                        <Link className={className} href={item.href} key={item.key}>
                            {content}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}