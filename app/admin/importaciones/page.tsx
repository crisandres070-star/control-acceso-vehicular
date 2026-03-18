import Link from "next/link";

export default function ImportacionesPage() {
    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Importaciones
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Centro de carga autonoma
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            Desde este modulo puede cargar empresas y vehiculos masivamente por Excel, que es el flujo principal de padrón operativo.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-primary" href="/admin">
                            Volver al panel
                        </Link>
                        <Link className="button-secondary" href="/admin/importaciones/vehiculos">
                            Abrir importador de vehiculos
                        </Link>
                        <Link className="button-secondary" href="/admin/dashboard-faena">
                            Abrir dashboard de faena
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <article className="panel p-6 lg:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Carga por Excel</p>
                    <h3 className="mt-3 text-2xl font-bold text-slate-950">Importador de empresas y vehiculos</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Procesa Patente, N°Interno, Empresa y Tipo vehiculo. Crea empresas faltantes, evita patentes duplicadas y registra solo filas validas.
                    </p>
                    <div className="mt-5">
                        <Link className="button-primary" href="/admin/importaciones/vehiculos">
                            Ir al importador
                        </Link>
                    </div>
                </article>

                <article className="panel p-6 lg:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Operacion</p>
                    <h3 className="mt-3 text-2xl font-bold text-slate-950">Dashboard dentro / fuera de faena</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Visualiza el estado actual del parque vehicular segun el ultimo movimiento registrado en porteria.
                    </p>
                    <div className="mt-5">
                        <Link className="button-secondary" href="/admin/dashboard-faena">
                            Ir al dashboard
                        </Link>
                    </div>
                </article>

                <article className="panel p-6 lg:p-8 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-700">Complemento manual</p>
                    <h3 className="mt-3 text-2xl font-bold text-slate-950">Contratistas puntuales sin reimportar Excel</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Si falta un contratista puntual o necesita corregir un dato, puede crear o editar su ficha manualmente sin tocar el flujo principal de importación.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link className="button-secondary" href="/admin/contratistas">
                            Ver contratistas
                        </Link>
                        <Link className="button-primary" href="/admin/contratistas/nuevo">
                            Nuevo contratista
                        </Link>
                    </div>
                </article>
            </section>
        </div>
    );
}