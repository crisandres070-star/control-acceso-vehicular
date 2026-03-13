import Image from "next/image";
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
            <div className="w-full max-w-5xl space-y-6">
                <section className="panel mx-auto w-full max-w-xl p-8 lg:p-10">
                    <div className="mb-10 flex justify-center">
                        <Image
                            alt="COSAYACH"
                            className="h-auto w-auto max-w-[210px]"
                            height={64}
                            priority
                            src="/logo/cosayach.png"
                            width={210}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-700">
                            Plataforma de acceso
                        </p>
                        <h1 className="mt-4 font-[family:var(--font-heading)] text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                            Ingresar al sistema
                        </h1>
                        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
                            Seleccione el rol y use las credenciales registradas para acceder de forma segura al sistema.
                        </p>
                    </div>
                    {error ? (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            {decodeURIComponent(error)}
                        </div>
                    ) : null}

                    <form action={loginAction} className="space-y-5">
                        <div>
                            <label className="field-label" htmlFor="role">
                                Rol
                            </label>
                            <select className="input-base" defaultValue="USER" id="role" name="role">
                                <option value="ADMIN">Administrador</option>
                                <option value="USER">Portería</option>
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
                                Contraseña
                            </label>
                            <input className="input-base" id="password" name="password" placeholder="Ingrese la contraseña" type="password" />
                        </div>

                        <button className="button-primary w-full text-base" type="submit">
                            Ingresar
                        </button>
                    </form>
                </section>

                <section className="panel overflow-hidden p-8 lg:p-10">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-700">
                            Operación centralizada
                        </p>
                        <h2 className="mt-4 font-[family:var(--font-heading)] text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                            Control de acceso
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
                            Validación y administración de accesos desde una sola plataforma, con una experiencia clara para portería y administración.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="panel-muted p-5 text-center md:text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Administración</p>
                            <p className="mt-3 text-3xl font-bold text-slate-950">Vehículos</p>
                            <p className="mt-2 text-sm text-slate-600">Altas, edición y bloqueo de accesos en una vista ordenada.</p>
                        </div>
                        <div className="panel-muted p-5 text-center md:text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Portería</p>
                            <p className="mt-3 text-3xl font-bold text-slate-950">Validación</p>
                            <p className="mt-2 text-sm text-slate-600">Resultado grande, rápido y legible en entornos reales de trabajo.</p>
                        </div>
                        <div className="panel-muted p-5 text-center md:text-left">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Auditoría</p>
                            <p className="mt-3 text-3xl font-bold text-slate-950">Excel</p>
                            <p className="mt-2 text-sm text-slate-600">Filtros por patente y rango de fechas para exportación inmediata.</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
