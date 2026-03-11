import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildCreatedAtFilter, normalizeLicensePlate, parseDateInput } from "@/lib/utils";

function escapeCsv(value: string | null | undefined) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
    const session = await getSession();

    if (!session || session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const plate = normalizeLicensePlate(searchParams.get("plate") ?? "");
    const startDate = parseDateInput(searchParams.get("startDate"));
    const endDate = parseDateInput(searchParams.get("endDate"));

    const where: Prisma.AccessLogWhereInput = {};

    if (plate) {
        where.licensePlate = plate;
    }

    const createdAtFilter = buildCreatedAtFilter(startDate, endDate);

    if (createdAtFilter) {
        where.createdAt = createdAtFilter;
    }

    const whereInput = Object.keys(where).length > 0 ? where : undefined;

    const logs = await prisma.accessLog.findMany({
        where: whereInput,
        orderBy: { createdAt: "desc" },
    });

    const rows = logs.map((log) =>
        [
            String(log.id),
            log.licensePlate,
            log.codigoInterno,
            log.name,
            log.result === "YES" ? "GRANTED" : "DENIED",
            log.createdAt.toISOString(),
        ]
            .map(escapeCsv)
            .join(","),
    );

    const csv = ["id,license_plate,codigo_interno,name,result,created_at", ...rows].join("\n");
    const suffixParts = [
        plate,
        startDate ? `from-${startDate}` : "",
        endDate ? `to-${endDate}` : "",
    ].filter(Boolean);
    const suffix = suffixParts.length > 0 ? `-${suffixParts.join("-")}` : "";

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="access-logs${suffix}.csv"`,
        },
    });
}
