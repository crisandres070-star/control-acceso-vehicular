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

function sanitizeLicensePlate(value: string) {
    return value.toUpperCase();
}

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

function getEstadoRecintoLabel(value: EstadoRecintoOption) {
    if (value === "DENTRO") {
        return "Dentro";
    }

    if (value === "FUERA") {
        return "Fuera";
    }

    return "Sin estado";
}

function getEstadoRecintoClasses(value: EstadoRecintoOption) {
    if (value === "DENTRO") {
        return "border-green-200 bg-green-50 text-green-700";
    }

    if (value === "FUERA") {
        return "border-slate-200 bg-slate-100 text-slate-700";
    }

    return "border-amber-200 bg-amber-50 text-amber-700";
}

function getAccessStatusClasses(value: string) {
    return value === "YES"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-red-200 bg-red-50 text-red-700";
}

function formatOperatorRole(value: "ADMIN" | "USER" | null) {
    if (value === "ADMIN") {
        return "Administrador";
    }

    if (value === "USER") {
        return "Portería";
    }

    return "No informado";
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
            setLookupError("Debe registrar al menos una portería antes de usar el Control de Acceso V2.");
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
            setActionError("Busque una patente registrada antes de registrar un evento.");
            setSuccessMessage(null);
            return;
        }

        if (vehicle.accessStatus !== "YES") {
            setActionError("El vehículo está bloqueado para acceso. Revise su estado en administración antes de registrar un movimiento.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedChoferId) {
            setActionError("Seleccione un chofer autorizado antes de registrar el acceso.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedPorteriaId) {
            setActionError("Debe seleccionar una portería.");
            setSuccessMessage(null);
            return;
        }

        if (!selectedEventType) {
            setActionError("Debe seleccionar el tipo de evento.");
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
    const isRegisterReady = Boolean(
        vehicle
        && hasEnabledAccess
        && hasContractor
        && selectedChofer
        && selectedPorteriaId
        && selectedEventType,
    );
    const workflowStatus = !vehicle
        ? null
        : !hasEnabledAccess
            ? {
                containerClass: "border-red-200 bg-red-50 text-red-700",
                title: "Vehículo bloqueado",
                description: "La patente existe, pero el padrón indica acceso bloqueado. No continúe al registro hasta corregir su estado en administración.",
            }
            : !hasContractor
                ? {
                    containerClass: "border-amber-200 bg-amber-50 text-amber-800",
                    title: "Falta contratista asociado",
                    description: "El vehículo fue encontrado, pero todavía no tiene contratista asociado. El registro de eventos queda bloqueado hasta corregir esa relación.",
                }
                : vehicle.choferes.length === 0
                    ? {
                        containerClass: "border-amber-200 bg-amber-50 text-amber-800",
                        title: "Falta chofer autorizado",
                        description: "Antes de registrar ENTRADA o SALIDA debe existir al menos un chofer autorizado asociado a esta patente.",
                    }
                    : !selectedChofer
                        ? {
                            containerClass: "border-amber-200 bg-amber-50 text-amber-800",
                            title: "Confirme el chofer",
                            description: "La patente ya fue validada. Ahora seleccione el chofer autorizado que realmente está operando el vehículo.",
                        }
                        : !selectedPorteriaId
                            ? {
                                containerClass: "border-amber-200 bg-amber-50 text-amber-800",
                                title: "Seleccione la portería",
                                description: "El siguiente paso es indicar desde qué portería quedará registrado el movimiento.",
                            }
                            : !selectedEventType
                                ? {
                                    containerClass: "border-sky-200 bg-sky-50 text-sky-800",
                                    title: "Seleccione ENTRADA o SALIDA",
                                    description: "Con el chofer y la portería confirmados, elija el tipo de movimiento para habilitar el registro final.",
                                }
                                : {
                                    containerClass: "border-green-200 bg-green-50 text-green-700",
                                    title: "Listo para registrar",
                                    description: "La validación operativa ya está completa. Puede registrar el movimiento final para esta patente.",
                                };
    const registerButtonLabel = isRegistering
        ? "Registrando evento..."
        : !vehicle
            ? "Busque una patente"
            : !hasEnabledAccess
                ? "Vehículo bloqueado"
                : !hasContractor
                    ? "Asigne contratista"
                    : vehicle.choferes.length === 0
                        ? "Falta chofer autorizado"
                        : !selectedChofer
                            ? "Seleccione chofer"
                            : !selectedPorteriaId
                                ? "Seleccione portería"
                                : !selectedEventType
                                    ? "Seleccione entrada o salida"
                                    : selectedEventType === "ENTRADA"
                                        ? "Registrar entrada"
                                        : "Registrar salida";
    const workflowCards = vehicle
        ? [
            {
                title: "1. Patente encontrada",
                description: `${vehicle.licensePlate} · ${vehicle.company}`,
                classes: "border-sky-200 bg-sky-50 text-sky-800",
            },
            {
                title: "2. Chofer seleccionado",
                description: selectedChofer
                    ? `${selectedChofer.nombre} · ${selectedChofer.rut}`
                    : vehicle.choferes.length === 0
                        ? "Sin choferes autorizados para continuar."
                        : "Seleccione un chofer autorizado antes de registrar el acceso.",
                classes: selectedChofer
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-amber-200 bg-amber-50 text-amber-800",
            },
            {
                title: "3. Listo para registrar",
                description: isRegisterReady
                    ? `${selectedEventType === "ENTRADA" ? "Entrada" : "Salida"} lista para registrar en ${selectedPorteria?.nombre ?? "la portería seleccionada"}.`
                    : selectedChofer
                        ? "Seleccione portería y tipo de evento para habilitar el registro final."
                        : "El registro final se habilita solo después de seleccionar chofer.",
                classes: isRegisterReady
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-slate-200 bg-slate-50 text-slate-700",
            },
        ]
        : [];

    return (
        <section className="panel overflow-hidden">
            <div className="border-b border-slate-200/70 bg-slate-950 px-6 py-6 text-white lg:px-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                    Portería inteligente
                </p>
                <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold lg:text-4xl">
                    Control de acceso V2
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80 lg:text-base">
                    Busque una patente, confirme el chofer autorizado, seleccione la portería y registre ENTRADA o SALIDA con trazabilidad completa en EventoAcceso.
                </p>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                    Contexto {contextLabel}
                </div>
            </div>

            <div className="space-y-6 p-6 lg:p-8">
                {porterias.length === 0 ? (
                    <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm font-medium leading-6 text-amber-800">
                        No hay porterías registradas. Cree al menos una portería en administración antes de usar este módulo.
                    </div>
                ) : null}

                <form className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]" onSubmit={handleLookup}>
                    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                        <label className="field-label" htmlFor="guard-v2-license-plate">
                            Patente
                        </label>
                        <input
                            autoCapitalize="characters"
                            autoComplete="off"
                            autoCorrect="off"
                            className="min-h-[92px] w-full rounded-[22px] border-2 border-slate-200 bg-white px-5 py-4 text-center font-[family:var(--font-heading)] text-4xl uppercase tracking-[0.28em] text-slate-950 shadow-sm transition placeholder:text-slate-300 focus:border-accent-400 focus:ring-4 focus:ring-accent-100 md:text-5xl"
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
                        className="inline-flex min-h-[132px] items-center justify-center rounded-[28px] bg-accent-700 px-8 py-6 text-lg font-bold uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-accent-800 focus:ring-4 focus:ring-accent-100 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isLookingUp || porterias.length === 0}
                        type="submit"
                    >
                        {isLookingUp ? "Buscando..." : "Buscar / validar"}
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

                {vehicle ? (
                    <div className="space-y-6">
                        <div className="grid gap-4 lg:grid-cols-3">
                            {workflowCards.map((card) => (
                                <div className={`rounded-[24px] border px-4 py-4 shadow-sm ${card.classes}`} key={card.title}>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Flujo operativo</p>
                                    <p className="mt-3 text-lg font-bold text-current">{card.title}</p>
                                    <p className="mt-2 text-sm leading-6 text-current opacity-90">{card.description}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Patente</p>
                                        <p className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold tracking-[0.2em] text-slate-950">
                                            {vehicle.licensePlate}
                                        </p>
                                        <p className="mt-3 text-sm text-slate-500">Número interno: {vehicle.codigoInterno}</p>
                                    </div>

                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Estado recinto</p>
                                        <div className={`mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] ${getEstadoRecintoClasses(vehicle.estadoRecinto)}`}>
                                            {getEstadoRecintoLabel(vehicle.estadoRecinto)}
                                        </div>
                                        <div className={`mt-3 inline-flex rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] ${getAccessStatusClasses(vehicle.accessStatus)}`}>
                                            Estado padrón {vehicle.accessStatus === "YES" ? "habilitado" : "bloqueado"}
                                        </div>
                                    </div>

                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Contratista</p>
                                        {vehicle.contratista ? (
                                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-2xl font-bold text-slate-950">{vehicle.contratista.razonSocial}</p>
                                                    <p className="mt-2 text-sm text-slate-600">RUT: {vehicle.contratista.rut}</p>
                                                </div>
                                                <div className="text-sm text-slate-600">
                                                    <p>Contacto: {vehicle.contratista.contacto ?? "Sin contacto"}</p>
                                                    <p className="mt-2">Teléfono: {vehicle.contratista.telefono ?? "Sin teléfono"}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
                                                El vehículo existe, pero no tiene contratista asociado. No podrá registrar eventos hasta completar esa asignación en administración.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ficha del vehículo</p>
                                            <h3 className="mt-3 text-2xl font-bold text-slate-950">{vehicle.name}</h3>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                            <p>Empresa: {vehicle.company}</p>
                                            <p className="mt-2">Tipo: {vehicle.vehicleType}</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Marca</p>
                                            <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.brand}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Modelo</p>
                                            <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.modelo ?? "Sin modelo"}</p>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Choferes autorizados</p>
                                            <p className="mt-2 text-lg font-semibold text-slate-950">{vehicle.choferes.length}</p>
                                            {assignmentHref ? (
                                                <div className="mt-4">
                                                    <Link className="button-secondary" href={assignmentHref}>
                                                        Gestionar asignaciones
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Portería actual</p>
                                        <p className="mt-3 text-2xl font-bold text-slate-950">
                                            {selectedPorteria?.nombre ?? vehicle.ultimoEvento?.porteria.nombre ?? "Sin seleccionar"}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-600">
                                            {selectedPorteria
                                                ? `Portería preparada para registrar el próximo evento.`
                                                : "Seleccione una portería para continuar."}
                                        </p>
                                    </div>

                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Último movimiento V2</p>
                                        {vehicle.ultimoEvento ? (
                                            <div className="mt-3 text-sm text-slate-600">
                                                <p className="text-lg font-semibold text-slate-950">{vehicle.ultimoEvento.tipoEvento}</p>
                                                <p className="mt-2">Portería: {vehicle.ultimoEvento.porteria.nombre}</p>
                                                <p className="mt-2">Chofer: {vehicle.ultimoEvento.chofer?.nombre ?? "Sin chofer"}</p>
                                                <p className="mt-2">Operador: {vehicle.ultimoEvento.operadoPorUsername ?? "No informado"}</p>
                                                <p className="mt-2">Rol operador: {formatOperatorRole(vehicle.ultimoEvento.operadoPorRole)}</p>
                                                {vehicle.ultimoEvento.operadoPorPorteriaNombre ? (
                                                    <p className="mt-2">Cuenta asociada a: {vehicle.ultimoEvento.operadoPorPorteriaNombre}</p>
                                                ) : null}
                                                <p className="mt-2">Fecha: {formatDateTime(vehicle.ultimoEvento.fechaHora)}</p>
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-sm text-slate-600">Aún no existen movimientos V2 para esta patente.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {workflowStatus ? (
                                    <div className={`rounded-[28px] border px-5 py-5 shadow-sm ${workflowStatus.containerClass}`}>
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">Estado operativo</p>
                                        <p className="mt-3 text-2xl font-bold text-current">{workflowStatus.title}</p>
                                        <p className="mt-3 text-sm leading-6 text-current opacity-90">{workflowStatus.description}</p>
                                    </div>
                                ) : null}

                                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Portería para registrar</p>
                                    <select
                                        className="input-base mt-4 min-h-[64px] text-base font-semibold"
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
                                </div>

                                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Chofer para registrar</p>
                                            <p className="mt-2 text-sm text-slate-600">El guardia debe confirmar el chofer autorizado que realmente está operando este acceso.</p>
                                        </div>
                                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                                            {vehicle.choferes.length === 1
                                                ? "1 chofer"
                                                : `${vehicle.choferes.length} choferes`}
                                        </span>
                                    </div>

                                    {vehicle.choferes.length > 0 ? (
                                        <div className="mt-5 space-y-4">
                                            {vehicle.choferes.length > 1 ? (
                                                <div className="space-y-2">
                                                    <label className="field-label" htmlFor="authorized-chofer">
                                                        Chofer autorizado
                                                    </label>
                                                    <select
                                                        className="input-base min-h-[64px] text-base"
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
                                            ) : (
                                                <div className="rounded-[22px] border border-accent-100 bg-accent-50/60 px-4 py-4 text-sm text-accent-800">
                                                    Este vehículo tiene un solo chofer autorizado y quedó seleccionado automáticamente. Verifique el nombre visible antes de registrar el acceso.
                                                </div>
                                            )}

                                            {selectedChofer ? (
                                                <div className="rounded-[24px] border border-accent-100 bg-white px-4 py-4 shadow-sm">
                                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
                                                        Chofer seleccionado
                                                    </p>
                                                    <p className="mt-2 text-xl font-semibold text-slate-950">{selectedChofer.nombre}</p>
                                                    <p className="mt-2 text-sm text-slate-600">RUT: {selectedChofer.rut}</p>
                                                </div>
                                            ) : (
                                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                                                    Seleccione un chofer autorizado antes de registrar el acceso.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
                                            <p>Este vehículo no tiene choferes autorizados. Asigne uno o más choferes antes de registrar acceso.</p>
                                            {assignmentHref ? (
                                                <div className="mt-4">
                                                    <Link className="button-secondary" href={assignmentHref}>
                                                        Ir a asignaciones
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Tipo de evento</p>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        {(["ENTRADA", "SALIDA"] as const).map((eventType) => {
                                            const isSelected = selectedEventType === eventType;
                                            const isDisabled = !selectedChofer || !hasEnabledAccess || !hasContractor;

                                            return (
                                                <button
                                                    className={`min-h-[88px] rounded-[24px] border px-5 py-4 text-left transition ${isSelected
                                                        ? eventType === "ENTRADA"
                                                            ? "border-green-300 bg-green-50 text-green-700 shadow-sm"
                                                            : "border-sky-300 bg-sky-50 text-sky-700 shadow-sm"
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
                                                            ? "Actualiza el estado del vehículo a DENTRO."
                                                            : "Actualiza el estado del vehículo a FUERA."}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    className="inline-flex min-h-[96px] w-full items-center justify-center rounded-[28px] bg-slate-950 px-8 py-5 text-lg font-bold uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={!isRegisterReady || isRegistering || porterias.length === 0}
                                    onClick={handleRegister}
                                    type="button"
                                >
                                    {registerButtonLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm leading-6 text-slate-600">
                        Busque una patente para ver el vehículo, el contratista, la portería actual, los choferes autorizados y registrar un nuevo movimiento V2.
                    </div>
                )}
            </div>
        </section>
    );
}