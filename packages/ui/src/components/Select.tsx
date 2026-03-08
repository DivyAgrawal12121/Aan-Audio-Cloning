import React from "react";
import { cn } from "../utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    error?: string;
    icon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, error, icon, children, ...props }, ref) => {
        return (
            <div className="relative w-full">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
                <select
                    ref={ref}
                    className={cn(
                        "flex h-10 w-full appearance-none rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                        "bg-slate-900/50 border-slate-700 text-slate-100 focus-visible:ring-blue-500",
                        icon ? "pl-10 pr-10" : "px-3 pr-10",
                        error && "border-red-500 focus-visible:ring-red-500",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);
Select.displayName = "Select";
