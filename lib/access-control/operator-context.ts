import { Prisma, PrismaClient, UserRole } from "@prisma/client";

import type { SessionPayload } from "@/lib/auth-core";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type ResolvedOperatorContext = {
    operatorId: number | null;
    operatorUsername: string;
    operatorRole: UserRole;
    operatorPorteriaNombre: string | null;
    resolution: "session-user-id" | "session-username" | "session-user-missing" | "legacy-session";
};

const DEBUG_OPERATOR_CONTEXT = process.env.DEBUG_OPERATOR_CONTEXT === "true";

function debugOperatorContext(message: string, data?: unknown) {
    if (!DEBUG_OPERATOR_CONTEXT) {
        return;
    }

    const timestamp = new Date().toISOString();

    if (typeof data === "undefined") {
        console.info(`[${timestamp}] [OPERATOR-CONTEXT] ${message}`);
        return;
    }

    console.info(`[${timestamp}] [OPERATOR-CONTEXT] ${message}`, data);
}

function toUserRole(role: SessionPayload["role"]): UserRole {
    return role === "ADMIN" ? "ADMIN" : "USER";
}

type OperatorRow = {
    id: number;
    username: string;
    role: UserRole;
    isActive: boolean;
    porteria: {
        nombre: string;
    } | null;
};

const OPERATOR_SELECT = {
    id: true,
    username: true,
    role: true,
    isActive: true,
    porteria: {
        select: {
            nombre: true,
        },
    },
} as const;

async function findOperatorById(db: DbClient, userId: number) {
    return db.systemUser.findUnique({
        where: { id: userId },
        select: OPERATOR_SELECT,
    }) as Promise<OperatorRow | null>;
}

async function findOperatorByUsername(db: DbClient, username: string) {
    return db.systemUser.findUnique({
        where: { username },
        select: OPERATOR_SELECT,
    }) as Promise<OperatorRow | null>;
}

export async function resolveOperatorContext(
    db: DbClient,
    session: SessionPayload,
): Promise<ResolvedOperatorContext> {
    const expectedRole = toUserRole(session.role);

    if (typeof session.userId === "number" && session.userId > 0) {
        const userById = await findOperatorById(db, session.userId);

        if (userById?.isActive && userById.role === expectedRole) {
            debugOperatorContext("Operador resuelto por session.userId", {
                sessionUserId: session.userId,
                resolvedUserId: userById.id,
                username: userById.username,
                role: userById.role,
            });

            return {
                operatorId: userById.id,
                operatorUsername: userById.username,
                operatorRole: userById.role,
                operatorPorteriaNombre:
                    userById.porteria?.nombre
                    ?? session.porteriaNombre
                    ?? null,
                resolution: "session-user-id",
            };
        }

        debugOperatorContext("session.userId no es valido para FK en la BD activa; fallback controlado", {
            sessionUserId: session.userId,
            found: Boolean(userById),
            isActive: userById?.isActive ?? null,
            roleInDb: userById?.role ?? null,
            expectedRole,
        });
    }

    const userByUsername = await findOperatorByUsername(db, session.username);

    if (userByUsername?.isActive && userByUsername.role === expectedRole) {
        debugOperatorContext("Operador resuelto por username", {
            username: session.username,
            resolvedUserId: userByUsername.id,
            role: userByUsername.role,
        });

        return {
            operatorId: userByUsername.id,
            operatorUsername: userByUsername.username,
            operatorRole: userByUsername.role,
            operatorPorteriaNombre:
                userByUsername.porteria?.nombre
                ?? session.porteriaNombre
                ?? null,
            resolution: "session-username",
        };
    }

    debugOperatorContext("Sesion sin operador persistido; se registra auditoria sin FK", {
        username: session.username,
        role: expectedRole,
        hasSessionUserId: typeof session.userId === "number" && session.userId > 0,
    });

    return {
        operatorId: null,
        operatorUsername: session.username,
        operatorRole: expectedRole,
        operatorPorteriaNombre: session.porteriaNombre ?? null,
        resolution:
            typeof session.userId === "number" && session.userId > 0
                ? "session-user-missing"
                : "legacy-session",
    };
}
