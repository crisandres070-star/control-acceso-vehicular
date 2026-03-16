"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
};

type TipoEventoOption = "ENTRADA" | "SALIDA";
type EstadoRecintoOption = "DENTRO" | "FUERA" | null;

type AuthorizedChofer = {
    id: number;
    nombre: string;
    rut: string;
    codigoInterno: string | null;
};

type VehicleLookup = {
    id: number;
    name: string;
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    brand: string;
    modelo: string | null;
    company: string;
    accessStatus: string;
    estadoRecinto: EstadoRecintoOption;
    contratista: {
        id: number;
        razonSocial: string;
        rut: string;
        contacto: string | null;
        telefono: string | null;
    } | null;
    choferes: AuthorizedChofer[];
    ultimoEvento: {
        tipoEvento: TipoEventoOption;
        fechaHora: string;
        operadoPorUsername: string | null;
        operadoPorRole: "ADMIN" | "USER" | null;
        operadoPorPorteriaNombre: string | null;
        porteria: {
            id: number;
            nombre: string;
        };
        chofer: {
            id: number;
            nombre: string;
        } | null;
    } | null;
};

type LookupResponse = {
    vehicle: VehicleLookup;
};

type RegisterResponse = {
    message: string;
    estadoRecinto: Exclude<EstadoRecintoOption, null>;
    ultimoEvento: NonNullable<VehicleLookup["ultimoEvento"]>;
};

type AccessControlV2Props = {
    porterias: PorteriaOption[];
    contextLabel: string;
    assignmentBaseHref?: string | null;
    defaultPorteriaId?: number | null;
};

type AccessStateView = {
    containerClass: string;
    eyebrowClass: string;
    titleClass: string;
    descriptionClass: string;
    eyebrow: string;
    title: string;
    emphasis: string;
    description: string;
};

function sanitizeLicensePlate(value: string) {
    return value.toUpperCase();
}

function getInitialPorteriaId(
    porterias: PorteriaOption[],
    vehicle: VehicleLookup,
    currentValue: string,
    defaultPorteriaId: number | null,
) {
    if (currentValue && porterias.some((porteria) => String(porteria.id) === currentValue)) {
        return currentValue;
    }

    if (defaultPorteriaId && porterias.some((porteria) => porteria.id === defaultPorteriaId)) {
        return String(defaultPorteriaId);
    }

    const lastPorteriaId = vehicle.ultimoEvento?.porteria.id;

    if (lastPorteriaId && porterias.some((porteria) => porteria.id === lastPorteriaId)) {
        return String(lastPorteriaId);
    }

    if (porterias.length === 1) {
        return String(porterias[0].id);
    }

    return "";
}

