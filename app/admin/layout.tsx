import Image from "next/image";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await requireRole("ADMIN");

    return (
        <main className="min-h-screen">
            <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6 lg:py-5">
                <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.12)] lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
                    <aside className="flex flex-col gap-8 border-b border-slate-200 bg-slate-50/80 p-6 lg:min-h-[calc(100vh-3rem)] lg:border-b-0 lg:border-r lg:p-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-700">
                                Centro operativo
                            </p>
                            <h1 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                                Control de acceso de vehiculos
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                Gestion, trazabilidad y exportacion con una interfaz clara y consistente para operacion diaria.
                            </p>
                        </div>

                        <AdminSidebarNav />

                        <div className="mt-auto rounded-[28px] border border-accent-100 bg-accent-50/80 p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">
                                Sesion activa
                            </p>
                            <p className="mt-3 text-lg font-semibold text-slate-950">{session.username}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 shadow-sm">
                                    Rol {session.role}
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                Acceso completo para administrar vehiculos, revisar bitacoras y exportar informacion.
                            </p>
                        </div>
                    </aside>

                    <div className="min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))]">
                        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-6 py-5 backdrop-blur-xl lg:px-8">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex items-start gap-4 sm:items-center">
                                    <div className="flex h-14 w-[150px] shrink-0 items-center">
                                        <Image
                                            alt="Verix"
                                            className="h-auto w-[150px]"
                                            height={48}
                                            priority
                                            src="/logo/verix-horizontal.png"
                                            width={150}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                                            Panel administrativo
                                        </p>
                                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950">
                                            Control de acceso de vehiculos
                                        </h2>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Operacion centralizada para vehiculos, registros de acceso y formularios de gestion.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="topbar-chip">Rol {session.role}</span>
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                                        {session.username}
                                    </span>
                                    <form action="/logout" method="post">
                                        <button className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200" type="submit">
                                            Cerrar sesion
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </header>

                        <div className="min-w-0 space-y-6 p-6 lg:p-8">{children}</div>
                    </div>
                </div>
            </div>
        </main>
    );
}
