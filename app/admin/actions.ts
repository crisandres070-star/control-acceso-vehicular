"use server";

import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { AccessDecision } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
    isAlphanumericCode,
    normalizeInternalCode,
    normalizeLicensePlate,
} from "@/lib/utils";

type VehicleInput = {
    contratistaId: number;
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    brand: string;
    accessStatus: AccessDecision;
};

const VEHICLE_CREATED_MESSAGE = "Vehículo creado correctamente.";
const VEHICLE_UPDATED_MESSAGE = "Vehículo actualizado correctamente.";
const VEHICLE_DELETED_MESSAGE = "Vehículo eliminado correctamente.";

async function getContratistaForVehicle(contratistaId: number) {
    const contratista = await prisma.contratista.findUnique({
        where: { id: contratistaId },
        select: {
            id: true,
            razonSocial: true,
        },
    });

    if (!contratista) {
        throw new Error("Debe seleccionar un contratista válido.");
    }

    return contratista;
}

async function findExistingVehicleIdByNormalizedPlate(licensePlate: string, excludeId?: number) {
    if (!licensePlate) {
        return null;
    }

    const exclusionSql = typeof excludeId === "number"
        ? Prisma.sql`AND id <> ${excludeId}`
        : Prisma.empty;
    const rows = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM vehicles
        WHERE UPPER(REGEXP_REPLACE(license_plate, '[^A-Za-z0-9]', '', 'g')) = ${licensePlate}
        ${exclusionSql}
        ORDER BY id ASC
        LIMIT 1
    `;

    return rows[0]?.id ?? null;
}

async function ensureVehicleNormalizedPlateUniqueness(licensePlate: string, excludeId?: number) {
    const existingVehicleId = await findExistingVehicleIdByNormalizedPlate(licensePlate, excludeId);

    if (existingVehicleId) {
        throw new Error("Ya existe un vehículo con esa patente.");
    }
}

async function ensureVehicleAssignmentContractorConsistency(vehicleId: number, targetContratistaId: number) {
    const mismatchedAssignments = await prisma.vehiculoChofer.count({
        where: {
            vehiculoId: vehicleId,
            chofer: {
                contratistaId: {
                    not: targetContratistaId,
                },
            },
        },
    });

    if (mismatchedAssignments > 0) {
        throw new Error("No se puede cambiar el contratista del vehículo mientras tenga choferes autorizados de otra empresa. Desasigne esos choferes y vuelva a asignarlos según el nuevo contratista.");
    }
}

function parseVehicleInput(formData: FormData): VehicleInput {
    const contratistaId = Number(formData.get("contratistaId"));
    const licensePlate = normalizeLicensePlate(
        String(formData.get("licensePlate") ?? ""),
    );
    const codigoInterno = normalizeInternalCode(
        String(formData.get("codigoInterno") ?? ""),
    );
    const vehicleType = String(formData.get("vehicleType") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const accessStatusInput = String(formData.get("accessStatus") ?? "NO");
    const accessStatus: AccessDecision =
        accessStatusInput === "YES" ? "YES" : "NO";

    if (!Number.isInteger(contratistaId) || contratistaId <= 0) {
        throw new Error("Debe seleccionar un contratista válido.");
    }

    if (!licensePlate) {
        throw new Error("La patente es obligatoria.");
    }

    if (!codigoInterno) {
        throw new Error("El Código interno es obligatorio.");
    }

    if (!vehicleType) {
        throw new Error("El Tipo de vehículo es obligatorio.");
    }

    if (!brand) {
        throw new Error("La Marca es obligatoria.");
    }

    if (!isAlphanumericCode(codigoInterno)) {
        throw new Error("El Código interno solo puede contener letras y números.");
    }

    return {
        contratistaId,
        licensePlate,
        codigoInterno,
        vehicleType,
        brand,
        accessStatus,
    };
}

function buildSystemVehicleIdentity(licensePlate: string) {
    const token = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    return {
        name: `Vehículo ${licensePlate}`,
        rut: `AUTO-${token}`,
    };
}

function getActionErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const target = Array.isArray(error.meta?.target)
                ? error.meta?.target.join(",")
                : String(error.meta?.target ?? "");

            if (target.includes("licensePlate") || target.includes("license_plate")) {
                return "Ya existe un vehículo con esa patente.";
            }

            return "Ya existe un vehículo con datos duplicados.";
        }

        if (error.code === "P2003") {
            return "No se puede eliminar el vehículo porque tiene choferes asignados o eventos de acceso relacionados.";
        }

        if (error.code === "P2025") {
            return "No se encontró el vehículo solicitado.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado al guardar el vehículo.";
}

function revalidateVehiclePaths(id?: number) {
    revalidatePath("/admin");
    revalidatePath("/admin/vehiculos");
    revalidatePath("/admin/vehiculos/nuevo");
    revalidatePath("/admin/asignaciones");
    revalidatePath("/admin/control-acceso-v2");
    revalidatePath("/admin/eventos-acceso");
    revalidatePath("/guard/v2");

    if (id) {
        revalidatePath(`/admin/vehicles/${id}/edit`);
        revalidatePath(`/admin/vehiculos/${id}/editar`);
    }
}

export async function createVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    let vehicleId = 0;

    try {
        const input = parseVehicleInput(formData);
        const contratista = await getContratistaForVehicle(input.contratistaId);
        await ensureVehicleNormalizedPlateUniqueness(input.licensePlate);
        const systemIdentity = buildSystemVehicleIdentity(input.licensePlate);
        const vehicle = await prisma.vehicle.create({
            data: {
                licensePlate: input.licensePlate,
                codigoInterno: input.codigoInterno,
                vehicleType: input.vehicleType,
                brand: input.brand,
                accessStatus: input.accessStatus,
                company: contratista.razonSocial,
                contratistaId: contratista.id,
                ...systemIdentity,
            },
            select: { id: true },
        });
        vehicleId = vehicle.id;
    } catch (error) {
        redirect(`/admin/vehiculos/nuevo?error=${encodeURIComponent(getActionErrorMessage(error))}#vehiculo-form`);
    }

    revalidateVehiclePaths(vehicleId);
    redirect(`/admin/vehiculos?success=${encodeURIComponent(VEHICLE_CREATED_MESSAGE)}&savedVehicleId=${vehicleId}#vehiculos`);
}

