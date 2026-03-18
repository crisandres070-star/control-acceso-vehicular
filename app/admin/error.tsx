"use client";

import Link from "next/link";
import { useEffect } from "react";

type AdminErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
    useEffect(() => {
        console.error("[app/admin/error] Error capturado en seccion administrativa", error);
    }, [error]);

    return (
        <main className="min-h-[70vh] px-5 py-12 sm:px-8 lg:px-10">
            <section className="mx-auto w-full max-w-3xl rounded-[30px] border border-red-200 bg-white p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
                    Error en administración
                </p>
                <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 sm:text-4xl">
                    No fue posible cargar esta vista
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base">
                    La sesión se mantiene activa. Puede reintentar o volver al módulo operativo seguro.
                </p>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Código de incidente: <span className="font-semibold text-slate-900">{error.digest ?? "no-disponible"}</span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button className="button-primary" onClick={() => reset()} type="button">
                        Reintentar
                    </button>
                    <Link className="button-secondary" href="/admin/control-acceso-v2">
                        Ir a control operativo
                    </Link>
                    <Link className="button-secondary" href="/login">
                        Ir a login
                    </Link>
                </div>
            </section>
        </main>
    );
}
