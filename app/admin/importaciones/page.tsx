import Link from "next/link";

export default function ImportacionesPage() {
    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Mejora futura
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Importaciones fuera del flujo principal
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            En esta entrega la operación oficial del sistema es manual desde el panel administrador. Excel e IA quedan preservados como línea futura de trabajo, pero no forman parte del proceso recomendado para uso real.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin">
                            Volver al panel manual
                        </Link>
                        <Link className="button-secondary" href="/admin/contratistas">
                            Ver contratistas
                        </Link>
                        <Link className="button-secondary" href="/admin/asignaciones">
                            Ver asignaciones
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Estado actual</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">Operación manual</p>
                    <p className="mt-2 text-sm text-slate-500">Contratistas, vehículos, choferes y asignaciones se cargan directamente desde la web.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Excel</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">Despriorizado</p>
                    <p className="mt-2 text-sm text-slate-500">No se usa como camino oficial de carga en esta etapa para evitar fricción y dependencias extra.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">IA</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">Secundaria</p>
                    <p className="mt-2 text-sm text-slate-500">Queda fuera del flujo crítico para que el sistema funcione perfecto sin API keys ni servicios externos.</p>
                </div>
                <div className="panel p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Próxima etapa</p>
                    <p className="mt-3 text-2xl font-bold text-slate-950">Mejora futura</p>
                    <p className="mt-2 text-sm text-slate-500">El módulo puede retomarse más adelante cuando la operación manual ya esté consolidada.</p>
                </div>
            </section>

            <section className="panel overflow-hidden">
                <div className="border-b border-slate-200/70 bg-slate-50/70 px-6 py-6 lg:px-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                        Qué hacer en esta versión
                    </p>
                    <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                        El flujo recomendado se resuelve desde el panel manual
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Si necesita cargar información hoy, use directamente los módulos administrativos principales. Eso deja el padrón más controlado y reduce errores de operación.
                    </p>
                </div>

                <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3 lg:px-8">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">1. Contratistas</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">Crear la empresa base</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Registre manualmente la empresa antes de cargar vehículos y choferes.</p>
                        <div className="mt-4">
                            <Link className="button-secondary" href="/admin/contratistas/nuevo">
                                Ir a contratistas
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">2. Vehículos</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">Registrar cada patente</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Asocie manualmente el vehículo a su contratista para dejarlo listo para operación real.</p>
                        <div className="mt-4">
                            <Link className="button-secondary" href="/admin/vehiculos/nuevo">
                                Ir a vehículos
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">3. Choferes</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">Crear el personal autorizado</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Cargue manualmente los choferes y use la creación rápida de contratista solo cuando haga falta.</p>
                        <div className="mt-4">
                            <Link className="button-secondary" href="/admin/choferes/nuevo">
                                Ir a choferes
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">4. Asignaciones</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">Vincular vehículo y chofer</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Complete manualmente la relación para habilitar el control de acceso sin ambigüedades.</p>
                        <div className="mt-4">
                            <Link className="button-secondary" href="/admin/asignaciones">
                                Ir a asignaciones
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">5. Control de acceso</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">Operar entradas y salidas</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Registre los movimientos desde la web con portería, patente y chofer autorizado.</p>
                        <div className="mt-4">
                            <Link className="button-secondary" href="/admin/control-acceso-v2">
                                Ir a control de acceso
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">6. Eventos</p>
                        <p className="mt-3 text-lg font-semibold text-slate-950">Supervisar y auditar</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Revise el historial completo de movimientos y exporte reportes cuando haga falta.</p>
                        <div className="mt-4">
                            <Link className="button-secondary" href="/admin/eventos-acceso">
                                Ir a eventos
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                    Estado del módulo
                </p>
                <h3 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 lg:text-3xl">
                    Conservado como referencia, no como flujo principal
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    El sistema principal debe funcionar perfecto sin importaciones, sin IA y sin dependencias externas. Por eso, esta vista queda explícitamente fuera de foco hasta una etapa futura de mejora.
                </p>
            </section>
        </div>
    );
}