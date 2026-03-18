/**
 * STAGING DEBUG HELPERS - Sequential Porterias Testing
 *
 * Funciones auxiliares solo para staging/desarrollo.
 * No afectan la logica principal de produccion.
 */

import { TipoEventoAcceso } from "@prisma/client";

import {
    getDatabaseConnectionDebugInfo,
    getVehicleLookupDiagnostics,
    loadVehicleForLookup,
} from "@/lib/access-control/vehicle-lookup";
import {
    determineSequenceCompletion,
    getNextExpectedPorteria,
    validateNextCheckpoint,
    type ValidationResult,
} from "@/lib/porteria/sequential-access";
import { prisma } from "@/lib/prisma";

function debugLog(section: string, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [STAGING-DEBUG] [${section}]`;

    if (typeof data === "undefined") {
        console.log(`${prefix} ${message}`);
        return;
    }

    console.log(`${prefix} ${message}`, data);
}

function classifyValidationReason(validation: ValidationResult) {
    if (validation.valid) {
        return "VALID";
    }

    if (validation.message?.includes("recientemente")) {
        return "ANTI_DUPLICATE";
    }

    if (validation.message?.includes("checkpoint esperado")) {
        return "INVALID_SEQUENCE";
    }

    if (validation.message?.includes("ya se complet")) {
        return "SEQUENCE_COMPLETE";
    }

    if (validation.message?.includes("Porter")) {
        return "MISSING_PORTERIA";
    }

    return "REJECTED";
}

export async function debugGetVehicleSequenceHistory(licensePlateInput: string) {
    try {
        const lookup = await loadVehicleForLookup(licensePlateInput);

        if (!lookup.vehicle) {
            return {
                error: `Vehiculo ${lookup.normalizedLicensePlate} no encontrado en la tabla vehicles.`,
                normalizedLicensePlate: lookup.normalizedLicensePlate,
                lookupMethod: lookup.method,
                diagnostics: await getVehicleLookupDiagnostics(licensePlateInput),
            };
        }

        const events = await prisma.eventoAcceso.findMany({
            where: { vehiculoId: lookup.vehicle.id },
            orderBy: { fechaHora: "asc" },
            select: {
                id: true,
                tipoEvento: true,
                porteriaId: true,
                fechaHora: true,
                observacion: true,
                porteria: {
                    select: {
                        id: true,
                        nombre: true,
                        orden: true,
                    },
                },
                chofer: {
                    select: {
                        id: true,
                        nombre: true,
                    },
                },
            },
        });

        const history = events.map((event, index) => ({
            paso: index + 1,
            id: event.id,
            tipo: event.tipoEvento,
            porteriaId: event.porteriaId,
            porteriaNombre: event.porteria.nombre,
            porteriaOrden: event.porteria.orden,
            fechaHora: event.fechaHora.toISOString(),
            observacion: event.observacion,
            choferNombre: event.chofer?.nombre ?? null,
            duracionDesdeAnteriorMs:
                index === 0
                    ? null
                    : event.fechaHora.getTime() - events[index - 1].fechaHora.getTime(),
        }));

        return {
            connection: getDatabaseConnectionDebugInfo(),
            normalizedLicensePlate: lookup.normalizedLicensePlate,
            lookupMethod: lookup.method,
            vehiculo: {
                id: lookup.vehicle.id,
                licensePlate: lookup.vehicle.licensePlate,
                estadoActual: lookup.vehicle.estadoRecinto,
                accessStatus: lookup.vehicle.accessStatus,
                contratista: lookup.vehicle.contratista?.razonSocial ?? null,
            },
            historial: history,
            totalEventos: history.length,
        };
    } catch (error) {
        debugLog("ERROR", "debugGetVehicleSequenceHistory", error);
        throw error;
    }
}

export async function debugValidateSequence(
    licensePlateInput: string,
    porteriaId: number,
    tipoEvento: TipoEventoAcceso,
) {
    try {
        const lookup = await loadVehicleForLookup(licensePlateInput);

        if (!lookup.vehicle) {
            return {
                valid: false,
                error: `Vehiculo ${lookup.normalizedLicensePlate} no encontrado en vehicles.`,
                lookupMethod: lookup.method,
                diagnostics: await getVehicleLookupDiagnostics(licensePlateInput),
            };
        }

        const [targetPorteria, lastEvent, nextExpected, validation, sequenceInfo] = await Promise.all([
            prisma.porteria.findUnique({
                where: { id: porteriaId },
                select: { id: true, nombre: true, orden: true },
            }),
            prisma.eventoAcceso.findFirst({
                where: { vehiculoId: lookup.vehicle.id },
                orderBy: { fechaHora: "desc" },
                select: {
                    id: true,
                    tipoEvento: true,
                    fechaHora: true,
                    porteria: {
                        select: { id: true, nombre: true, orden: true },
                    },
                },
            }),
            getNextExpectedPorteria(lookup.vehicle.id, tipoEvento),
            validateNextCheckpoint(lookup.vehicle.id, porteriaId, tipoEvento),
            determineSequenceCompletion(lookup.vehicle.id, tipoEvento),
        ]);

        const result = {
            valid: validation.valid,
            reason: classifyValidationReason(validation),
            message: validation.message ?? "Evento valido para registrar.",
            normalizedLicensePlate: lookup.normalizedLicensePlate,
            lookupMethod: lookup.method,
            vehiculo: {
                id: lookup.vehicle.id,
                licensePlate: lookup.vehicle.licensePlate,
                estadoActual: lookup.vehicle.estadoRecinto,
                accessStatus: lookup.vehicle.accessStatus,
                contratista: lookup.vehicle.contratista?.razonSocial ?? null,
            },
            porteriaActual: targetPorteria,
            ultimaPorteriaRegistrada: lastEvent
                ? {
                    id: lastEvent.porteria.id,
                    nombre: lastEvent.porteria.nombre,
                    orden: lastEvent.porteria.orden,
                    tipoEvento: lastEvent.tipoEvento,
                    fechaHora: lastEvent.fechaHora.toISOString(),
                }
                : null,
            siguientePorteriaEsperada: nextExpected
                ? {
                    id: nextExpected.id,
                    nombre: nextExpected.nombre,
                    orden: nextExpected.orden,
                }
                : null,
            estadoSugeridoSegunFlujoActual: sequenceInfo.suggestedEstado,
            sequenceCompleteSegunFlujoActual: sequenceInfo.isComplete,
        };

        debugLog("VALIDATE", "Resultado de validacion de secuencia", result);
        return result;
    } catch (error) {
        debugLog("ERROR", "debugValidateSequence", error);
        throw error;
    }
}

export async function debugSimulateEvent(
    licensePlateInput: string,
    porteriaId: number,
    tipoEvento: TipoEventoAcceso,
) {
    try {
        const validation = await debugValidateSequence(licensePlateInput, porteriaId, tipoEvento);

        if (!validation.valid) {
            debugLog("SIMULATE", "Evento seria rechazado", validation);
            return {
                simulado: true,
                aceptado: false,
                razon: "reason" in validation ? validation.reason : "LOOKUP_ERROR",
                detalles: validation,
            };
        }

        debugLog("SIMULATE", "Evento seria aceptado", validation);
        return {
            simulado: true,
            aceptado: true,
            detalles: validation,
        };
    } catch (error) {
        debugLog("ERROR", "debugSimulateEvent", error);
        throw error;
    }
}

export async function debugGetNextExpectedPorteria(
    licensePlateInput: string,
    tipoEvento: TipoEventoAcceso,
) {
    try {
        const lookup = await loadVehicleForLookup(licensePlateInput);

        if (!lookup.vehicle) {
            return {
                error: `Vehiculo ${lookup.normalizedLicensePlate} no encontrado en vehicles.`,
                lookupMethod: lookup.method,
                diagnostics: await getVehicleLookupDiagnostics(licensePlateInput),
            };
        }

        const [lastEvent, nextExpected] = await Promise.all([
            prisma.eventoAcceso.findFirst({
                where: { vehiculoId: lookup.vehicle.id },
                orderBy: { fechaHora: "desc" },
                select: {
                    tipoEvento: true,
                    fechaHora: true,
                    porteria: {
                        select: { id: true, nombre: true, orden: true },
                    },
                },
            }),
            getNextExpectedPorteria(lookup.vehicle.id, tipoEvento),
        ]);

        const result = {
            normalizedLicensePlate: lookup.normalizedLicensePlate,
            lookupMethod: lookup.method,
            estadoActual: lookup.vehicle.estadoRecinto,
            ultimaPorteriaRegistrada: lastEvent
                ? {
                    nombre: lastEvent.porteria.nombre,
                    orden: lastEvent.porteria.orden,
                    tipoEvento: lastEvent.tipoEvento,
                    fechaHora: lastEvent.fechaHora.toISOString(),
                }
                : null,
            siguiente: nextExpected
                ? {
                    id: nextExpected.id,
                    nombre: nextExpected.nombre,
                    orden: nextExpected.orden,
                }
                : null,
            razon: nextExpected
                ? "Existe una siguiente porteria esperada en la secuencia."
                : "No hay siguiente porteria esperada para este flujo.",
        };

        debugLog("NEXT", "Siguiente porteria esperada", result);
        return result;
    } catch (error) {
        debugLog("ERROR", "debugGetNextExpectedPorteria", error);
        throw error;
    }
}

export async function debugCleanVehicleEvents(licensePlateInput: string) {
    if (process.env.NODE_ENV === "production") {
        return { error: "NO SE PUEDE USAR EN PRODUCCION" };
    }

    try {
        const lookup = await loadVehicleForLookup(licensePlateInput);

        if (!lookup.vehicle) {
            return {
                error: `Vehiculo ${lookup.normalizedLicensePlate} no encontrado en vehicles.`,
                lookupMethod: lookup.method,
                diagnostics: await getVehicleLookupDiagnostics(licensePlateInput),
            };
        }

        const deleted = await prisma.eventoAcceso.deleteMany({
            where: { vehiculoId: lookup.vehicle.id },
        });

        await prisma.vehicle.update({
            where: { id: lookup.vehicle.id },
            data: { estadoRecinto: null },
        });

        const result = {
            cleaned: true,
            vehiculo: lookup.vehicle.licensePlate,
            eventosEliminados: deleted.count,
        };

        debugLog("CLEAN", "Historial del vehiculo limpiado", result);
        return result;
    } catch (error) {
        debugLog("ERROR", "debugCleanVehicleEvents", error);
        throw error;
    }
}

export function debugFormatHistoryForConsole(vehicleHistory: {
    error?: string;
    vehiculo?: {
        licensePlate: string;
        estadoActual: string | null;
    };
    historial?: Array<{
        paso: number;
        tipo: string;
        porteriaNombre: string;
        fechaHora: string;
        observacion: string | null;
        duracionDesdeAnteriorMs: number | null;
    }>;
    totalEventos?: number;
}) {
    if (vehicleHistory.error) {
        return `HISTORIAL ERROR: ${vehicleHistory.error}`;
    }

    const lines: string[] = [];
    lines.push("");
    lines.push("============================================================");
    lines.push(`HISTORIAL - ${vehicleHistory.vehiculo?.licensePlate ?? "SIN VEHICULO"}`);
    lines.push("============================================================");
    lines.push("");

    for (const event of vehicleHistory.historial ?? []) {
        const icon = event.tipo === "ENTRADA" ? "->" : "<-";
        const hora = new Date(event.fechaHora).toLocaleTimeString("es-CL");
        const duracion = event.duracionDesdeAnteriorMs
            ? ` (+${(event.duracionDesdeAnteriorMs / 1000).toFixed(1)}s)`
            : "";

        lines.push(`  [${event.paso}] ${icon} ${event.porteriaNombre} | ${hora}${duracion}`);
        if (event.observacion) {
            lines.push(`       ${event.observacion}`);
        }
    }

    lines.push("");
    lines.push(`  Estado actual: ${vehicleHistory.vehiculo?.estadoActual ?? "(sin estado)"}`);
    lines.push(`  Total eventos: ${vehicleHistory.totalEventos ?? 0}`);
    lines.push("");

    return lines.join("\n");
}

const stagingDebugTools = {
    debugGetVehicleSequenceHistory,
    debugValidateSequence,
    debugSimulateEvent,
    debugGetNextExpectedPorteria,
    debugCleanVehicleEvents,
    debugFormatHistoryForConsole,
};

export default stagingDebugTools;
