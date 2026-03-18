export const OPERATIONAL_PORTERIA_NAMES = [
    "Cala Cala",
    "Soledad",
    "Tana",
    "Negreiros",
] as const;

type PorteriaLike = {
    nombre: string;
    orden?: number | null;
};

type CanonicalPorteria = {
    displayName: (typeof OPERATIONAL_PORTERIA_NAMES)[number];
    order: number;
    aliases: string[];
};

const CANONICAL_PORTERIAS: CanonicalPorteria[] = [
    {
        displayName: "Cala Cala",
        order: 1,
        aliases: [
            "cala cala",
            "porteria 1",
            "porteria entrada minera",
            "entrada minera",
        ],
    },
    {
        displayName: "Soledad",
        order: 2,
        aliases: [
            "soledad",
            "porteria 2",
            "control caseta",
            "caseta",
        ],
    },
    {
        displayName: "Tana",
        order: 3,
        aliases: [
            "tana",
            "porteria 3",
            "porteria salida operativa",
            "salida operativa",
        ],
    },
    {
        displayName: "Negreiros",
        order: 4,
        aliases: [
            "negreiros",
            "porteria 4",
            "salida principal",
            "porteria principal",
        ],
    },
];

function normalizePorteriaToken(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function findCanonicalPorteria(nombre: string, orden?: number | null) {
    const normalizedName = normalizePorteriaToken(nombre);
    const byAlias = CANONICAL_PORTERIAS.find((porteria) => {
        const normalizedDisplayName = normalizePorteriaToken(porteria.displayName);

        return normalizedName === normalizedDisplayName
            || porteria.aliases.some((alias) => normalizePorteriaToken(alias) === normalizedName);
    });

    if (byAlias) {
        return byAlias;
    }

    if (typeof orden === "number") {
        return CANONICAL_PORTERIAS.find((porteria) => porteria.order === orden) ?? null;
    }

    return null;
}

export function getOperationalPorteriaName(input: PorteriaLike | string | null | undefined) {
    if (!input) {
        return "";
    }

    if (typeof input === "string") {
        const canonical = findCanonicalPorteria(input);

        return canonical?.displayName ?? input.trim();
    }

    const canonical = findCanonicalPorteria(input.nombre, input.orden);

    return canonical?.displayName ?? input.nombre.trim();
}

export function getOperationalPorteriaSortOrder(input: PorteriaLike) {
    const canonical = findCanonicalPorteria(input.nombre, input.orden);

    if (canonical) {
        return canonical.order;
    }

    if (typeof input.orden === "number" && input.orden > 0) {
        return input.orden;
    }

    return 999;
}

export function sortOperationalPorterias<T extends PorteriaLike>(porterias: T[]) {
    return [...porterias].sort((left, right) => {
        const orderDelta = getOperationalPorteriaSortOrder(left) - getOperationalPorteriaSortOrder(right);

        if (orderDelta !== 0) {
            return orderDelta;
        }

        return getOperationalPorteriaName(left).localeCompare(getOperationalPorteriaName(right), "es");
    });
}

export function mapOperationalPorterias<T extends PorteriaLike>(porterias: T[]) {
    return sortOperationalPorterias(porterias).map((porteria) => ({
        ...porteria,
        nombre: getOperationalPorteriaName(porteria),
    } as T));
}