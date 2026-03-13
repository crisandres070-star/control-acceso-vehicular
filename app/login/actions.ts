"use server";

import { redirect } from "next/navigation";

import {
    authenticateCredentials,
    createSession,
    getDashboardPath,
    parseRole,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
    const role = parseRole(String(formData.get("role") ?? ""));
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!role || !username || !password) {
        redirect(`/login?error=${encodeURIComponent("Complete todos los campos.")}`);
    }

    const session = await authenticateCredentials(role, username, password);

    if (!session) {
        redirect(`/login?error=${encodeURIComponent("Credenciales inválidas para el rol seleccionado.")}`);
    }

    await createSession(session);
    redirect(getDashboardPath(role));
}
