"use client";

import { useFormStatus } from "react-dom";

type ImportUploadFormProps = {
    validateImportFileAction: (formData: FormData) => void | Promise<void>;
};

type AiImportAssistantFormProps = {
    analyzeImportWithAiAction: (formData: FormData) => void | Promise<void>;
    disabled?: boolean;
};

type ConfirmAiMappingFormProps = {
    confirmAiImportMappingAction: (formData: FormData) => void | Promise<void>;
    analysisId: string;
    disabled?: boolean;
};

type ConfirmImportFormProps = {
    confirmImportAction: (formData: FormData) => void | Promise<void>;
    previewId: string;
    disabled?: boolean;
};

function PendingButton(props: {
    idleLabel: string;
    pendingLabel: string;
    className?: string;
    disabled?: boolean;
}) {
    const { pending } = useFormStatus();

    return (
        <button
            className={props.className ?? "button-primary"}
            disabled={pending || props.disabled}
            type="submit"
        >
            {pending ? props.pendingLabel : props.idleLabel}
        </button>
    );
}

export function ImportUploadForm({ validateImportFileAction }: ImportUploadFormProps) {
    return (
        <form action={validateImportFileAction} className="grid gap-5" encType="multipart/form-data" method="post">
            <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                <label className="field-label" htmlFor="file">
                    Archivo Excel
                </label>
                <p className="mb-3 text-sm text-slate-500">
                    Suba un archivo .xlsx con una sola hoja y columnas exactas: Patente, N°Interno, Empresa, Tipo vehiculo.
                </p>
                <input
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                    id="file"
                    name="file"
                    required
                    type="file"
                />
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Validación previa obligatoria</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            El sistema valida formato, hoja única, encabezados, patentes, empresas, duplicados y registros existentes antes de habilitar la importación.
                        </p>
                    </div>

                    <PendingButton
                        idleLabel="Subir y validar"
                        pendingLabel="Validando archivo..."
                    />
                </div>
            </div>
        </form>
    );
}

export function AiImportAssistantForm({ analyzeImportWithAiAction, disabled = false }: AiImportAssistantFormProps) {
    return (
        <form action={analyzeImportWithAiAction} className="grid gap-5" encType="multipart/form-data" method="post">
            <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,0.98))] p-5 shadow-sm">
                <label className="field-label" htmlFor="ai-file">
                    Archivo Excel para análisis IA
                </label>
                <p className="mb-3 text-sm text-slate-500">
                    La IA analiza hojas, encabezados y filas de muestra para proponer un mapeo. La importación final sigue validándose con las reglas duras del sistema.
                </p>
                <input
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={disabled}
                    id="ai-file"
                    name="file"
                    required
                    type="file"
                />
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Etapa asistida por IA</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Primero propone tipo de documento, hojas, columnas equivalentes, normalizaciones y alertas. Luego usted confirma el mapeo antes de generar el preview real.
                        </p>
                    </div>

                    <PendingButton
                        disabled={disabled}
                        idleLabel="Analizar con IA"
                        pendingLabel="Analizando archivo..."
                    />
                </div>
            </div>
        </form>
    );
}

export function ConfirmAiMappingForm({ confirmAiImportMappingAction, analysisId, disabled = false }: ConfirmAiMappingFormProps) {
    return (
        <form action={confirmAiImportMappingAction} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" method="post">
            <input name="analysisId" type="hidden" value={analysisId} />

            <div>
                <p className="text-sm font-semibold text-slate-900">Confirmar interpretación IA</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Al confirmar, el sistema convierte el mapeo propuesto en un preview normal y vuelve a validar todo con las reglas internas antes de importar.
                </p>
            </div>

            <PendingButton
                className="button-primary sm:min-w-[260px]"
                disabled={disabled}
                idleLabel="Usar interpretación IA"
                pendingLabel="Generando preview..."
            />
        </form>
    );
}

export function ConfirmImportForm({ confirmImportAction, previewId, disabled = false }: ConfirmImportFormProps) {
    return (
        <form action={confirmImportAction} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" method="post">
            <input name="previewId" type="hidden" value={previewId} />

            <div>
                <p className="text-sm font-semibold text-slate-900">Confirmación transaccional</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    La inserción crea primero contratistas faltantes y luego vehículos nuevos dentro de una sola transacción Prisma.
                </p>
            </div>

            <PendingButton
                className="button-primary sm:min-w-[240px]"
                disabled={disabled}
                idleLabel="Confirmar importación"
                pendingLabel="Importando..."
            />
        </form>
    );
}