"use client";

import { useEffect, useId, useRef, useState } from "react";

import { VehicleForm } from "@/components/admin/vehicle-form";

type ContratistaOption = {
    id: number;
    razonSocial: string;
};

type VehicleCreateDialogProps = {
    action: (formData: FormData) => void | Promise<void>;
    contratistas: ContratistaOption[];
    errorMessage?: string;
    formKey: string;
};

export function VehicleCreateDialog({
    action,
    contratistas,
    errorMessage,
    formKey,
}: VehicleCreateDialogProps) {
    const [isOpen, setIsOpen] = useState(Boolean(errorMessage));
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();

    useEffect(() => {
        if (errorMessage) {
            setIsOpen(true);
        }
    }, [errorMessage]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const frameId = requestAnimationFrame(() => {
            closeButtonRef.current?.focus();
        });

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleEscape);

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    return (
        <>
            <button className="button-primary" onClick={() => setIsOpen(true)} type="button">
                Agregar vehículo
            </button>

            {isOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsOpen(false);
                        }
                    }}
                    role="presentation"
                >
                    <div
                        aria-labelledby={titleId}
                        aria-modal="true"
                        className="w-full max-w-4xl rounded-[32px] border border-white/90 bg-white p-5 shadow-[0_32px_90px_rgba(15,23,42,0.2)] sm:p-6 lg:p-8"
                        role="dialog"
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-700">
                                    Alta manual
                                </p>
                                <h2 className="mt-3 font-[family:var(--font-heading)] text-2xl font-bold text-slate-950 sm:text-3xl" id={titleId}>
                                    Agregar vehículo
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                    Complete la ficha operativa del vehículo con una estructura más limpia y enfocada en la carga diaria.
                                </p>
                            </div>

                            <button
                                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus:ring-4 focus:ring-accent-100"
                                onClick={() => setIsOpen(false)}
                                ref={closeButtonRef}
                                type="button"
                            >
                                Cerrar
                            </button>
                        </div>

                        <VehicleForm
                            action={action}
                            cancelLabel="Cerrar"
                            contratistas={contratistas}
                            errorMessage={errorMessage}
                            heading="Agregar vehículo"
                            id="vehicle-form"
                            key={formKey}
                            onCancel={() => setIsOpen(false)}
                            showHeader={false}
                            submitLabel="Guardar vehículo"
                            variant="plain"
                        />
                    </div>
                </div>
            ) : null}
        </>
    );
}