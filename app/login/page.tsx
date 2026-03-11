import { redirect } from "next/navigation";

import { loginAction } from "@/app/login/actions";
import { getDashboardPath, getSession } from "@/lib/auth";
import { getQueryStringValue } from "@/lib/utils";

type LoginPageProps = {
    searchParams: {
        error?: string | string[];
    };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const session = await getSession();

    if (session) {
        redirect(getDashboardPath(session.role));
    }

    const error = getQueryStringValue(searchParams.error);

    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-10">
            <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="panel overflow-hidden p-8 lg:p-12">
                    <div className="mb-10 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-accent-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-accent-500" />
                        <span>Control de acceso de vehiculos</span>
                    </div>
                    <div className="space-y-6">
                        <h1 className="max-w-2xl font-[family:var(--font-heading)] text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">
                            Valide ingresos en porteria y administre registros desde una sola plataforma.
                        </h1>
                        <p className="max-w-xl text-lg text-slate-600">
                            Administracion controla vehiculos y auditorias. Porteria solo necesita ingresar la patente para obtener un resultado inmediato y claro.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        <div className="panel-muted p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Administracion</p>
                            <p className="mt-3 text-3xl font-bold text-slate-950">Vehiculos</p>
                            <p className="mt-2 text-sm text-slate-600">Altas, edicion y bloqueo de accesos en una vista ordenada.</p>
                        </div>
                        <div className="panel-muted p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Porteria</p>
                            <p className="mt-3 text-3xl font-bold text-slate-950">Validacion</p>
                            <p className="mt-2 text-sm text-slate-600">Resultado grande, rapido y legible en entornos reales de trabajo.</p>
                        </div>
                        <div className="panel-muted p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Auditoria</p>
                            <p className="mt-3 text-3xl font-bold text-slate-950">CSV</p>
                            <p className="mt-2 text-sm text-slate-600">Filtros por patente y rango de fechas para exportacion inmediata.</p>
                        </div>
                    </div>
                </section>

                <section className="panel p-8 lg:p-10">
                    <div className="mb-8">
                        <h2 className="font-[family:var(--font-heading)] text-3xl font-bold text-slate-950">Ingresar al sistema</h2>
                        <p className="mt-2 text-sm text-slate-600">Seleccione el rol y utilice las credenciales configuradas en su entorno.</p>
                    </div>

                    {error ? (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {decodeURIComponent(error)}
                        </div>
                    ) : null}

                    <form action={loginAction} className="space-y-5">
                        <div>
                            <label className="field-label" htmlFor="role">
                                Role
                            </label>
                            <select className="input-base" defaultValue="USER" id="role" name="role">
                                <option value="ADMIN">ADMIN</option>
                                <option value="USER">USER (Porteria)</option>
                            </select>
                        </div>

                        <div>
                            <label className="field-label" htmlFor="username">
                                Usuario
                            </label>
                            <input className="input-base" id="username" name="username" placeholder="Ingrese usuario" type="text" />
                        </div>

                        <div>
                            <label className="field-label" htmlFor="password">
                                Contrasena
                            </label>
                            <input className="input-base" id="password" name="password" placeholder="Ingrese contrasena" type="password" />
                        </div>

                        <button className="button-primary w-full text-base" type="submit">
                            Entrar al sistema
                        </button>
                    </form>

                    <div className="mt-8 rounded-2xl border border-accent-100 bg-accent-50/70 p-4 text-sm text-slate-600">
                        <p className="font-semibold text-slate-900">Credenciales locales por defecto</p>
                        <p className="mt-2">Admin: admin / admin123</p>
                        <p>Porteria: guard / guard123</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
