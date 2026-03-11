import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
    SESSION_COOKIE_NAME,
    getDashboardPath,
    isValidCredentials,
    parseRole,
    signSessionToken,
    verifySessionToken,
    type AppRole,
} from "@/lib/auth-core";

export { getDashboardPath, isValidCredentials, parseRole, type AppRole };

export async function createSession(role: AppRole, username: string) {
    const token = await signSessionToken({ role, username });

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
