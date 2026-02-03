"use client";

import { ChatSidebar } from "@/components/chat-sidebar";
import { TacticalMap } from "@/components/tactical-map";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";

/**
 * CerebroContent - Main content component with TamboProvider
 * 
 * This is in a separate file to allow dynamic import with ssr: false,
 * which prevents react-media-recorder from being evaluated during SSR.
 */
export function CerebroContent() {
    // Load MCP server configurations
    const mcpServers = useMcpServers();

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
                <div className="flex-1 relative h-full">
                    {/* Default map - Tambo will render TacticalMap components in the chat when requested */}
                    <TacticalMap
                        markers={[]}
                        centerLongitude={0}
                        centerLatitude={20}
                        zoomLevel={2}
                    />
                </div>

                {/* Right Sidebar: Chat Interface (30%) */}
                <aside className="w-[30%] min-w-[320px] h-full border-l border-border bg-sidebar flex flex-col">
                    <div className="p-4 border-b border-sidebar-border">
                        <h1 className="font-bold text-lg">Project Veronica</h1>
                        <p className="text-sm text-muted-foreground">
                            Cerebro Command Center
                        </p>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        <ChatSidebar />
                    </div>
                </aside>
            </div>
        </TamboProvider>
    );
}
