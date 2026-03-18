import type { ImportIssue, ImportPreview } from "@/lib/import/types";

type ImportSummaryProps = {
    preview: ImportPreview;
};

const ISSUE_LIST_LIMIT = 20;
const VEHICLE_LIST_LIMIT = 25;

function getIssueClasses(severity: ImportIssue["severity"]) {
    if (severity === "critical") {
        return {
            container: "border-red-200 bg-red-50",
            badge: "bg-red-100 text-red-700",
            text: "text-red-800",
        };
    }

    return {
        container: "border-amber-200 bg-amber-50",
        badge: "bg-amber-100 text-amber-700",
        text: "text-amber-800",
    };
}

export function ImportSummary({ preview }: ImportSummaryProps) {
    const omittedDuplicates = preview.summary.existingVehicles + preview.summary.duplicateInternal;
    const criticalIssues = preview.issues.filter((issue) => issue.severity === "critical");
    const warningIssues = preview.issues.filter((issue) => issue.severity === "warning");

    return (
        <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Filas leidas</p>
                    <p className="mt-3 text-4xl font-bold text-slate-950">{preview.summary.totalRows}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Filas validas</p>
                    <p className="mt-3 text-4xl font-bold text-green-700">{preview.summary.validRows}</p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Filas con error</p>
                    <p className={`mt-3 text-4xl font-bold ${preview.summary.invalidRows > 0 ? "text-red-700" : "text-green-700"}`}>
                        {preview.summary.invalidRows}
                    </p>
                </div>
                <div className="panel px-5 py-5 lg:px-6 lg:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Omitidas por duplicado</p>
                    <p className="mt-3 text-4xl font-bold text-amber-700">{omittedDuplicates}</p>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Empresas nuevas</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{preview.summary.newContractors}</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Empresas existentes</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{preview.summary.existingContractors}</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehiculos nuevos</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{preview.summary.newVehicles}</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Vehiculos existentes</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">{preview.summary.existingVehicles}</p>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-5 lg:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Validacion</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950">Resultado del analisis del archivo</h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Archivo: <span className="font-semibold text-slate-900">{preview.fileName}</span>
                        {preview.sheetName ? (
                            <>
                                {" "}· Hoja: <span className="font-semibold text-slate-900">{preview.sheetName}</span>
                            </>
                        ) : null}
                    </p>
                </div>

                <div className="space-y-3 px-6 py-5 lg:px-8">
                    {preview.issues.length === 0 ? (
                        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                            El archivo no presenta observaciones.
                        </div>
                    ) : (
                        preview.issues.slice(0, ISSUE_LIST_LIMIT).map((issue, index) => {
                            const classes = getIssueClasses(issue.severity);

                            return (
                                <div className={`rounded-2xl border px-4 py-3 ${classes.container}`} key={`${issue.code}-${issue.rowNumber ?? "global"}-${index}`}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] ${classes.badge}`}>
                                            {issue.severity === "critical" ? "Error" : "Advertencia"}
                                        </span>
                                        {typeof issue.rowNumber === "number" ? (
                                            <span className="text-xs font-semibold text-slate-600">Fila {issue.rowNumber}</span>
                                        ) : null}
                                        {issue.field ? (
                                            <span className="text-xs font-semibold text-slate-600">Campo {issue.field}</span>
                                        ) : null}
                                    </div>
                                    <p className={`mt-2 text-sm leading-6 ${classes.text}`}>{issue.message}</p>
                                </div>
                            );
                        })
                    )}

                    {preview.issues.length > ISSUE_LIST_LIMIT ? (
                        <p className="text-xs font-medium text-slate-500">
                            Mostrando {ISSUE_LIST_LIMIT} de {preview.issues.length} observaciones.
                        </p>
                    ) : null}

                    {criticalIssues.length > 0 ? (
                        <p className="text-sm font-semibold text-red-700">
                            Se detectaron {criticalIssues.length} errores criticos y {warningIssues.length} advertencias.
                        </p>
                    ) : (
                        <p className="text-sm font-semibold text-green-700">
                            No hay errores criticos globales. Puede importar filas validas.
                        </p>
                    )}
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-5 lg:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Filas validas</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-950">Vehiculos listos para importacion</h3>
                </div>

                <div className="overflow-x-auto px-2 pb-4 pt-2 lg:px-4">
                    <table className="min-w-full border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                <th className="px-4 py-2">Fila</th>
                                <th className="px-4 py-2">Patente</th>
                                <th className="px-4 py-2">N°Interno</th>
                                <th className="px-4 py-2">Empresa</th>
                                <th className="px-4 py-2">Tipo vehiculo</th>
                                <th className="px-4 py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.importRows.slice(0, VEHICLE_LIST_LIMIT).map((row) => {
                                const existingVehicle = preview.vehicles.existingItems.find((item) => item.patente === row.patente);

                                return (
                                    <tr className="rounded-2xl border border-slate-200 bg-white shadow-sm" key={`${row.__row}-${row.patente}`}>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.__row}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{row.patente}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{row.numeroInterno}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{row.empresa}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{row.tipoVehiculo}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {existingVehicle ? (
                                                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                                                    Existente
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
                                                    Nuevo
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {preview.importRows.length > VEHICLE_LIST_LIMIT ? (
                    <p className="px-6 pb-5 text-xs font-medium text-slate-500 lg:px-8">
                        Mostrando {VEHICLE_LIST_LIMIT} de {preview.importRows.length} filas validas.
                    </p>
                ) : null}
            </section>
        </div>
    );
}
