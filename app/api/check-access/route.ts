import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { resolveOperatorContext } from "@/lib/access-control/operator-context";
import { prisma } from "@/lib/prisma";
import { normalizeLicensePlate } from "@/lib/utils";

const CHECK_ACCESS_INCLUDE = {
    vehiculoChoferes: {
        orderBy: {
            chofer: {
                nombre: "asc" as const,
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
} as const;

async function loadVehicleForCheckAccess(licensePlate: string) {
    const directMatch = await prisma.vehicle.findUnique({
        where: { licensePlate },
        include: CHECK_ACCESS_INCLUDE,
    });

    if (directMatch) {
        return directMatch;
    }

    const fallbackRows = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM vehicles
        WHERE UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) = ${licensePlate}
        ORDER BY id ASC
        LIMIT 1
    `;
    const fallbackId = fallbackRows[0]?.id;

    if (!fallbackId) {
        return null;
    }

    return prisma.vehicle.findUnique({
        where: { id: fallbackId },
        include: CHECK_ACCESS_INCLUDE,
    });
}

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

type AssociatedRecord = {
    id: number;
    nombre: string;
    rut: string;
};

export async function POST(request: Request) {
    try {
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

        const vehicleRecord = await loadVehicleForCheckAccess(licensePlate);
        const vehicle = vehicleRecord as VehicleLookup | null;
        const operator = await resolveOperatorContext(prisma, session);
        const associatedRecords: AssociatedRecord[] = vehicle
            ? vehicle.vehiculoChoferes
                .filter((assignment) => vehicle.contratistaId !== null && assignment.chofer.contratistaId === vehicle.contratistaId)
                .map((assignment) => ({
                    id: assignment.chofer.id,
                    nombre: assignment.chofer.nombre,
                    rut: assignment.chofer.rut,
                }))
            : [];

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
                associatedRecords,
                choferes: associatedRecords,
            }
            : {
                name: "Unknown vehicle",
                licensePlate,
                codigoInterno: "Not registered",
                rut: "Not registered",
                vehicleType: "Not registered",
                brand: "Not registered",
                company: "Not registered",
                associatedRecords: [],
                choferes: [],
            };

        const accessLogData = {
            licensePlate,
            codigoInterno: vehicle?.codigoInterno ?? null,
            name: vehicleDetails.name,
            result,
            operatorUserId: operator.operatorId,
            operatorUsername: operator.operatorUsername,
            operatorRole: operator.operatorRole,
            operatorPorteriaNombre: operator.operatorPorteriaNombre,
        };

        await prisma.accessLog.create({
            data: accessLogData,
        });

        return NextResponse.json({
            isRegistered: Boolean(vehicle),
            result,
            vehicle: vehicleDetails,
        });
    } catch (error) {
        console.error("[check-access] Error inesperado", error);

        return NextResponse.json(
            {
                error: "No fue posible validar la patente en este momento. Intente nuevamente.",
            },
            { status: 500 },
        );
    }
}