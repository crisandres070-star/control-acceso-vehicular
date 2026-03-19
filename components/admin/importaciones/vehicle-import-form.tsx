"use client";

import { useFormStatus } from "react-dom";

type VehicleImportFormProps = {
    validateImportFileAction: (formData: FormData) => void | Promise<void>;
};

type ConfirmVehicleImportFormProps = {
    confirmImportAction: (formData: FormData) => void | Promise<void>;
    previewId: string;
    disabled?: boolean;
};

function PendingSubmitButton(props: {
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

export function VehicleImportForm({ validateImportFileAction }: VehicleImportFormProps) {
    return (
        <form action={validateImportFileAction} className="grid gap-5" encType="multipart/form-data" method="post">
            <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.98))] p-5 shadow-sm">
                <label className="field-label" htmlFor="vehicle-import-file">
                    Archivo Excel
                </label>
                <p className="mb-3 text-sm text-slate-500">
                    Suba un archivo .xlsx con una sola hoja. Debe incluir columnas para Patente, N°Interno, Empresa y Tipo vehiculo.
                </p>
                <input
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                    id="vehicle-import-file"
                    name="file"
                    required
                    type="file"
                />
            </div>

            <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/70 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Validacion previa obligatoria</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Se valida estructura real de columnas, se detecta automaticamente la fila de encabezados y se omiten filas invalidas sin bloquear toda la importacion.
                        </p>
                    </div>

                    <PendingSubmitButton
                        idleLabel="Subir y validar"
                        pendingLabel="Validando archivo..."
                    />
                </div>
            </div>
        </form>
    );
}

export function ConfirmVehicleImportForm({
    confirmImportAction,
    previewId,
    disabled = false,
}: ConfirmVehicleImportFormProps) {
    return (
        <form action={confirmImportAction} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" method="post">
            <input name="previewId" type="hidden" value={previewId} />

            <div>
                <p className="text-sm font-semibold text-slate-900">Confirmar importacion</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Se guardaran solo filas validas. Los duplicados y filas invalidas quedaran omitidos en el resumen.
                </p>
            </div>

            <PendingSubmitButton
                className="button-primary sm:min-w-[280px]"
                disabled={disabled}
                idleLabel="Importar filas validas"
                pendingLabel="Importando registros..."
            />
        </form>
    );
}
