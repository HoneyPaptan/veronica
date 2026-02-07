"use client";

import {
    MessageInput,
    MessageInputError,
    MessageInputSubmitButton,
    MessageInputTextarea,
    MessageInputToolbar,
} from "@/components/tambo/message-input";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { ThreadContainer } from "@/components/tambo/thread-container";
import {
    ThreadContent,
    ThreadContentMessages,
} from "@/components/tambo/thread-content";
import type { Suggestion } from "@tambo-ai/react";
import { useTamboThreadInput, useTambo } from "@tambo-ai/react";
import {
    MessageSuggestions,
    MessageSuggestionsList,
    MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { useMapChatContext } from "@/components/veronica-content";
import { useEffect, useRef } from "react";
import { saveThreadData } from "@/lib/local-storage";
import { cn } from "@/lib/utils";

/**
 * Component that persists thread messages to localStorage
 * Only saves complete, non-error messages
 */
function ThreadPersistence() {
    const { thread, isIdle } = useTambo();
    const lastSavedRef = useRef<string>("");

    useEffect(() => {
        // Only save when idle (not generating) to avoid saving incomplete states
        if (!isIdle) return;
        if (!thread?.messages || thread.messages.length === 0) return;

        // Filter out messages with errors or that are incomplete
        const validMessages = thread.messages.filter(m => {
            // Skip messages with errors
            if (m.error) return false;
            // Skip system messages
            if (m.role === 'system') return false;
            // Keep user messages and complete assistant messages
            return true;
        });

        // Don't save if the last message has an error (cancelled/failed state)
        const lastMessage = thread.messages[thread.messages.length - 1];
        if (lastMessage?.error) {
            return;
        }

        // Create a signature to detect if messages actually changed
        const messagesSignature = JSON.stringify(
            validMessages.map(m => ({ id: m.id, role: m.role }))
        );

        if (messagesSignature !== lastSavedRef.current && validMessages.length > 0) {
            lastSavedRef.current = messagesSignature;

            saveThreadData(thread.id, validMessages);
        }
    }, [thread?.messages, thread?.id, isIdle]);

    return null;
}

/**
 * Component that handles auto-submitting queries from the map
 */
function MapQueryHandler() {
    const { pendingQuery, setPendingQuery } = useMapChatContext();
    const { setValue, submit } = useTamboThreadInput();

    useEffect(() => {
        if (pendingQuery) {
            // Set the value in the input
            setValue(pendingQuery);

            // Submit after a short delay to ensure the value is set
            const timer = setTimeout(async () => {
                try {
                    await submit({ streamResponse: true });
                } catch (error) {
                }
                // Clear the pending query
                setPendingQuery(null);
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [pendingQuery, setValue, submit, setPendingQuery]);

    return null;
}

/**
 * ChatSidebar component for Project Veronica
 * 
 * A streamlined chat interface designed for the Veronica command center sidebar.
 * Based on the Tambo MessageThreadFull pattern but optimized for sidebar use.
 */
export function ChatSidebar() {
    const defaultSuggestions: Suggestion[] = [
        {
            id: "suggestion-1",
            title: "Show wildfires",
            detailedSuggestion: "Show me all active wildfires on the map",
            messageId: "wildfire-query",
        },
        {
            id: "suggestion-2",
            title: "Crisis overview",
            detailedSuggestion: "Give me an overview of current global crisis events",
            messageId: "overview-query",
        },
        {
            id: "suggestion-3",
            title: "Zoom to region",
            detailedSuggestion: "Zoom the map to show North America",
            messageId: "zoom-query",
        },
    ];

    return (
        <ThreadContainer disableSidebarSpacing className="h-full bg-background flex flex-col">
            {/* Persist thread messages to localStorage */}
            <ThreadPersistence />

            <ScrollableMessageContainer className="flex-1 p-4 scroll-smooth">
                <ThreadContent>
                    <ThreadContentMessages />
                </ThreadContent>
            </ScrollableMessageContainer>

            {/* Message suggestions status */}
            <MessageSuggestions>
                <MessageSuggestionsStatus />
            </MessageSuggestions>

            {/* Message input */}
            <div className="p-4 pt-2">
                <div className="relative rounded-xl border border-input bg-card shadow-sm hover:shadow-md transition-shadow">
                    <MessageInput variant="default" className="text-sm border-0 ring-0 shadow-none bg-transparent">
                        <MessageInputTextarea
                            placeholder="Ask Veronica..."
                            className="bg-transparent border-0 focus-visible:ring-0 px-4 py-3 placeholder:text-muted-foreground min-h-[50px] resize-none"
                        />
                        <MessageInputToolbar className="px-2 pb-2 flex justify-between items-center">
                            <div className="flex-1" /> {/* Spacer */}
                            <MessageInputSubmitButton className="w-8 h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors" />
                        </MessageInputToolbar>
                        <MessageInputError />
                        {/* Handler for map queries - must be inside MessageInput context */}
                        <MapQueryHandler />
                    </MessageInput>
                </div>
                <div className="mt-2 text-center text-[10px] text-muted-foreground/60">
                    Veronica AI can make mistakes. Verify critical info.
                </div>
            </div>

            {/* Message suggestions */}
            <div className="px-4 pb-4">
                <MessageSuggestions initialSuggestions={defaultSuggestions}>
                    <MessageSuggestionsList className="flex gap-2 overflow-x-auto pb-2" />
                </MessageSuggestions>
            </div>
        </ThreadContainer>
    );
}
