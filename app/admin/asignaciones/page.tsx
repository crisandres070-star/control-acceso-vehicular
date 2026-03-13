import Link from "next/link";

import {
    assignSelectedChoferesToVehicleAction,
    removeChoferFromVehicleAction,
} from "@/app/admin/asignaciones/actions";
import { prisma } from "@/lib/prisma";
import { getQueryStringValue } from "@/lib/utils";

type VehicleListItem = {
    id: number;
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    company: string;
    contratistaId: number | null;
    contratista: {
        id: number;
        razonSocial: string;
    } | null;
    _count: {
        vehiculoChoferes: number;
    };
};

type ContratistaFilterItem = {
    id: number;
    razonSocial: string;
};

type AssignedChoferItem = {
    id: number;
    nombre: string;
    rut: string;
    codigoInterno: string | null;
    contratistaId: number;
    contratista: {
        razonSocial: string;
    };
    _count: {
        vehiculoChoferes: number;
    };
};

type SelectedVehicleItem = VehicleListItem & {
    vehiculoChoferes: Array<{
        choferId: number;
        chofer: AssignedChoferItem;
    }>;
};

type AsignacionesPageProps = {
    searchParams: {
        vehicleId?: string | string[];
        contratistaId?: string | string[];
        success?: string | string[];
        error?: string | string[];
    };
};

