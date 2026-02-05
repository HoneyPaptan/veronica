"use client";

import { ChatSidebar } from "@/components/chat-sidebar";
import { InteractableTacticalMap } from "@/components/tactical-map";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TamboProvider } from "@tambo-ai/react";
import { useEffect } from "react";

/**
 * VeronicaContent - Main content component with TamboProvider
 * 
 * This is in a separate file to allow dynamic import with ssr: false,
 * which prevents react-media-recorder from being evaluated during SSR.
 */
export function VeronicaContent() {
    // Load MCP server configurations
    const mcpServers = useMcpServers();

    // Suppress harmless MCP -32601 "Method not found" console errors
    // These occur when MCP servers don't support certain methods but are not fatal
    useEffect(() => {
        const originalError = console.error;
        console.error = (...args) => {
            // Filter out MCP -32601 errors (Method not found)
            const message = args[0]?.toString() || '';
            if (message.includes('-32601') || message.includes('Method not found')) {
                // Silently ignore these harmless MCP protocol errors
                return;
            }
            originalError.apply(console, args);
        };
        return () => {
            console.error = originalError;
        };
    }, []);

    return (
        <TamboProvider
            apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
            components={components}
            tools={tools}
            tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
            mcpServers={mcpServers}
        >
            <div className="flex h-screen w-full overflow-hidden bg-background">
                {/* Left Stage: Tactical Map (70% / Flex-1) */}
                <div className="flex-1 relative h-full bg-zinc-950">
                    {/* InteractableTacticalMap - Tambo can update this map directly */}
                    <InteractableTacticalMap
                        markers={[]}
                        centerLongitude={0}
                        centerLatitude={20}
                        zoomLevel={2}
                    />
                </div>

                {/* Right Sidebar: Chat Interface (30%) */}
                <aside className="w-[30%] min-w-[320px] h-full border-l border-border bg-sidebar flex flex-col font-mono text-sm bg-dot-pattern relative">
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] pointer-events-none" />
                    <div className="p-4 border-b border-border relative z-10 flex justify-between items-center bg-background/80 backdrop-blur-sm">
                        <div>
                            <h1 className="font-bold tracking-tight text-xs text-muted-foreground uppercase mb-1">Project Veronica</h1>
                            <div className="text-sm font-semibold tracking-wider text-foreground flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                [ COMMAND_CENTER ]
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] text-muted-foreground/50 border border-border px-1 py-0.5 rounded">
                                SYS.ONLINE
                            </div>
                            <ThemeToggle />
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative z-10">
                        <ChatSidebar />
                    </div>
                </aside>
            </div>
        </TamboProvider>
    );
}

