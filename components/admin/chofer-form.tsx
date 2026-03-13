"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { formatRutInput } from "@/lib/utils";

type ContratistaOption = {
    id: number;
    razonSocial: string;
};

type ChoferDefaults = {
    contratistaId?: number;
    nombre?: string;
    rut?: string;
    codigoInterno?: string | null;
};

type QuickCreateContratistaAction = (formData: FormData) => Promise<{
    status: "success" | "error";
    message: string;
    contratista?: ContratistaOption;
    values?: {
        razonSocial: string;
        rut: string;
        email: string;
    };
}>;

type ChoferFormProps = {
    id?: string;
    action: (formData: FormData) => void | Promise<void>;
    heading: string;
    description?: string;
    submitLabel: string;
    contratistas: ContratistaOption[];
    defaults?: ChoferDefaults;
    cancelHref?: string;
    successMessage?: string;
    errorMessage?: string;
    quickCreateContratistaAction?: QuickCreateContratistaAction;
};

function sortContratistas(items: ContratistaOption[]) {
    return [...items].sort((left, right) => left.razonSocial.localeCompare(right.razonSocial, "es"));
}

export function ChoferForm({
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
    quickCreateContratistaAction,
}: ChoferFormProps) {
    const [rut, setRut] = useState(defaults?.rut ?? "");
    const [codigoInterno, setCodigoInterno] = useState(defaults?.codigoInterno ?? "");
    const [contratistaOptions, setContratistaOptions] = useState(() => sortContratistas(contratistas));
    const [selectedContratistaId, setSelectedContratistaId] = useState(defaults?.contratistaId ? String(defaults.contratistaId) : "");
    const [quickRazonSocial, setQuickRazonSocial] = useState("");
    const [quickRut, setQuickRut] = useState("");
    const [quickEmail, setQuickEmail] = useState("");
    const [quickCreateMessage, setQuickCreateMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(
        Boolean(quickCreateContratistaAction) && contratistas.length === 0,
    );
    const [isQuickCreatePending, startQuickCreateTransition] = useTransition();

    useEffect(() => {
        setRut(defaults?.rut ?? "");
        setCodigoInterno(defaults?.codigoInterno ?? "");
    }, [defaults?.codigoInterno, defaults?.rut]);

    useEffect(() => {
        setContratistaOptions(sortContratistas(contratistas));
    }, [contratistas]);

    useEffect(() => {
        setSelectedContratistaId(defaults?.contratistaId ? String(defaults.contratistaId) : "");
    }, [defaults?.contratistaId]);

    useEffect(() => {
        if (!quickCreateContratistaAction) {
            setIsQuickCreateOpen(false);
            return;
        }

        if (contratistaOptions.length === 0) {
            setIsQuickCreateOpen(true);
        }
    }, [contratistaOptions.length, quickCreateContratistaAction]);

    function sanitizeCodigoInterno(value: string) {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    function resetQuickCreateForm() {
        setQuickRazonSocial("");
        setQuickRut("");
        setQuickEmail("");
    }

    function upsertContratistaOption(newContratista: ContratistaOption) {
        setContratistaOptions((currentOptions) => {
            const filteredOptions = currentOptions.filter((item) => item.id !== newContratista.id);

            return sortContratistas([...filteredOptions, newContratista]);
        });
    }

    function handleQuickCreateContratista() {
        if (!quickCreateContratistaAction) {
            return;
        }

        const formData = new FormData();
        formData.set("razonSocial", quickRazonSocial);
        formData.set("rut", quickRut);
        formData.set("email", quickEmail);
        setQuickCreateMessage(null);

        startQuickCreateTransition(async () => {
            try {
                const result = await quickCreateContratistaAction(formData);

                if (result.values) {
                    setQuickRazonSocial(result.values.razonSocial);
                    setQuickRut(result.values.rut);
                    setQuickEmail(result.values.email);
                }

                if (result.status === "success" && result.contratista) {
                    upsertContratistaOption(result.contratista);
                    setSelectedContratistaId(String(result.contratista.id));
                    setQuickCreateMessage({
                        type: "success",
                        text: result.message,
                    });
                    resetQuickCreateForm();
                    setIsQuickCreateOpen(false);
                    return;
                }

                setQuickCreateMessage({
                    type: "error",
                    text: result.message,
                });
                setIsQuickCreateOpen(true);
            } catch {
                setQuickCreateMessage({
                    type: "error",
                    text: "No fue posible crear el contratista rápido. Intente nuevamente.",
                });
                setIsQuickCreateOpen(true);
            }
        });
    }

    const showQuickCreatePanel = Boolean(quickCreateContratistaAction)
        && (isQuickCreateOpen || contratistaOptions.length === 0);
    const canToggleQuickCreate = Boolean(quickCreateContratistaAction)
        && contratistaOptions.length > 0;

    return (
        <section className="panel mx-auto max-w-4xl overflow-hidden scroll-mt-28" id={id}>
            <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] px-6 py-6 lg:px-8 lg:py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                    Formulario de chofer
                </p>
                <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                    {heading}
                </h2>
                {description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                ) : null}
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
                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm md:col-span-2">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <label className="field-label" htmlFor="contratistaId">
                                Contratista
                            </label>
                        </div>

                        {canToggleQuickCreate ? (
                            <button
                                className="button-secondary"
                                onClick={() => {
                                    setQuickCreateMessage(null);
                                    setIsQuickCreateOpen((currentValue) => !currentValue);
                                }}
                                type="button"
                            >
                                {showQuickCreatePanel ? "Ocultar creación rápida" : "Crear contratista rápido"}
                            </button>
                        ) : null}
                    </div>

                    <select
                        className="input-base"
                        id="contratistaId"
                        name="contratistaId"
                        required
                        value={selectedContratistaId}
                        onChange={(event) => {
                            setSelectedContratistaId(event.target.value);
                            setQuickCreateMessage(null);
                        }}
                    >
                        <option value="">Seleccione un contratista</option>
                        {contratistaOptions.map((contratista) => (
                            <option key={contratista.id} value={contratista.id}>
                                {contratista.razonSocial}
                            </option>
                        ))}
                    </select>

                    {contratistaOptions.length === 0 ? (
                        <p className="mt-3 text-sm font-medium text-amber-700">
                            Aún no hay contratistas cargados. Cree el primero aquí mismo para continuar con el alta del chofer.
                        </p>
                    ) : null}

                    {selectedContratistaId ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm text-slate-600">
                            Este chofer quedará disponible para ser autorizado en uno o varios vehículos de la empresa seleccionada.
                        </div>
                    ) : null}

                    {quickCreateMessage ? (
                        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${quickCreateMessage.type === "success"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                            }`}>
                            {quickCreateMessage.text}
                        </div>
                    ) : null}

                    {showQuickCreatePanel ? (
                        <div className="mt-4 rounded-[24px] border border-accent-100 bg-accent-50/45 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-700">
                                        Crear contratista rápido
                                    </p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Ingrese los datos mínimos para crear la empresa y dejarla seleccionada sin salir de este flujo.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="field-label" htmlFor={`${id ?? "chofer-form"}-quick-razon-social`}>
                                        Razón social
                                    </label>
                                    <input
                                        className="input-base"
                                        id={`${id ?? "chofer-form"}-quick-razon-social`}
                                        onChange={(event) => {
                                            setQuickRazonSocial(event.target.value);
                                            setQuickCreateMessage(null);
                                        }}
                                        placeholder="Ej. Servicios Mineros del Norte"
                                        type="text"
                                        value={quickRazonSocial}
                                    />
                                </div>

                                <div>
                                    <label className="field-label" htmlFor={`${id ?? "chofer-form"}-quick-rut`}>
                                        RUT
                                    </label>
                                    <input
                                        autoCapitalize="characters"
                                        className="input-base uppercase tracking-[0.14em]"
                                        id={`${id ?? "chofer-form"}-quick-rut`}
                                        onChange={(event) => {
                                            setQuickRut(formatRutInput(event.target.value));
                                            setQuickCreateMessage(null);
                                        }}
                                        placeholder="12345678-9"
                                        spellCheck={false}
                                        type="text"
                                        value={quickRut}
                                    />
                                </div>

                                <div>
                                    <label className="field-label" htmlFor={`${id ?? "chofer-form"}-quick-email`}>
                                        Email opcional
                                    </label>
                                    <input
                                        className="input-base"
                                        id={`${id ?? "chofer-form"}-quick-email`}
                                        onChange={(event) => {
                                            setQuickEmail(event.target.value);
                                            setQuickCreateMessage(null);
                                        }}
                                        placeholder="contacto@empresa.cl"
                                        type="email"
                                        value={quickEmail}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                {canToggleQuickCreate ? (
                                    <button
                                        className="button-secondary"
                                        onClick={() => {
                                            setQuickCreateMessage(null);
                                            resetQuickCreateForm();
                                            setIsQuickCreateOpen(false);
                                        }}
                                        type="button"
                                    >
                                        Cancelar
                                    </button>
                                ) : null}
                                <button
                                    className="button-primary"
                                    disabled={isQuickCreatePending}
                                    onClick={handleQuickCreateContratista}
                                    type="button"
                                >
                                    {isQuickCreatePending ? "Creando contratista..." : "Guardar contratista y continuar"}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                    <label className="field-label" htmlFor="nombre">
                        Nombre
                    </label>
                    <input
                        className="input-base"
                        defaultValue={defaults?.nombre}
                        id="nombre"
                        name="nombre"
                        placeholder="Ej. Juan Pérez"
                        required
                        type="text"
                    />
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
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

                <div className="md:col-span-2 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/75 p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-end">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Dato secundario
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-slate-950">
                                Código interno opcional del chofer
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                El número interno operativo pertenece al vehículo. Use este campo solo si su operación necesita un código adicional para identificar al chofer.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="field-label" htmlFor="codigoInterno">
                                Código interno opcional
                            </label>
                            <input
                                autoCapitalize="characters"
                                className="input-base uppercase tracking-[0.18em]"
                                id="codigoInterno"
                                name="codigoInterno"
                                onChange={(event) => {
                                    setCodigoInterno(sanitizeCodigoInterno(event.target.value));
                                }}
                                pattern="[A-Za-z0-9]*"
                                placeholder="Solo si realmente se usa"
                                spellCheck={false}
                                title="Ingrese solo letras y números"
                                type="text"
                                value={codigoInterno}
                            />
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-4 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Datos del chofer</p>
                        <p className="mt-1 text-sm text-slate-500">Guarde la ficha y luego autorice este chofer en uno o varios vehículos.</p>
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