"use client";

import { useEffect, useRef, useState } from "react";

import { type EstadoOperativoVehiculo } from "@/lib/access-control/constants";
import {
    getOperationalStateLabel,
    getTipoEventoLabel,
} from "@/lib/access-control/state-utils";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
    orden?: number;
};

type TipoEventoOption = "ENTRADA" | "SALIDA";
type EstadoRecintoOption = "DENTRO" | "FUERA" | "EN_TRANSITO" | null;
type EstadoOperativoOption = EstadoOperativoVehiculo;

type MovementSummary = {
    currentCycleType: TipoEventoOption | null;
    currentCycleCount: number;
    requiredMovements: number;
    remainingMovements: number;
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
    estadoOperativo: EstadoOperativoOption;
    contratista: {
        id: number;
        razonSocial: string;
        rut: string;
        contacto: string | null;
        telefono: string | null;
    } | null;
    ultimoEvento: {
        tipoEvento: TipoEventoOption;
        fechaHora: string;
        operadoPorUsername: string | null;
        operadoPorRole: "ADMIN" | "USER" | null;
        operadoPorPorteriaNombre: string | null;
        observacion: string | null;
        porteria: {
            id: number;
            nombre: string;
        };
    } | null;
    movementSummary: MovementSummary;
};

type LookupResponse = {
    vehicle: VehicleLookup;
};

type RegisterResponse = {
    message: string;
    estadoRecinto: Exclude<EstadoRecintoOption, null>;
    estadoOperativo: EstadoOperativoOption;
    ultimoEvento: NonNullable<VehicleLookup["ultimoEvento"]>;
    movementSummary: MovementSummary;
    stateChangedTo?: EstadoOperativoOption | null;
};

type AccessControlV2Props = {
    porterias: PorteriaOption[];
    contextLabel: string;
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
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const guardDateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

function formatGuardDateTime(value: string) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return guardDateTimeFormatter.format(parsed);
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
}: {
    vehicle: VehicleLookup | null;
    lookupError: string | null;
    hasEnabledAccess: boolean;
    hasContractor: boolean;
}): AccessStateView {
    if (!vehicle) {
        if (lookupError) {
            return {
                containerClass: "border-red-200 bg-red-500",
                eyebrowClass: "text-white/85",
                titleClass: "text-white",
                descriptionClass: "text-white/90",
                eyebrow: "Resultado",
                title: "Acceso denegado",
                emphasis: "No autorizado",
                description: lookupError,
            };
        }

        return {
            containerClass: "border-slate-200 bg-slate-100",
            eyebrowClass: "text-slate-500",
            titleClass: "text-slate-800",
            descriptionClass: "text-slate-600",
            eyebrow: "Estado inicial",
            title: "Listo para validar",
            emphasis: "Ingrese patente",
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
            title: "Acceso denegado",
            emphasis: "Vehículo bloqueado",
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
            title: "Acceso denegado",
            emphasis: "Falta contratista",
            description: "El vehículo no tiene empresa/contratista asociado. No se puede registrar movimiento.",
        };
    }

    return {
        containerClass: "border-green-200 bg-green-500",
        eyebrowClass: "text-white/85",
        titleClass: "text-white",
        descriptionClass: "text-white/90",
        eyebrow: "Resultado",
        title: "VEHÍCULO CONFIRMADO",
        emphasis: "PATENTE ENCONTRADA",
        description: "Seleccione portería, ENTRADA o SALIDA y registre el movimiento.",
    };
}

function getOperationalStateClasses(estadoOperativo: EstadoOperativoOption) {
    if (estadoOperativo === "EN_FAENA") {
        return "bg-green-100 text-green-700";
    }

    if (estadoOperativo === "FUERA_DE_FAENA") {
        return "bg-sky-100 text-sky-700";
    }

    return "bg-amber-100 text-amber-700";
}

function VehicleDataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
        </div>
    );
}

