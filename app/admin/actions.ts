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
    licensePlate: string;
    codigoInterno: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: AccessDecision;
};

const VEHICLE_CREATED_MESSAGE = "Vehículo guardado exitosamente";
const VEHICLE_UPDATED_MESSAGE = "Vehículo actualizado exitosamente";

function parseVehicleInput(formData: FormData): VehicleInput {
    const licensePlate = normalizeLicensePlate(
        String(formData.get("licensePlate") ?? ""),
    );
    const codigoInterno = normalizeInternalCode(
        String(formData.get("codigoInterno") ?? ""),
    );
    const vehicleType = String(formData.get("vehicleType") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const accessStatusInput = String(formData.get("accessStatus") ?? "NO");
    const accessStatus: AccessDecision =
        accessStatusInput === "YES" ? "YES" : "NO";

    if (!licensePlate || !codigoInterno || !vehicleType || !brand || !company) {
        throw new Error("Patente, Código interno, tipo de vehículo, marca y empresa son obligatorios.");
    }

    if (!isAlphanumericCode(codigoInterno)) {
        throw new Error("El Código interno solo puede contener letras y números.");
    }

    return {
        licensePlate,
        codigoInterno,
        vehicleType,
        brand,
        company,
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
            ? error.meta?.target.join(",")
            : String(error.meta?.target ?? "");

        if (target.includes("licensePlate") || target.includes("license_plate")) {
            return "Ya existe un vehículo con esa patente.";
        }

        return "Ya existe un vehículo con datos duplicados.";
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado al guardar el vehículo.";
}

export async function createVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    let vehicleId = 0;

    try {
        const input = parseVehicleInput(formData);
        const systemIdentity = buildSystemVehicleIdentity(input.licensePlate);
        const vehicle = await prisma.vehicle.create({
            data: {
                ...input,
                ...systemIdentity,
            },
            select: { id: true },
        });
        vehicleId = vehicle.id;
    } catch (error) {
        redirect(`/admin?formError=${encodeURIComponent(getActionErrorMessage(error))}#vehicle-form`);
    }

    revalidatePath("/admin");
    redirect(`/admin?success=${encodeURIComponent(VEHICLE_CREATED_MESSAGE)}&savedVehicleId=${vehicleId}#vehicles`);
}

export async function updateVehicleAction(id: number, formData: FormData) {
    await requireRole("ADMIN");

    try {
        const input = parseVehicleInput(formData);
        const existingVehicle = await prisma.vehicle.findUnique({
            where: { id },
            select: {
                name: true,
                rut: true,
            },
        });

        if (!existingVehicle) {
            throw new Error("No se encontró el vehículo a actualizar.");
        }

        await prisma.vehicle.update({
            where: { id },
            data: {
                ...input,
                name: existingVehicle.name,
                rut: existingVehicle.rut,
            },
        });
    } catch (error) {
        redirect(
            `/admin/vehicles/${id}/edit?error=${encodeURIComponent(getActionErrorMessage(error))}#edit-vehicle-form`,
        );
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/vehicles/${id}/edit`);
    redirect(`/admin?success=${encodeURIComponent(VEHICLE_UPDATED_MESSAGE)}&savedVehicleId=${id}#vehicles`);
}

export async function deleteVehicleAction(formData: FormData) {
    await requireRole("ADMIN");

    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
        redirect(`/admin?error=${encodeURIComponent("Identificador de vehículo inválido.")}`);
    }

    await prisma.vehicle.delete({ where: { id } });
    revalidatePath("/admin");
    redirect(`/admin?success=${encodeURIComponent("Vehículo eliminado correctamente.")}`);
}
