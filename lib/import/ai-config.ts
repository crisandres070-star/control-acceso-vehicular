import "server-only";

import { IMPORT_AI_DEFAULT_MODEL } from "@/lib/import/constants";

export const OPENAI_IMPORT_ASSISTANT_MISSING_API_KEY_MESSAGE = "La capa IA no está disponible porque falta la variable de entorno OPENAI_API_KEY del servidor. En desarrollo local use .env o .env.local; .env.example es solo una plantilla. En Vercel configúrela en Environment Variables.";

export type OpenAiImportAssistantConfig = {
    enabled: boolean;
    apiKey: string | null;
    apiKeyPresent: boolean;
    model: string;
    usesDefaultModel: boolean;
};

function getTrimmedEnvValue(value: string | undefined) {
    const trimmedValue = value?.trim() ?? "";

    return trimmedValue || "";
}

export function getOpenAiImportAssistantConfig(): OpenAiImportAssistantConfig {
    const apiKey = getTrimmedEnvValue(process.env.OPENAI_API_KEY);
    const configuredModel = getTrimmedEnvValue(process.env.OPENAI_IMPORT_ASSISTANT_MODEL);

    return {
        enabled: Boolean(apiKey),
        apiKey: apiKey || null,
        apiKeyPresent: Boolean(apiKey),
        model: configuredModel || IMPORT_AI_DEFAULT_MODEL,
        usesDefaultModel: !configuredModel,
    };
}

export function isOpenAiImportAssistantEnabled() {
    return getOpenAiImportAssistantConfig().enabled;
}

export function getOpenAiImportAssistantUnavailableMessage() {
    return OPENAI_IMPORT_ASSISTANT_MISSING_API_KEY_MESSAGE;
}

export function getOpenAiImportAssistantSafeDiagnostic() {
    const config = getOpenAiImportAssistantConfig();

    return {
        apiKeyPresent: config.apiKeyPresent,
        model: config.model,
        usesDefaultModel: config.usesDefaultModel,
    };
}