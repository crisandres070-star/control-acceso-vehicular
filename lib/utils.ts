export function normalizeLicensePlate(value: string) {
    return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
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

const chileDateFormatter = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const chileTimeFormatter = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

function resolveDatePart(parts: Intl.DateTimeFormatPart[], type: "day" | "month" | "year") {
    return parts.find((part) => part.type === type)?.value ?? "";
}

function resolveTimePart(parts: Intl.DateTimeFormatPart[], type: "hour" | "minute" | "second") {
    return parts.find((part) => part.type === type)?.value ?? "00";
}

export function formatDateTime(value: Date) {
    const dateParts = chileDateFormatter.formatToParts(value);
    const timeParts = chileTimeFormatter.formatToParts(value);
    const day = resolveDatePart(dateParts, "day");
    const month = resolveDatePart(dateParts, "month");
    const year = resolveDatePart(dateParts, "year");
    const hour = resolveTimePart(timeParts, "hour");
    const minute = resolveTimePart(timeParts, "minute");
    const second = resolveTimePart(timeParts, "second");

    return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
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
