"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SYSTEM_LOGS = [
    "INITIALIZING_KERNEL...",
    "LOADING_MODULES [NET, GEO, AI]...",
    "ESTABLISHING_SECURE_LINK...",
    "VERIFYING_INTEGRITY...",
    "ALLOCATING_MEMORY_BLOCKS...",
    "MOUNTING_VIRTUAL_DOM...",
    "SYSTEM_READY."
];

export function AgenticLoading() {
    const [logs, setLogs] = useState<string[]>([]);
    const [dots, setDots] = useState("");

    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < SYSTEM_LOGS.length) {
                setLogs(prev => [...prev, SYSTEM_LOGS[currentIndex]]);
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, 150); // Speed of log appearance

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length < 3 ? prev + "." : ""));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background bg-grid-pattern overflow-hidden text-xs md:text-sm font-mono text-muted-foreground relative">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-[1px]" />

            <div className="z-10 w-full max-w-md p-8 border border-border bg-background/80 backdrop-blur-md relative tech-border shadow-lg">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-border pb-2">
                    <span className="text-foreground font-bold tracking-widest">[ SYSTEM_BOOT ]</span>
                    <span className="text-[10px] opacity-70 text-muted-foreground">V.1.0.4</span>
                </div>

                {/* Logs Area */}
                <div className="flex flex-col gap-1 font-mono h-40 overflow-hidden">
                    {logs.map((log, i) => (
                        <div key={i} className={cn(
                            "flex items-center gap-2",
                            i === logs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground/50"
                        )}>
                            <span className="text-[10px] opacity-40">{`00:${10 + i}:${21 + i * 2}`}</span>
                            <span>{">"} {log}</span>
                        </div>
                    ))}

                    {logs.length < SYSTEM_LOGS.length && (
                        <div className="animate-pulse text-foreground mt-2">_</div>
                    )}
                </div>

                {/* Footer Status */}
                <div className="mt-6 flex justify-between items-center pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", logs.length === SYSTEM_LOGS.length ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500 animate-pulse")} />
                        <span className="text-[10px] tracking-wider text-muted-foreground">
                            {logs.length === SYSTEM_LOGS.length ? "ONLINE" : `BOOTING${dots}`}
                        </span>
                    </div>
                    <span className="text-[10px] opacity-50 text-muted-foreground">VERONICA_CORE</span>
                </div>
            </div>
        </div>
    );
}
