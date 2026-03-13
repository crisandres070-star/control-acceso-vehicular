import { GuardOperationalShell } from "@/components/guard/guard-operational-shell";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PorteriaOption = {
    id: number;
    nombre: string;
    telefono: string | null;
};

export default async function GuardV2Page() {
    const session = await requireRole("USER");
    const roleLabel = session.role === "ADMIN" ? "Administrador" : "Portería";
    const porteriaRecords = await prisma.porteria.findMany({
        orderBy: [{ nombre: "asc" }],
        select: {
            id: true,
            nombre: true,
            telefono: true,
        },
    });
    const porterias = porteriaRecords as PorteriaOption[];

    return (
        <GuardOperationalShell
            defaultPorteriaId={session.porteriaId ?? null}
            legacyHref="/guard/legacy"
            porterias={porterias}
            roleLabel={roleLabel}
            username={session.username}
        />
    );
}