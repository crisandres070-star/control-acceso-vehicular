import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

type SeedUser = {
    username: string;
    password: string;
    role: UserRole;
    porteriaNombre?: string;
};

type SeedResult = {
    username: string;
    action: "created" | "updated";
    porteria: string | null;
};

const seedUsers: SeedUser[] = [
    {
        username: "Lquispe",
        password: "c2026",
        role: "ADMIN",
    },
    {
        username: "PorteriaCalaCala",
        password: "cala2026",
        role: "USER",
        porteriaNombre: "Cala Cala",
    },
    {
        username: "PorteriaSoledad",
        password: "Soledad2026",
        role: "USER",
        porteriaNombre: "Soledad",
    },
    {
        username: "PorteriaTana",
        password: "Tana2026",
        role: "USER",
        porteriaNombre: "Tana",
    },
    {
        username: "PorteriaNegreiros",
        password: "Negreiros2026",
        role: "USER",
        porteriaNombre: "Negreiros",
    },
];

async function ensurePorteria(nombre: string) {
    return prisma.porteria.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
        select: {
            id: true,
            nombre: true,
        },
    });
}

async function ensureUser(account: SeedUser): Promise<SeedResult> {
    const porteria = account.porteriaNombre
        ? await ensurePorteria(account.porteriaNombre)
        : null;
    const existingUser = await prisma.systemUser.findUnique({
        where: { username: account.username },
        select: {
            id: true,
            passwordHash: true,
        },
    });

    if (!existingUser) {
        const passwordHash = await hashPassword(account.password);

        const createdUser = await prisma.systemUser.create({
            data: {
                username: account.username,
                passwordHash,
                role: account.role,
                porteriaId: porteria?.id ?? null,
                isActive: true,
            },
            select: {
                username: true,
            },
        });

        return {
            username: createdUser.username,
            action: "created",
            porteria: porteria?.nombre ?? null,
        };
    }

    const updatedUser = await prisma.systemUser.update({
        where: { username: account.username },
        data: {
            role: account.role,
            porteriaId: porteria?.id ?? null,
            isActive: true,
        },
        select: {
            username: true,
        },
    });

    return {
        username: updatedUser.username,
        action: "updated",
        porteria: porteria?.nombre ?? null,
    };
}

async function main() {
    const results: SeedResult[] = [];

    for (const user of seedUsers) {
        results.push(await ensureUser(user));
    }

    for (const result of results) {
        console.log(
            `${result.action.toUpperCase()}: ${result.username}${result.porteria ? ` -> ${result.porteria}` : ""}`,
        );
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });