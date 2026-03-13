import {
    type EstadoRecintoVehiculo,
    Prisma,
    type TipoEventoAcceso,
} from "@prisma/client";

import {
    buildCreatedAtFilter,
    normalizeLicensePlate,
    parseDateInput,
} from "@/lib/utils";

export type EventoAccesoReportFilters = {
    plate: string;
    contratistaId: number | null;
    choferId: number | null;
    porteriaId: number | null;
    tipoEvento: TipoEventoAcceso | "";
    startDate: string;
    endDate: string;
};

export function parsePositiveInteger(value: string | null | undefined) {
    const parsed = Number(value ?? "");

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseTipoEvento(value: string | null | undefined): TipoEventoAcceso | "" {
    return value === "ENTRADA" || value === "SALIDA" ? value : "";
}

export function parseEventoAccesoReportFilters(input: {
    plate?: string | null;
    contratistaId?: string | null;
    choferId?: string | null;
    porteriaId?: string | null;
    tipoEvento?: string | null;
    startDate?: string | null;
    endDate?: string | null;
}): EventoAccesoReportFilters {
    return {
        plate: normalizeLicensePlate(input.plate ?? ""),
        contratistaId: parsePositiveInteger(input.contratistaId),
        choferId: parsePositiveInteger(input.choferId),
        porteriaId: parsePositiveInteger(input.porteriaId),
        tipoEvento: parseTipoEvento(input.tipoEvento),
        startDate: parseDateInput(input.startDate),
        endDate: parseDateInput(input.endDate),
    };
}

export function buildEventoAccesoWhereInput(filters: EventoAccesoReportFilters) {
    const where: Prisma.EventoAccesoWhereInput = {};

    if (filters.plate) {
        where.vehiculo = {
            licensePlate: filters.plate,
        };
    }

    if (filters.contratistaId) {
        where.contratistaId = filters.contratistaId;
    }

    if (filters.choferId) {
        where.choferId = filters.choferId;
    }

    if (filters.porteriaId) {
        where.porteriaId = filters.porteriaId;
    }

    if (filters.tipoEvento) {
        where.tipoEvento = filters.tipoEvento;
    }

    const fechaHoraFilter = buildCreatedAtFilter(filters.startDate, filters.endDate);

    if (fechaHoraFilter) {
        where.fechaHora = fechaHoraFilter;
    }

    return Object.keys(where).length > 0 ? where : undefined;
}

export function buildEventoAccesoExportSearchParams(filters: EventoAccesoReportFilters) {
    const searchParams = new URLSearchParams();

    if (filters.plate) {
        searchParams.set("plate", filters.plate);
    }

    if (filters.contratistaId) {
        searchParams.set("contratistaId", String(filters.contratistaId));
    }

    if (filters.choferId) {
        searchParams.set("choferId", String(filters.choferId));
    }

    if (filters.porteriaId) {
        searchParams.set("porteriaId", String(filters.porteriaId));
    }

    if (filters.tipoEvento) {
        searchParams.set("tipoEvento", filters.tipoEvento);
    }

    if (filters.startDate) {
        searchParams.set("startDate", filters.startDate);
    }

    if (filters.endDate) {
        searchParams.set("endDate", filters.endDate);
    }

    return searchParams;
}

export function buildTodayDateRange(reference = new Date()) {
    const start = new Date(reference);
    const end = new Date(reference);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
        gte: start,
        lte: end,
    };
}

export function formatEstadoRecintoLabel(value: EstadoRecintoVehiculo | null | undefined) {
    if (value === "DENTRO") {
        return "DENTRO";
    }

    if (value === "FUERA") {
        return "FUERA";
    }

    return "Sin estado";
}

export function formatChoferLabel(nombre: string | null | undefined) {
    return nombre?.trim() ? nombre : "Sin chofer";
}