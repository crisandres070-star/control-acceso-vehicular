"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PorteriaInput = {
    nombre: string;
    telefono: string | null;
};

const PORTERIA_CREATED_MESSAGE = "Portería guardada exitosamente";
const PORTERIA_UPDATED_MESSAGE = "Portería actualizada exitosamente";
const PORTERIA_DELETED_MESSAGE = "Portería eliminada correctamente.";

function normalizeOptionalField(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();

    return normalized ? normalized : null;
}

function parsePorteriaInput(formData: FormData): PorteriaInput {
    const nombre = String(formData.get("nombre") ?? "").trim();
    const telefono = normalizeOptionalField(formData.get("telefono"));

    if (!nombre) {
        throw new Error("El Nombre es obligatorio.");
    }

    return {
        nombre,
        telefono,
    };
}

function getPorteriaActionErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const target = Array.isArray(error.meta?.target)
                ? error.meta.target.join(",")
                : String(error.meta?.target ?? "");

            if (target.includes("nombre")) {
                return "Ya existe una portería con ese nombre.";
            }

            return "Ya existe una portería con datos duplicados.";
        }

        if (error.code === "P2003") {
            return "No se puede eliminar la portería porque tiene registros relacionados.";
        }

        if (error.code === "P2025") {
            return "No se encontró la portería solicitada.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado al guardar la portería.";
}

export async function createPorteriaAction(formData: FormData) {
    await requireRole("ADMIN");

    let porteriaId = 0;

    try {
        const input = parsePorteriaInput(formData);
        const porteria = await prisma.porteria.create({
            data: input,
            select: { id: true },
        });
        porteriaId = porteria.id;
    } catch (error) {
        redirect(`/admin/porterias/nuevo?error=${encodeURIComponent(getPorteriaActionErrorMessage(error))}#porteria-form`);
    }

    revalidatePath("/admin/porterias");
    redirect(`/admin/porterias?success=${encodeURIComponent(PORTERIA_CREATED_MESSAGE)}&savedPorteriaId=${porteriaId}#porterias`);
}

export async function updatePorteriaAction(id: number, formData: FormData) {
    await requireRole("ADMIN");

    try {
        const input = parsePorteriaInput(formData);

        await prisma.porteria.update({
            where: { id },
            data: input,
        });
    } catch (error) {
        redirect(`/admin/porterias/${id}/editar?error=${encodeURIComponent(getPorteriaActionErrorMessage(error))}#edit-porteria-form`);
    }

    revalidatePath("/admin/porterias");
    revalidatePath(`/admin/porterias/${id}/editar`);
    redirect(`/admin/porterias?success=${encodeURIComponent(PORTERIA_UPDATED_MESSAGE)}&savedPorteriaId=${id}#porterias`);
}

export async function deletePorteriaAction(formData: FormData) {
    await requireRole("ADMIN");

    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
        redirect(`/admin/porterias?error=${encodeURIComponent("Identificador de portería inválido.")}`);
    }

    try {
        await prisma.porteria.delete({ where: { id } });
    } catch (error) {
        redirect(`/admin/porterias?error=${encodeURIComponent(getPorteriaActionErrorMessage(error))}`);
    }

    revalidatePath("/admin/porterias");
    redirect(`/admin/porterias?success=${encodeURIComponent(PORTERIA_DELETED_MESSAGE)}`);
}