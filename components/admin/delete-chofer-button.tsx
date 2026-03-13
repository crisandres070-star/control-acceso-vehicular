"use client";

import { useEffect, useId, useRef, useState } from "react";

type DeleteChoferButtonProps = {
    action: (formData: FormData) => void | Promise<void>;
    choferId: number;
    nombre: string;
};

export function DeleteChoferButton({ action, choferId, nombre }: DeleteChoferButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const frameId = requestAnimationFrame(() => {
            cancelButtonRef.current?.focus();
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
            <form action={action} ref={formRef}>
                <input name="id" type="hidden" value={choferId} />
                <button
                    className="inline-flex min-h-[44px] items-center rounded-full bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-100 focus:ring-4 focus:ring-red-100"
                    onClick={() => setIsOpen(true)}
                    type="button"
                >
                    Eliminar
                </button>
            </form>

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
                        className="w-full max-w-md rounded-[32px] border border-white/90 bg-white p-6 shadow-[0_32px_90px_rgba(15,23,42,0.2)]"
                        role="dialog"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-500">
                            Confirmación
                        </p>
                        <h3 className="mt-3 font-[family:var(--font-heading)] text-3xl font-bold text-slate-950" id={titleId}>
                            Eliminar chofer
                        </h3>
                        <p className="mt-3 text-base leading-7 text-slate-600">
                            Esta acción no se puede deshacer. Revise que el chofer no sea necesario para la operación actual antes de confirmar.
                        </p>
                        <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Chofer seleccionado
                            </p>
                            <p className="mt-2 text-lg font-semibold text-slate-950">{nombre}</p>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                className="button-secondary"
                                onClick={() => setIsOpen(false)}
                                ref={cancelButtonRef}
                                type="button"
                            >
                                Cancelar
                            </button>
                            <button
                                className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-red-600 px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-700 focus:ring-4 focus:ring-red-100"
                                onClick={() => {
                                    setIsOpen(false);
                                    formRef.current?.requestSubmit();
                                }}
                                type="button"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}