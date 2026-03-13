import { NextResponse } from "next/server";

import { createPwaIconFileResponse, hasPwaIconAsset, type PwaIconPurpose } from "@/lib/pwa-icon";

export const runtime = "nodejs";

function parseIconSize(value: string) {
    const parsed = Number(value);

    if (parsed === 192 || parsed === 512) {
        return parsed;
    }

    return null;
}

function parsePurpose(value: string | null): PwaIconPurpose {
    return value === "maskable" ? "maskable" : "any";
}

export async function GET(
    request: Request,
    context: { params: { size: string } },
) {
    const iconSize = parseIconSize(context.params.size);
    const iconPurpose = parsePurpose(new URL(request.url).searchParams.get("purpose"));

    if (!iconSize || !hasPwaIconAsset(iconSize, iconPurpose)) {
        return NextResponse.json({ error: "Icono no disponible." }, { status: 404 });
    }

    return createPwaIconFileResponse(iconSize, iconPurpose);
}