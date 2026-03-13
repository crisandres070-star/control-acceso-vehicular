"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import {
    getContratistaActionErrorMessage,
    parseContratistaInput,
} from "@/lib/contratistas";
import { prisma } from "@/lib/prisma";
import {
    isAlphanumericCode,
    isValidRut,
    normalizeInternalCode,
    normalizeRut,
} from "@/lib/utils";

type ChoferInput = {
    contratistaId: number;
    nombre: string;
    rut: string;
    codigoInterno: string | null;
};

const CHOFER_CREATED_MESSAGE = "Chofer guardado exitosamente";
const CHOFER_UPDATED_MESSAGE = "Chofer actualizado exitosamente";
const CHOFER_DELETED_MESSAGE = "Chofer eliminado correctamente.";
const QUICK_CONTRATISTA_CREATED_MESSAGE = "Contratista creado y seleccionado correctamente.";

type QuickCreateContratistaResult = {
    status: "success" | "error";
    message: string;
    contratista?: {
        id: number;
        razonSocial: string;
    };
    values?: {
        razonSocial: string;
        rut: string;
        email: string;
    };
};

function getQuickContratistaValues(formData: FormData) {
    return {
        razonSocial: String(formData.get("razonSocial") ?? "").trim(),
        rut: normalizeRut(String(formData.get("rut") ?? "")),
        email: String(formData.get("email") ?? "").trim(),
    };
}

function parseChoferInput(formData: FormData): ChoferInput {
    const contratistaId = Number(formData.get("contratistaId"));
    const nombre = String(formData.get("nombre") ?? "").trim();
    const rut = normalizeRut(String(formData.get("rut") ?? ""));
    const codigoInternoInput = String(formData.get("codigoInterno") ?? "").trim();
    const codigoInterno = codigoInternoInput
        ? normalizeInternalCode(codigoInternoInput)
        : null;

    if (!Number.isInteger(contratistaId) || contratistaId <= 0) {
        throw new Error("Debe seleccionar un contratista válido.");
    }

    if (!nombre) {
        throw new Error("El Nombre es obligatorio.");
    }

    if (!rut) {
        throw new Error("El RUT es obligatorio.");
    }

    if (!isValidRut(rut)) {
        throw new Error("Ingrese un RUT válido en formato 12345678-9.");
    }

    if (codigoInterno && !isAlphanumericCode(codigoInterno)) {
        throw new Error("El Código interno solo puede contener letras y números.");
    }

    return {
        contratistaId,
        nombre,
        rut,
        codigoInterno,
    };
}

function getChoferActionErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const target = Array.isArray(error.meta?.target)
                ? error.meta.target.join(",")
                : String(error.meta?.target ?? "");

            if (target.includes("rut")) {
                return "Ya existe un chofer con ese RUT.";
            }

            if (target.includes("contratista_id") && target.includes("codigo_interno")) {
                return "Ya existe un chofer con ese Código interno para el contratista seleccionado.";
            }

            return "Ya existe un chofer con datos duplicados.";
        }

        if (error.code === "P2003") {
            return "No se puede guardar o eliminar el chofer por una relación inválida con contratistas o eventos.";
        }

        if (error.code === "P2025") {
            return "No se encontró el chofer solicitado.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado al guardar el chofer.";
}

async function ensureContratistaExists(contratistaId: number) {
    const contratista = await prisma.contratista.findUnique({
        where: { id: contratistaId },
        select: { id: true },
    });

    if (!contratista) {
        throw new Error("El contratista seleccionado no existe.");
    }
}

export async function createQuickContratistaForChoferAction(formData: FormData): Promise<QuickCreateContratistaResult> {
    await requireRole("ADMIN");

    const values = getQuickContratistaValues(formData);

    try {
        const input = parseContratistaInput(formData);
        const contratista = await prisma.contratista.create({
            data: input,
            select: {
                id: true,
                razonSocial: true,
            },
        });

        revalidatePath("/admin/choferes");
        revalidatePath("/admin/choferes/nuevo");
        revalidatePath("/admin/contratistas");

        return {
            status: "success",
            message: QUICK_CONTRATISTA_CREATED_MESSAGE,
            contratista,
        };
    } catch (error) {
        return {
            status: "error",
            message: getContratistaActionErrorMessage(error),
            values,
        };
    }
}

export async function createChoferAction(formData: FormData) {
    await requireRole("ADMIN");

    let choferId = 0;

    try {
        const input = parseChoferInput(formData);
        await ensureContratistaExists(input.contratistaId);
        const chofer = await prisma.chofer.create({
            data: input,
            select: { id: true },
        });
        choferId = chofer.id;
    } catch (error) {
        redirect(`/admin/choferes/nuevo?error=${encodeURIComponent(getChoferActionErrorMessage(error))}#chofer-form`);
    }

    revalidatePath("/admin/choferes");
    redirect(`/admin/choferes?success=${encodeURIComponent(CHOFER_CREATED_MESSAGE)}&savedChoferId=${choferId}#choferes`);
}

export async function updateChoferAction(id: number, formData: FormData) {
    await requireRole("ADMIN");

    try {
        const input = parseChoferInput(formData);
        await ensureContratistaExists(input.contratistaId);

        await prisma.chofer.update({
            where: { id },
            data: input,
        });
    } catch (error) {
        redirect(`/admin/choferes/${id}/editar?error=${encodeURIComponent(getChoferActionErrorMessage(error))}#edit-chofer-form`);
    }

    revalidatePath("/admin/choferes");
    revalidatePath(`/admin/choferes/${id}/editar`);
    redirect(`/admin/choferes?success=${encodeURIComponent(CHOFER_UPDATED_MESSAGE)}&savedChoferId=${id}#choferes`);
}

export async function deleteChoferAction(formData: FormData) {
    await requireRole("ADMIN");

    const id = Number(formData.get("id"));

    if (!Number.isInteger(id)) {
        redirect(`/admin/choferes?error=${encodeURIComponent("Identificador de chofer inválido.")}`);
    }

    try {
        await prisma.chofer.delete({ where: { id } });
    } catch (error) {
        redirect(`/admin/choferes?error=${encodeURIComponent(getChoferActionErrorMessage(error))}`);
    }

    revalidatePath("/admin/choferes");
    redirect(`/admin/choferes?success=${encodeURIComponent(CHOFER_DELETED_MESSAGE)}`);
}