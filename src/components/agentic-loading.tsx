"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function AgenticLoading() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-sm">
            <div className="relative flex flex-col items-center gap-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                <p className="text-muted-foreground animate-pulse">Initializing Veronica...</p>
            </div>
        </div>
    );
}