function getAccessStateView({
    vehicle,
    lookupError,
    hasEnabledAccess,
    hasContractor,
    hasAuthorizedChoferes,
    selectedChofer,
}: {
    vehicle: VehicleLookup | null;
    lookupError: string | null;
    hasEnabledAccess: boolean;
    hasContractor: boolean;
    hasAuthorizedChoferes: boolean;
    selectedChofer: AuthorizedChofer | null;
}): AccessStateView {
    if (!vehicle) {
        if (lookupError) {
            return {
                containerClass: "border-red-200 bg-red-500",
                eyebrowClass: "text-white/85",
                titleClass: "text-white",
                descriptionClass: "text-white/90",
                eyebrow: "Resultado",
                title: "ACCESO DENEGADO",
                emphasis: "NO AUTORIZADO",
                description: lookupError,
            };
        }

        return {
            containerClass: "border-slate-200 bg-slate-100",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-800",
            descriptionClass: "text-slate-600",
            eyebrow: "Estado inicial",
            title: "LISTO PARA VALIDAR",
            emphasis: "INGRESE PATENTE",
            description: "Escriba la patente y presione Validar acceso para iniciar el control de portería.",
        };
    }

    if (!hasEnabledAccess) {
        return {
            containerClass: "border-red-200 bg-red-500",
            eyebrowClass: "text-white/85",
            titleClass: "text-white",
            descriptionClass: "text-white/90",
            eyebrow: "Resultado",
            title: "ACCESO DENEGADO",
            emphasis: "VEHÍCULO BLOQUEADO",
            description: "La patente existe, pero está bloqueada para operar en portería.",
        };
    }

    if (!hasContractor) {
        return {
            containerClass: "border-red-200 bg-red-500",
            eyebrowClass: "text-white/85",
            titleClass: "text-white",
            descriptionClass: "text-white/90",
            eyebrow: "Resultado",
            title: "ACCESO DENEGADO",
            emphasis: "FALTA EMPRESA",
            description: "El vehículo no tiene empresa/contratista asociado. No se puede registrar movimiento.",
        };
    }

    if (!hasAuthorizedChoferes) {
        return {
            containerClass: "border-red-200 bg-red-500",
            eyebrowClass: "text-white/85",
            titleClass: "text-white",
            descriptionClass: "text-white/90",
            eyebrow: "Resultado",
            title: "ACCESO DENEGADO",
            emphasis: "SIN CHOFER AUTORIZADO",
            description: "No hay chofer autorizado para esta patente. El registro queda bloqueado.",
        };
    }

    if (!selectedChofer) {
        return {
            containerClass: "border-red-200 bg-red-500",
            eyebrowClass: "text-white/85",
            titleClass: "text-white",
            descriptionClass: "text-white/90",
            eyebrow: "Resultado",
            title: "VALIDACIÓN INCOMPLETA",
            emphasis: "SELECCIONE CHOFER",
            description: "Elija un chofer autorizado para continuar con ENTRADA o SALIDA.",
        };
    }

    return {
        containerClass: "border-green-200 bg-green-500",
        eyebrowClass: "text-white/85",
        titleClass: "text-white",
        descriptionClass: "text-white/90",
        eyebrow: "Resultado",
        title: "VEHÍCULO CONFIRMADO",
        emphasis: "CONFIRMADO",
        description: "Validación completa. Seleccione portería, tipo de evento y registre el movimiento.",
    };
}

function VehicleDataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
        </div>
    );
}

