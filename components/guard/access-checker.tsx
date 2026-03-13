"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type AuthorizedChofer = {
    id: number;
    nombre: string;
    rut: string;
};

type CheckResponse = {
    isRegistered: boolean;
    result: "YES" | "NO";
    vehicle: {
        licensePlate: string;
        codigoInterno: string;
        vehicleType: string;
        brand: string;
        company: string;
        choferes: AuthorizedChofer[];
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
    const [selectedChoferId, setSelectedChoferId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    function sanitizeLicensePlate(value: string) {
        return value.toUpperCase();
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
            setSelectedChoferId(data.vehicle.choferes.length === 1 ? String(data.vehicle.choferes[0].id) : "");
            setLicensePlate("");
        } catch (requestError) {
            setResult(null);
            setSelectedChoferId("");
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
    const isRegistered = result?.isRegistered ?? false;
    const authorizedChoferes = result?.vehicle.choferes ?? [];
    const selectedChofer = authorizedChoferes.find((chofer) => String(chofer.id) === selectedChoferId)
        ?? (authorizedChoferes.length === 1 ? authorizedChoferes[0] : null);
    const vehicle = result
        ? {
            licensePlate: formatVehicleValue(result.vehicle.licensePlate),
            codigoInterno: formatVehicleValue(result.vehicle.codigoInterno),
            vehicleType: formatVehicleValue(result.vehicle.vehicleType),
            brand: formatVehicleValue(result.vehicle.brand),
            company: formatVehicleValue(result.vehicle.company),
        }
        : null;
    const statusCard = !result
        ? {
            containerClass: "border border-slate-200 bg-slate-100",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-700",
            bodyClass: "text-slate-500",
            eyebrow: "Estado inicial",
            title: "LISTO PARA VALIDAR",
            description: "Ingrese una patente para obtener el estado del vehículo y confirmar el chofer autorizado antes de autorizar el acceso.",
        }
        : !granted
            ? {
                containerClass: "bg-red-500",
                eyebrowClass: "text-white/85",
                titleClass: "text-white",
                bodyClass: "text-white/85",
                eyebrow: isRegistered ? "Acceso restringido" : "Patente no registrada",
                title: isRegistered ? "ACCESO DENEGADO" : "VEHÍCULO NO REGISTRADO",
                description: isRegistered
                    ? "El vehículo está bloqueado para acceso y no debe continuar al registro operativo. Revise su estado en administración."
                    : "La patente no existe en el padrón actual. No continúe hasta validar o registrar el vehículo en administración.",
            }
            : authorizedChoferes.length === 0
                ? {
                    containerClass: "bg-amber-400",
                    eyebrowClass: "text-slate-900/75",
                    titleClass: "text-slate-950",
                    bodyClass: "text-slate-900/80",
                    eyebrow: "Validación incompleta",
                    title: "SIN CHOFER AUTORIZADO",
                    description: "La patente está habilitada en padrón, pero no existe un chofer asignado para cerrar la validación operativa.",
                }
                : !selectedChofer
                    ? {
                        containerClass: "bg-amber-400",
                        eyebrowClass: "text-slate-900/75",
                        titleClass: "text-slate-950",
                        bodyClass: "text-slate-900/80",
                        eyebrow: "Validación en curso",
                        title: "SELECCIONE CHOFER",
                        description: "La patente está habilitada, pero el acceso no debe considerarse aprobado hasta confirmar qué chofer autorizado está operando el vehículo.",
                    }
                    : {
                        containerClass: "bg-green-500",
                        eyebrowClass: "text-white/85",
                        titleClass: "text-white",
                        bodyClass: "text-white/85",
                        eyebrow: "Validación completa",
                        title: "CHOFER CONFIRMADO",
                        description: "La patente fue validada y el chofer autorizado ya está confirmado para este control operativo.",
                    };

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
                        className={`rounded-[32px] px-8 py-10 text-center shadow-lg ${statusCard.containerClass}`}
                    >
                        <p className={`text-sm font-semibold uppercase tracking-[0.3em] ${statusCard.eyebrowClass}`}>
                            {statusCard.eyebrow}
                        </p>
                        <p className={`mt-5 font-[family:var(--font-heading)] text-4xl font-bold uppercase tracking-[0.18em] sm:text-5xl xl:text-6xl ${statusCard.titleClass}`}>
                            {statusCard.title}
                        </p>
                        <p className={`mx-auto mt-4 max-w-2xl text-base leading-7 ${statusCard.bodyClass}`}>
                            {statusCard.description}
                        </p>
                    </div>

                    <div className="rounded-[32px] border border-slate-200/80 bg-slate-100 p-6 shadow-sm">
                        <div className="rounded-[28px] bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Información del vehículo y chofer
                            </p>

                            {vehicle ? (
                                <div className="mt-5 space-y-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
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

                                    {isRegistered ? (
                                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chofer autorizado</p>
                                                    <p className="mt-2 text-sm text-slate-600">
                                                        {authorizedChoferes.length === 1
                                                            ? "Se asignó automáticamente el único chofer autorizado para este vehículo."
                                                            : authorizedChoferes.length > 1
                                                                ? "Seleccione el chofer autorizado que corresponde a este acceso."
                                                                : "No hay chofer autorizado disponible para esta patente."}
                                                    </p>
                                                </div>

                                                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                                                    {authorizedChoferes.length === 1
                                                        ? "1 chofer"
                                                        : `${authorizedChoferes.length} choferes`}
                                                </span>
                                            </div>

                                            {authorizedChoferes.length > 1 ? (
                                                <div className="mt-4 space-y-2">
                                                    <label className="field-label" htmlFor="legacy-authorized-chofer">
                                                        Chofer para validar
                                                    </label>
                                                    <select
                                                        className="input-base"
                                                        id="legacy-authorized-chofer"
                                                        onChange={(event) => setSelectedChoferId(event.target.value)}
                                                        value={selectedChoferId}
                                                    >
                                                        <option value="">Seleccione un chofer autorizado</option>
                                                        {authorizedChoferes.map((chofer) => (
                                                            <option key={chofer.id} value={chofer.id}>
                                                                {chofer.nombre} · {chofer.rut}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : null}

                                            {selectedChofer ? (
                                                <div className="mt-4 rounded-[20px] border border-accent-100 bg-white px-4 py-4 shadow-sm">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
                                                        Chofer seleccionado
                                                    </p>
                                                    <p className="mt-2 text-lg font-semibold text-slate-950">{selectedChofer.nombre}</p>
                                                    <p className="mt-2 text-sm text-slate-600">RUT: {selectedChofer.rut}</p>
                                                </div>
                                            ) : authorizedChoferes.length === 0 ? (
                                                <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium leading-6 text-amber-800">
                                                    Este vehículo no tiene choferes autorizados. Debe asignarse al menos un chofer antes de registrar acceso.
                                                </div>
                                            ) : (
                                                <div className="mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                                                    Seleccione un chofer autorizado para ver su nombre y RUT.
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                                    Después de consultar una patente aparecerán aquí los datos del vehículo y, cuando exista, el chofer autorizado correspondiente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
