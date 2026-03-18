import Link from "next/link";

import { AccessControlV2 } from "@/components/guard/access-control-v2";
import { requireRole } from "@/lib/auth";
import { mapOperationalPorterias } from "@/lib/porterias";
import { prisma } from "@/lib/prisma";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
    orden: number;
};

export default async function AdminControlAccesoV2Page() {
    const session = await requireRole("ADMIN");
    const porteriaRecords = await prisma.porteria.findMany({
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: {
            id: true,
            nombre: true,
            telefono: true,
            orden: true,
        },
    });
    const porterias = mapOperationalPorterias(porteriaRecords as PorteriaOption[]);

    return (
        <div className="space-y-6">
            <section className="panel p-6 lg:p-8">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent-700">
                            Operación manual
                        </p>
                        <h2 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950 lg:text-4xl">
                            Control de acceso operativo
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 lg:text-base">
                            Valide la patente, seleccione la portería y registre una ENTRADA o SALIDA con historial inmediato y estado actualizado del vehículo.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link className="button-secondary" href="/admin/porterias">
                            Gestionar porterías
                        </Link>
                        <Link className="button-secondary" href="/admin/eventos-acceso">
                            Ver eventos
                        </Link>
                    </div>
                </div>
            </section>

            <AccessControlV2 contextLabel={session.username} porterias={porterias} />
        </div>
    );
}