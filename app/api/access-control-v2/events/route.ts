import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type TipoEventoInput = "ENTRADA" | "SALIDA";

function parsePositiveInteger(value: unknown) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseTipoEvento(value: unknown) {
    return value === "ENTRADA" || value === "SALIDA" ? value : null;
}

export async function POST(request: Request) {
    const session = await getSession();

    if (!session || (session.role !== "ADMIN" && session.role !== "USER")) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
        | {
            vehicleId?: unknown;
            choferId?: unknown;
            porteriaId?: unknown;
            tipoEvento?: unknown;
        }
        | null;
    const vehicleId = parsePositiveInteger(body?.vehicleId);
    const choferId = parsePositiveInteger(body?.choferId);
    const porteriaId = parsePositiveInteger(body?.porteriaId);
    const tipoEvento = parseTipoEvento(body?.tipoEvento);

    if (!vehicleId) {
        return NextResponse.json(
            { error: "Debe indicar un vehículo válido." },
            { status: 400 },
        );
    }

    if (!choferId) {
        return NextResponse.json(
            { error: "Debe seleccionar un chofer autorizado." },
            { status: 400 },
        );
    }

    if (!porteriaId) {
        return NextResponse.json(
            { error: "Debe seleccionar una portería." },
            { status: 400 },
        );
    }

    if (!tipoEvento) {
        return NextResponse.json(
            { error: "Debe seleccionar el tipo de evento." },
            { status: 400 },
        );
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const vehicle = await tx.vehicle.findUnique({
                where: { id: vehicleId },
                select: {
                    id: true,
                    licensePlate: true,
                    accessStatus: true,
                    contratistaId: true,
                },
            });

            if (!vehicle) {
                throw new Error("El vehículo seleccionado ya no existe.");
            }

            if (!vehicle.contratistaId) {
                throw new Error("El vehículo no tiene contratista asociado. Actualícelo en administración antes de registrar eventos.");
            }

            if (vehicle.accessStatus !== "YES") {
                throw new Error("El vehículo está bloqueado para acceso. Revise su estado en administración antes de registrar un movimiento.");
            }

            const porteria = await tx.porteria.findUnique({
                where: { id: porteriaId },
                select: {
                    id: true,
                    nombre: true,
                },
            });

            if (!porteria) {
                throw new Error("La portería seleccionada no existe.");
            }

            const assignment = await tx.vehiculoChofer.findUnique({
                where: {
                    vehiculoId_choferId: {
                        vehiculoId: vehicle.id,
                        choferId,
                    },
                },
                select: {
                    chofer: {
                        select: {
                            id: true,
                            nombre: true,
                            contratistaId: true,
                        },
                    },
                },
            });

            if (!assignment) {
                throw new Error("El chofer seleccionado no está autorizado para este vehículo.");
            }

            if (assignment.chofer.contratistaId !== vehicle.contratistaId) {
                throw new Error("La asignación vigente es inconsistente: el chofer pertenece a otro contratista. Corrija la relación antes de registrar el evento.");
            }

            const nextEstadoRecinto = tipoEvento === "ENTRADA" ? "DENTRO" : "FUERA";

            const evento = await tx.eventoAcceso.create({
                data: {
                    vehiculoId: vehicle.id,
                    contratistaId: vehicle.contratistaId,
                    choferId,
                    porteriaId: porteria.id,
                    operadoPorId: session.userId ?? null,
                    operadoPorUsername: session.username,
                    operadoPorRole: session.role,
                    operadoPorPorteriaNombre: session.porteriaNombre ?? null,
                    tipoEvento: tipoEvento as TipoEventoInput,
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
            });

            await tx.vehicle.update({
                where: { id: vehicle.id },
                data: {
                    estadoRecinto: nextEstadoRecinto,
                },
            });

            return {
                estadoRecinto: nextEstadoRecinto,
                ultimoEvento: evento,
                choferNombre: assignment.chofer.nombre,
                porteriaNombre: porteria.nombre,
                vehicleLicensePlate: vehicle.licensePlate,
            };
        });

        revalidatePath("/admin");
        revalidatePath("/admin/control-acceso-v2");
        revalidatePath("/admin/eventos-acceso");
        revalidatePath("/admin/logs");
        revalidatePath("/guard");
        revalidatePath("/guard/v2");

        return NextResponse.json({
            message: `${tipoEvento === "ENTRADA" ? "Entrada" : "Salida"} registrada correctamente para la patente ${result.vehicleLicensePlate} en ${result.porteriaNombre} con el chofer ${result.choferNombre}. El movimiento ya quedó disponible en el historial administrativo.`,
            estadoRecinto: result.estadoRecinto,
            ultimoEvento: result.ultimoEvento,
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error
                    ? error.message
                    : "No fue posible registrar el evento de acceso.",
            },
            { status: 400 },
        );
    }
}