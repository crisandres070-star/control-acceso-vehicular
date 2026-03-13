"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import {
    getOpenAiImportAssistantUnavailableMessage,
    isOpenAiImportAssistantEnabled,
} from "@/lib/import/ai-config";
import {
    createAiImportAnalysisFromFile,
    createImportPreviewFromAiAnalysis,
    ImportAiAnalysisAccessDeniedError,
    ImportAiAnalysisBlockedError,
    ImportAiAnalysisExpiredError,
    ImportAiAnalysisNotFoundError,
    ImportAiAssistantUnavailableError,
} from "@/lib/import/ai-import-assistant";
import { IMPORT_MODULE_PATH } from "@/lib/import/constants";
import {
    ImportPreviewAccessDeniedError,
    confirmImportPreview,
    createImportPreviewFromFile,
    ImportPreviewBlockedError,
    ImportPreviewExpiredError,
    ImportPreviewNotFoundError,
} from "@/lib/import/import-service";

function buildImportRedirectPath(params: {
    preview?: string;
    analysis?: string;
    success?: string;
    error?: string;
    importedContractors?: number;
    existingContractors?: number;
    importedVehicles?: number;
    existingVehicles?: number;
    duplicateInternal?: number;
    warnings?: number;
    totalRows?: number;
}) {
    const searchParams = new URLSearchParams();

    if (params.preview) {
        searchParams.set("preview", params.preview);
    }

    if (params.analysis) {
        searchParams.set("analysis", params.analysis);
    }

    if (params.success) {
        searchParams.set("success", params.success);
    }

    if (params.error) {
        searchParams.set("error", params.error);
    }

    if (typeof params.importedContractors === "number") {
        searchParams.set("importedContractors", String(params.importedContractors));
    }

    if (typeof params.existingContractors === "number") {
        searchParams.set("existingContractors", String(params.existingContractors));
    }

    if (typeof params.importedVehicles === "number") {
        searchParams.set("importedVehicles", String(params.importedVehicles));
    }

    if (typeof params.existingVehicles === "number") {
        searchParams.set("existingVehicles", String(params.existingVehicles));
    }

    if (typeof params.duplicateInternal === "number") {
        searchParams.set("duplicateInternal", String(params.duplicateInternal));
    }

    if (typeof params.warnings === "number") {
        searchParams.set("warnings", String(params.warnings));
    }

    if (typeof params.totalRows === "number") {
        searchParams.set("totalRows", String(params.totalRows));
    }

    const queryString = searchParams.toString();

    return queryString ? `${IMPORT_MODULE_PATH}?${queryString}` : IMPORT_MODULE_PATH;
}

function getImportActionErrorMessage(error: unknown) {
    if (
        error instanceof ImportAiAnalysisBlockedError
        || error instanceof ImportAiAnalysisNotFoundError
        || error instanceof ImportAiAnalysisExpiredError
        || error instanceof ImportAiAnalysisAccessDeniedError
        || error instanceof ImportAiAssistantUnavailableError
        || error instanceof ImportPreviewBlockedError
        || error instanceof ImportPreviewNotFoundError
        || error instanceof ImportPreviewExpiredError
        || error instanceof ImportPreviewAccessDeniedError
    ) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado durante la importación.";
}

export async function validateImportFileAction(formData: FormData) {
    const session = await requireRole("ADMIN");
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File) || !fileEntry.name) {
        redirect(buildImportRedirectPath({
            error: "Debe seleccionar un archivo Excel .xlsx.",
        }));
    }

    let redirectPath = IMPORT_MODULE_PATH;

    try {
        const storedPreview = await createImportPreviewFromFile(fileEntry, session.username);
        redirectPath = buildImportRedirectPath({
            preview: storedPreview.id,
        });
    } catch (error) {
        redirectPath = buildImportRedirectPath({
            error: getImportActionErrorMessage(error),
        });
    }

    redirect(redirectPath);
}

