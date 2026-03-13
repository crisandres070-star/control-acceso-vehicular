import type { MetadataRoute } from "next";

import {
    PWA_APP_NAME,
    PWA_BACKGROUND_COLOR,
    PWA_DESCRIPTION,
    PWA_SHORT_NAME,
    PWA_START_URL,
    PWA_THEME_COLOR,
} from "@/lib/pwa-config";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: PWA_START_URL,
        name: PWA_APP_NAME,
        short_name: PWA_SHORT_NAME,
        description: PWA_DESCRIPTION,
        start_url: PWA_START_URL,
        scope: "/",
        display: "standalone",
        background_color: PWA_BACKGROUND_COLOR,
        theme_color: PWA_THEME_COLOR,
        lang: "es-CL",
        categories: ["business", "productivity"],
        prefer_related_applications: false,
        icons: [
            {
                src: "/pwa-icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/pwa-icons/maskable-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/pwa-icons/icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/pwa-icons/maskable-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}