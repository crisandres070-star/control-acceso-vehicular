import { PrismaClient, UserRole } from "@prisma/client";

import { hashPassword, verifyPassword } from "../lib/password";

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
    passwordHashAction: "created" | "updated" | "unchanged";
};

const allowProduction = process.argv.includes("--allow-production");

if (process.env.NODE_ENV === "production" && !allowProduction) {
    throw new Error(
        "Por seguridad, este seed no se ejecuta en producción sin --allow-production.",
    );
}

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

    if (account.role === "USER" && !porteria) {
        throw new Error(`El usuario ${account.username} requiere una portería asociada.`);
    }

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
            passwordHashAction: "created",
        };
    }

    const hasValidPassword = await verifyPassword(account.password, existingUser.passwordHash);
    const nextPasswordHash = hasValidPassword
        ? existingUser.passwordHash
        : await hashPassword(account.password);

    const updatedUser = await prisma.systemUser.update({
        where: { username: account.username },
        data: {
            passwordHash: nextPasswordHash,
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
        passwordHashAction: hasValidPassword ? "unchanged" : "updated",
    };
}

async function main() {
    const results: SeedResult[] = [];

    for (const user of seedUsers) {
        results.push(await ensureUser(user));
    }

    for (const result of results) {
        console.log(
            `${result.action.toUpperCase()}: ${result.username}${result.porteria ? ` -> ${result.porteria}` : ""} | password_hash: ${result.passwordHashAction}`,
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