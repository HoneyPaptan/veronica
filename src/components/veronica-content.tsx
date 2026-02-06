"use client";

import { ChatSidebar } from "@/components/chat-sidebar";
import { InteractableTacticalMap, type SelectedLocation } from "@/components/tactical-map";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TamboProvider, useTambo, useTamboThread } from "@tambo-ai/react";
import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import {
    getPersistedMarkers,
    addMarkersToStorage,
    clearPersistedState,
    hasPersistedData,
    getStorageSize,
    formatStorageSize,
    getPersistedThreadData,
} from "@/lib/local-storage";
import type { CrisisMarker } from "@/lib/markers";
import { Trash2 } from "lucide-react";

/**
 * Context for sending messages from the map to the chat
 */
interface MapChatContextType {
    pendingQuery: string | null;
    setPendingQuery: (query: string | null) => void;
    // Accumulated markers from all searches
    accumulatedMarkers: CrisisMarker[];
    addMarkers: (markers: CrisisMarker[]) => void;
    clearAllData: () => void;
}

export const MapChatContext = createContext<MapChatContextType>({
    pendingQuery: null,
    setPendingQuery: () => { },
    accumulatedMarkers: [],
    addMarkers: () => { },
    clearAllData: () => { },
});

export function useMapChatContext() {
    return useContext(MapChatContext);
}

/**
 * Component that restores the thread from localStorage on mount
 * Must be inside TamboProvider to access useTamboThread
 * 
 * IMPORTANT: Only restores threads that completed successfully.
 * If the last session ended with an error/cancel, starts fresh.
 */
function ThreadRestorer() {
    const { switchCurrentThread, startNewThread, thread } = useTamboThread();
    const hasAttemptedRestore = useRef(false);
    const hasCheckedCurrentThread = useRef(false);

    // First effect: Try to restore the persisted thread
    useEffect(() => {
        if (hasAttemptedRestore.current) return;
        hasAttemptedRestore.current = true;

        const persistedThread = getPersistedThreadData();

        // Check if persisted thread has valid messages (no errors)
        if (persistedThread?.threadId && persistedThread.messages?.length > 0) {
            // Check if any message has an error
            const hasErrorMessage = persistedThread.messages.some((m: any) => m.error);

            if (hasErrorMessage) {
                console.log('Persisted thread has errors, clearing and starting fresh');
                clearPersistedState();
                return;
            }

            console.log('Attempting to restore thread:', persistedThread.threadId);
            try {
                switchCurrentThread(persistedThread.threadId);
            } catch (err) {
                console.log('Could not restore thread (may be expired):', err);
                clearPersistedState();
            }
        }
    }, [switchCurrentThread]);

    // Second effect: Check if the current thread has errors and start fresh if needed
    useEffect(() => {
        if (hasCheckedCurrentThread.current) return;
        if (!thread?.messages || thread.messages.length === 0) return;

        // Check if any message in the current thread has an error
        const hasErrorMessage = thread.messages.some((m: any) => m.error);

        if (hasErrorMessage) {
            hasCheckedCurrentThread.current = true;
            console.log('Current thread has errors, starting new thread');
            clearPersistedState();
            startNewThread();
        }
    }, [thread?.messages, startNewThread]);

    return null;
}

/**
 * Delete Thread Button Component
 */
function DeleteThreadButton({ onDelete }: { onDelete: () => void }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [storageInfo, setStorageInfo] = useState<string>("");

    useEffect(() => {
        // Update storage info periodically
        const updateInfo = () => {
            const size = getStorageSize();
            const hasData = hasPersistedData();
            if (hasData) {
                setStorageInfo(formatStorageSize(size));
            } else {
                setStorageInfo("");
            }
        };
        updateInfo();
        const interval = setInterval(updateInfo, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = () => {
        onDelete();
        setShowConfirm(false);
        setStorageInfo("");
    };

    if (showConfirm) {
        return (
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={handleDelete}
                    className="text-[10px] text-red-400 border border-red-500/50 bg-red-500/10 px-1.5 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                >
                    Confirm
                </button>
                <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/70 border border-border px-1.5 py-0.5 rounded hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-colors"
            title={storageInfo ? `Clear cache (${storageInfo})` : "Clear thread & map data"}
        >
            <Trash2 className="h-3 w-3" />
            {storageInfo && <span className="text-[9px]">{storageInfo}</span>}
        </button>
    );
}

/**
 * VeronicaContent - Main content component with TamboProvider
 * 
 * This is in a separate file to allow dynamic import with ssr: false,
 * which prevents react-media-recorder from being evaluated during SSR.
 */
export function VeronicaContent() {
    // Load MCP server configurations
    const mcpServers = useMcpServers();

    // State for pending query from map selection
    const [pendingQuery, setPendingQuery] = useState<string | null>(null);

    // Accumulated markers state - persisted to local storage
    const [accumulatedMarkers, setAccumulatedMarkers] = useState<CrisisMarker[]>([]);

    // Load persisted markers on mount
    useEffect(() => {
        const persistedMarkers = getPersistedMarkers();
        if (persistedMarkers.length > 0) {
            console.log('Loaded persisted markers:', persistedMarkers.length);
            setAccumulatedMarkers(persistedMarkers);
        }
    }, []);

    // Add new markers to accumulated list
    const addMarkers = useCallback((newMarkers: CrisisMarker[]) => {
        if (!newMarkers || newMarkers.length === 0) return;

        const updatedMarkers = addMarkersToStorage(newMarkers);
        setAccumulatedMarkers(updatedMarkers);
        console.log('Added markers, total:', updatedMarkers.length);
    }, []);

    // Clear all persisted data
    const clearAllData = useCallback(() => {
        clearPersistedState();
        setAccumulatedMarkers([]);
        // Reload the page to reset Tambo state
        window.location.reload();
    }, []);

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

    // Handler for location selection from the map
    const handleLocationSelect = useCallback((location: SelectedLocation, query: string) => {
        console.log('Location selected:', location, 'Query:', query);
        setPendingQuery(query);
    }, []);

    const contextValue = {
        pendingQuery,
        setPendingQuery,
        accumulatedMarkers,
        addMarkers,
        clearAllData,
    };

    return (
        <TamboProvider
            apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
            components={components}
            tools={tools}
            tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
            mcpServers={mcpServers}
        >
            {/* Restore thread from localStorage on mount */}
            <ThreadRestorer />
            <MapChatContext.Provider value={contextValue}>
                <div className="flex h-screen w-full overflow-hidden bg-background">
                    {/* Left Stage: Tactical Map (70% / Flex-1) */}
                    <div className="flex-1 relative h-full bg-zinc-950">
                        {/* InteractableTacticalMap - Tambo can update this map directly */}
                        <InteractableTacticalMap
                            centerLongitude={0}
                            centerLatitude={20}
                            zoomLevel={2}
                            onLocationSelect={handleLocationSelect}
                        />
                    </div>

                    {/* Right Sidebar: Chat Interface (35%) */}
                    <aside className="w-[35%] min-w-[380px] max-w-[800px] h-full border-l border-border bg-sidebar flex flex-col relative shadow-xl z-20">
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-border flex justify-between items-center bg-sidebar shrink-0">
                                <span className="font-semibold text-sm">Veronica</span>
                                <div className="flex items-center gap-2">
                                    <DeleteThreadButton onDelete={clearAllData} />
                                    <ThemeToggle />
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 relative">
                                <ChatSidebar />
                            </div>
                        </div>
                    </aside>
                </div>
            </MapChatContext.Provider>
        </TamboProvider>
    );
}
