import { NextResponse, type NextRequest } from "next/server";

import {
    SESSION_COOKIE_NAME,
    getDashboardPath,
    verifySessionToken,
} from "@/lib/auth-core";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (pathname === "/login" && session) {
        return NextResponse.redirect(new URL(getDashboardPath(session.role), request.url));
    }

    if (pathname.startsWith("/admin")) {
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        if (session.role !== "ADMIN") {
            return NextResponse.redirect(
                new URL(getDashboardPath(session.role), request.url),
            );
        }
    }

    if (pathname.startsWith("/guard")) {
        if (!session) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        if (session.role !== "USER") {
            return NextResponse.redirect(
                new URL(getDashboardPath(session.role), request.url),
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/guard/:path*", "/login"],
};
