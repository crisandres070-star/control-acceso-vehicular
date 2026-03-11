"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import type { AccessDecision } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
    isAlphanumericCode,
    isValidRut,
    normalizeInternalCode,
    normalizeLicensePlate,
    normalizeRut,
} from "@/lib/utils";

type VehicleInput = {
    name: string;
    licensePlate: string;
    codigoInterno: string;
    rut: string;
    vehicleType: string;
    brand: string;
    company: string;
    accessStatus: AccessDecision;
};

const VEHICLE_CREATED_MESSAGE = "Vehículo guardado exitosamente";
const VEHICLE_UPDATED_MESSAGE = "Vehículo actualizado exitosamente";

function parseVehicleInput(formData: FormData): VehicleInput {
    const name = String(formData.get("name") ?? "").trim();
    const licensePlate = normalizeLicensePlate(
        String(formData.get("licensePlate") ?? ""),
    );
    const codigoInterno = normalizeInternalCode(
        String(formData.get("codigoInterno") ?? ""),
    );
    const rut = normalizeRut(String(formData.get("rut") ?? ""));
    const vehicleType = String(formData.get("vehicleType") ?? "").trim();
    const brand = String(formData.get("brand") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const accessStatusInput = String(formData.get("accessStatus") ?? "NO");
    const accessStatus: AccessDecision =
        accessStatusInput === "YES" ? "YES" : "NO";

    if (!name || !licensePlate || !codigoInterno || !rut || !vehicleType || !brand || !company) {
        throw new Error("Todos los campos del vehículo son obligatorios.");
    }

    if (!isAlphanumericCode(codigoInterno)) {
        throw new Error("El Código interno solo puede contener letras y números.");
    }

    if (!isValidRut(rut)) {
        throw new Error("El RUT debe tener el formato 12345678-9 o 12345678-K.");
    }

    return {
        name,
        licensePlate,
        codigoInterno,
        rut,
        vehicleType,
        brand,
        company,
        accessStatus,
    };
}

function getActionErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
            ? error.meta?.target.join(",")
            : String(error.meta?.target ?? "");

        if (target.includes("rut")) {
            return "Ya existe un vehículo con ese RUT.";
        }

        if (target.includes("licensePlate") || target.includes("license_plate")) {
            return "Ya existe un vehículo con esa patente.";
        }

        return "Ya existe un vehículo con un dato único duplicado.";
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
        const vehicle = await prisma.vehicle.create({
            data: input,
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
        await prisma.vehicle.update({
            where: { id },
            data: input,
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
