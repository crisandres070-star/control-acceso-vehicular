import { NextResponse } from "next/server";

import {
    accessLookupDebugLog,
    getVehicleLookupDiagnostics,
    loadVehicleForLookup,
} from "@/lib/access-control/vehicle-lookup";
import { getOperationalPorteriaName } from "@/lib/porterias";
import { summarizeMovementCycleFromTypes } from "@/lib/access-control/state-utils";
import { getSession } from "@/lib/auth";
import { normalizeLicensePlate } from "@/lib/utils";

export async function POST(request: Request) {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "USER")) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
            licensePlate?: string;
        }
        | null;
    const licensePlate = normalizeLicensePlate(body?.licensePlate ?? "");

    if (!licensePlate) {
        return NextResponse.json(
            { error: "La patente es obligatoria." },
            { status: 400 },
        );
    }

    const lookup = await loadVehicleForLookup(licensePlate);
    const vehicle = lookup.vehicle;

    if (!vehicle) {
        accessLookupDebugLog(
            "lookup-route",
            "No se encontró vehículo en la estructura real esperada por Prisma.",
            await getVehicleLookupDiagnostics(licensePlate),
        );

        return NextResponse.json(
            { error: "No se encontró un vehículo con esa patente." },
            { status: 404 },
        );
    }

    accessLookupDebugLog("lookup-route", "Vehículo encontrado correctamente.", {
        vehicleId: vehicle.id,
        normalizedLicensePlate: lookup.normalizedLicensePlate,
        lookupMethod: lookup.method,
        accessStatus: vehicle.accessStatus,
        contratistaId: vehicle.contratista?.id ?? null,
    });

    const lastEvent = vehicle.eventosAcceso[0] ?? null;
    const movementSummary = summarizeMovementCycleFromTypes(
        vehicle.eventosAcceso.map((event) => event.tipoEvento),
    );

    return NextResponse.json({
        vehicle: {
            id: vehicle.id,
            name: vehicle.name,
            licensePlate: vehicle.licensePlate,
            codigoInterno: vehicle.codigoInterno,
            vehicleType: vehicle.vehicleType,
            brand: vehicle.brand,
            modelo: vehicle.modelo,
            company: vehicle.company,
            accessStatus: vehicle.accessStatus,
            estadoRecinto: movementSummary.persistedState,
            estadoOperativo: movementSummary.operationalState,
            contratista: vehicle.contratista,
            ultimoEvento: lastEvent
                ? {
                    tipoEvento: lastEvent.tipoEvento,
                    fechaHora: lastEvent.fechaHora,
                    operadoPorUsername: lastEvent.operadoPorUsername,
                    operadoPorRole: lastEvent.operadoPorRole,
                    operadoPorPorteriaNombre: lastEvent.operadoPorPorteriaNombre
                        ? getOperationalPorteriaName(lastEvent.operadoPorPorteriaNombre)
                        : null,
                    porteria: {
                        ...lastEvent.porteria,
                        nombre: getOperationalPorteriaName(lastEvent.porteria),
                    },
                    observacion: lastEvent.observacion,
                }
                : null,
            movementSummary: {
                currentCycleType: movementSummary.currentCycleType,
                currentCycleCount: movementSummary.currentCycleCount,
                requiredMovements: movementSummary.requiredMovements,
                remainingMovements: movementSummary.remainingMovements,
            },
        },
    });
}