export async function analyzeImportWithAiAction(formData: FormData) {
    const session = await requireRole("ADMIN");
    const fileEntry = formData.get("file");

    if (!isOpenAiImportAssistantEnabled()) {
        redirect(buildImportRedirectPath({
            error: getOpenAiImportAssistantUnavailableMessage(),
        }));
    }

    if (!(fileEntry instanceof File) || !fileEntry.name) {
        redirect(buildImportRedirectPath({
            error: "Debe seleccionar un archivo Excel .xlsx para el análisis asistido por IA.",
        }));
    }

    let redirectPath = IMPORT_MODULE_PATH;

    try {
        const storedAnalysis = await createAiImportAnalysisFromFile(fileEntry, session.username);
        redirectPath = buildImportRedirectPath({
            analysis: storedAnalysis.id,
        });
    } catch (error) {
        redirectPath = buildImportRedirectPath({
            error: getImportActionErrorMessage(error),
        });
    }

    redirect(redirectPath);
}

export async function confirmAiImportMappingAction(formData: FormData) {
    const session = await requireRole("ADMIN");
    const analysisId = String(formData.get("analysisId") ?? "").trim();

    if (!analysisId) {
        redirect(buildImportRedirectPath({
            error: "La propuesta IA seleccionada no es válida.",
        }));
    }

    let redirectPath = buildImportRedirectPath({
        analysis: analysisId,
    });

    try {
        const preview = await createImportPreviewFromAiAnalysis(analysisId, session.username);
        redirectPath = buildImportRedirectPath({
            preview: preview.id,
        });
    } catch (error) {
        if (error instanceof ImportAiAnalysisBlockedError) {
            redirectPath = buildImportRedirectPath({
                analysis: error.analysisId,
                error: error.message,
            });
        } else if (
            error instanceof ImportAiAnalysisNotFoundError
            || error instanceof ImportAiAnalysisExpiredError
            || error instanceof ImportAiAnalysisAccessDeniedError
            || error instanceof ImportAiAssistantUnavailableError
        ) {
            redirectPath = buildImportRedirectPath({
                error: error.message,
            });
        } else {
            redirectPath = buildImportRedirectPath({
                analysis: analysisId,
                error: getImportActionErrorMessage(error),
            });
        }
    }

    redirect(redirectPath);
}

export async function confirmImportAction(formData: FormData) {
    const session = await requireRole("ADMIN");
    const previewId = String(formData.get("previewId") ?? "").trim();

    if (!previewId) {
        redirect(buildImportRedirectPath({
            error: "La vista previa seleccionada no es válida.",
        }));
    }

    let redirectPath = buildImportRedirectPath({
        preview: previewId,
    });

    try {
        const result = await confirmImportPreview(previewId, session.username);

        revalidatePath(IMPORT_MODULE_PATH);
        revalidatePath("/admin");
        revalidatePath("/admin/vehicles");
        revalidatePath("/admin/contratistas");
        revalidatePath("/admin/asignaciones");
        revalidatePath("/admin/control-acceso-v2");
        revalidatePath("/guard/v2");

        redirectPath = buildImportRedirectPath({
            success: "Importación completada correctamente.",
            importedContractors: result.createdContractors,
            existingContractors: result.existingContractors,
            importedVehicles: result.createdVehicles,
            existingVehicles: result.existingVehicles,
            duplicateInternal: result.duplicateInternal,
            warnings: result.warnings,
            totalRows: result.totalRows,
        });
    } catch (error) {
        if (error instanceof ImportPreviewBlockedError) {
            redirectPath = buildImportRedirectPath({
                preview: error.previewId,
                error: error.message,
            });
        } else if (
            error instanceof ImportPreviewNotFoundError
            || error instanceof ImportPreviewExpiredError
            || error instanceof ImportPreviewAccessDeniedError
        ) {
            redirectPath = buildImportRedirectPath({
                error: error.message,
            });
        } else {
            redirectPath = buildImportRedirectPath({
                preview: previewId,
                error: getImportActionErrorMessage(error),
            });
        }
    }

    redirect(redirectPath);
}