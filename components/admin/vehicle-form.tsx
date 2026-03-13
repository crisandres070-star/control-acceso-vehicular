"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ContratistaOption = {
    id: number;
    razonSocial: string;
};

type VehicleDefaults = {
    contratistaId?: number | null;
    licensePlate?: string;
    codigoInterno?: string;
    vehicleType?: string;
    brand?: string;
    company?: string;
    accessStatus?: string;
};

type VehicleFormProps = {
    id?: string;
    action: (formData: FormData) => void | Promise<void>;
    heading: string;
    description?: string;
    submitLabel: string;
    contratistas: ContratistaOption[];
    defaults?: VehicleDefaults;
    cancelHref?: string;
    successMessage?: string;
    errorMessage?: string;
    variant?: "card" | "plain";
    showHeader?: boolean;
    onCancel?: () => void;
    cancelLabel?: string;
};

export function VehicleForm({
    id,
    action,
    heading,
    description,
    submitLabel,
    contratistas,
    defaults,
    cancelHref,
    successMessage,
    errorMessage,
    variant = "card",
    showHeader = true,
    onCancel,
    cancelLabel = "Volver",
}: VehicleFormProps) {
    const [licensePlate, setLicensePlate] = useState(defaults?.licensePlate ?? "");
    const [codigoInterno, setCodigoInterno] = useState(defaults?.codigoInterno ?? "");
    const [contratistaId, setContratistaId] = useState(defaults?.contratistaId ? String(defaults.contratistaId) : "");

    useEffect(() => {
        setLicensePlate(defaults?.licensePlate ?? "");
        setCodigoInterno(defaults?.codigoInterno ?? "");
        setContratistaId(defaults?.contratistaId ? String(defaults.contratistaId) : "");
    }, [defaults?.codigoInterno, defaults?.contratistaId, defaults?.licensePlate]);

    function sanitizeCodigoInterno(value: string) {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    function sanitizeLicensePlate(value: string) {
        return value.toUpperCase();
    }

    const isPlain = variant === "plain";
    const selectedContratista = contratistas.find((item) => String(item.id) === contratistaId) ?? null;
    const hasContratistas = contratistas.length > 0;
    const wrapperClassName = isPlain ? "w-full" : "panel mx-auto max-w-4xl overflow-hidden scroll-mt-28";
    const formClassName = isPlain
        ? "grid gap-6 md:grid-cols-2"
        : "grid gap-6 px-6 py-6 md:grid-cols-2 lg:px-8 lg:py-8";
    const bannerPaddingClassName = isPlain ? "pb-5" : "px-6 pt-6 lg:px-8";

    return (
        <section className={wrapperClassName} id={id}>
            {showHeader ? (
                <div className={isPlain ? "pb-5" : "border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] px-6 py-6 lg:px-8 lg:py-7"}>
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                        Formulario de vehículo
                    </p>
                    <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        {heading}
                    </h2>
                    {description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                    ) : null}
                </div>
            ) : null}

            {successMessage ? (
                <div className={bannerPaddingClassName}>
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        {decodeURIComponent(successMessage)}
                    </div>
                </div>
            ) : null}

            {errorMessage ? (
                <div className={bannerPaddingClassName}>
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {decodeURIComponent(errorMessage)}
                    </div>
                </div>
            ) : null}

            <form action={action} className={formClassName}>
                <div className="md:col-span-2 rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-5 lg:p-6">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                        <div className="space-y-2">
                            <label className="field-label" htmlFor="contratistaId">
                                Contratista
                            </label>
                            <select
                                className="input-base"
                                disabled={!hasContratistas}
                                id="contratistaId"
                                name="contratistaId"
                                onChange={(event) => setContratistaId(event.target.value)}
                                required
                                value={contratistaId}
                            >
                                <option value="">Seleccione un contratista</option>
                                {contratistas.map((contratista) => (
                                    <option key={contratista.id} value={contratista.id}>
                                        {contratista.razonSocial}
                                    </option>
                                ))}
                            </select>

                            {defaults?.company && !selectedContratista && defaults?.contratistaId == null ? (
                                <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-600">
                                    Referencia histórica del registro: {defaults.company}. Seleccione ahora el contratista correcto para normalizar el vehículo.
                                </div>
                            ) : null}

                            {!hasContratistas ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                                    No hay contratistas disponibles. Cree uno primero y luego vuelva a este formulario para registrar el vehículo correctamente asociado.
                                    <div className="mt-4">
                                        <Link className="button-secondary" href="/admin/contratistas/nuevo">
                                            Crear contratista
                                        </Link>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="rounded-[20px] border border-white/90 bg-white/85 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Empresa seleccionada
                            </p>
                            <p className="mt-2 text-base font-semibold text-slate-950">
                                {selectedContratista?.razonSocial ?? "Pendiente de selección"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {selectedContratista
                                    ? "La ficha del vehículo quedará alineada con esta empresa y luego podrá autorizar uno o más choferes desde asignaciones."
                                    : "Seleccione la empresa responsable para dejar la ficha lista para operar."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="licensePlate">
                        Patente
                    </label>
                    <input
                        autoCapitalize="characters"
                        className="input-base uppercase tracking-[0.18em]"
                        id="licensePlate"
                        name="licensePlate"
                        onChange={(event) => {
                            setLicensePlate(sanitizeLicensePlate(event.target.value));
                        }}
                        placeholder="PATENTE"
                        required
                        spellCheck={false}
                        type="text"
                        value={licensePlate}
                    />
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="codigoInterno">
                        Número interno del vehículo
                    </label>
                    <input
                        autoCapitalize="characters"
                        className="input-base uppercase tracking-[0.18em]"
                        id="codigoInterno"
                        name="codigoInterno"
                        onChange={(event) => {
                            setCodigoInterno(sanitizeCodigoInterno(event.target.value));
                        }}
                        pattern="[A-Za-z0-9]+"
                        placeholder="INT001"
                        required
                        spellCheck={false}
                        title="Ingrese solo letras y números"
                        type="text"
                        value={codigoInterno}
                    />
                    <p className="text-sm leading-6 text-slate-500">
                        Este número identifica a la camioneta o camión dentro de la operación. No pertenece al chofer.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="vehicleType">
                        Tipo de vehículo
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.vehicleType}
                        id="vehicleType"
                        name="vehicleType"
                        placeholder="Ej. Camioneta / camión"
                        required
                        type="text"
                    />
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="brand">
                        Marca
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.brand}
                        id="brand"
                        name="brand"
                        placeholder="Ej. Toyota"
                        required
                        type="text"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="field-label" htmlFor="accessStatus">
                        Estado de acceso
                    </label>
                    <select
                        className="input-base"
                        defaultValue={defaults?.accessStatus ?? "YES"}
                        id="accessStatus"
                        name="accessStatus"
                    >
                        <option value="YES">Habilitar acceso</option>
                        <option value="NO">Bloquear acceso</option>
                    </select>
                </div>

                <div className="md:col-span-2 flex flex-col gap-4 border-t border-slate-200/80 pt-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Datos del vehículo</p>
                        <p className="mt-1 text-sm text-slate-500">Guarde la ficha y luego autorice uno o más choferes para este vehículo.</p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        {cancelHref ? (
                            <Link className="button-secondary" href={cancelHref}>
                                {cancelLabel}
                            </Link>
                        ) : null}
                        {onCancel ? (
                            <button className="button-secondary" onClick={onCancel} type="button">
                                {cancelLabel}
                            </button>
                        ) : null}
                        <button className="button-primary" disabled={!hasContratistas} type="submit">
                            {submitLabel}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}
