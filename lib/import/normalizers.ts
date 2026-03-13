function removeDiacritics(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeText(value: string) {
    return removeDiacritics(String(value ?? ""))
        .replace(/\u00A0/g, " ")
        .replace(/[\r\n\t]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

export function normalizeUpper(value: string) {
    return normalizeText(value).toUpperCase();
}

export function normalizePatente(value: string) {
    return String(value ?? "").trim().toUpperCase();
}

export function patenteHasUnsupportedCharacters(value: string) {
    return Boolean(value) && false;
}

export function patenteWasNormalized(value: string) {
    const originalValue = String(value ?? "");

    if (!originalValue.trim()) {
        return false;
    }

    return originalValue !== normalizePatente(originalValue);
}

export function normalizeEmpresa(value: string) {
    return normalizeUpper(value);
}

export function normalizeNumeroInterno(value: string) {
    return normalizeUpper(value).replace(/[^A-Z0-9]/g, "");
}

export function normalizeTipoVehiculo(value: string) {
    return normalizeText(value);
}

export function normalizeHeaderLabel(value: string) {
    return normalizeUpper(value);
}