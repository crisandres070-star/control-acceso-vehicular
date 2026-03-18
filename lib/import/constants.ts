export const IMPORT_MODULE_PATH = "/admin/importaciones/vehiculos";

export const IMPORT_REQUIRED_HEADER_KEYS = [
    "patente",
    "numeroInterno",
    "empresa",
    "tipoVehiculo",
] as const;

export type ImportRequiredHeaderKey = (typeof IMPORT_REQUIRED_HEADER_KEYS)[number];

export const IMPORT_REQUIRED_HEADER_LABELS = {
    patente: "Patente",
    numeroInterno: "N°Interno",
    empresa: "Empresa",
    tipoVehiculo: "Tipo vehiculo",
} as const satisfies Record<ImportRequiredHeaderKey, string>;

export const IMPORT_REQUIRED_HEADERS = IMPORT_REQUIRED_HEADER_KEYS.map(
    (key) => IMPORT_REQUIRED_HEADER_LABELS[key],
);

export const IMPORT_HEADER_ALIASES = {
    patente: [
        "Patente",
        "Pat",
        "Placa",
        "PPU",
    ],
    numeroInterno: [
        "N°Interno",
        "N° Interno",
        "Nro Interno",
        "Nro. Interno",
        "Numero Interno",
        "Num Interno",
        "Codigo Interno",
    ],
    empresa: [
        "Empresa",
        "Contratista",
        "Razon Social",
    ],
    tipoVehiculo: [
        "Tipo vehiculo",
        "Tipo vehículo",
        "Tipo",
        "Clase vehiculo",
        "Clase vehículo",
    ],
} as const satisfies Record<ImportRequiredHeaderKey, readonly string[]>;

export const IMPORT_ALLOWED_EXTENSION = ".xlsx";
export const IMPORT_ALLOWED_MIME_TYPES = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
] as const;

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_FILE_SIZE_LABEL = "5 MB";
export const IMPORT_PREVIEW_TTL_MS = 30 * 60 * 1000;
export const IMPORT_AI_ANALYSIS_TTL_MS = 30 * 60 * 1000;
export const IMPORT_AI_ANALYSIS_SAMPLE_ROWS = 5;
export const IMPORT_AI_REQUEST_TIMEOUT_MS = 20_000;
export const IMPORT_AI_DEFAULT_MODEL = "gpt-4.1-mini";

export const DEFAULT_IMPORTED_VEHICLE_NAME_PREFIX = "Vehículo";
export const DEFAULT_IMPORTED_INTERNAL_CODE = "PENDIENTE";
export const DEFAULT_IMPORTED_VEHICLE_TYPE = "NO INFORMADO";
export const DEFAULT_IMPORTED_VEHICLE_BRAND = "IMPORTADO";
export const DEFAULT_IMPORTED_VEHICLE_ACCESS_STATUS = "YES" as const;

export const SYNTHETIC_CONTRATISTA_RUT_MIN = 90_000_000;
export const SYNTHETIC_CONTRATISTA_RUT_RANGE = 9_999_999;