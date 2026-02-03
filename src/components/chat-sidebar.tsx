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
import {
    MessageSuggestions,
    MessageSuggestionsList,
    MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";

/**
 * ChatSidebar component for Project Veronica
 * 
 * A streamlined chat interface designed for the Cerebro command center sidebar.
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
        <ThreadContainer disableSidebarSpacing className="h-full">
            <ScrollableMessageContainer className="p-4">
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
                <MessageInput>
                    <MessageInputTextarea placeholder="Command the map..." />
                    <MessageInputToolbar>
                        <MessageInputSubmitButton />
                    </MessageInputToolbar>
                    <MessageInputError />
                </MessageInput>
            </div>

            {/* Message suggestions */}
            <MessageSuggestions initialSuggestions={defaultSuggestions}>
                <MessageSuggestionsList />
            </MessageSuggestions>
        </ThreadContainer>
    );
}
