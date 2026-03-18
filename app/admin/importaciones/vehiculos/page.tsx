import Link from "next/link";

import {
    confirmImportAction,
    validateImportFileAction,
} from "@/app/admin/importaciones/actions";
import { ImportSummary } from "@/components/admin/importaciones/import-summary";
import {
    ConfirmVehicleImportForm,
    VehicleImportForm,
} from "@/components/admin/importaciones/vehicle-import-form";
import { requireRole } from "@/lib/auth";
import {
    ImportPreviewAccessDeniedError,
    ImportPreviewExpiredError,
    ImportPreviewNotFoundError,
    loadStoredImportPreview,
} from "@/lib/import/import-service";
import { getQueryStringValue } from "@/lib/utils";

type ImportacionVehiculosPageProps = {
    searchParams: {
        preview?: string | string[];
        success?: string | string[];
        error?: string | string[];
        importedContractors?: string | string[];
        existingContractors?: string | string[];
        importedVehicles?: string | string[];
        existingVehicles?: string | string[];
        validRows?: string | string[];
        invalidRows?: string | string[];
        omittedDuplicates?: string | string[];
        duplicateInternal?: string | string[];
        warnings?: string | string[];
        totalRows?: string | string[];
    };
};

function parsePositiveIntegerParam(value: string | undefined) {
    if (!value) {
        return 0;
    }

    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function decodeMessage(value: string | undefined) {
    if (!value) {
        return "";
    }

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getErrorMessage(error: unknown) {
    if (
        error instanceof ImportPreviewNotFoundError
        || error instanceof ImportPreviewExpiredError
        || error instanceof ImportPreviewAccessDeniedError
    ) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "No fue posible recuperar la vista previa de importacion.";
}

export default async function ImportacionVehiculosPage({ searchParams }: ImportacionVehiculosPageProps) {
    const session = await requireRole("ADMIN");
    const previewId = String(getQueryStringValue(searchParams.preview) ?? "").trim();
    let storedPreview: Awaited<ReturnType<typeof loadStoredImportPreview>> | null = null;
    let previewErrorMessage = "";

    if (previewId) {
        try {
            storedPreview = await loadStoredImportPreview(previewId, session.username);
        } catch (error) {
            previewErrorMessage = getErrorMessage(error);
        }
    }

    const successMessage = decodeMessage(getQueryStringValue(searchParams.success));
    const errorMessage = decodeMessage(getQueryStringValue(searchParams.error)) || previewErrorMessage;
    const importedContractors = parsePositiveIntegerParam(getQueryStringValue(searchParams.importedContractors));
    const existingContractors = parsePositiveIntegerParam(getQueryStringValue(searchParams.existingContractors));
    const importedVehicles = parsePositiveIntegerParam(getQueryStringValue(searchParams.importedVehicles));
    const existingVehicles = parsePositiveIntegerParam(getQueryStringValue(searchParams.existingVehicles));
    const validRows = parsePositiveIntegerParam(getQueryStringValue(searchParams.validRows));
    const invalidRows = parsePositiveIntegerParam(getQueryStringValue(searchParams.invalidRows));
    const omittedDuplicates = parsePositiveIntegerParam(getQueryStringValue(searchParams.omittedDuplicates));
    const duplicateInternal = parsePositiveIntegerParam(getQueryStringValue(searchParams.duplicateInternal));
    const warnings = parsePositiveIntegerParam(getQueryStringValue(searchParams.warnings));
    const totalRows = parsePositiveIntegerParam(getQueryStringValue(searchParams.totalRows));
    const previewReady = Boolean(storedPreview?.preview.summary.canImport);

    return (
        <div className="space-y-6">
            <section className="panel overflow-hidden">
                <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Importaciones
                        </p>
                        <h1 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Importador maestro de vehiculos por Excel
                        </h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 lg:text-base">
                            Carga autonoma para crear empresas y vehiculos en forma masiva. El sistema valida filas,
                            evita duplicados y solo persiste registros validos sin bloquear todo el proceso por errores puntuales.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-secondary" href="/admin/importaciones">
                            Volver al modulo de importaciones
                        </Link>
                        <Link className="button-secondary" href="/admin/dashboard-faena">
                            Ver dashboard de faena
                        </Link>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">Formato requerido</p>
                <h2 className="mt-3 text-2xl font-bold text-slate-950">Columnas esperadas en el archivo</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Patente</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">N°Interno</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Empresa</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Tipo vehiculo</div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                    Se aceptan alias razonables de encabezados. El archivo debe ser .xlsx, con una sola hoja y filas completas.
                </p>
            </section>

            {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                </div>
            ) : null}

            {successMessage ? (
                <section className="panel overflow-hidden">
                    <div className="border-b border-green-200 bg-green-50 px-6 py-5 lg:px-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-green-700">Importacion completada</p>
                        <h2 className="mt-2 text-2xl font-bold text-green-900">{successMessage}</h2>
                    </div>

                    <div className="grid gap-4 px-6 py-5 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
                        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Filas leidas</p>
                            <p className="mt-2 text-3xl font-bold text-green-900">{totalRows}</p>
                        </div>
                        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Filas validas</p>
                            <p className="mt-2 text-3xl font-bold text-green-900">{validRows}</p>
                        </div>
                        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Vehiculos insertados</p>
                            <p className="mt-2 text-3xl font-bold text-green-900">{importedVehicles}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Omitidas por duplicado</p>
                            <p className="mt-2 text-3xl font-bold text-amber-800">{omittedDuplicates}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-4 lg:px-8 lg:pb-8">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Filas con error</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{invalidRows}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Empresas nuevas</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{importedContractors}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Empresas existentes</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{existingContractors}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Advertencias</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">{warnings}</p>
                        </div>
                    </div>

                    <p className="px-6 pb-6 text-sm text-slate-600 lg:px-8 lg:pb-8">
                        Vehiculos ya existentes omitidos: <span className="font-semibold text-slate-900">{existingVehicles}</span>. Duplicados internos dentro del Excel: <span className="font-semibold text-slate-900">{duplicateInternal}</span>.
                    </p>
                </section>
            ) : null}

            <section className="panel p-6 lg:p-8">
                <VehicleImportForm validateImportFileAction={validateImportFileAction} />
            </section>

            {storedPreview ? (
                <>
                    <ImportSummary preview={storedPreview.preview} />

                    <section className="panel p-6 lg:p-8">
                        <ConfirmVehicleImportForm
                            confirmImportAction={confirmImportAction}
                            disabled={!previewReady}
                            previewId={storedPreview.id}
                        />
                        {!previewReady ? (
                            <p className="mt-3 text-sm text-slate-600">
                                Corrija los errores estructurales del archivo antes de confirmar la importacion.
                            </p>
                        ) : null}
                    </section>
                </>
            ) : null}
        </div>
    );
}
