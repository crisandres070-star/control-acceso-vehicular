export const ENTRADAS_PARA_FAENA = 1;
export const SALIDAS_PARA_FUERA = 1;
export const DUPLICATE_WINDOW_MINUTES = 5;
export const MAX_MOVEMENTS_FOR_STATE_EVALUATION = Math.max(
    ENTRADAS_PARA_FAENA,
    SALIDAS_PARA_FUERA,
);

export type TipoEventoAccesoValue = "ENTRADA" | "SALIDA";
export type EstadoRecintoPersistedValue = "DENTRO" | "FUERA" | "EN_TRANSITO" | null;
export type EstadoOperativoVehiculo = "EN_FAENA" | "FUERA_DE_FAENA";