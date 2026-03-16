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
    contratistaId: number | null;
    createdAt: Date;
    vehiculoChoferes: Array<{
        chofer: {
            id: number;
            nombre: string;
            rut: string;
            contratistaId: number;
        };
    }>;
};

export async function POST(request: Request) {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "USER")) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
            licensePlate?: string;
        }
        | null;
    const licensePlate = normalizeLicensePlate(body?.licensePlate ?? "");

    if (!licensePlate) {
        return NextResponse.json(
            { error: "La patente es obligatoria." },
            { status: 400 },
        );
    }

    const vehicleRecord = await prisma.vehicle.findUnique({
        where: { licensePlate },
        include: {
            vehiculoChoferes: {
                orderBy: {
                    chofer: {
                        nombre: "asc",
                    },
                },
                select: {
                    chofer: {
                        select: {
                            id: true,
                            nombre: true,
                            rut: true,
                            contratistaId: true,
                        },
                    },
                },
            },
        },
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
            choferes: vehicle.vehiculoChoferes
                .filter((assignment) => vehicle.contratistaId !== null && assignment.chofer.contratistaId === vehicle.contratistaId)
                .map((assignment) => ({
                    id: assignment.chofer.id,
                    nombre: assignment.chofer.nombre,
                    rut: assignment.chofer.rut,
                })),
        }
        : {
            name: "Unknown vehicle",
            licensePlate,
            codigoInterno: "Not registered",
            rut: "Not registered",
            vehicleType: "Not registered",
            brand: "Not registered",
            company: "Not registered",
            choferes: [],
        };

    const accessLogData = {
        licensePlate,
        codigoInterno: vehicle?.codigoInterno ?? null,
        name: vehicleDetails.name,
        result,
        operatorUserId: session.userId ?? null,
        operatorUsername: session.username,
        operatorRole: session.role,
        operatorPorteriaNombre: session.porteriaNombre ?? null,
    };

    await prisma.accessLog.create({
        data: accessLogData,
    });

    return NextResponse.json({
        isRegistered: Boolean(vehicle),
        result,
        vehicle: vehicleDetails,
    });
}