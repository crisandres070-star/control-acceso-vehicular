import { Prisma } from "@prisma/client";

import { MAX_MOVEMENTS_FOR_STATE_EVALUATION } from "@/lib/access-control/constants";
import { prisma } from "@/lib/prisma";
import { normalizeLicensePlate } from "@/lib/utils";

export const VEHICLE_LOOKUP_SELECT = {
    id: true,
    name: true,
    licensePlate: true,
    codigoInterno: true,
    vehicleType: true,
    brand: true,
    modelo: true,
    company: true,
    accessStatus: true,
    estadoRecinto: true,
    contratista: {
        select: {
            id: true,
            razonSocial: true,
            rut: true,
            contacto: true,
            telefono: true,
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
            operadoPorUsername: true,
            operadoPorRole: true,
            operadoPorPorteriaNombre: true,
            observacion: true,
            porteria: {
                select: {
                    id: true,
                    nombre: true,
                    orden: true,
                },
            },
        },
    },
} as const;

export type VehicleLookupRecord = Prisma.VehicleGetPayload<{
    select: typeof VEHICLE_LOOKUP_SELECT;
}>;

export type VehicleLookupMethod = "direct" | "normalized-fallback" | "not-found";

const ACCESS_LOOKUP_DEBUG = process.env.DEBUG_ACCESS_LOOKUP === "true";
let hasLoggedConnectionSummary = false;

function parseDatabaseUrl(databaseUrl: string | undefined) {
    if (!databaseUrl) {
        return null;
    }

    try {
        return new URL(databaseUrl);
    } catch {
        return null;
    }
}