export function AccessControlV2({ porterias, contextLabel, defaultPorteriaId = null }: AccessControlV2Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [licensePlate, setLicensePlate] = useState("");
    const [vehicle, setVehicle] = useState<VehicleLookup | null>(null);
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
            setSelectedEventType("");
            setSelectedPorteriaId((currentValue) => getInitialPorteriaId(porterias, data.vehicle, currentValue, defaultPorteriaId));
        } catch (requestError) {
            setVehicle(null);
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

        if (!selectedPorteriaId) {
            setActionError("Seleccione portería.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedEventType) {
            setActionError("Seleccione entrada o salida.");
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
                    porteriaId: Number(selectedPorteriaId),
                    tipoEvento: selectedEventType,
                }),
            });
            const data = (await response.json()) as RegisterResponse & { error?: string };

            if (!response.ok) {
                throw new Error(data.error || "No fue posible registrar el evento.");
            }

            const nextSelectedPorteriaId = selectedPorteriaId;
            const estadoLabel = getOperationalStateLabel(data.estadoOperativo);
            const progressLabel = data.movementSummary.currentCycleType
                ? `${getTipoEventoLabel(data.movementSummary.currentCycleType)} ${data.movementSummary.currentCycleCount}/${data.movementSummary.requiredMovements}`
                : null;
            const stateChangeMessage = data.stateChangedTo
                ? ` Estado actualizado a ${getOperationalStateLabel(data.stateChangedTo)}.`
                : ` Estado actual: ${estadoLabel}.`;

            setVehicle(null);
            setLicensePlate("");
            setSelectedEventType("");
            setSelectedPorteriaId(nextSelectedPorteriaId);
            setSuccessMessage(`Movimiento registrado correctamente.${stateChangeMessage}${progressLabel ? ` ${progressLabel}.` : ""} Pantalla lista para la siguiente patente.`);
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
    const hasEnabledAccess = vehicle?.accessStatus === "YES";
    const hasContractor = Boolean(vehicle?.contratista);
    const canOperate = Boolean(
        vehicle
        && hasEnabledAccess
        && hasContractor,
    );
    const isRegisterReady = Boolean(canOperate && selectedPorteriaId && selectedEventType);

    const statusView = getAccessStateView({
        vehicle,
        lookupError,
        hasEnabledAccess,
        hasContractor,
    });

    const registerButtonLabel = isRegistering
        ? "Registrando movimiento..."
        : "Registrar movimiento";
    const registerButtonTone = !isRegisterReady || isRegistering || porterias.length === 0
        ? "bg-slate-950 hover:bg-slate-800 focus:ring-slate-200"
        : selectedEventType === "ENTRADA"
            ? "bg-green-700 hover:bg-green-800 focus:ring-green-100"
            : selectedEventType === "SALIDA"
                ? "bg-red-700 hover:bg-red-800 focus:ring-red-100"
                : "bg-slate-950 hover:bg-slate-800 focus:ring-slate-200";

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
                                    <VehicleDataRow label="Número interno" value={vehicle.codigoInterno} />
                                    <VehicleDataRow label="Tipo de vehículo" value={vehicle.vehicleType} />
                                    <VehicleDataRow label="Estado actual" value={getOperationalStateLabel(vehicle.estadoOperativo)} />
                                    <div className="sm:col-span-2">
                                        <VehicleDataRow
                                            label="Contratista"
                                            value={vehicle.contratista?.razonSocial ?? vehicle.company}
                                        />
                                    </div>
                                    <VehicleDataRow
                                        label="Última portería"
                                        value={vehicle.ultimoEvento?.porteria.nombre ?? "Sin registro"}
                                    />
                                    <VehicleDataRow
                                        label="Último movimiento"
                                        value={vehicle.ultimoEvento
                                            ? `${vehicle.ultimoEvento.tipoEvento} · ${formatGuardDateTime(vehicle.ultimoEvento.fechaHora)}`
                                            : "Sin registro"}
                                    />
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Estado actual del vehículo
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-3">
                                        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${getOperationalStateClasses(vehicle.estadoOperativo)}`}>
                                            {getOperationalStateLabel(vehicle.estadoOperativo)}
                                        </span>
                                        <span className="text-sm text-slate-600">
                                            {vehicle.movementSummary.currentCycleType
                                                ? `${getTipoEventoLabel(vehicle.movementSummary.currentCycleType)} ${vehicle.movementSummary.currentCycleCount}/${vehicle.movementSummary.requiredMovements}`
                                                : "Sin movimientos previos"}
                                        </span>
                                    </div>
                                    {vehicle.ultimoEvento ? (
                                        <>
                                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                Último movimiento
                                            </p>
                                            <p className="mt-1 text-sm text-slate-700 font-semibold">
                                                {vehicle.ultimoEvento.tipoEvento} · {vehicle.ultimoEvento.porteria.nombre}
                                            </p>

                                            {vehicle.ultimoEvento.observacion ? (
                                                <>
                                                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                        Observación
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-700">
                                                        {vehicle.ultimoEvento.observacion}
                                                    </p>
                                                </>
                                            ) : null}
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                                Aqui vera patente, numero interno, contratista, tipo de vehiculo, estado actual y ultimo movimiento cuando valide una patente.
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
                                        className={`min-h-[112px] rounded-[22px] border px-5 py-4 text-left transition ${isSelected
                                            ? eventType === "ENTRADA"
                                                ? "border-green-700 bg-green-700 text-white ring-2 ring-green-200 shadow-[0_20px_45px_rgba(21,128,61,0.28)]"
                                                : "border-red-700 bg-red-700 text-white ring-2 ring-red-200 shadow-[0_20px_45px_rgba(185,28,28,0.28)]"
                                            : isDisabled
                                                ? "border-slate-200 bg-slate-100 text-slate-400"
                                                : eventType === "ENTRADA"
                                                    ? "border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50 hover:text-green-800 hover:shadow-sm"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800 hover:shadow-sm"
                                            }`}
                                        disabled={isDisabled}
                                        key={eventType}
                                        onClick={() => {
                                            setSelectedEventType(eventType);
                                            setActionError(null);
                                        }}
                                        type="button"
                                    >
                                        <p className="text-xl font-bold uppercase tracking-[0.16em]">{eventType}</p>
                                        <p className="mt-2 text-sm">
                                            {eventType === "ENTRADA"
                                                ? "Registrar entrada del vehículo."
                                                : "Registrar salida del vehículo."}
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
                            className={`mt-4 inline-flex min-h-[112px] w-full items-center justify-center rounded-[22px] px-6 py-5 text-xl font-bold uppercase tracking-[0.16em] text-white shadow-sm transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${registerButtonTone}`}
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
                                    ? "Seleccione entrada o salida para habilitar el registro."
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
