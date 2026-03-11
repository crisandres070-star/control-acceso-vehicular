"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatRutInput } from "@/lib/utils";

type VehicleDefaults = {
    name?: string;
    licensePlate?: string;
    codigoInterno?: string;
    rut?: string;
    vehicleType?: string;
    brand?: string;
    company?: string;
    accessStatus?: string;
};

type VehicleFormProps = {
    id?: string;
    action: (formData: FormData) => void | Promise<void>;
    heading: string;
    description: string;
    submitLabel: string;
    defaults?: VehicleDefaults;
    cancelHref?: string;
    successMessage?: string;
    errorMessage?: string;
};

export function VehicleForm({
    id,
    action,
    heading,
    description,
    submitLabel,
    defaults,
    cancelHref,
    successMessage,
    errorMessage,
}: VehicleFormProps) {
    const [licensePlate, setLicensePlate] = useState(defaults?.licensePlate ?? "");
    const [codigoInterno, setCodigoInterno] = useState(defaults?.codigoInterno ?? "");
    const [rut, setRut] = useState(defaults?.rut ?? "");

    useEffect(() => {
        setLicensePlate(defaults?.licensePlate ?? "");
        setCodigoInterno(defaults?.codigoInterno ?? "");
        setRut(defaults?.rut ?? "");
    }, [defaults?.codigoInterno, defaults?.licensePlate, defaults?.rut]);

    function sanitizeCodigoInterno(value: string) {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    return (
        <section className="panel mx-auto max-w-4xl overflow-hidden scroll-mt-28" id={id}>
            <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] px-6 py-6 lg:px-8 lg:py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                    Formulario de vehículo
                </p>
                <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                    {heading}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            </div>

            {successMessage ? (
                <div className="px-6 pt-6 lg:px-8">
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        {decodeURIComponent(successMessage)}
                    </div>
                </div>
            ) : null}

            {errorMessage ? (
                <div className="px-6 pt-6 lg:px-8">
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {decodeURIComponent(errorMessage)}
                    </div>
                </div>
            ) : null}

            <form action={action} className="grid gap-5 px-6 py-6 md:grid-cols-2 lg:px-8 lg:py-8">
                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="name">
                        Nombre
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Nombre visible para administración y portería.</p>
                    <input className="input-base" defaultValue={defaults?.name} id="name" name="name" placeholder="Ej. Luis Herrera" type="text" />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="licensePlate">
                        Patente
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Ingrese la patente en el formato usado por el personal de acceso.</p>
                    <input
                        autoCapitalize="characters"
                        className="input-base uppercase tracking-[0.18em]"
                        id="licensePlate"
                        name="licensePlate"
                        onChange={(event) => {
                            setLicensePlate(event.target.value.toUpperCase());
                        }}
                        placeholder="ABC123"
                        spellCheck={false}
                        type="text"
                        value={licensePlate}
                    />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="codigoInterno">
                        Código interno
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Use solo letras y números para la trazabilidad interna del vehículo.</p>
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
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="vehicleType">
                        Tipo de vehículo
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Categoría utilizada para identificar el vehículo con rapidez.</p>
                    <input
                        className="input-base"
                        defaultValue={defaults?.vehicleType}
                        id="vehicleType"
                        name="vehicleType"
                        placeholder="Ej. Camioneta"
                        type="text"
                    />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm md:col-start-1">
                    <label className="field-label" htmlFor="rut">
                        RUT del conductor
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Puede pegarlo con puntos o guion; el sistema lo normaliza automáticamente.</p>
                    <input
                        autoCapitalize="characters"
                        className="input-base uppercase tracking-[0.12em]"
                        id="rut"
                        name="rut"
                        onChange={(event) => {
                            setRut(formatRutInput(event.target.value));
                        }}
                        pattern="[0-9]{8}-[0-9K]"
                        placeholder="12.345.678-9"
                        required
                        spellCheck={false}
                        title="Ingrese un RUT en formato 12345678-9 o 12345678-K"
                        type="text"
                        value={rut}
                    />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="brand">
                        Marca
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Fabricante o marca principal para apoyo visual en validación.</p>
                    <input className="input-base" defaultValue={defaults?.brand} id="brand" name="brand" placeholder="Ej. Toyota" type="text" />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="company">
                        Empresa
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Organización asociada al permiso o bloqueo de ingreso.</p>
                    <input className="input-base" defaultValue={defaults?.company} id="company" name="company" placeholder="Ej. Logistica Norte" type="text" />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="accessStatus">
                        Estado de acceso
                    </label>
                    <p className="mb-3 text-sm text-slate-500">Defina si el vehículo debe quedar habilitado o bloqueado para el ingreso.</p>
                    <select
                        className="input-base"
                        defaultValue={defaults?.accessStatus ?? "YES"}
                        id="accessStatus"
                        name="accessStatus"
                    >
                        <option value="YES">Permitir acceso</option>
                        <option value="NO">Denegar acceso</option>
                    </select>
                </div>

                <div className="md:col-span-2 rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Revise los datos antes de guardar</p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Los cambios se aplican sobre el mismo registro y conservan el comportamiento actual del sistema.
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3">
                            {cancelHref ? (
                                <Link className="button-secondary" href={cancelHref}>
                                    Cancelar
                                </Link>
                            ) : null}
                            <button className="button-primary" type="submit">
                                {submitLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </section>
    );
}