export async function updateVehicleAction(id: number, formData: FormData) {
    await requireRole("ADMIN");

    try {
        const input = parseVehicleInput(formData);
        const contratista = await getContratistaForVehicle(input.contratistaId);
        await ensureVehicleNormalizedPlateUniqueness(input.licensePlate, id);
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { id },
            select: {
                name: true,
                rut: true,
                contratistaId: true,
            },
        });

        if (!existingVehicle) {
            throw new Error("No se encontró el vehículo a actualizar.");
        }

        if (existingVehicle.contratistaId !== contratista.id) {
            await ensureVehicleAssignmentContractorConsistency(id, contratista.id);
        }

        await prisma.vehicle.update({
            where: { id },
            data: {
                licensePlate: input.licensePlate,
                codigoInterno: input.codigoInterno,
                vehicleType: input.vehicleType,
                brand: input.brand,
                accessStatus: input.accessStatus,
                company: contratista.razonSocial,
                contratistaId: contratista.id,
                name: existingVehicle.name,
                rut: existingVehicle.rut,
            },
        });
    } catch (error) {
        redirect(
            `/admin/vehiculos/${id}/editar?error=${encodeURIComponent(getActionErrorMessage(error))}#edit-vehicle-form`,
        );
    }

    revalidateVehiclePaths(id);
    redirect(`/admin/vehiculos?success=${encodeURIComponent(VEHICLE_UPDATED_MESSAGE)}&savedVehicleId=${id}#vehiculos`);
}

export async function deleteVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
        redirect(`/admin/vehiculos?error=${encodeURIComponent("Identificador de vehículo inválido.")}`);
    }

    try {
        await prisma.vehicle.delete({ where: { id } });
    } catch (error) {
        redirect(`/admin/vehiculos?error=${encodeURIComponent(getActionErrorMessage(error))}`);
    }

    revalidateVehiclePaths(id);
    redirect(`/admin/vehiculos?success=${encodeURIComponent(VEHICLE_DELETED_MESSAGE)}`);
}
