"use client";

import { useEffect, useMemo, useState } from "react";

import { PWA_SHORT_NAME } from "@/lib/pwa-config";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
};

const DISMISS_STORAGE_KEY = "web-acceso:pwa-install-dismissed";

function isStandaloneMode() {
    if (typeof window === "undefined") {
        return false;
    }

    return window.matchMedia("(display-mode: standalone)").matches;
}

function isAndroidChrome() {
    if (typeof navigator === "undefined") {
        return false;
    }

    const userAgent = navigator.userAgent.toLowerCase();

    return userAgent.includes("android") && userAgent.includes("chrome");
}

export function PwaEnhancer() {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isPromptVisible, setIsPromptVisible] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const shouldAttemptInstallPrompt = useMemo(
        () => typeof window !== "undefined" && isAndroidChrome() && !isStandaloneMode(),
        [],
    );

    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        if (!window.isSecureContext && window.location.hostname !== "localhost") {
            return;
        }

        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
            return undefined;
        });
    }, []);

    useEffect(() => {
        if (!shouldAttemptInstallPrompt) {
            return;
        }

        const dismissed = window.localStorage.getItem(DISMISS_STORAGE_KEY) === "1";

        if (dismissed) {
            return;
        }

        const handleBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
            setIsPromptVisible(true);
        };
        const handleAppInstalled = () => {
            setInstallPrompt(null);
            setIsPromptVisible(false);
            window.localStorage.removeItem(DISMISS_STORAGE_KEY);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, [shouldAttemptInstallPrompt]);

    async function handleInstall() {
        if (!installPrompt) {
            return;
        }

        setIsInstalling(true);

        try {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;

            if (choice.outcome === "accepted") {
                setInstallPrompt(null);
                setIsPromptVisible(false);
                window.localStorage.removeItem(DISMISS_STORAGE_KEY);
                return;
            }
        } finally {
            setIsInstalling(false);
        }
    }

    function handleDismiss() {
        window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
        setIsPromptVisible(false);
    }

    if (!shouldAttemptInstallPrompt || !installPrompt || !isPromptVisible) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6 lg:px-8">
            <aside className="pointer-events-auto w-full max-w-xl rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-700">
                            Instalación en tablet
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                            Puede instalar {PWA_SHORT_NAME} en la pantalla principal de la tablet para abrirla como aplicación.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button className="button-secondary min-h-[48px] px-4 py-2" onClick={handleDismiss} type="button">
                            Ahora no
                        </button>
                        <button className="button-primary min-h-[48px] px-4 py-2" disabled={isInstalling} onClick={() => void handleInstall()} type="button">
                            {isInstalling ? "Preparando..." : "Instalar"}
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
}