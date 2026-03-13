"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ASSIGNMENT_CREATED_MESSAGE = "Chofer asociado correctamente al vehículo.";
const ASSIGNMENT_REMOVED_MESSAGE = "Chofer desasignado correctamente del vehículo.";

function parsePositiveIntegerList(values: FormDataEntryValue[]) {
    return Array.from(new Set(
        values
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0),
    ));
}

function getBulkAssignmentSuccessMessage(createdAssignments: number, requestedAssignments: number) {
    if (createdAssignments === requestedAssignments) {
        return createdAssignments === 1
            ? "Chofer autorizado correctamente para el vehículo."
            : `${createdAssignments} choferes autorizados correctamente para el vehículo.`;
    }

    const ignoredAssignments = requestedAssignments - createdAssignments;

    return `${createdAssignments} choferes autorizados correctamente para el vehículo. ${ignoredAssignments} ya estaban vinculados y se mantuvieron sin duplicarse.`;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeContratistaFilter(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();

    if (!normalized) {
        return "";
    }

    return normalized === "ALL" ? "ALL" : normalized;
}

function buildAsignacionesRedirectPath(options: {
    vehicleId?: number | null;
    contratistaId?: string;
    success?: string;
    error?: string;
}) {
    const searchParams = new URLSearchParams();

    if (options.vehicleId) {
        searchParams.set("vehicleId", String(options.vehicleId));
    }

    if (options.contratistaId) {
        searchParams.set("contratistaId", options.contratistaId);
    }

    if (options.success) {
        searchParams.set("success", encodeURIComponent(options.success));
    }

    if (options.error) {
        searchParams.set("error", encodeURIComponent(options.error));
    }

    const queryString = searchParams.toString();

    return queryString
        ? `/admin/asignaciones?${queryString}#asignaciones`
        : "/admin/asignaciones";
}

function getAssignmentErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return "El chofer ya está asignado a este vehículo.";
        }

        if (error.code === "P2003") {
            return "No se pudo completar la asignación porque el vehículo o el chofer relacionado no es válido.";
        }

        if (error.code === "P2025") {
            return "No se encontró la asignación solicitada.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado al actualizar la asignación.";
}

async function ensureVehicleAndChoferExist(vehicleId: number, choferId: number) {
    const [vehicle, chofer] = await Promise.all([
        prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: {
                id: true,
                contratistaId: true,
            },
        }),
        prisma.chofer.findUnique({
            where: { id: choferId },
            select: {
                id: true,
                contratistaId: true,
            },
        }),
    ]);

    if (!vehicle) {
        throw new Error("El vehículo seleccionado no existe.");
    }

    if (!chofer) {
        throw new Error("El chofer seleccionado no existe.");
    }

    return {
        vehicle,
        chofer,
    };
}

async function ensureAssignmentIntegrity(vehicleId: number, choferId: number) {
    const { vehicle, chofer } = await ensureVehicleAndChoferExist(vehicleId, choferId);

    if (!vehicle.contratistaId) {
        throw new Error("El vehículo seleccionado no tiene contratista asociado. Actualícelo antes de asignar choferes.");
    }

    if (vehicle.contratistaId !== chofer.contratistaId) {
        throw new Error("El chofer seleccionado pertenece a otro contratista. Use un chofer de la misma empresa del vehículo.");
    }
}

function revalidateAssignmentPaths(vehicleId?: number) {
    revalidatePath("/admin");
    revalidatePath("/admin/asignaciones");
    revalidatePath("/admin/vehiculos");
    revalidatePath("/admin/control-acceso-v2");
    revalidatePath("/admin/eventos-acceso");
    revalidatePath("/guard/v2");

    if (vehicleId) {
        revalidatePath(`/admin/vehicles/${vehicleId}/edit`);
        revalidatePath(`/admin/vehiculos/${vehicleId}/editar`);
    }
}

