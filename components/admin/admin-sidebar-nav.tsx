import Image from "next/image";

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
        label: "Vehículos",
        short: "VH",
        description: "Altas, edición y administración de registros.",
    },
    {
        key: "logs",
        href: "/admin/logs",
        label: "Registros de acceso",
        short: "RA",
        description: "Auditoría, filtros y trazabilidad diaria.",
    },
    {
        key: "export",
        href: "/admin/logs/export",
        label: "Exportar Excel",
        short: "XLSX",
        description: "Descarga inmediata de bitácoras en Excel.",
    },
] as const;

export function AdminSidebarNav() {
    return (
        <div>
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Image
                    alt="COSAYACH"
                    className="h-10 w-auto"
                    height={40}
                    priority
                    src="/logo/cosayach.png"
                    width={170}
                />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">Control de acceso</p>
                    <p className="mt-1 text-xs text-slate-500">Panel operativo y navegación principal</p>
                </div>
            </div>

            <p className="px-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Navegación
            </p>

            <nav className="mt-4 space-y-2">
                {navigationItems.map((item) => (
                    <a
                        className="sidebar-link sidebar-link-idle"
                        download={item.key === "export"}
                        href={item.href}
                        key={item.key}
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold uppercase tracking-[0.16em] text-accent-700">
                            {item.short}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold">{item.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {item.description}
                            </span>
                        </span>
                    </a>
                ))}
            </nav>
        </div>
    );
}