import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
    getVehicleMovementSummary,
    hasRecentMovementDuplicate,
} from "@/lib/access-control/movement-state";
import { resolveOperatorContext } from "@/lib/access-control/operator-context";
import {
    projectMovementCycle,
} from "@/lib/access-control/state-utils";
import { getOperationalPorteriaName } from "@/lib/porterias";
import { prisma } from "@/lib/prisma";

type TipoEventoInput = "ENTRADA" | "SALIDA";
const DEBUG_EVENT_REGISTRATION = process.env.DEBUG_EVENT_REGISTRATION === "true";

class OperationalValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OperationalValidationError";
    }
}

function debugEventRegistration(message: string, data?: unknown) {
    if (!DEBUG_EVENT_REGISTRATION) {
        return;
    }

    const timestamp = new Date().toISOString();

    if (typeof data === "undefined") {
        console.info(`[${timestamp}] [ACCESS-EVENT] ${message}`);
        return;
    }

    console.info(`[${timestamp}] [ACCESS-EVENT] ${message}`, data);
}

function parsePositiveInteger(value: unknown) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseTipoEvento(value: unknown) {
    return value === "ENTRADA" || value === "SALIDA" ? value : null;
}

export async function POST(request: Request) {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "USER")) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
            vehicleId?: unknown;
            porteriaId?: unknown;
            tipoEvento?: unknown;
        }
        | null;
    const vehicleId = parsePositiveInteger(body?.vehicleId);
    const porteriaId = parsePositiveInteger(body?.porteriaId);
    const tipoEvento = parseTipoEvento(body?.tipoEvento);

    if (!vehicleId) {
        return NextResponse.json(
            { error: "Debe indicar un vehículo válido." },
            { status: 400 },
        );
    }

    if (!porteriaId) {
        return NextResponse.json(
            { error: "Debe seleccionar una portería." },
            { status: 400 },
        );
    }

    if (!tipoEvento) {
        return NextResponse.json(
            { error: "Debe seleccionar el tipo de evento." },
            { status: 400 },
        );
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const operator = await resolveOperatorContext(tx, session);

            const vehicle = await tx.vehicle.findUnique({
                where: { id: vehicleId },
                select: {
                    id: true,
                    licensePlate: true,
                    accessStatus: true,
                    contratistaId: true,
                },
            });

            if (!vehicle) {
                throw new OperationalValidationError("El vehículo seleccionado ya no existe.");
            }

            if (!vehicle.contratistaId) {
                throw new OperationalValidationError("El vehículo no tiene contratista asociado. Actualícelo en administración antes de registrar eventos.");
            }

            if (vehicle.accessStatus !== "YES") {
                throw new OperationalValidationError("El vehículo está bloqueado para acceso. Revise su estado en administración antes de registrar un movimiento.");
            }

            const porteria = await tx.porteria.findUnique({
                where: { id: porteriaId },
                select: {
                    id: true,
                    nombre: true,
                },
            });

            if (!porteria) {
                throw new OperationalValidationError("La portería seleccionada no existe.");
            }

            const porteriaNombre = getOperationalPorteriaName(porteria);

            const hasDuplicate = await hasRecentMovementDuplicate(
                tx,
                vehicle.id,
                porteria.id,
                tipoEvento,
            );

            if (hasDuplicate) {
                throw new OperationalValidationError(`Ya existe un ${tipoEvento === "ENTRADA" ? "ingreso" : "salida"} reciente en ${porteriaNombre}. Espere un momento antes de repetir el registro.`);
            }

            const currentMovementSummary = await getVehicleMovementSummary(tx, vehicle.id);
            const projectedMovement = projectMovementCycle(
                currentMovementSummary,
                tipoEvento,
            );

            const evento = await tx.eventoAcceso.create({
                data: {
                    vehiculoId: vehicle.id,
                    contratistaId: vehicle.contratistaId,
                    choferId: null,
                    porteriaId: porteria.id,
                    operadoPorId: operator.operatorId,
                    operadoPorUsername: operator.operatorUsername,
                    operadoPorRole: operator.operatorRole,
                    operadoPorPorteriaNombre: porteriaNombre,
                    tipoEvento: tipoEvento as TipoEventoInput,
                    observacion: projectedMovement.observation,
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
                        },
                    },
                },
            });

            await tx.vehicle.update({
                where: { id: vehicle.id },
                data: {
                    estadoRecinto: projectedMovement.persistedState,
                },
            });

            debugEventRegistration("Evento creado correctamente", {
                vehicleId: vehicle.id,
                licensePlate: vehicle.licensePlate,
                tipoEvento,
                porteriaId: porteria.id,
                porteriaNombre,
                operatorResolution: operator.resolution,
                operadoPorId: operator.operatorId,
                operadoPorUsername: operator.operatorUsername,
                currentCycleCount: projectedMovement.currentCycleCount,
                requiredMovements: projectedMovement.requiredMovements,
                estadoOperativo: projectedMovement.operationalState,
            });

            return {
                estadoRecinto: projectedMovement.persistedState,
                estadoOperativo: projectedMovement.operationalState,
                movementSummary: projectedMovement,
                ultimoEvento: {
                    ...evento,
                    porteria: {
                        ...evento.porteria,
                        nombre: getOperationalPorteriaName(evento.porteria),
                    },
                },
                porteriaNombre,
                vehicleLicensePlate: vehicle.licensePlate,
            };
        });

        revalidatePath("/admin");
        revalidatePath("/admin/control-acceso-v2");
        revalidatePath("/admin/dashboard-faena");
        revalidatePath("/admin/eventos-acceso");
        revalidatePath("/admin/logs");
        revalidatePath("/guard");
        revalidatePath("/guard/v2");

        return NextResponse.json({
            message: `Movimiento registrado correctamente para la patente ${result.vehicleLicensePlate} en ${result.porteriaNombre}.`,
            estadoRecinto: result.estadoRecinto,
            estadoOperativo: result.estadoOperativo,
            ultimoEvento: result.ultimoEvento,
            movementSummary: {
                currentCycleType: result.movementSummary.currentCycleType,
                currentCycleCount: result.movementSummary.currentCycleCount,
                requiredMovements: result.movementSummary.requiredMovements,
                remainingMovements: result.movementSummary.remainingMovements,
            },
            stateChangedTo: result.movementSummary.stateChangedTo,
        });
    } catch (error) {
        if (error instanceof OperationalValidationError) {
            return NextResponse.json(
                {
                    error: error.message,
                },
                { status: 400 },
            );
        }

        console.error("[access-control-v2/events] Error inesperado", error);

        return NextResponse.json(
            {
                error: "No fue posible registrar el evento de acceso. Intente nuevamente.",
            },
            { status: 500 },
        );
    }
}