export function maskDatabaseUrl(databaseUrl: string | undefined = process.env.DATABASE_URL) {
    const parsed = parseDatabaseUrl(databaseUrl);

    if (!parsed) {
        return databaseUrl ? "(invalid DATABASE_URL)" : null;
    }

    const databaseName = parsed.pathname.replace(/^\//, "") || "(unknown-db)";
    const hasAuth = Boolean(parsed.username || parsed.password);

    return `${parsed.protocol}//${hasAuth ? "***:***@" : ""}${parsed.host}/${databaseName}`;
}

export function getDatabaseConnectionDebugInfo() {
    const parsed = parseDatabaseUrl(process.env.DATABASE_URL);

    if (!parsed) {
        return {
            configured: Boolean(process.env.DATABASE_URL),
            maskedUrl: maskDatabaseUrl(process.env.DATABASE_URL),
            host: null,
            database: null,
            hasPooler: false,
            sslmode: null,
            channelBinding: null,
            nodeEnv: process.env.NODE_ENV ?? null,
        };
    }

    return {
        configured: true,
        maskedUrl: maskDatabaseUrl(process.env.DATABASE_URL),
        host: parsed.host,
        database: parsed.pathname.replace(/^\//, "") || null,
        hasPooler: parsed.hostname.includes("pooler"),
        sslmode: parsed.searchParams.get("sslmode"),
        channelBinding: parsed.searchParams.get("channel_binding"),
        nodeEnv: process.env.NODE_ENV ?? null,
    };
}

export function accessLookupDebugLog(scope: string, message: string, data?: unknown) {
    if (!ACCESS_LOOKUP_DEBUG) {
        return;
    }

    const timestamp = new Date().toISOString();

    if (typeof data === "undefined") {
        console.info(`[${timestamp}] [ACCESS-LOOKUP] [${scope}] ${message}`);
        return;
    }

    console.info(`[${timestamp}] [ACCESS-LOOKUP] [${scope}] ${message}`, data);
}

export function logDatabaseConnectionSummaryOnce(scope: string) {
    if (!ACCESS_LOOKUP_DEBUG || hasLoggedConnectionSummary) {
        return;
    }

    hasLoggedConnectionSummary = true;
    accessLookupDebugLog(scope, "DATABASE_URL activa", getDatabaseConnectionDebugInfo());
}

export async function loadVehicleForLookup(licensePlateInput: string): Promise<{
    vehicle: VehicleLookupRecord | null;
    normalizedLicensePlate: string;
    method: VehicleLookupMethod;
    fallbackVehicleId: number | null;
}> {
    const normalizedLicensePlate = normalizeLicensePlate(licensePlateInput);

    logDatabaseConnectionSummaryOnce("lookup");
    accessLookupDebugLog("lookup", "Inicio de búsqueda", {
        input: licensePlateInput,
        normalizedLicensePlate,
    });

    const directMatch = await prisma.vehicle.findUnique({
        where: { licensePlate: normalizedLicensePlate },
        select: VEHICLE_LOOKUP_SELECT,
    });

    if (directMatch) {
        accessLookupDebugLog("lookup", "Coincidencia directa en vehicles", {
            vehicleId: directMatch.id,
            licensePlate: directMatch.licensePlate,
        });

        return {
            vehicle: directMatch,
            normalizedLicensePlate,
            method: "direct",
            fallbackVehicleId: null,
        };
    }

    const fallbackRows = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM vehicles
        WHERE UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) = ${normalizedLicensePlate}
        ORDER BY id ASC
        LIMIT 1
    `;
    const fallbackVehicleId = fallbackRows[0]?.id ?? null;

    accessLookupDebugLog("lookup", "Consulta fallback por patente normalizada", {
        normalizedLicensePlate,
        fallbackVehicleId,
    });

    if (!fallbackVehicleId) {
        accessLookupDebugLog("lookup", "Sin coincidencias en vehicles", {
            normalizedLicensePlate,
        });

        return {
            vehicle: null,
            normalizedLicensePlate,
            method: "not-found",
            fallbackVehicleId: null,
        };
    }

    const fallbackVehicle = await prisma.vehicle.findUnique({
        where: { id: fallbackVehicleId },
        select: VEHICLE_LOOKUP_SELECT,
    });

    accessLookupDebugLog(
        "lookup",
        fallbackVehicle ? "Coincidencia fallback resuelta" : "Fallback devolvió id sin fila asociada",
        {
            fallbackVehicleId,
            normalizedLicensePlate,
            found: Boolean(fallbackVehicle),
        },
    );

    return {
        vehicle: fallbackVehicle,
        normalizedLicensePlate,
        method: fallbackVehicle ? "normalized-fallback" : "not-found",
        fallbackVehicleId,
    };
}

export async function getVehicleLookupDiagnostics(licensePlateInput: string) {
    const normalizedLicensePlate = normalizeLicensePlate(licensePlateInput);
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('vehicles', 'vehiculos', 'porterias')
        ORDER BY table_name ASC
    `;

    const vehiclesMatchesRows = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM vehicles
        WHERE license_plate = ${normalizedLicensePlate}
           OR UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) = ${normalizedLicensePlate}
    `;

    const vehicleRows = await prisma.$queryRaw<Array<{
        id: number;
        license_plate: string;
        codigo_interno: string;
        company: string;
        access_status: string;
        contratista_id: number | null;
    }>>`
        SELECT id, license_plate, codigo_interno, company, access_status, contratista_id
        FROM vehicles
        WHERE license_plate = ${normalizedLicensePlate}
           OR UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) = ${normalizedLicensePlate}
        ORDER BY id ASC
        LIMIT 5
    `;

    const hasVehiculosTable = tables.some((row) => row.table_name === "vehiculos");
    const vehiculosMatchesRows = hasVehiculosTable
        ? await prisma.$queryRawUnsafe<Array<{ count: number }>>(
            "SELECT COUNT(*)::int AS count FROM vehiculos WHERE patente = $1 OR UPPER(REGEXP_REPLACE(patente, '[^A-Za-z0-9]', '', 'g')) = $1",
            normalizedLicensePlate,
        )
        : [];
    const vehiculosRows = hasVehiculosTable
        ? await prisma.$queryRawUnsafe<Array<{ id: number; patente: string }>>(
            "SELECT id, patente FROM vehiculos WHERE patente = $1 OR UPPER(REGEXP_REPLACE(patente, '[^A-Za-z0-9]', '', 'g')) = $1 ORDER BY id ASC LIMIT 5",
            normalizedLicensePlate,
        )
        : [];

    return {
        connection: getDatabaseConnectionDebugInfo(),
        normalizedLicensePlate,
        tables: tables.map((row) => row.table_name),
        vehiclesMatches: vehiclesMatchesRows[0]?.count ?? 0,
        vehicleRows,
        vehiculosMatches: hasVehiculosTable ? vehiculosMatchesRows[0]?.count ?? 0 : null,
        vehiculosRows,
    };
}
