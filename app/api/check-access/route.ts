import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeLicensePlate } from "@/lib/utils";

export async function POST(request: Request) {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "USER")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
            licensePlate?: string;
        }
        | null;
    const licensePlate = normalizeLicensePlate(body?.licensePlate ?? "");

    if (!licensePlate) {
        return NextResponse.json(
            { error: "License plate is required." },
            { status: 400 },
        );
    }

    const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate },
    });

    const result = vehicle?.accessStatus === "YES" ? "YES" : "NO";
    const vehicleDetails = vehicle
        ? {
            name: vehicle.name,
            licensePlate: vehicle.licensePlate,
            codigoInterno: vehicle.codigoInterno,
            vehicleType: vehicle.vehicleType,
            brand: vehicle.brand,
            company: vehicle.company,
        }
        : {
            name: "Unknown vehicle",
            licensePlate,
            codigoInterno: "Not registered",
            vehicleType: "Not registered",
            brand: "Not registered",
            company: "Not registered",
        };

    await prisma.accessLog.create({
        data: {
            licensePlate,
            codigoInterno: vehicle?.codigoInterno ?? null,
            name: vehicleDetails.name,
            result,
        },
    });

    return NextResponse.json({
        result,
        vehicle: vehicleDetails,
    });
}