import { GuardOperationalShell } from "@/components/guard/guard-operational-shell";
import { requireRole } from "@/lib/auth";
import { mapOperationalPorterias } from "@/lib/porterias";
import { prisma } from "@/lib/prisma";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
};

export default async function GuardPage() {
    const session = await requireRole("USER");
    const roleLabel = session.role === "ADMIN" ? "Administrador" : "Portería";
    let porterias: PorteriaOption[] = [];
    let loadErrorMessage: string | null = null;

    try {
        const porteriaRecords = await prisma.porteria.findMany({
            orderBy: { nombre: "asc" },
            select: {
                id: true,
                nombre: true,
                telefono: true,
            },
        });
        porterias = mapOperationalPorterias(porteriaRecords as PorteriaOption[]);
    } catch (error) {
        console.error("[guard/page] No fue posible cargar porterías", error);
        loadErrorMessage = "No fue posible cargar las porterías en este momento. Intente nuevamente.";
    }

    return (
        <GuardOperationalShell
            defaultPorteriaId={session.porteriaId ?? null}
            legacyHref={null}
            loadErrorMessage={loadErrorMessage}
            porterias={porterias}
            roleLabel={roleLabel}
            username={session.username}
        />
    );
}
