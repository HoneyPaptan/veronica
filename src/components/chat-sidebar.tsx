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
import { useTamboThreadInput } from "@tambo-ai/react";
import {
    MessageSuggestions,
    MessageSuggestionsList,
    MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { useMapChatContext } from "@/components/veronica-content";
import { useEffect } from "react";

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
                    console.error('Failed to submit map query:', error);
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
        <ThreadContainer disableSidebarSpacing className="h-full bg-background/50 backdrop-blur-sm">
            <ScrollableMessageContainer className="p-4 scroll-smooth">
                <ThreadContent>
                    <ThreadContentMessages />
                </ThreadContent>
            </ScrollableMessageContainer>

            {/* Message suggestions status */}
            <MessageSuggestions>
                <MessageSuggestionsStatus />
            </MessageSuggestions>

            {/* Message input */}
            <div className="px-4 pb-4">
                <div className="relative border border-border bg-muted/20 backdrop-blur-sm p-1">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-foreground/20" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-foreground/20" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-foreground/20" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-foreground/20" />

                    <MessageInput variant="bordered" className="font-mono text-sm [&_textarea]:min-h-[2.5rem] [&_textarea]:bg-transparent border-0 ring-0 shadow-none">
                        <div className="flex items-center px-2 py-1 border-b border-border mb-1 text-[10px] text-muted-foreground/50 select-none">
                            <span>USER_INPUT //</span>
                        </div>
                        <MessageInputTextarea
                            placeholder="ENTER_COMMAND..."
                            className="bg-transparent border-0 focus-visible:ring-0 px-2 py-1 placeholder:text-muted-foreground/30 font-mono text-sm tracking-tight text-foreground"
                        />
                        <MessageInputToolbar className="px-2 pb-1 opacity-50 hover:opacity-100 transition-opacity">
                            <MessageInputSubmitButton />
                        </MessageInputToolbar>
                        <MessageInputError />
                        {/* Handler for map queries - must be inside MessageInput context */}
                        <MapQueryHandler />
                    </MessageInput>
                </div>
            </div>

            {/* Message suggestions */}
            <MessageSuggestions initialSuggestions={defaultSuggestions}>
                <MessageSuggestionsList />
            </MessageSuggestions>
        </ThreadContainer>
    );
}
