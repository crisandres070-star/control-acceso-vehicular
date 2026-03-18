import { prisma } from "@/lib/prisma";
import { TipoEventoAcceso, EstadoRecintoVehiculo } from "@prisma/client";

const DEBUG_SEQUENTIAL_PORTERIA = process.env.DEBUG_SEQUENTIAL_PORTERIA === "true";

function debugSequentialLog(message: string, data?: unknown) {
    if (!DEBUG_SEQUENTIAL_PORTERIA) {
        return;
    }

    const timestamp = new Date().toISOString();

    if (typeof data === "undefined") {
        console.info(`[${timestamp}] [SEQUENTIAL-PORTERIA] ${message}`);
        return;
    }

    console.info(`[${timestamp}] [SEQUENTIAL-PORTERIA] ${message}`, data);
}

/**
 * Sequential Portería Access Control
 * 
 * Manages checkpoint-based entry/exit flows for vehicles.
 * Rules:
 * - ENTRADA: porterías must be traversed in ascending order (1→2→3→4)
 * - SALIDA: porterías must be traversed in descending order (4→3→2→1)
 * - EN_TRANSITO: vehicle is in a sequential flow but not fully entered/exited
 * - Anti-duplicate: ignores same portería within 5 minutes of last checkpoint
 */

/** Result of validation check */
export type ValidationResult = {
    valid: boolean;
    message?: string;
    nextExpectedPorteria?: {
        id: number;
        nombre: string;
        orden: number;
    };
    isSequenceComplete?: boolean;
    suggestedEstadoRecinto?: EstadoRecintoVehiculo;
};

/** Get the last checkpoint event for a vehicle */
async function getLastCheckpoint(vehiculoId: number) {
    return prisma.eventoAcceso.findFirst({
        where: { vehiculoId },
        orderBy: { fechaHora: "desc" },
        include: { porteria: true },
    });
}

/** Get all porterías ordered by secuencia */
async function getPorteriasOrdered(ordenDesc: boolean = false) {
    return prisma.porteria.findMany({
        orderBy: { orden: ordenDesc ? "desc" : "asc" },
    });
}

/** Check if there's a recent duplicate event (same portería within 5 minutes) */
async function hasRecentDuplicate(
    vehiculoId: number,
    porteriaId: number,
    windowMinutes: number = 5
): Promise<boolean> {
    const fiveMinutesAgo = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recent = await prisma.eventoAcceso.findFirst({
        where: {
            vehiculoId,
            porteriaId,
            fechaHora: { gte: fiveMinutesAgo },
        },
        orderBy: { fechaHora: "desc" },
    });

    return !!recent;
}



/** Get vehicle's current estado recinto state */
export async function getVehicleCurrentEstado(
    vehiculoId: number
): Promise<EstadoRecintoVehiculo | null> {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehiculoId },
        select: { estadoRecinto: true },
    });
    return vehicle?.estadoRecinto ?? null;
}

/** Determine the next expected portería for sequential flow */
export async function getNextExpectedPorteria(
    vehiculoId: number,
    tipoEvento: TipoEventoAcceso
) {
    const lastEvent = await getLastCheckpoint(vehiculoId);

    // If no history, first portería in sequence
    if (!lastEvent) {
        const porterias = await getPorteriasOrdered(tipoEvento === "SALIDA");
        return porterias[0] ?? null;
    }

    // Get last portería's orden
    const lastOrden = lastEvent.porteria.orden;
    const porterias = await getPorteriasOrdered();

    if (tipoEvento === "ENTRADA") {
        // ENTRADA: next should be orden > lastOrden
        const next = porterias.find((p) => p.orden > lastOrden);
        return next ?? null; // Returns null if no more entries (sequence complete)
    }

    if (tipoEvento === "SALIDA") {
        // SALIDA: next should be orden < lastOrden
        const next = [...porterias].reverse().find((p) => p.orden < lastOrden);
        return next ?? null; // Returns null if no more exits (sequence complete)
    }

    return null;
}



