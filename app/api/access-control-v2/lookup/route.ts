import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeLicensePlate } from "@/lib/utils";

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

    const vehicle = await prisma.vehicle.findUnique({
        where: { licensePlate },
        select: {
            id: true,
            name: true,
            licensePlate: true,
            codigoInterno: true,
            vehicleType: true,
            brand: true,
            modelo: true,
            company: true,
            accessStatus: true,
            estadoRecinto: true,
            contratista: {
                select: {
                    id: true,
                    razonSocial: true,
                    rut: true,
                    contacto: true,
                    telefono: true,
                },
            },
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
                            codigoInterno: true,
                            contratistaId: true,
                        },
                    },
                },
            },
            eventosAcceso: {
                take: 1,
                orderBy: {
                    fechaHora: "desc",
                },
                select: {
                    tipoEvento: true,
                    fechaHora: true,
                    operadoPorUsername: true,
                    operadoPorRole: true,
                    operadoPorPorteriaNombre: true,
                    porteria: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                    chofer: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                },
            },
        },
    });

    if (!vehicle) {
        return NextResponse.json(
            { error: "No se encontró un vehículo con esa patente." },
            { status: 404 },
        );
    }

    const vehicleContractorId = vehicle.contratista?.id ?? null;
    const authorizedDrivers = vehicle.vehiculoChoferes
        .filter((assignment) => vehicleContractorId !== null && assignment.chofer.contratistaId === vehicleContractorId)
        .map((assignment) => ({
            id: assignment.chofer.id,
            nombre: assignment.chofer.nombre,
            rut: assignment.chofer.rut,
            codigoInterno: assignment.chofer.codigoInterno,
        }));
    const lastEvent = vehicle.eventosAcceso[0] ?? null;

    return NextResponse.json({
        vehicle: {
            id: vehicle.id,
            name: vehicle.name,
            licensePlate: vehicle.licensePlate,
            codigoInterno: vehicle.codigoInterno,
            vehicleType: vehicle.vehicleType,
            brand: vehicle.brand,
            modelo: vehicle.modelo,
            company: vehicle.company,
            accessStatus: vehicle.accessStatus,
            estadoRecinto: vehicle.estadoRecinto,
            contratista: vehicle.contratista,
            choferes: authorizedDrivers,
            ultimoEvento: lastEvent
                ? {
                    tipoEvento: lastEvent.tipoEvento,
                    fechaHora: lastEvent.fechaHora,
                    operadoPorUsername: lastEvent.operadoPorUsername,
                    operadoPorRole: lastEvent.operadoPorRole,
                    operadoPorPorteriaNombre: lastEvent.operadoPorPorteriaNombre,
                    porteria: lastEvent.porteria,
                    chofer: lastEvent.chofer,
                }
                : null,
        },
    });
}