export async function assignSelectedChoferesToVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    const vehicleId = parsePositiveInteger(formData.get("vehicleId"));
    const choferIds = parsePositiveIntegerList(formData.getAll("choferIds"));
    const contratistaId = normalizeContratistaFilter(formData.get("contratistaId"));

    if (!vehicleId) {
        redirect(buildAsignacionesRedirectPath({
            error: "Debe seleccionar un vehículo válido.",
        }));
    }

    if (choferIds.length === 0) {
        redirect(buildAsignacionesRedirectPath({
            vehicleId,
            contratistaId,
            error: "Debe seleccionar uno o más choferes para autorizar.",
        }));
    }

    let redirectPath = buildAsignacionesRedirectPath({
        vehicleId,
        contratistaId,
        success: getBulkAssignmentSuccessMessage(choferIds.length, choferIds.length),
    });
    let shouldRevalidate = false;

    try {
        for (const choferId of choferIds) {
            await ensureAssignmentIntegrity(vehicleId, choferId);
        }

        const result = await prisma.vehiculoChofer.createMany({
            data: choferIds.map((choferId) => ({
                vehiculoId: vehicleId,
                choferId,
            })),
            skipDuplicates: true,
        });

        if (result.count === 0) {
            redirectPath = buildAsignacionesRedirectPath({
                vehicleId,
                contratistaId,
                error: "Los choferes seleccionados ya estaban autorizados para este vehículo.",
            });
        } else {
            shouldRevalidate = true;
            redirectPath = buildAsignacionesRedirectPath({
                vehicleId,
                contratistaId,
                success: getBulkAssignmentSuccessMessage(result.count, choferIds.length),
            });
        }
    } catch (error) {
        redirectPath = buildAsignacionesRedirectPath({
            vehicleId,
            contratistaId,
            error: getAssignmentErrorMessage(error),
        });
    }

    if (shouldRevalidate) {
        revalidateAssignmentPaths(vehicleId);
    }

    redirect(redirectPath);
}

export async function assignChoferToVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    const vehicleId = parsePositiveInteger(formData.get("vehicleId"));
    const choferId = parsePositiveInteger(formData.get("choferId"));
    const contratistaId = normalizeContratistaFilter(formData.get("contratistaId"));

    if (!vehicleId) {
        redirect(buildAsignacionesRedirectPath({
            error: "Debe seleccionar un vehículo válido.",
        }));
    }

    if (!choferId) {
        redirect(buildAsignacionesRedirectPath({
            vehicleId,
            contratistaId,
            error: "Debe seleccionar un chofer válido.",
        }));
    }

    let redirectPath = buildAsignacionesRedirectPath({
        vehicleId,
        contratistaId,
        success: ASSIGNMENT_CREATED_MESSAGE,
    });
    let shouldRevalidate = false;

    try {
        await ensureAssignmentIntegrity(vehicleId, choferId);
        await prisma.vehiculoChofer.create({
            data: {
                vehiculoId: vehicleId,
                choferId,
            },
        });

        shouldRevalidate = true;
    } catch (error) {
        redirectPath = buildAsignacionesRedirectPath({
            vehicleId,
            contratistaId,
            error: getAssignmentErrorMessage(error),
        });
    }

    if (shouldRevalidate) {
        revalidateAssignmentPaths(vehicleId);
    }

    redirect(redirectPath);
}

export async function removeChoferFromVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    const vehicleId = parsePositiveInteger(formData.get("vehicleId"));
    const choferId = parsePositiveInteger(formData.get("choferId"));
    const contratistaId = normalizeContratistaFilter(formData.get("contratistaId"));

    if (!vehicleId) {
        redirect(buildAsignacionesRedirectPath({
            error: "Debe seleccionar un vehículo válido.",
        }));
    }

    if (!choferId) {
        redirect(buildAsignacionesRedirectPath({
            vehicleId,
            contratistaId,
            error: "Debe seleccionar un chofer válido.",
        }));
    }

    let redirectPath = buildAsignacionesRedirectPath({
        vehicleId,
        contratistaId,
        success: ASSIGNMENT_REMOVED_MESSAGE,
    });
    let shouldRevalidate = false;

    try {
        await ensureVehicleAndChoferExist(vehicleId, choferId);
        await prisma.vehiculoChofer.delete({
            where: {
                vehiculoId_choferId: {
                    vehiculoId: vehicleId,
                    choferId,
                },
            },
        });

        shouldRevalidate = true;
    } catch (error) {
        redirectPath = buildAsignacionesRedirectPath({
            vehicleId,
            contratistaId,
            error: getAssignmentErrorMessage(error),
        });
    }

    if (shouldRevalidate) {
        revalidateAssignmentPaths(vehicleId);
    }

    redirect(redirectPath);
}