/** Get porterías already traversed in current flow */
async function getTraversedPorterias(
    vehiculoId: number,
    tipoEvento: TipoEventoAcceso
): Promise<number[]> {
    const allEvents = await prisma.eventoAcceso.findMany({
        where: { vehiculoId },
        orderBy: { fechaHora: "asc" },
    });

    // Find the latest state change to understand current flow
    let isAccumulatingType = false;
    const traversed: number[] = [];

    for (const event of allEvents) {
        if (!isAccumulatingType) {
            // First event sets the flow type
            isAccumulatingType = true;
        }

        if (event.tipoEvento === tipoEvento) {
            traversed.push(event.porteriaId);
        } else {
            // Flow direction changed, reset
            traversed.length = 0;
            tipoEvento = event.tipoEvento;
        }
    }

    return traversed;
}

/** Validate if registering an event at a specific portería is valid */
export async function validateNextCheckpoint(
    vehiculoId: number,
    porteriaId: number,
    tipoEvento: TipoEventoAcceso
): Promise<ValidationResult> {
    debugSequentialLog("Inicio de validación secuencial.", {
        vehiculoId,
        porteriaId,
        tipoEvento,
    });

    if (await hasRecentDuplicate(vehiculoId, porteriaId)) {
        debugSequentialLog("Rechazo por duplicado reciente.", {
            vehiculoId,
            porteriaId,
            tipoEvento,
        });

        return {
            valid: false,
            message: `Ya fue registrado recientemente en esta portería. Espere un momento.`,
        };
    }

    const nextExpected = await getNextExpectedPorteria(vehiculoId, tipoEvento);
    const currentPorteria = await prisma.porteria.findUnique({
        where: { id: porteriaId },
    });
    const lastEvent = await getLastCheckpoint(vehiculoId);

    debugSequentialLog("Contexto actual de secuencia.", {
        vehiculoId,
        tipoEvento,
        ultimaPorteriaRegistrada: lastEvent
            ? {
                id: lastEvent.porteria.id,
                nombre: lastEvent.porteria.nombre,
                orden: lastEvent.porteria.orden,
                tipoEvento: lastEvent.tipoEvento,
                fechaHora: lastEvent.fechaHora,
            }
            : null,
        siguienteEsperada: nextExpected
            ? {
                id: nextExpected.id,
                nombre: nextExpected.nombre,
                orden: nextExpected.orden,
            }
            : null,
        porteriaSolicitada: currentPorteria
            ? {
                id: currentPorteria.id,
                nombre: currentPorteria.nombre,
                orden: currentPorteria.orden,
            }
            : null,
    });

    if (!currentPorteria) {
        debugSequentialLog("Rechazo: portería inexistente.", {
            vehiculoId,
            porteriaId,
            tipoEvento,
        });

        return {
            valid: false,
            message: `Portería no encontrada.`,
        };
    }

    if (!lastEvent) {
        debugSequentialLog("Validación aceptada: primer checkpoint del vehículo.", {
            vehiculoId,
            porteriaId,
            tipoEvento,
        });

        return {
            valid: true,
            nextExpectedPorteria: currentPorteria,
        };
    }

    if (!nextExpected) {
        if (lastEvent.tipoEvento === tipoEvento) {
            debugSequentialLog("Rechazo: la secuencia ya estaba completa para este tipo de evento.", {
                vehiculoId,
                tipoEvento,
                ultimaPorteriaRegistrada: lastEvent.porteria.nombre,
            });

            return {
                valid: false,
                message: `La secuencia de ${tipoEvento === "ENTRADA" ? "entrada" : "salida"} ya se completó.`,
            };
        }

        debugSequentialLog("Validación aceptada: cambio de flujo, inicia nueva secuencia.", {
            vehiculoId,
            ultimoTipoEvento: lastEvent.tipoEvento,
            nuevoTipoEvento: tipoEvento,
        });

        return {
            valid: true,
            nextExpectedPorteria: currentPorteria,
        };
    }

    if (nextExpected.id !== porteriaId) {
        debugSequentialLog("Rechazo por secuencia inválida.", {
            vehiculoId,
            porteriaSolicitada: currentPorteria.nombre,
            ordenSolicitada: currentPorteria.orden,
            siguienteEsperada: nextExpected.nombre,
            ordenEsperada: nextExpected.orden,
        });

        return {
            valid: false,
            message: `El siguiente checkpoint esperado es ${nextExpected.nombre}. Se intentó registrar en ${currentPorteria.nombre}.`,
            nextExpectedPorteria: nextExpected,
        };
    }

    debugSequentialLog("Validación secuencial aceptada.", {
        vehiculoId,
        porteriaId,
        tipoEvento,
        siguienteEsperada: nextExpected.nombre,
    });

    return {
        valid: true,
        nextExpectedPorteria: currentPorteria,
    };
}

