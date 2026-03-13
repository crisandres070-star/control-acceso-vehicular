import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PWA_APP_NAME } from "@/lib/pwa-config";

const ICON_ASSETS = {
    any: {
        192: "icon-192.png",
        512: "icon-512.png",
    },
    maskable: {
        192: "maskable-192.png",
        512: "maskable-512.png",
    },
    apple: {
        180: "apple-touch-icon.png",
    },
} as const;

export type PwaIconPurpose = keyof typeof ICON_ASSETS;

function getPwaIconFileName(size: number, purpose: PwaIconPurpose) {
    const variants = ICON_ASSETS[purpose] as Record<number, string>;

    return variants[size] ?? null;
}

export function hasPwaIconAsset(size: number, purpose: PwaIconPurpose = "any") {
    return Boolean(getPwaIconFileName(size, purpose));
}

export async function createPwaIconFileResponse(size: number, purpose: PwaIconPurpose = "any") {
    const fileName = getPwaIconFileName(size, purpose);

    if (!fileName) {
        throw new Error(`No existe un icono PWA configurado para ${purpose} ${size}x${size}.`);
    }

    const iconBuffer = await readFile(join(process.cwd(), "public", "pwa-icons", fileName));

    return new Response(iconBuffer, {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
}

export function getPwaIconAltLabel(size: number, purpose: PwaIconPurpose = "any") {
    return `${PWA_APP_NAME} ${size}x${size}${purpose === "maskable" ? " maskable" : ""}`;
}