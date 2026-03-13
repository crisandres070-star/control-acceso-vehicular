import { createPwaIconFileResponse } from "@/lib/pwa-icon";

export const runtime = "nodejs";

export const size = {
    width: 192,
    height: 192,
};

export const contentType = "image/png";

export default async function Icon() {
    return createPwaIconFileResponse(192);
}