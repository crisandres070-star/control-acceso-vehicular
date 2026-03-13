import { Prisma } from "@prisma/client";

import { isValidRut, normalizeRut } from "@/lib/utils";

export type ContratistaInput = {
    razonSocial: string;
    rut: string;
    email: string | null;
    contacto: string | null;
    telefono: string | null;
};

function normalizeOptionalField(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();

    return normalized ? normalized : null;
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseContratistaInput(formData: FormData): ContratistaInput {
    const razonSocial = String(formData.get("razonSocial") ?? "").trim();
    const rut = normalizeRut(String(formData.get("rut") ?? ""));
    const email = normalizeOptionalField(formData.get("email"));
    const contacto = normalizeOptionalField(formData.get("contacto"));
    const telefono = normalizeOptionalField(formData.get("telefono"));

    if (!razonSocial) {
        throw new Error("La Razón social es obligatoria.");
    }

    if (!rut) {
        throw new Error("El RUT es obligatorio.");
    }

    if (!isValidRut(rut)) {
        throw new Error("Ingrese un RUT válido en formato 12345678-9.");
    }

    if (email && !isValidEmail(email)) {
        throw new Error("Ingrese un email válido.");
    }

    return {
        razonSocial,
        rut,
        email,
        contacto,
        telefono,
    };
}

export function getContratistaActionErrorMessage(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            const target = Array.isArray(error.meta?.target)
                ? error.meta.target.join(",")
                : String(error.meta?.target ?? "");

            if (target.includes("rut")) {
                return "Ya existe un contratista con ese RUT.";
            }

            return "Ya existe un contratista con datos duplicados.";
        }

        if (error.code === "P2003") {
            return "No se puede eliminar el contratista porque tiene registros relacionados.";
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Ocurrió un error inesperado al guardar el contratista.";
}