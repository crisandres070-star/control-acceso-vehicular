import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
    SESSION_COOKIE_NAME,
    getDashboardPath,
    isValidCredentials,
    parseRole,
    signSessionToken,
    type SessionPayload,
    verifySessionToken,
    type AppRole,
} from "@/lib/auth-core";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export { getDashboardPath, isValidCredentials, parseRole, type AppRole };

async function recordLoginAudit(session: SessionPayload) {
    if (session.userId) {
        await prisma.$transaction([
            prisma.systemUser.update({
                where: { id: session.userId },
                data: {
                    lastLoginAt: new Date(),
                },
            }),
            prisma.loginAudit.create({
                data: {
                    userId: session.userId,
                    username: session.username,
                    role: session.role,
                    porteriaNombre: session.porteriaNombre ?? null,
                },
            }),
        ]);

        return;
    }

    await prisma.loginAudit.create({
        data: {
            username: session.username,
            role: session.role,
            porteriaNombre: session.porteriaNombre ?? null,
        },
    });
}

export async function authenticateCredentials(role: AppRole, username: string, password: string) {
    const user = await prisma.systemUser.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            passwordHash: true,
            role: true,
            isActive: true,
            porteria: {
                select: {
                    id: true,
                    nombre: true,
                },
            },
        },
    });

    if (user && user.isActive && user.role === role) {
        const isPasswordValid = await verifyPassword(password, user.passwordHash);

        if (isPasswordValid) {
            const session = {
                role,
                username: user.username,
                userId: user.id,
                porteriaId: user.porteria?.id ?? null,
                porteriaNombre: user.porteria?.nombre ?? null,
            } satisfies SessionPayload;

            await recordLoginAudit(session);

            return session;
        }
    }

    if (!isValidCredentials(role, username, password)) {
        return null;
    }

    const legacySession = {
        role,
        username,
        userId: null,
        porteriaId: null,
        porteriaNombre: null,
    } satisfies SessionPayload;

    await recordLoginAudit(legacySession);

    return legacySession;
}

export async function createSession(session: SessionPayload) {
    const token = await signSessionToken(session);

    cookies().set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
    });
}

export function clearSession() {
    cookies().delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
    const token = cookies().get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    return verifySessionToken(token);
}

export async function requireRole(role: AppRole) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    if (session.role !== role) {
        redirect(getDashboardPath(session.role));
    }

    return session;
}