export function AccessControlV2({ porterias, contextLabel, assignmentBaseHref = null, defaultPorteriaId = null }: AccessControlV2Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [licensePlate, setLicensePlate] = useState("");
    const [vehicle, setVehicle] = useState<VehicleLookup | null>(null);
    const [selectedChoferId, setSelectedChoferId] = useState("");
    const [selectedPorteriaId, setSelectedPorteriaId] = useState("");
    const [selectedEventType, setSelectedEventType] = useState<"" | TipoEventoOption>("");
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!licensePlate.trim()) {
            setLookupError("La patente es obligatoria.");
            setActionError(null);
            setSuccessMessage(null);
            setVehicle(null);
            inputRef.current?.focus();
            return;
        }

        if (porterias.length === 0) {
            setLookupError("Debe registrar al menos una portería antes de usar este módulo.");
            setActionError(null);
            setSuccessMessage(null);
            setVehicle(null);
            return;
        }

        setIsLookingUp(true);
        setLookupError(null);
        setActionError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/access-control-v2/lookup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ licensePlate: sanitizeLicensePlate(licensePlate) }),
            });
            const data = (await response.json()) as LookupResponse & { error?: string };

            if (!response.ok) {
                throw new Error(data.error || "No fue posible buscar la patente.");
            }

            setVehicle(data.vehicle);
            setSelectedChoferId(data.vehicle.choferes.length === 1 ? String(data.vehicle.choferes[0].id) : "");
            setSelectedEventType("");
            setSelectedPorteriaId((currentValue) => getInitialPorteriaId(porterias, data.vehicle, currentValue, defaultPorteriaId));
        } catch (requestError) {
            setVehicle(null);
            setSelectedChoferId("");
            setSelectedEventType("");
            setLookupError(
                requestError instanceof Error
                    ? requestError.message
                    : "No fue posible buscar la patente.",
            );
        } finally {
            setIsLookingUp(false);
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }

    async function handleRegister() {
        if (!vehicle) {
            setActionError("Primero valide una patente.");
            setSuccessMessage(null);
            return;
        }

        if (vehicle.accessStatus !== "YES") {
            setActionError("Acceso denegado. El vehículo está bloqueado.");
            setSuccessMessage(null);
            return;
        }

        if (!vehicle.contratista) {
            setActionError("Acceso denegado. El vehículo no tiene empresa asociada.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedChoferId) {
            setActionError("Seleccione un chofer autorizado antes de registrar.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedPorteriaId) {
            setActionError("Seleccione una portería.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedEventType) {
            setActionError("Seleccione ENTRADA o SALIDA.");
            setSuccessMessage(null);
            return;
        }

        setIsRegistering(true);
        setActionError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/access-control-v2/events", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    vehicleId: vehicle.id,
                    choferId: Number(selectedChoferId),
                    porteriaId: Number(selectedPorteriaId),
                    tipoEvento: selectedEventType,
                }),
            });
            const data = (await response.json()) as RegisterResponse & { error?: string };

            if (!response.ok) {
                throw new Error(data.error || "No fue posible registrar el evento.");
            }

            const nextSelectedPorteriaId = selectedPorteriaId;

            setVehicle(null);
            setLicensePlate("");
            setSelectedChoferId("");
            setSelectedEventType("");
            setSelectedPorteriaId(nextSelectedPorteriaId);
            setSuccessMessage(`${data.message} Pantalla lista para la siguiente patente.`);
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        } catch (requestError) {
            setActionError(
                requestError instanceof Error
                    ? requestError.message
                    : "No fue posible registrar el evento.",
            );
            setSuccessMessage(null);
        } finally {
            setIsRegistering(false);
        }
    }

    const selectedPorteria = porterias.find((porteria) => String(porteria.id) === selectedPorteriaId) ?? null;
    const assignmentHref = assignmentBaseHref && vehicle
        ? `${assignmentBaseHref}?vehicleId=${vehicle.id}#asignaciones`
        : null;
    const selectedChofer = vehicle?.choferes.find((chofer) => String(chofer.id) === selectedChoferId)
        ?? (vehicle?.choferes.length === 1 ? vehicle.choferes[0] : null);
    const hasEnabledAccess = vehicle?.accessStatus === "YES";
    const hasContractor = Boolean(vehicle?.contratista);
    const hasAuthorizedChoferes = (vehicle?.choferes.length ?? 0) > 0;
    const canOperate = Boolean(
        vehicle
        && hasEnabledAccess
        && hasContractor
        && hasAuthorizedChoferes
        && selectedChofer,
    );
    const isRegisterReady = Boolean(canOperate && selectedPorteriaId && selectedEventType);

    const statusView = getAccessStateView({
        vehicle,
        lookupError,
        hasEnabledAccess,
        hasContractor,
        hasAuthorizedChoferes,
        selectedChofer,
    });

    const registerButtonLabel = isRegistering
        ? "Registrando movimiento..."
        : selectedEventType === "ENTRADA"
            ? "Registrar entrada"
            : selectedEventType === "SALIDA"
                ? "Registrar salida"
                : "Registrar movimiento";

    return (
        <section className="panel overflow-hidden">
            <div className="border-b border-slate-200/80 bg-white px-6 py-5 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-700">
                            Portería
                        </p>
                        <h2 className="mt-2 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Control de acceso
                        </h2>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                        Usuario {contextLabel}
                    </span>
                </div>
            </div>

            <div className="space-y-5 p-5 lg:p-7">
                {porterias.length === 0 ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        No hay porterías registradas. Cree una portería antes de operar este módulo.
                    </div>
                ) : null}

                <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]" onSubmit={handleLookup}>
                    <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="field-label" htmlFor="guard-v2-license-plate">
                            Patente
                        </label>
                        <input
                            autoCapitalize="characters"
                            autoComplete="off"
                            autoCorrect="off"
                            className="min-h-[88px] w-full rounded-[20px] border-2 border-slate-200 bg-white px-5 py-4 text-center font-[family:var(--font-heading)] text-4xl uppercase tracking-[0.26em] text-slate-950 shadow-sm transition placeholder:text-slate-300 focus:border-accent-400 focus:ring-4 focus:ring-accent-100 md:text-5xl"
                            id="guard-v2-license-plate"
                            inputMode="text"
                            onChange={(event) => {
                                setLicensePlate(sanitizeLicensePlate(event.target.value));
                                setLookupError(null);
                                setActionError(null);
                                setSuccessMessage(null);
                            }}
                            placeholder="ABC123"
                            ref={inputRef}
                            spellCheck={false}
                            type="text"
                            value={licensePlate}
                        />
                    </div>

                    <button
                        className="inline-flex min-h-[132px] items-center justify-center rounded-[26px] bg-accent-700 px-8 py-6 text-lg font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-accent-800 focus:ring-4 focus:ring-accent-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLookingUp || porterias.length === 0}
                        type="submit"
                    >
                        {isLookingUp ? "Validando..." : "Validar acceso"}
                    </button>
                </form>

                {lookupError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {lookupError}
                    </div>
                ) : null}

                {actionError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {actionError}
                    </div>
                ) : null}

                {successMessage ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        {successMessage}
                    </div>
                ) : null}

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                    <article className={`rounded-[30px] border px-8 py-10 text-center shadow-sm ${statusView.containerClass}`}>
                        <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${statusView.eyebrowClass}`}>
                            {statusView.eyebrow}
                        </p>
                        <p className={`mt-5 font-[family:var(--font-heading)] text-4xl font-bold uppercase tracking-[0.15em] sm:text-5xl lg:text-6xl ${statusView.titleClass}`}>
                            {statusView.title}
                        </p>
                        <p className={`mt-4 text-2xl font-bold uppercase tracking-[0.2em] sm:text-3xl ${statusView.titleClass}`}>
                            {statusView.emphasis}
                        </p>
                        <p className={`mx-auto mt-5 max-w-2xl text-base leading-7 ${statusView.descriptionClass}`}>
                            {statusView.description}
                        </p>
                    </article>

                    <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Datos del vehículo
                        </p>

                        {vehicle ? (
                            <div className="mt-4 space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <VehicleDataRow label="Patente" value={vehicle.licensePlate} />
                                    <VehicleDataRow label="Código interno" value={vehicle.codigoInterno} />
                                    <VehicleDataRow label="Tipo de vehículo" value={vehicle.vehicleType} />
                                    <VehicleDataRow label="Marca" value={vehicle.brand} />
                                    <div className="sm:col-span-2">
                                        <VehicleDataRow
                                            label="Empresa"
                                            value={vehicle.contratista?.razonSocial ?? vehicle.company}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Chofer autorizado
                                    </p>

                                    {vehicle.choferes.length === 0 ? (
                                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-medium text-red-700">
                                            No hay chofer autorizado para esta patente.
                                        </div>
                                    ) : null}

                                    {vehicle.choferes.length > 1 ? (
                                        <div className="mt-3 space-y-2">
                                            <label className="field-label" htmlFor="authorized-chofer">
                                                Seleccione chofer
                                            </label>
                                            <select
                                                className="input-base min-h-[58px] text-base"
                                                id="authorized-chofer"
                                                onChange={(event) => {
                                                    setSelectedChoferId(event.target.value);
                                                    setActionError(null);
                                                }}
                                                value={selectedChoferId}
                                            >
                                                <option value="">Seleccione un chofer autorizado</option>
                                                {vehicle.choferes.map((chofer) => (
                                                    <option key={chofer.id} value={chofer.id}>
                                                        {chofer.nombre} · {chofer.rut}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null}

                                    {vehicle.choferes.length === 1 && selectedChofer ? (
                                        <p className="mt-3 text-sm text-slate-600">
                                            Se seleccionó automáticamente: <span className="font-semibold text-slate-900">{selectedChofer.nombre}</span>
                                        </p>
                                    ) : null}

                                    {selectedChofer ? (
                                        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                                                Chofer seleccionado
                                            </p>
                                            <p className="mt-2 text-base font-semibold text-green-900">{selectedChofer.nombre}</p>
                                            <p className="mt-1 text-sm text-green-800">RUT: {selectedChofer.rut}</p>
                                        </div>
                                    ) : vehicle.choferes.length > 1 ? (
                                        <p className="mt-3 text-sm text-slate-600">
                                            Seleccione el chofer que está operando el vehículo.
                                        </p>
                                    ) : null}

                                    {vehicle.choferes.length === 0 && assignmentHref ? (
                                        <div className="mt-3">
                                            <Link className="button-secondary min-h-[48px] px-4 py-2.5" href={assignmentHref}>
                                                Ir a asignaciones
                                            </Link>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                                Aquí verá patente, código interno, tipo, marca, empresa y chofer cuando valide una patente.
                            </div>
                        )}
                    </aside>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)_minmax(320px,0.95fr)]">
                    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Portería
                        </p>
                        <select
                            className="input-base mt-4 min-h-[62px] text-base font-semibold"
                            disabled={!vehicle}
                            onChange={(event) => {
                                setSelectedPorteriaId(event.target.value);
                                setActionError(null);
                            }}
                            value={selectedPorteriaId}
                        >
                            <option value="">Seleccione una portería</option>
                            {porterias.map((porteria) => (
                                <option key={porteria.id} value={porteria.id}>
                                    {porteria.nombre}{porteria.telefono ? ` · ${porteria.telefono}` : ""}
                                </option>
                            ))}
                        </select>
                        <p className="mt-3 text-sm text-slate-600">
                            {selectedPorteria
                                ? `Portería seleccionada: ${selectedPorteria.nombre}.`
                                : "Seleccione la portería antes de registrar."}
                        </p>
                    </div>

                    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Tipo de evento
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {(["ENTRADA", "SALIDA"] as const).map((eventType) => {
                                const isSelected = selectedEventType === eventType;
                                const isDisabled = !canOperate;

                                return (
                                    <button
                                        className={`min-h-[98px] rounded-[22px] border px-5 py-4 text-left transition ${isSelected
                                            ? eventType === "ENTRADA"
                                                ? "border-green-300 bg-green-50 text-green-700"
                                                : "border-sky-300 bg-sky-50 text-sky-700"
                                            : isDisabled
                                                ? "border-slate-200 bg-slate-100 text-slate-400"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                        disabled={isDisabled}
                                        key={eventType}
                                        onClick={() => {
                                            setSelectedEventType(eventType);
                                            setActionError(null);
                                        }}
                                        type="button"
                                    >
                                        <p className="text-lg font-bold uppercase tracking-[0.16em]">{eventType}</p>
                                        <p className="mt-2 text-sm">
                                            {eventType === "ENTRADA"
                                                ? "Registrar ingreso al recinto."
                                                : "Registrar salida del recinto."}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Registro final
                        </p>
                        <button
                            className="mt-4 inline-flex min-h-[112px] w-full items-center justify-center rounded-[22px] bg-slate-950 px-6 py-5 text-xl font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!isRegisterReady || isRegistering || porterias.length === 0}
                            onClick={handleRegister}
                            type="button"
                        >
                            {registerButtonLabel}
                        </button>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            {!vehicle
                                ? "Primero valide la patente."
                                : !selectedEventType
                                    ? "Seleccione ENTRADA o SALIDA para habilitar el registro."
                                    : selectedEventType === "ENTRADA"
                                        ? "Se registrará una entrada en historial."
                                        : "Se registrará una salida en historial."}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
