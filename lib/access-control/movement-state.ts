import { Prisma, PrismaClient } from "@prisma/client";

import {
    DUPLICATE_WINDOW_MINUTES,
    MAX_MOVEMENTS_FOR_STATE_EVALUATION,
    type TipoEventoAccesoValue,
} from "@/lib/access-control/constants";
import {
    type MovementCycleSummary,
    summarizeMovementCycleFromTypes,
} from "@/lib/access-control/state-utils";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getVehicleMovementSummary(
    db: DbClient,
    vehiculoId: number,
): Promise<MovementCycleSummary> {
    const recentEvents = await db.eventoAcceso.findMany({
        where: { vehiculoId },
        orderBy: { fechaHora: "desc" },
        take: MAX_MOVEMENTS_FOR_STATE_EVALUATION,
        select: {
            tipoEvento: true,
        },
    });

    return summarizeMovementCycleFromTypes(
        recentEvents.map((event) => event.tipoEvento as TipoEventoAccesoValue),
    );
}

export async function hasRecentMovementDuplicate(
    db: DbClient,
    vehiculoId: number,
    porteriaId: number,
    tipoEvento: TipoEventoAccesoValue,
    windowMinutes: number = DUPLICATE_WINDOW_MINUTES,
) {
    const recentThreshold = new Date(Date.now() - windowMinutes * 60 * 1000);

    const recentEvent = await db.eventoAcceso.findFirst({
        where: {
            vehiculoId,
            porteriaId,
            tipoEvento,
            fechaHora: {
                gte: recentThreshold,
            },
        },
        select: {
            id: true,
        },
    });

    return Boolean(recentEvent);
}