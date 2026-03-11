"use server";

import { redirect } from "next/navigation";

import {
    createSession,
    getDashboardPath,
    isValidCredentials,
    parseRole,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
    const role = parseRole(String(formData.get("role") ?? ""));
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!role || !username || !password) {
        redirect(`/login?error=${encodeURIComponent("Complete todos los campos.")}`);
    }

    if (!isValidCredentials(role, username, password)) {
        redirect(`/login?error=${encodeURIComponent("Credenciales invalidas para el rol seleccionado.")}`);
    }

    await createSession(role, username);
    redirect(getDashboardPath(role));
}
