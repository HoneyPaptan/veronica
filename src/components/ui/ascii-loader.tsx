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
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        // Don't animate if in error state
        if (isError) return;
        
        const interval = setInterval(() => {
            setFrame((f) => f + 1);
        }, 100);
        return () => clearInterval(interval);
    }, [isError]);

    const spinners = ["|", "/", "-", "\\"];
    // A growing bar that resets: [=     ] -> [==    ] ...
    const getBar = (f: number) => {
        const width = 5;
        const pos = f % (width + 1);
        const fill = "=".repeat(pos);
        const empty = " ".repeat(width - pos);
        return `[${fill}${empty}]`;
    };

    const getDots = (f: number) => ".".repeat((f % 3) + 1);

    // Error state - show static error indicator
    if (isError) {
        return (
            <div className={cn("font-mono text-xs flex flex-col gap-2", className)} {...props}>
                <div className="flex items-center gap-2">
                    <span className="text-red-500">[= ERROR]</span>
                    <span className="text-red-500 uppercase tracking-wider">
                        {errorMessage || "ERROR"}
                    </span>
                </div>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-1 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/50 rounded-md bg-red-500/10 hover:bg-red-500/20 hover:border-red-500 transition-all w-fit"
                    >
                        ↻ Try Again
                    </button>
                )}
            </div>
        );
    }

    let animation = "";
    if (variant === "spinner") animation = spinners[frame % spinners.length];
    else if (variant === "bar") animation = getBar(frame);
    else if (variant === "dots") animation = getDots(frame);

    return (
        <div className={cn("font-mono text-xs flex items-center gap-2", className)} {...props}>
            <span className="text-emerald-500">{animation}</span>
            {text && <span className="opacity-70 uppercase tracking-wider">{text}</span>}
        </div>
    );
}
