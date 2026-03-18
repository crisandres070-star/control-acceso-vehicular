import { SignJWT, jwtVerify } from "jose";

export type AppRole = "ADMIN" | "USER";

export type SessionPayload = {
    role: AppRole;
    username: string;
    userId?: number | null;
    porteriaId?: number | null;
    porteriaNombre?: string | null;
};

export const SESSION_COOKIE_NAME = "vehicle-access-session";

function getSecretKey() {
    return new TextEncoder().encode(
        process.env.SESSION_SECRET || "development-session-secret-change-me",
    );
}

export function parseRole(value: string): AppRole | null {
    if (value === "ADMIN" || value === "USER") {
        return value;
    }

    return null;
}

export function getDashboardPath(role: AppRole) {
    // Admin lands on the operational control route, which handles data-load failures locally.
    return role === "ADMIN" ? "/admin/control-acceso-v2" : "/guard";
}

export function isValidCredentials(
    role: AppRole,
    username: string,
    password: string,
) {
    const expectedUsername =
        role === "ADMIN"
            ? process.env.ADMIN_USERNAME || "admin"
            : process.env.GUARD_USERNAME || "guard";
    const expectedPassword =
        role === "ADMIN"
            ? process.env.ADMIN_PASSWORD || "admin123"
            : process.env.GUARD_PASSWORD || "guard123";

    return username === expectedUsername && password === expectedPassword;
}

export async function signSessionToken(payload: SessionPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1d")
        .sign(getSecretKey());
}

export async function verifySessionToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecretKey());

        if (payload.role !== "ADMIN" && payload.role !== "USER") {
            return null;
        }

        if (typeof payload.username !== "string") {
            return null;
        }

        const userId = typeof payload.userId === "number" && Number.isInteger(payload.userId) && payload.userId > 0
            ? payload.userId
            : null;
        const porteriaId = typeof payload.porteriaId === "number" && Number.isInteger(payload.porteriaId) && payload.porteriaId > 0
            ? payload.porteriaId
            : null;
        const porteriaNombre = typeof payload.porteriaNombre === "string" && payload.porteriaNombre.trim()
            ? payload.porteriaNombre
            : null;

        return {
            role: payload.role,
            username: payload.username,
            userId,
            porteriaId,
            porteriaNombre,
        } satisfies SessionPayload;
    } catch {
        return null;
    }
}
