"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AsciiLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
    text?: string;
    variant?: "spinner" | "bar" | "dots";
    /** When true, stops animation and shows error state with red styling */
    isError?: boolean;
    /** Error message to display (overrides text when isError is true) */
    errorMessage?: string;
    /** Callback when "Try Again" button is clicked */
    onRetry?: () => void;
}

export function AsciiLoader({
    className,
    text = "PROCESSING",
    variant = "bar",
    isError = false,
    errorMessage,
    onRetry,
    ...props
}: AsciiLoaderProps) {
    // Error state - show modern error indicator
    if (isError) {
        return (
            <div className={cn("text-xs flex flex-col gap-2 p-2 rounded-md bg-red-500/5 text-red-600 border border-red-500/20", className)} {...props}>
                <div className="flex items-center gap-2">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="font-medium">
                        {errorMessage || "An error occurred"}
                    </span>
                </div>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="self-start mt-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md bg-white hover:bg-red-50 transition-colors shadow-sm"
                    >
                        Try Again
                    </button>
                )}
            </div>
        );
    }

    // Loading state - show modern spinner
    return (
        <div className={cn("text-xs flex items-center gap-2 text-muted-foreground", className)} {...props}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 animate-spin"
            >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {text && <span className="font-medium animate-pulse">{text}</span>}
        </div>
    );
}
