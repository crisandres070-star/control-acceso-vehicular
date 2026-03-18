/**
 * API DEBUG ENDPOINT - Sequential Porterias Testing
 *
 * Solo disponible en staging/desarrollo.
 * Ayuda a verificar lookup, conexion activa y secuencia sin tocar el flujo real.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { TipoEventoAcceso } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
    getDatabaseConnectionDebugInfo,
    getVehicleLookupDiagnostics,
    loadVehicleForLookup,
} from "@/lib/access-control/vehicle-lookup";
import {
    debugCleanVehicleEvents,
    debugFormatHistoryForConsole,
    debugGetNextExpectedPorteria,
    debugGetVehicleSequenceHistory,
    debugSimulateEvent,
    debugValidateSequence,
} from "@/lib/porteria/staging-debug";

const ALLOW_DEBUG = process.env.NODE_ENV !== "production";

function parsePositiveInteger(value: string | null) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getEnvFilesPresence() {
    const candidates = [
        ".env",
        ".env.local",
        ".env.development",
        ".env.development.local",
        ".env.production",
        ".env.production.local",
    ];

    return candidates.map((fileName) => ({
        fileName,
        exists: existsSync(join(process.cwd(), fileName)),
    }));
}

export async function GET(request: NextRequest) {
    if (!ALLOW_DEBUG) {
        return NextResponse.json(
            { error: "Debug endpoint not available in production" },
            { status: 403 },
        );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const licensePlate = searchParams.get("licensePlate");
    const porteriaId = parsePositiveInteger(
        searchParams.get("porteriaId") ?? searchParams.get("porteria_id"),
    );
    const tipoEvento = searchParams.get("tipoEvento") as TipoEventoAcceso | null;

    try {
        if (action === "db-summary") {
            return NextResponse.json({
                connection: getDatabaseConnectionDebugInfo(),
                envFiles: getEnvFilesPresence(),
            });
        }

        if (action === "lookup") {
            if (!licensePlate) {
                return NextResponse.json({ error: "licensePlate is required" }, { status: 400 });
            }

            const lookup = await loadVehicleForLookup(licensePlate);
            return NextResponse.json({
                lookup,
                diagnostics: await getVehicleLookupDiagnostics(licensePlate),
            });
        }

        if (action === "history") {
            if (!licensePlate) {
                return NextResponse.json({ error: "licensePlate is required" }, { status: 400 });
            }

            const history = await debugGetVehicleSequenceHistory(licensePlate);
            console.log(debugFormatHistoryForConsole(history));
            return NextResponse.json(history);
        }

        if (action === "validate") {
            if (!licensePlate || !porteriaId || !tipoEvento) {
                return NextResponse.json(
                    { error: "licensePlate, porteriaId, tipoEvento are required" },
                    { status: 400 },
                );
            }

            return NextResponse.json(
                await debugValidateSequence(licensePlate, porteriaId, tipoEvento),
            );
        }

        if (action === "simulate") {
            if (!licensePlate || !porteriaId || !tipoEvento) {
                return NextResponse.json(
                    { error: "licensePlate, porteriaId, tipoEvento are required" },
                    { status: 400 },
                );
            }

            return NextResponse.json(
                await debugSimulateEvent(licensePlate, porteriaId, tipoEvento),
            );
        }

        if (action === "next") {
            if (!licensePlate || !tipoEvento) {
                return NextResponse.json(
                    { error: "licensePlate, tipoEvento are required" },
                    { status: 400 },
                );
            }

            return NextResponse.json(
                await debugGetNextExpectedPorteria(licensePlate, tipoEvento),
            );
        }

        if (action === "clean") {
            if (!licensePlate) {
                return NextResponse.json({ error: "licensePlate is required" }, { status: 400 });
            }

            return NextResponse.json(await debugCleanVehicleEvents(licensePlate));
        }

        if (!action) {
            return NextResponse.json({
                message: "Sequential Porterias Debug API",
                warning: "ONLY AVAILABLE IN STAGING/DEVELOPMENT",
                availableActions: {
                    dbSummary: {
                        description: "Show masked DATABASE_URL summary and env file overrides.",
                        example: "?action=db-summary",
                    },
                    lookup: {
                        description: "Run the same vehicle lookup the app uses and show diagnostics.",
                        params: ["licensePlate"],
                        example: "?action=lookup&licensePlate=TEST001",
                    },
                    history: {
                        description: "Get complete event history for a vehicle.",
                        params: ["licensePlate"],
                        example: "?action=history&licensePlate=TEST001",
                    },
                    validate: {
                        description: "Validate if an event would be accepted.",
                        params: ["licensePlate", "porteriaId", "tipoEvento"],
                        example: "?action=validate&licensePlate=TEST001&porteriaId=1&tipoEvento=ENTRADA",
                    },
                    simulate: {
                        description: "Simulate an event without writing to DB.",
                        params: ["licensePlate", "porteriaId", "tipoEvento"],
                        example: "?action=simulate&licensePlate=TEST001&porteriaId=1&tipoEvento=ENTRADA",
                    },
                    next: {
                        description: "Get the next expected porteria for a sequence.",
                        params: ["licensePlate", "tipoEvento"],
                        example: "?action=next&licensePlate=TEST001&tipoEvento=ENTRADA",
                    },
                    clean: {
                        description: "Delete all staged events for a vehicle and reset estadoRecinto.",
                        params: ["licensePlate"],
                        example: "?action=clean&licensePlate=TEST001",
                    },
                },
            });
        }

        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    } catch (error) {
        console.error("[DEBUG-TEST] Error:", error);
        return NextResponse.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}
