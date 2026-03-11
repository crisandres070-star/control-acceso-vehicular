import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeLicensePlate } from "@/lib/utils";

type VehicleLookup = {
    id: number;
    name: string;
    licensePlate: string;
    codigoInterno: string;
    rut: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: string;
    createdAt: Date;
};

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

    const vehicleRecord = await prisma.vehicle.findUnique({
        where: { licensePlate },
    });
    const vehicle = vehicleRecord as VehicleLookup | null;

    const result = vehicle?.accessStatus === "YES" ? "YES" : "NO";
    const vehicleDetails = vehicle
        ? {
            name: vehicle.name,
            licensePlate: vehicle.licensePlate,
            codigoInterno: vehicle.codigoInterno,
            rut: vehicle.rut,
            vehicleType: vehicle.vehicleType,
            brand: vehicle.brand,
            company: vehicle.company,
        }
        : {
            name: "Unknown vehicle",
            licensePlate,
            codigoInterno: "Not registered",
            rut: "Not registered",
            vehicleType: "Not registered",
            brand: "Not registered",
            company: "Not registered",
        };

    const accessLogData = {
        licensePlate,
        codigoInterno: vehicle?.codigoInterno ?? null,
        name: vehicleDetails.name,
        result,
    };

    await prisma.accessLog.create({
        data: accessLogData,
    });

    return NextResponse.json({
        result,
        vehicle: vehicleDetails,
    });
}