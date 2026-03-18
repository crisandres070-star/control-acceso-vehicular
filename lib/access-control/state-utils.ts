import {
    ENTRADAS_PARA_FAENA,
    SALIDAS_PARA_FUERA,
    type EstadoOperativoVehiculo,
    type EstadoRecintoPersistedValue,
    type TipoEventoAccesoValue,
} from "@/lib/access-control/constants";

export type MovementCycleSummary = {
    currentCycleType: TipoEventoAccesoValue | null;
    currentCycleCount: number;
    requiredMovements: number;
    remainingMovements: number;
    operationalState: EstadoOperativoVehiculo;
    persistedState: Exclude<EstadoRecintoPersistedValue, null>;
};

export type ProjectedMovementCycle = MovementCycleSummary & {
    stateChanged: boolean;
    stateChangedTo: EstadoOperativoVehiculo | null;
    observation: string;
};

export function getRequiredMovements(tipoEvento: TipoEventoAccesoValue) {
    return tipoEvento === "ENTRADA" ? ENTRADAS_PARA_FAENA : SALIDAS_PARA_FUERA;
}

export function getTipoEventoLabel(tipoEvento: TipoEventoAccesoValue) {
    return tipoEvento === "ENTRADA" ? "Entrada" : "Salida";
}

export function getOperationalStateLabel(estado: EstadoOperativoVehiculo) {
    if (estado === "EN_FAENA") {
        return "EN FAENA";
    }

    if (estado === "FUERA_DE_FAENA") {
        return "FUERA DE FAENA";
    }

    return "EN TRÁNSITO";
}

export function toOperationalState(
    estadoRecinto: EstadoRecintoPersistedValue,
): EstadoOperativoVehiculo {
    if (estadoRecinto === "DENTRO") {
        return "EN_FAENA";
    }

    if (estadoRecinto === "EN_TRANSITO") {
        return "EN_TRANSITO";
    }

    return "FUERA_DE_FAENA";
}

export function toPersistedState(
    estadoOperativo: EstadoOperativoVehiculo,
): Exclude<EstadoRecintoPersistedValue, null> {
    if (estadoOperativo === "EN_FAENA") {
        return "DENTRO";
    }

    if (estadoOperativo === "EN_TRANSITO") {
        return "EN_TRANSITO";
    }

    return "FUERA";
}

function buildMovementCycleSummary(
    currentCycleType: TipoEventoAccesoValue | null,
    rawCount: number,
): MovementCycleSummary {
    if (!currentCycleType) {
        return {
            currentCycleType: null,
            currentCycleCount: 0,
            requiredMovements: 0,
            remainingMovements: 0,
            operationalState: "FUERA_DE_FAENA",
            persistedState: "FUERA",
        };
    }

    const requiredMovements = getRequiredMovements(currentCycleType);
    const currentCycleCount = Math.min(rawCount, requiredMovements);
    const operationalState = currentCycleType === "ENTRADA"
        ? currentCycleCount >= requiredMovements
            ? "EN_FAENA"
            : "EN_TRANSITO"
        : currentCycleCount >= requiredMovements
            ? "FUERA_DE_FAENA"
            : "EN_TRANSITO";

    return {
        currentCycleType,
        currentCycleCount,
        requiredMovements,
        remainingMovements: Math.max(requiredMovements - currentCycleCount, 0),
        operationalState,
        persistedState: toPersistedState(operationalState),
    };
}

function buildObservation(summary: MovementCycleSummary, stateChanged: boolean) {
    if (!summary.currentCycleType) {
        return "Sin movimientos registrados";
    }

    const progressLabel = `${getTipoEventoLabel(summary.currentCycleType)} ${summary.currentCycleCount}/${summary.requiredMovements}`;

    if (summary.operationalState === "EN_TRANSITO") {
        return progressLabel;
    }

    if (stateChanged) {
        return `${progressLabel} · Estado actualizado a ${summary.operationalState}`;
    }

    return `${progressLabel} · Estado ${summary.operationalState}`;
}

export function summarizeMovementCycleFromTypes(
    tipoEventos: TipoEventoAccesoValue[],
): MovementCycleSummary {
    const currentCycleType = tipoEventos[0] ?? null;

    if (!currentCycleType) {
        return buildMovementCycleSummary(null, 0);
    }

    let rawCount = 0;

    for (const tipoEvento of tipoEventos) {
        if (tipoEvento !== currentCycleType) {
            break;
        }

        rawCount += 1;
    }

    return buildMovementCycleSummary(currentCycleType, rawCount);
}

export function projectMovementCycle(
    currentSummary: MovementCycleSummary,
    tipoEvento: TipoEventoAccesoValue,
): ProjectedMovementCycle {
    const rawCount = currentSummary.currentCycleType === tipoEvento
        ? currentSummary.currentCycleCount + 1
        : 1;
    const nextSummary = buildMovementCycleSummary(tipoEvento, rawCount);
    const stateChanged = nextSummary.operationalState !== currentSummary.operationalState;

    return {
        ...nextSummary,
        stateChanged,
        stateChangedTo: stateChanged ? nextSummary.operationalState : null,
        observation: buildObservation(nextSummary, stateChanged),
    };
}