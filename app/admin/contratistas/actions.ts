"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { normalizeEmpresa } from "@/lib/import/normalizers";
import {
    getContratistaActionErrorMessage,
    parseContratistaInput,
} from "@/lib/contratistas";
import { prisma } from "@/lib/prisma";

const CONTRATISTA_CREATED_MESSAGE = "Contratista guardado exitosamente";
const CONTRATISTA_UPDATED_MESSAGE = "Contratista actualizado exitosamente";
const CONTRATISTA_DELETED_MESSAGE = "Contratista eliminado correctamente.";

async function ensureContratistaNormalizedNameUniqueness(razonSocial: string, excludeId?: number) {
    const normalizedTarget = normalizeEmpresa(razonSocial);

    if (!normalizedTarget) {
        return;
    }

    const existingContractors = await prisma.contratista.findMany({
        select: {
            id: true,
            razonSocial: true,
        },
    });

    const normalizedConflict = existingContractors.find((contractor) => {
        if (typeof excludeId === "number" && contractor.id === excludeId) {
            return false;
        }

        return normalizeEmpresa(contractor.razonSocial) === normalizedTarget;
    });

    if (normalizedConflict) {
        throw new Error("Ya existe un contratista con una razón social equivalente. Revise tildes, mayúsculas o espacios.");
    }
}

export async function createContratistaAction(formData: FormData) {
    await requireRole("ADMIN");

    let contratistaId = 0;

    try {
        const input = parseContratistaInput(formData);
        await ensureContratistaNormalizedNameUniqueness(input.razonSocial);
        const contratista = await prisma.contratista.create({
            data: input,
            select: { id: true },
        });
        contratistaId = contratista.id;
    } catch (error) {
        redirect(`/admin/contratistas/nuevo?error=${encodeURIComponent(getContratistaActionErrorMessage(error))}#contratista-form`);
    }

    revalidatePath("/admin/contratistas");
    redirect(`/admin/contratistas?success=${encodeURIComponent(CONTRATISTA_CREATED_MESSAGE)}&savedContratistaId=${contratistaId}#contratistas`);
}

export async function updateContratistaAction(id: number, formData: FormData) {
    await requireRole("ADMIN");

    try {
        const input = parseContratistaInput(formData);
        await ensureContratistaNormalizedNameUniqueness(input.razonSocial, id);

        await prisma.contratista.update({
            where: { id },
            data: input,
        });
    } catch (error) {
        redirect(`/admin/contratistas/${id}/editar?error=${encodeURIComponent(getContratistaActionErrorMessage(error))}#edit-contratista-form`);
    }

    revalidatePath("/admin/contratistas");
    revalidatePath(`/admin/contratistas/${id}/editar`);
    redirect(`/admin/contratistas?success=${encodeURIComponent(CONTRATISTA_UPDATED_MESSAGE)}&savedContratistaId=${id}#contratistas`);
}

export async function deleteContratistaAction(formData: FormData) {
    await requireRole("ADMIN");

    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
        redirect(`/admin/contratistas?error=${encodeURIComponent("Identificador de contratista inválido.")}`);
    }

    try {
        await prisma.contratista.delete({ where: { id } });
    } catch (error) {
        redirect(`/admin/contratistas?error=${encodeURIComponent(getContratistaActionErrorMessage(error))}`);
    }

    revalidatePath("/admin/contratistas");
    redirect(`/admin/contratistas?success=${encodeURIComponent(CONTRATISTA_DELETED_MESSAGE)}`);
}