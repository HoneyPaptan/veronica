"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AsciiLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
    text?: string;
    variant?: "spinner" | "bar" | "dots";
}

export function AsciiLoader({
    className,
    text = "PROCESSING",
    variant = "bar",
    ...props
}: AsciiLoaderProps) {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((f) => f + 1);
        }, 100);
        return () => clearInterval(interval);
    }, []);

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