/** Determine if sequence is complete and what estado should be set */
export async function determineSequenceCompletion(
    vehiculoId: number,
    tipoEvento: TipoEventoAcceso
): Promise<{
    isComplete: boolean;
    suggestedEstado: EstadoRecintoVehiculo;
}> {
    const nextExpected = await getNextExpectedPorteria(vehiculoId, tipoEvento);

    if (tipoEvento === "ENTRADA") {
        if (!nextExpected) {
            debugSequentialLog("Estado sugerido luego de entrada: DENTRO.", {
                vehiculoId,
                tipoEvento,
            });
            return { isComplete: true, suggestedEstado: "DENTRO" };
        }

        debugSequentialLog("Estado sugerido luego de entrada: EN_TRANSITO.", {
            vehiculoId,
            tipoEvento,
            siguienteEsperada: nextExpected.nombre,
        });
        return { isComplete: false, suggestedEstado: "EN_TRANSITO" };
    }

    if (tipoEvento === "SALIDA") {
        if (!nextExpected) {
            debugSequentialLog("Estado sugerido luego de salida: FUERA.", {
                vehiculoId,
                tipoEvento,
            });
            return { isComplete: true, suggestedEstado: "FUERA" };
        }

        debugSequentialLog("Estado sugerido luego de salida: EN_TRANSITO.", {
            vehiculoId,
            tipoEvento,
            siguienteEsperada: nextExpected.nombre,
        });
        return { isComplete: false, suggestedEstado: "EN_TRANSITO" };
    }

    debugSequentialLog("Estado sugerido por fallback: EN_TRANSITO.", {
        vehiculoId,
        tipoEvento,
    });

    return {
        isComplete: false,
        suggestedEstado: "EN_TRANSITO",
    };
}

/** Get readable description of current flow state */
export async function getFlowStatus(vehiculoId: number): Promise<{
    currentEstado: EstadoRecintoVehiculo | null;
    lastEventType: TipoEventoAcceso | null;
    nextCheckpoint: { id: number; nombre: string; orden: number } | null;
    completedCheckpoints: number;
    totalCheckpoints: number;
}> {
    const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehiculoId },
        select: { estadoRecinto: true },
    });

    const lastEvent = await getLastCheckpoint(vehiculoId);
    const nextCheckpoint = lastEvent
        ? await getNextExpectedPorteria(vehiculoId, lastEvent.tipoEvento)
        : await getNextExpectedPorteria(vehiculoId, "ENTRADA");

    const allPorterias = await getPorteriasOrdered();
    const traversed = await getTraversedPorterias(
        vehiculoId,
        lastEvent?.tipoEvento ?? "ENTRADA"
    );

    return {
        currentEstado: vehicle?.estadoRecinto ?? null,
        lastEventType: lastEvent?.tipoEvento ?? null,
        nextCheckpoint: nextCheckpoint
            ? {
                id: nextCheckpoint.id,
                nombre: nextCheckpoint.nombre,
                orden: nextCheckpoint.orden,
            }
            : null,
        completedCheckpoints: traversed.length,
        totalCheckpoints: allPorterias.length,
    };
}
