import React from "react";
import { cn } from "../utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-slate-900",
                    {
                        "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800": variant === "primary",
                        "bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600": variant === "secondary",
                        "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100": variant === "outline",
                        "bg-transparent hover:bg-slate-800 text-slate-100": variant === "ghost",
                        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800": variant === "danger",
                        "h-9 px-3": size === "sm",
                        "h-10 py-2 px-4": size === "md",
                        "h-11 px-8 text-base": size === "lg",
                        "h-10 w-10": size === "icon",
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";
