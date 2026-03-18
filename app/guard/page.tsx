import { GuardOperationalShell } from "@/components/guard/guard-operational-shell";
import { requireRole } from "@/lib/auth";
import { mapOperationalPorterias } from "@/lib/porterias";
import { prisma } from "@/lib/prisma";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
    orden: number;
};

export default async function GuardPage() {
    const session = await requireRole("USER");
    const roleLabel = session.role === "ADMIN" ? "Administrador" : "Portería";
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
        <GuardOperationalShell
            defaultPorteriaId={session.porteriaId ?? null}
            legacyHref={null}
            porterias={porterias}
            roleLabel={roleLabel}
            username={session.username}
        />
    );
}
