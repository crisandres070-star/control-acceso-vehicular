"use client";

import Link from "next/link";
import { useEffect } from "react";

type GlobalErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error("[app/global-error] Error global capturado", error);
    }, [error]);

    return (
        <html lang="es">
            <body style={{ background: "#eef2f6", margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", color: "#0f172a" }}>
                <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
                    <section style={{ width: "100%", maxWidth: "760px", background: "#ffffff", border: "1px solid #fecaca", borderRadius: "24px", padding: "28px", boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
                        <p style={{ margin: 0, color: "#b91c1c", fontSize: "12px", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase" }}>
                            Recuperación global
                        </p>
                        <h1 style={{ marginTop: "12px", marginBottom: 0, fontSize: "32px", lineHeight: 1.15 }}>
                            La aplicación encontró un error inesperado
                        </h1>
                        <p style={{ marginTop: "14px", marginBottom: 0, color: "#334155", lineHeight: 1.7 }}>
                            Se aplicó una pantalla de contingencia para evitar el fallo genérico de producción. Puede reintentar o volver al inicio de sesión.
                        </p>

                        <div style={{ marginTop: "18px", border: "1px solid #cbd5e1", borderRadius: "14px", background: "#f8fafc", padding: "12px 14px", color: "#334155", fontSize: "14px" }}>
                            Código de incidente: <strong style={{ color: "#0f172a" }}>{error.digest ?? "no-disponible"}</strong>
                        </div>

                        <p style={{ marginTop: "14px", marginBottom: 0, color: "#475569", lineHeight: 1.6 }}>
                            Si el reintento no resulta, continúe por una ruta segura para evitar quedar atrapado en la misma pantalla.
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "18px" }}>
                            <button
                                onClick={() => reset()}
                                style={{ border: 0, borderRadius: "10px", padding: "12px 18px", fontWeight: 700, background: "#4e0bd9", color: "#fff", cursor: "pointer" }}
                                type="button"
                            >
                                Reintentar
                            </button>
                            <Link
                                href="/login"
                                style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px 18px", fontWeight: 700, color: "#0f172a", textDecoration: "none", background: "#fff" }}
                            >
                                Ir a login
                            </Link>
                            <Link
                                href="/guard/v2"
                                style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px 18px", fontWeight: 700, color: "#0f172a", textDecoration: "none", background: "#fff" }}
                            >
                                Ir a control operativo
                            </Link>
                            <Link
                                href="/admin/control-acceso-v2"
                                style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px 18px", fontWeight: 700, color: "#0f172a", textDecoration: "none", background: "#fff" }}
                            >
                                Ir a dashboard
                            </Link>
                        </div>
                    </section>
                </main>
            </body>
        </html>
    );
}