function parsePositiveInteger(value: string | string[] | undefined) {
    const normalized = getQueryStringValue(value);
    const parsed = Number(normalized);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildVehicleOptionLabel(vehicle: VehicleListItem) {
    return `${vehicle.licensePlate} · ${vehicle.codigoInterno} · ${vehicle.contratista?.razonSocial ?? vehicle.company}`;
}

export default async function AsignacionesPage({ searchParams }: AsignacionesPageProps) {
    const selectedVehicleId = parsePositiveInteger(searchParams.vehicleId);
    const requestedContratistaFilter = getQueryStringValue(searchParams.contratistaId) ?? "";
    const parsedContratistaFilter = parsePositiveInteger(requestedContratistaFilter);
    const success = getQueryStringValue(searchParams.success);
    const error = getQueryStringValue(searchParams.error);

    const [vehicleRecords, contratistaRecords, totalChoferes] = await Promise.all([
        prisma.vehicle.findMany({
            include: {
                contratista: {
                    select: {
                        id: true,
                        razonSocial: true,
                    },
                },
                _count: {
                    select: {
                        vehiculoChoferes: true,
                    },
                },
            },
            orderBy: [{ licensePlate: "asc" }],
        }),
        prisma.contratista.findMany({
            select: {
                id: true,
                razonSocial: true,
            },
            orderBy: [{ razonSocial: "asc" }],
        }),
        prisma.chofer.count(),
    ]);

    const vehicles = vehicleRecords as VehicleListItem[];
    const contratistas = contratistaRecords as ContratistaFilterItem[];

    let selectedVehicle: SelectedVehicleItem | null = null;
    let selectedVehicleError: string | null = null;
    let assignedChoferes: AssignedChoferItem[] = [];
    let availableChoferes: AssignedChoferItem[] = [];

    if (selectedVehicleId !== null) {
        const vehicleRecord = await prisma.vehicle.findUnique({
            where: { id: selectedVehicleId },
            include: {
                contratista: {
                    select: {
                        id: true,
                        razonSocial: true,
                    },
                },
                _count: {
                    select: {
                        vehiculoChoferes: true,
                    },
                },
                vehiculoChoferes: {
                    include: {
                        chofer: {
                            include: {
                                contratista: {
                                    select: {
                                        razonSocial: true,
                                    },
                                },
                                _count: {
                                    select: {
                                        vehiculoChoferes: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        selectedVehicle = vehicleRecord as SelectedVehicleItem | null;

        if (!selectedVehicle) {
            selectedVehicleError = "El vehículo seleccionado ya no existe.";
        }
    }

    const selectedVehicleContratistaId = selectedVehicle?.contratistaId ?? null;
    const activeContratistaFilter = !selectedVehicle
        ? "ALL"
        : selectedVehicleContratistaId
            ? String(selectedVehicleContratistaId)
            : requestedContratistaFilter === "ALL"
                ? "ALL"
                : parsedContratistaFilter
                    ? String(parsedContratistaFilter)
                    : "ALL";

    if (selectedVehicle) {
        assignedChoferes = selectedVehicle.vehiculoChoferes
            .map((assignment) => assignment.chofer)
            .sort((left, right) => left.nombre.localeCompare(right.nombre, "es"));

        if (selectedVehicleContratistaId) {
            const assignedChoferIds = assignedChoferes.map((chofer) => chofer.id);
            const availableWhere = {
                contratistaId: selectedVehicleContratistaId,
                ...(assignedChoferIds.length > 0
                    ? {
                        id: {
                            notIn: assignedChoferIds,
                        },
                    }
                    : {}),
            };

            const availableRecords = await prisma.chofer.findMany({
                where: availableWhere,
                include: {
                    contratista: {
                        select: {
                            razonSocial: true,
                        },
                    },
                    _count: {
                        select: {
                            vehiculoChoferes: true,
                        },
                    },
                },
                orderBy: [{ nombre: "asc" }],
            });

            availableChoferes = availableRecords as AssignedChoferItem[];
        }
    }

    const choferesAsignadosCount = assignedChoferes.length;
    const choferesDisponiblesCount = availableChoferes.length;
    const pageError = selectedVehicleError ?? error;

    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Vínculo manual
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Asignaciones vehículo ↔ chofer
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            Autorice manualmente choferes por vehículo. Un vehículo puede tener varios choferes autorizados y un chofer puede operar en varios vehículos de la misma empresa.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin/choferes/nuevo">
                            Crear chofer
                        </Link>
                        <Link className="button-secondary" href="/admin/vehiculos/nuevo">
                            Crear vehículo
                        </Link>
                        <Link className="button-secondary" href="/admin">
                            Volver al panel
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-700">Paso 1</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">Seleccione un vehículo</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Trabaje siempre desde un vehículo concreto para evitar cruces o asignaciones duplicadas.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-700">Paso 2</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">Autorice uno o varios choferes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Seleccione uno o más choferes disponibles del mismo contratista para dejar el vehículo listo para operar.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-700">Paso 3</p>
                    <p className="mt-3 text-lg font-semibold text-slate-950">Mantenga una relación muchos a muchos</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Un chofer puede quedar autorizado para varios vehículos y el sistema evita duplicados o cruces entre empresas.</p>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Vehículos</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{vehicles.length}</p>
                    <p className="mt-2 text-sm text-slate-500">Registros disponibles para administrar asignaciones.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Choferes</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{totalChoferes}</p>
                    <p className="mt-2 text-sm text-slate-500">Padrón total cargado en el módulo administrativo.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Asignados</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{choferesAsignadosCount}</p>
                    <p className="mt-2 text-sm text-slate-500">Choferes ya vinculados al vehículo seleccionado.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Disponibles</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{selectedVehicle ? choferesDisponiblesCount : 0}</p>
                    <p className="mt-2 text-sm text-slate-500">Choferes listos para asignación según el filtro actual.</p>
                </div>
            </section>

            {success ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {decodeURIComponent(success)}
                </div>
            ) : null}

            {pageError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {decodeURIComponent(pageError)}
                </div>
            ) : null}

            {vehicles.length === 0 ? (
                <section className="panel p-6 lg:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                        Requisito previo
                    </p>
                    <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        Primero debe registrar un vehículo
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Para administrar asignaciones necesita al menos un vehículo cargado en el sistema. Agregue un vehículo y luego vuelva a esta vista.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin/vehiculos/nuevo">
                            Agregar vehículo
                        </Link>
                        <Link className="button-secondary" href="/admin">
                            Volver al panel
                        </Link>
                    </div>
                </section>
            ) : (
                <>
                    <section className="panel overflow-hidden scroll-mt-28" id="asignaciones">
                        <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6 lg:px-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                                Paso 1 · Selección y filtro
                            </p>
                            <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                                Elija un vehículo para administrar choferes autorizados
                            </h3>
                            <p className="mt-2 text-sm text-slate-600">
                                Seleccione primero el vehículo. La empresa aplicable se resuelve automáticamente y solo se mostrarán choferes válidos de ese mismo contratista.
                            </p>

                            <form className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]" method="get">
                                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                                    <label className="field-label" htmlFor="vehicleId">
                                        Vehículo
                                    </label>
                                    <select className="input-base" defaultValue={selectedVehicle ? String(selectedVehicle.id) : ""} id="vehicleId" name="vehicleId">
                                        <option value="">Seleccione un vehículo</option>
                                        {vehicles.map((vehicle) => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {buildVehicleOptionLabel(vehicle)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                                    <label className="field-label" htmlFor="contratistaId">
                                        Empresa aplicada automáticamente
                                    </label>
                                    <select
                                        className="input-base"
                                        defaultValue={activeContratistaFilter}
                                        disabled
                                        id="contratistaId"
                                        name="contratistaId"
                                    >
                                        <option value="ALL">Todos los contratistas</option>
                                        {contratistas.map((contratista) => (
                                            <option key={contratista.id} value={contratista.id}>
                                                {contratista.razonSocial}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <button className="button-primary w-full lg:min-w-[210px]" type="submit">
                                        Ver disponibilidad
                                    </button>
                                </div>
                            </form>

                            {selectedVehicle ? (
                                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehículo seleccionado</p>
                                        <p className="mt-3 text-xl font-semibold tracking-[0.18em] text-slate-950">{selectedVehicle.licensePlate}</p>
                                        <p className="mt-2 text-sm font-medium tracking-[0.18em] text-slate-600">Tipo {selectedVehicle.vehicleType}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Número interno</p>
                                        <p className="mt-3 text-xl font-semibold tracking-[0.18em] text-slate-950">{selectedVehicle.codigoInterno}</p>
                                        <p className="mt-2 text-sm text-slate-600">Identificador operativo del vehículo.</p>
                                    </div>
                                    <div className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Empresa asociada</p>
                                        <p className="mt-3 text-xl font-semibold text-slate-950">{selectedVehicle.contratista?.razonSocial ?? "Sin contratista asociado"}</p>
                                        <p className="mt-2 text-sm text-slate-600">Referencia guardada: {selectedVehicle.company}</p>
                                    </div>
                                    <div className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-sm">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Choferes autorizados</p>
                                        <p className="mt-3 text-xl font-semibold text-slate-950">
                                            {assignedChoferes.length === 1
                                                ? "1 chofer"
                                                : `${assignedChoferes.length} choferes`}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-600">Puede autorizar varios choferes para este mismo vehículo.</p>
                                    </div>
                                </div>
                            ) : null}

                            {selectedVehicle && !selectedVehicle.contratistaId ? (
                                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                                    Este vehículo aún no tiene contratista asociado. Corrija la ficha del vehículo antes de crear nuevas asignaciones.
                                </div>
                            ) : null}
                        </div>
                    </section>

                    {selectedVehicle ? (
                        <section className="grid gap-6 xl:grid-cols-2">
                            <section className="panel overflow-hidden">
                                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                                        Paso 2 · Choferes disponibles
                                    </p>
                                    <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                                        Autorizar choferes para el vehículo
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Marque uno o varios choferes disponibles del mismo contratista. El sistema mantiene la relación muchos a muchos sin duplicar asignaciones.
                                    </p>
                                </div>

                                {totalChoferes === 0 ? (
                                    <div className="px-6 py-8 text-sm text-slate-600">
                                        No hay choferes registrados todavía. Cree uno desde el módulo correspondiente para comenzar a asignar.
                                        <div className="mt-4">
                                            <Link className="button-primary" href="/admin/choferes/nuevo">
                                                Crear chofer
                                            </Link>
                                        </div>
                                    </div>
                                ) : !selectedVehicle.contratistaId ? (
                                    <div className="px-6 py-8 text-sm text-slate-600">
                                        Este vehículo no tiene contratista asociado. Complete primero esa relación para habilitar choferes disponibles y mantener el padrón consistente.
                                    </div>
                                ) : availableChoferes.length === 0 ? (
                                    <div className="px-6 py-8 text-sm text-slate-600">
                                        No hay más choferes disponibles del mismo contratista o todos ya quedaron autorizados para este vehículo.
                                    </div>
                                ) : (
                                    <form action={assignSelectedChoferesToVehicleAction}>
                                        <input name="vehicleId" type="hidden" value={selectedVehicle.id} />
                                        <input name="contratistaId" type="hidden" value={activeContratistaFilter} />

                                        <div className="divide-y divide-slate-100 bg-white">
                                            {availableChoferes.map((chofer) => (
                                                <label className="flex cursor-pointer gap-4 px-6 py-5 hover:bg-slate-50/80" htmlFor={`available-chofer-${chofer.id}`} key={chofer.id}>
                                                    <input
                                                        className="mt-1 h-5 w-5 rounded border-slate-300 text-accent-700 focus:ring-accent-200"
                                                        id={`available-chofer-${chofer.id}`}
                                                        name="choferIds"
                                                        type="checkbox"
                                                        value={chofer.id}
                                                    />

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                                            <div>
                                                                <p className="text-lg font-semibold text-slate-950">{chofer.nombre}</p>
                                                                <p className="mt-1 text-sm text-slate-600">RUT: {chofer.rut}</p>
                                                                {chofer.codigoInterno ? (
                                                                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                                                                        Dato interno opcional: {chofer.codigoInterno}
                                                                    </p>
                                                                ) : null}
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                <span className="inline-flex items-center rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
                                                                    {chofer._count.vehiculoChoferes === 1
                                                                        ? "Autorizado en 1 vehículo"
                                                                        : `Autorizado en ${chofer._count.vehiculoChoferes} vehículos`}
                                                                </span>
                                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                                                                    Misma empresa
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="flex flex-col gap-4 border-t border-slate-200/70 bg-slate-50/70 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">Autorización múltiple</p>
                                                <p className="mt-1 text-sm text-slate-500">Puede seleccionar uno o varios choferes y autorizarlos en una sola operación.</p>
                                            </div>

                                            <button className="button-primary" type="submit">
                                                Autorizar choferes seleccionados
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </section>

                            <section className="panel overflow-hidden">
                                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                                        Paso 3 · Choferes asignados
                                    </p>
                                    <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950">
                                        Asignaciones vigentes del vehículo
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Revise los choferes actualmente autorizados para este vehículo. Cada chofer puede seguir autorizado también en otros vehículos de la misma empresa.
                                    </p>
                                </div>

                                {assignedChoferes.length === 0 ? (
                                    <div className="px-6 py-8 text-sm text-slate-600">
                                        Este vehículo todavía no tiene choferes autorizados.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 bg-white">
                                        {assignedChoferes.map((chofer) => (
                                            <form action={removeChoferFromVehicleAction} className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between" key={chofer.id}>
                                                <input name="vehicleId" type="hidden" value={selectedVehicle.id} />
                                                <input name="choferId" type="hidden" value={chofer.id} />
                                                <input name="contratistaId" type="hidden" value={activeContratistaFilter} />

                                                <div className="min-w-0">
                                                    <p className="text-lg font-semibold text-slate-950">{chofer.nombre}</p>
                                                    <p className="mt-1 text-sm text-slate-600">RUT: {chofer.rut}</p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <span className="inline-flex items-center rounded-full bg-accent-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">
                                                            {chofer._count.vehiculoChoferes === 1
                                                                ? "Autorizado en 1 vehículo"
                                                                : `Autorizado en ${chofer._count.vehiculoChoferes} vehículos`}
                                                        </span>
                                                        {chofer.codigoInterno ? (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                                                                Dato interno opcional: {chofer.codigoInterno}
                                                            </span>
                                                        ) : null}
                                                        {chofer._count.vehiculoChoferes > 1 ? (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                                                                También opera otros {chofer._count.vehiculoChoferes - 1} vehículos
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    <Link className="button-secondary" href={`/admin/choferes/${chofer.id}/editar`}>
                                                        Ver ficha
                                                    </Link>
                                                    <button className="inline-flex min-h-[56px] items-center justify-center rounded-lg bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-100 focus:ring-4 focus:ring-red-100 xl:min-w-[150px]" type="submit">
                                                        Quitar
                                                    </button>
                                                </div>
                                            </form>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </section>
                    ) : (
                        <section className="panel p-6 lg:p-8">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                                Selección pendiente
                            </p>
                            <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                                Seleccione un vehículo para administrar sus choferes
                            </h3>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                Elija un vehículo desde el selector superior para ver los choferes disponibles de la misma empresa, autorizar varios en una sola operación y revisar los ya habilitados para esa patente.
                            </p>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}