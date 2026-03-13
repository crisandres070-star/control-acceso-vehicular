"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatRutInput } from "@/lib/utils";

type ContratistaDefaults = {
    razonSocial?: string;
    rut?: string;
    email?: string | null;
    contacto?: string | null;
    telefono?: string | null;
};

type ContratistaFormProps = {
    id?: string;
    action: (formData: FormData) => void | Promise<void>;
    heading: string;
    description?: string;
    submitLabel: string;
    defaults?: ContratistaDefaults;
    cancelHref?: string;
    successMessage?: string;
    errorMessage?: string;
};

export function ContratistaForm({
    id,
    action,
    heading,
    description,
    submitLabel,
    defaults,
    cancelHref,
    successMessage,
    errorMessage,
}: ContratistaFormProps) {
    const [rut, setRut] = useState(defaults?.rut ?? "");

    useEffect(() => {
        setRut(defaults?.rut ?? "");
    }, [defaults?.rut]);

    return (
        <section className="panel mx-auto max-w-4xl overflow-hidden scroll-mt-28" id={id}>
            <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] px-6 py-6 lg:px-8 lg:py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                    Formulario de contratista
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

            <form action={action} className="grid gap-6 px-6 py-6 md:grid-cols-2 lg:px-8 lg:py-8">
                <div className="space-y-2 md:col-span-2">
                    <label className="field-label" htmlFor="razonSocial">
                        Razón social
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.razonSocial}
                        id="razonSocial"
                        name="razonSocial"
                        placeholder="Ej. Servicios Mineros del Norte"
                        required
                        type="text"
                    />
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="rut">
                        RUT
                    </label>
                    <input
                        autoCapitalize="characters"
                        className="input-base uppercase tracking-[0.14em]"
                        id="rut"
                        name="rut"
                        onChange={(event) => {
                            setRut(formatRutInput(event.target.value));
                        }}
                        placeholder="12345678-9"
                        required
                        spellCheck={false}
                        type="text"
                        value={rut}
                    />
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="email">
                        Email
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.email ?? ""}
                        id="email"
                        name="email"
                        placeholder="contacto@empresa.cl"
                        type="email"
                    />
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="contacto">
                        Contacto
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.contacto ?? ""}
                        id="contacto"
                        name="contacto"
                        placeholder="Ej. Carla Muñoz"
                        type="text"
                    />
                </div>

                <div className="space-y-2">
                    <label className="field-label" htmlFor="telefono">
                        Teléfono
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.telefono ?? ""}
                        id="telefono"
                        name="telefono"
                        placeholder="Ej. +56 9 1234 5678"
                        type="text"
                    />
                </div>

                <div className="md:col-span-2 flex flex-col gap-4 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Datos del contratista</p>
                        <p className="mt-1 text-sm text-slate-500">Complete los campos requeridos y guarde la ficha.</p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        {cancelHref ? (
                            <Link className="button-secondary" href={cancelHref}>
                                Volver
                            </Link>
                        ) : null}
                        <button className="button-primary" type="submit">
                            {submitLabel}
                        </button>
                    </div>
                </div>
            </form>
        </section>
    );
}