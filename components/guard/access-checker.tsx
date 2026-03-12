"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type CheckResponse = {
    result: "YES" | "NO";
    vehicle: {
        licensePlate: string;
        codigoInterno: string;
        vehicleType: string;
        brand: string;
        company: string;
    };
};

type AccessCheckerProps = {
    username: string;
    roleLabel: string;
};

export function AccessChecker({ username, roleLabel }: AccessCheckerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [licensePlate, setLicensePlate] = useState("");
    const [result, setResult] = useState<CheckResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    function sanitizeLicensePlate(value: string) {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    function formatVehicleValue(value: string) {
        if (value === "Unknown vehicle") {
            return "Vehículo no registrado";
        }

        if (value === "Not registered") {
            return "No registrado";
        }

        return value;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!licensePlate.trim()) {
            setError("Ingrese una patente antes de consultar.");
            setResult(null);
            inputRef.current?.focus();
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/check-access", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ licensePlate: sanitizeLicensePlate(licensePlate) }),
            });

            const data = (await response.json()) as CheckResponse & { error?: string };

            if (!response.ok) {
                throw new Error(data.error || "No fue posible verificar el acceso.");
            }

            setResult(data);
            setLicensePlate("");
        } catch (requestError) {
            setResult(null);
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "No fue posible verificar el acceso.",
            );
        } finally {
            setIsSubmitting(false);
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }

    const granted = result?.result === "YES";
    const vehicle = result
        ? {
            licensePlate: formatVehicleValue(result.vehicle.licensePlate),
            codigoInterno: formatVehicleValue(result.vehicle.codigoInterno),
            vehicleType: formatVehicleValue(result.vehicle.vehicleType),
            brand: formatVehicleValue(result.vehicle.brand),
            company: formatVehicleValue(result.vehicle.company),
        }
        : null;

    return (
        <section className="w-full rounded-[36px] border border-white/85 bg-white/95 shadow-[0_32px_90px_rgba(15,23,42,0.14)] xl:max-w-[1380px]">
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
                            Control de acceso
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Validación para portería
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="sr-only">Usuario activo: {username}</span>
                    <span className="inline-flex items-center rounded-full bg-accent-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-700">
                        Rol {roleLabel}
                    </span>
                    <form action="/logout" method="post">
                        <button className="inline-flex min-h-[52px] items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:ring-4 focus:ring-slate-100" type="submit">
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </div>

            <div className="p-6 lg:p-8 xl:p-10">
                <div className="text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent-700">
                        Puesto de control
                    </p>
                    <h2 className="mt-4 font-[family:var(--font-heading)] text-4xl font-bold text-slate-950 sm:text-5xl lg:text-6xl">
                        INGRESAR PATENTE
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                        Sistema de validación instantánea
                    </p>
                </div>

                <form className="mx-auto mt-8 max-w-6xl" onSubmit={handleSubmit}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <input
                            autoComplete="off"
                            autoCorrect="off"
                            autoFocus
                            autoCapitalize="characters"
                            className="min-h-[88px] w-full rounded-xl border-2 border-slate-200 bg-white px-5 py-4 text-center font-[family:var(--font-heading)] text-4xl uppercase tracking-[0.28em] text-slate-950 shadow-sm transition placeholder:text-slate-300 focus:border-accent-400 focus:ring-4 focus:ring-accent-100 md:text-5xl"
                            enterKeyHint="go"
                            id="license-plate"
                            inputMode="text"
                            maxLength={12}
                            onChange={(event) => {
                                setLicensePlate(sanitizeLicensePlate(event.target.value));
                                setError(null);
                            }}
                            placeholder="ABC123"
                            ref={inputRef}
                            spellCheck={false}
                            type="text"
                            value={licensePlate}
                        />

                        <button
                            className="inline-flex min-h-[88px] items-center justify-center rounded-xl px-8 py-4 text-lg font-bold uppercase tracking-[0.18em] text-white shadow-sm transition hover:opacity-90 focus:ring-4 focus:ring-accent-100 disabled:cursor-not-allowed disabled:opacity-60"
                            style={{ backgroundColor: "#4e0bd9" }}
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? "Consultando..." : "Validar acceso"}
                        </button>
                    </div>
                </form>

                {error ? (
                    <div className="mx-auto mt-5 max-w-5xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                    </div>
                ) : null}

                <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                    <div
                        className={`rounded-[32px] px-8 py-10 text-center shadow-lg ${result
                            ? granted
                                ? "bg-green-500"
                                : "bg-red-500"
                            : "border border-slate-200 bg-slate-100"
                            }`}
                    >
                        <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${result ? "text-white/85" : "text-slate-500"}`}>
                            {result ? "Resultado" : "Estado inicial"}
                        </p>
                        <p className={`mt-5 font-[family:var(--font-heading)] text-4xl font-bold uppercase tracking-[0.18em] sm:text-5xl xl:text-6xl ${result ? "text-white" : "text-slate-700"}`}>
                            {result ? (granted ? "ACCESO PERMITIDO" : "ACCESO DENEGADO") : "LISTO PARA VALIDAR"}
                        </p>
                        <p className={`mx-auto mt-4 max-w-2xl text-base leading-7 ${result ? "text-white/85" : "text-slate-500"}`}>
                            {result
                                ? "La decisión se muestra con alto contraste para lectura inmediata en operaciones de acceso."
                                : "Ingrese una patente para obtener el resultado y los datos del vehículo consultado."}
                        </p>
                    </div>

                    <div className="rounded-[32px] border border-slate-200/80 bg-slate-100 p-6 shadow-sm">
                        <div className="rounded-[28px] bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Información del vehículo
                            </p>

                            {vehicle ? (
                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Patente</p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.licensePlate}</p>
                                    </div>
                                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Código interno</p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.codigoInterno}</p>
                                    </div>
                                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tipo de vehículo</p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.vehicleType}</p>
                                    </div>
                                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Marca</p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.brand}</p>
                                    </div>
                                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4 sm:col-span-2">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Empresa</p>
                                        <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.company}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                                    Después de consultar una patente aparecerán aquí los datos del vehículo correspondiente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
