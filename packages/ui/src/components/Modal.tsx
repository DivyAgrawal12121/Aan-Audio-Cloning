import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../utils";
import { Button } from "./Button";

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    className,
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={cn(
                    "relative z-50 w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl animate-in zoom-in-95 duration-200",
                    className
                )}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <div>
                        {title && <h2 className="text-lg font-semibold">{title}</h2>}
                        {description && (
                            <p className="mt-1 text-sm text-slate-400">{description}</p>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full -mr-2 text-slate-400 hover:text-white"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>

                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/50 px-6 py-4 rounded-b-xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
