import Image from "next/image";
import Link from "next/link";

import { AccessControlV2 } from "@/components/guard/access-control-v2";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
};

type GuardOperationalShellProps = {
    roleLabel: string;
    username: string;
    porterias: PorteriaOption[];
    defaultPorteriaId?: number | null;
    legacyHref?: string | null;
};

export function GuardOperationalShell({
    roleLabel,
    username,
    porterias,
    defaultPorteriaId = null,
    legacyHref = null,
}: GuardOperationalShellProps) {
    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_20%),linear-gradient(180deg,#f4f6fa_0%,#edf2f7_100%)]">
            <div className="mx-auto flex min-h-screen w-full max-w-[1560px] items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
                <section className="w-full rounded-[36px] border border-white/85 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.14)]">
                    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 shrink-0 items-center">
                                <Image
                                    alt="COSAYACH"
                                    className="h-auto w-auto object-contain"
                                    height={50}
                                    priority
                                    src="/logo/cosayach.png"
                                    width={160}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate font-[family:var(--font-heading)] text-xl font-bold text-slate-950 sm:text-2xl">
                                    Control de acceso operativo
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Patente, portería y registro simple de ENTRADA o SALIDA
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center rounded-full bg-accent-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-700">
                                Rol {roleLabel}
                            </span>
                            {legacyHref ? (
                                <Link className="button-secondary min-h-[52px] px-5 py-3" href={legacyHref}>
                                    Ir al flujo legacy
                                </Link>
                            ) : null}
                            <form action="/logout" method="post">
                                <button className="inline-flex min-h-[52px] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:ring-4 focus:ring-slate-100" type="submit">
                                    Cerrar sesión
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="p-6 lg:p-8 xl:p-10">
                        <AccessControlV2
                            contextLabel={username}
                            defaultPorteriaId={defaultPorteriaId}
                            porterias={porterias}
                        />
                    </div>
                </section>
            </div>
        </main>
    );
}