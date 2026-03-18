import type { Prisma } from "@prisma/client";

import { MAX_MOVEMENTS_FOR_STATE_EVALUATION, type EstadoOperativoVehiculo } from "@/lib/access-control/constants";
import { summarizeMovementCycleFromTypes } from "@/lib/access-control/state-utils";
import { getOperationalPorteriaName } from "@/lib/porterias";
import { prisma } from "@/lib/prisma";
import { normalizeLicensePlate } from "@/lib/utils";

export type EstadoFaenaFilter = "TODOS" | "EN_FAENA" | "FUERA_DE_FAENA" | "EN_TRANSITO";

export type FaenaDashboardFilters = {
    plate: string;
    contratistaId: number | null;
    estado: EstadoFaenaFilter;
};

export type FaenaDashboardVehicleRow = {
    id: number;
    licensePlate: string;
    vehicleType: string;
    companyName: string;
    estadoOperativo: EstadoOperativoVehiculo;
    ultimoMovimientoAt: Date | null;
    ultimoMovimientoTipo: "ENTRADA" | "SALIDA" | null;
    ultimaPorteriaNombre: string | null;
};

export type FaenaDashboardData = {
    stats: {
        totalVehicles: number;
        enFaenaVehicles: number;
        fueraFaenaVehicles: number;
        transitVehicles: number;
    };
    options: {
        contratistas: Array<{
            id: number;
            razonSocial: string;
        }>;
    };
    rows: {
        enFaena: FaenaDashboardVehicleRow[];
        transit: FaenaDashboardVehicleRow[];
        fueraFaena: FaenaDashboardVehicleRow[];
    };
};

const VEHICLE_LIST_LIMIT = 300;

const VEHICLE_SELECT = {
    id: true,
    licensePlate: true,
    vehicleType: true,
    company: true,
    contratista: {
        select: {
            razonSocial: true,
        },
    },
    eventosAcceso: {
        take: MAX_MOVEMENTS_FOR_STATE_EVALUATION,
        orderBy: {
            fechaHora: "desc" as const,
        },
        select: {
            tipoEvento: true,
            fechaHora: true,
            porteria: {
                select: {
                    nombre: true,
                    orden: true,
                },
            },
        },
    },
} satisfies Prisma.VehicleSelect;

type VehicleWithLastEvent = Prisma.VehicleGetPayload<{
    select: typeof VEHICLE_SELECT;
}>;

function buildBaseVehicleWhere(filters: FaenaDashboardFilters): Prisma.VehicleWhereInput {
    const whereInput: Prisma.VehicleWhereInput = {};
    const normalizedPlate = normalizeLicensePlate(filters.plate);

    if (normalizedPlate) {
        whereInput.licensePlate = {
            contains: normalizedPlate,
            mode: "insensitive",
        };
    }

    if (filters.contratistaId) {
        whereInput.contratistaId = filters.contratistaId;
    }

    return whereInput;
}

function mapVehicleRow(record: VehicleWithLastEvent): FaenaDashboardVehicleRow {
    const lastEvent = record.eventosAcceso[0] ?? null;
    const movementSummary = summarizeMovementCycleFromTypes(
        record.eventosAcceso.map((event) => event.tipoEvento),
    );

    return {
        id: record.id,
        licensePlate: record.licensePlate,
        vehicleType: record.vehicleType,
        companyName: record.contratista?.razonSocial ?? record.company,
        estadoOperativo: movementSummary.operationalState,
        ultimoMovimientoAt: lastEvent?.fechaHora ?? null,
        ultimoMovimientoTipo: lastEvent?.tipoEvento ?? null,
        ultimaPorteriaNombre: lastEvent ? getOperationalPorteriaName(lastEvent.porteria) : null,
    };
}

function sortVehicles(left: FaenaDashboardVehicleRow, right: FaenaDashboardVehicleRow) {
    if (left.ultimoMovimientoAt && right.ultimoMovimientoAt) {
        return right.ultimoMovimientoAt.getTime() - left.ultimoMovimientoAt.getTime();
    }

    if (left.ultimoMovimientoAt && !right.ultimoMovimientoAt) {
        return -1;
    }

    if (!left.ultimoMovimientoAt && right.ultimoMovimientoAt) {
        return 1;
    }

    return left.licensePlate.localeCompare(right.licensePlate, "es");
}

export async function getFaenaDashboardData(filters: FaenaDashboardFilters): Promise<FaenaDashboardData> {
    const baseWhere = buildBaseVehicleWhere(filters);

    const [vehicleRecords, contratistas] = await Promise.all([
        prisma.vehicle.findMany({
            where: baseWhere,
            orderBy: [
                {
                    updatedAt: "desc",
                },
                {
                    licensePlate: "asc",
                },
            ],
            select: VEHICLE_SELECT,
        }),
        prisma.contratista.findMany({
            select: {
                id: true,
                razonSocial: true,
            },
            orderBy: {
                razonSocial: "asc",
            },
        }),
    ]);

    const mappedRows = vehicleRecords.map(mapVehicleRow).sort(sortVehicles);
    const enFaenaRows = mappedRows.filter((row) => row.estadoOperativo === "EN_FAENA");
    const transitRows = mappedRows.filter((row) => row.estadoOperativo === "EN_TRANSITO");
    const fueraFaenaRows = mappedRows.filter((row) => row.estadoOperativo === "FUERA_DE_FAENA");

    return {
        stats: {
            totalVehicles: mappedRows.length,
            enFaenaVehicles: enFaenaRows.length,
            transitVehicles: transitRows.length,
            fueraFaenaVehicles: fueraFaenaRows.length,
        },
        options: {
            contratistas,
        },
        rows: {
            enFaena: enFaenaRows.slice(0, VEHICLE_LIST_LIMIT),
            transit: transitRows.slice(0, VEHICLE_LIST_LIMIT),
            fueraFaena: fueraFaenaRows.slice(0, VEHICLE_LIST_LIMIT),
        },
    };
}
