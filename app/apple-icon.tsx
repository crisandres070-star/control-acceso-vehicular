import { createPwaIconFileResponse } from "@/lib/pwa-icon";

export const runtime = "nodejs";

export const size = {
    width: 180,
    height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
    return createPwaIconFileResponse(180, "apple");
}