import React from "react";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, type, ...props }, ref) => {
        return (
            <div className="relative w-full">
                <input
                    type={type}
                    className={cn(
                        "flex h-10 w-full rounded-md border text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "bg-slate-900/50 border-slate-700 text-slate-100 focus-visible:ring-blue-500",
                        error && "border-red-500 focus-visible:ring-red-500",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";
