import Image from "next/image";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await requireRole("ADMIN");
    const roleLabel = session.role === "ADMIN" ? "Administrador" : "Portería";

    return (
        <main className="min-h-screen">
            <div className="mx-auto max-w-[1680px] px-4 py-4 lg:px-6 lg:py-5">
                <div className="overflow-hidden rounded-[36px] border border-white/80 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="flex flex-col gap-6 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(249,250,251,0.96),rgba(244,247,250,0.98))] p-6 lg:min-h-[calc(100vh-3rem)] lg:border-b-0 lg:border-r lg:p-7">
                        <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-700">
                                Menú administración
                            </p>
                            <h1 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                                Sistema de acceso
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Ingreso manual de datos, seguimiento en línea y reportes desde la web.
                            </p>
                        </div>

                        <AdminSidebarNav />

                        <div className="mt-auto rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                                        Sesión activa
                                    </p>
                                    <p className="mt-3 text-lg font-semibold text-slate-950">{session.username}</p>
                                </div>
                                <span className="inline-flex items-center rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
                                    {roleLabel}
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                Sesión preparada para gestionar padrón, asignaciones y control de acceso desde el panel.
                            </p>
                        </div>
                    </aside>

                    <div className="min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]">
                        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/92 px-6 py-4 backdrop-blur lg:px-8">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className="flex h-10 shrink-0 items-center">
                                        <Image
                                            alt="COSAYACH"
                                            className="h-12 w-auto"
                                            height={48}
                                            priority
                                            src="/logo/cosayach.png"
                                            width={210}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                            Administración
                                        </p>
                                        <p className="mt-1 truncate font-[family:var(--font-heading)] text-xl font-bold text-slate-950 sm:text-2xl">
                                            Menú del sistema
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Flujo manual, claro y operativo
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="topbar-chip">Operación manual</span>
                                    <span className="topbar-chip">Rol {roleLabel}</span>
                                    <form action="/logout" method="post">
                                        <button className="inline-flex min-h-[52px] items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200" type="submit">
                                            Cerrar sesión
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </header>

                        <div className="min-w-0 space-y-8 p-6 lg:p-8">{children}</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
