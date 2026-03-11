export function normalizeLicensePlate(value: string) {
    return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeInternalCode(value: string) {
    return value.trim().toUpperCase();
}

export function isAlphanumericCode(value: string) {
    return /^[A-Z0-9]+$/.test(value);
}

export function formatRutInput(value: string) {
    const sanitized = value
        .trim()
        .toUpperCase()
        .replace(/[^0-9K]/g, "")
        .slice(0, 9);

    if (sanitized.length <= 8) {
        return sanitized;
    }

    return `${sanitized.slice(0, 8)}-${sanitized.slice(8)}`;
}

export function normalizeRut(value: string) {
    return formatRutInput(value);
}

export function isValidRut(value: string) {
    return /^[0-9]{8}-[0-9K]$/.test(normalizeRut(value));
}

export function formatDateTime(value: Date) {
    return new Intl.DateTimeFormat("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export function getQueryStringValue(
    value: string | string[] | undefined,
) {
    return Array.isArray(value) ? value[0] : value;
}

function isValidDateInput(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
        parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day
    );
}

function toUtcDate(value: string, endOfDay: boolean) {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(
        Date.UTC(
            year,
            month - 1,
            day,
            endOfDay ? 23 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 999 : 0,
        ),
    );
}

export function parseDateInput(value: string | string[] | undefined | null) {
    const normalized = Array.isArray(value) ? value[0] : value ?? "";
    const trimmed = normalized.trim();

    return isValidDateInput(trimmed) ? trimmed : "";
}

export function buildCreatedAtFilter(startDateInput: string, endDateInput: string) {
    const createdAt: {
        gte?: Date;
        lte?: Date;
    } = {};

    if (startDateInput) {
        createdAt.gte = toUtcDate(startDateInput, false);
    }

    if (endDateInput) {
        createdAt.lte = toUtcDate(endDateInput, true);
    }

    return Object.keys(createdAt).length > 0 ? createdAt : undefined;
}
