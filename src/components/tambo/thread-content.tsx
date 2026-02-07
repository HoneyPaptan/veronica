"use client";

import {
  Message,
  MessageContent,
  MessageImages,
  MessageRenderedComponentArea,
  ReasoningInfo,
  ToolcallInfo,
  type messageVariants,
} from "@/components/tambo/message";
import { AsciiLoader } from "@/components/ui/ascii-loader";
import { cn } from "@/lib/utils";
import { type TamboThreadMessage, useTambo, useTamboThreadInput } from "@tambo-ai/react";
import { type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * @typedef ThreadContentContextValue
 * @property {Array} messages - Array of message objects in the thread
 * @property {boolean} isGenerating - Whether a response is being generated
 * @property {string|undefined} generationStage - Current generation stage
 * @property {VariantProps<typeof messageVariants>["variant"]} [variant] - Optional styling variant for messages
 */
interface ThreadContentContextValue {
  messages: TamboThreadMessage[];
  isGenerating: boolean;
  generationStage?: string;
  variant?: VariantProps<typeof messageVariants>["variant"];
}

/**
 * React Context for sharing thread data among sub-components.
 * @internal
 */
const ThreadContentContext =
  React.createContext<ThreadContentContextValue | null>(null);

/**
 * Hook to access the thread content context.
 * @returns {ThreadContentContextValue} The thread content context value.
 * @throws {Error} If used outside of ThreadContent.
 * @internal
 */
const useThreadContentContext = () => {
  const context = React.useContext(ThreadContentContext);
  if (!context) {
    throw new Error(
      "ThreadContent sub-components must be used within a ThreadContent",
    );
  }
  return context;
};

/**
 * Props for the ThreadContent component.
 * Extends standard HTMLDivElement attributes.
 */
export interface ThreadContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional styling variant for the message container */
  variant?: VariantProps<typeof messageVariants>["variant"];
  /** The child elements to render within the container. */
  children?: React.ReactNode;
}

/**
 * The root container for thread content.
 * It establishes the context for its children using data from the Tambo hook.
 * @component ThreadContent
 * @example
 * ```tsx
 * <ThreadContent variant="solid">
 *   <ThreadContent.Messages />
 * </ThreadContent>
 * ```
 */
const ThreadContent = React.forwardRef<HTMLDivElement, ThreadContentProps>(
  ({ children, className, variant, ...props }, ref) => {
    const { thread, generationStage, isIdle } = useTambo();
    const isGenerating = !isIdle;

    const contextValue = React.useMemo(
      () => ({
        messages: thread?.messages ?? [],
        isGenerating,
        generationStage,
        variant,
      }),
      [thread?.messages, isGenerating, generationStage, variant],
    );

    return (
      <ThreadContentContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn("w-full", className)}
          data-slot="thread-content-container"
          {...props}
        >
          {children}
        </div>
      </ThreadContentContext.Provider>
    );
  },
);
ThreadContent.displayName = "ThreadContent";

/**
 * Props for the ThreadContentMessages component.
 * Extends standard HTMLDivElement attributes.
 */
export type ThreadContentMessagesProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Renders the list of messages in the thread.
 * Automatically connects to the context to display messages.
 * @component ThreadContent.Messages
 * @example
 * ```tsx
 * <ThreadContent>
 *   <ThreadContent.Messages />
 * </ThreadContent>
 * ```
 */
/**
 * Component to handle error display with retry functionality
 */
function MessageErrorDisplay({ 
  message, 
  lastUserMessage 
}: { 
  message: TamboThreadMessage;
  lastUserMessage?: TamboThreadMessage;
}) {
  const { setValue, submit } = useTamboThreadInput();
  const [isRetrying, setIsRetrying] = React.useState(false);

  // Check if message has an error
  const hasError = !!message.error;
  const errorMessage = typeof message.error === 'string' 
    ? message.error 
    : (message.error as any)?.message || "An error occurred";

  const handleRetry = React.useCallback(async () => {
    if (!lastUserMessage) return;
    
    setIsRetrying(true);
    try {
      // Get the last user message content
      const content = typeof lastUserMessage.content === 'string' 
        ? lastUserMessage.content 
        : Array.isArray(lastUserMessage.content)
          ? lastUserMessage.content.find(c => c?.type === 'text')?.text || ''
          : '';
      
      if (content) {
        setValue(content);
        // Small delay to ensure value is set
        await new Promise(resolve => setTimeout(resolve, 50));
        await submit({ streamResponse: true });
      }
    } catch (error) {
    } finally {
      setIsRetrying(false);
    }
  }, [lastUserMessage, setValue, submit]);

  if (!hasError) return null;

  return (
    <div className="px-5 py-3">
      <AsciiLoader
        isError={true}
        errorMessage={errorMessage}
        onRetry={handleRetry}
      />
      {isRetrying && (
        <div className="mt-2 text-xs text-muted-foreground">
          Retrying...
        </div>
      )}
    </div>
  );
}

const ThreadContentMessages = React.forwardRef<
  HTMLDivElement,
  ThreadContentMessagesProps
>(({ className, ...props }, ref) => {
  const { messages, isGenerating, variant } = useThreadContentContext();

  const filteredMessages = messages.filter(
    (message) => message.role !== "system" && !message.parentMessageId,
  );

  // Find the last user message for retry functionality
  const lastUserMessage = React.useMemo(() => {
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      if (filteredMessages[i].role === 'user') {
        return filteredMessages[i];
      }
    }
    return undefined;
  }, [filteredMessages]);

  // Check if any message has an error (including cancelled)
  const hasAnyError = filteredMessages.some(m => !!m.error);

  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2", className)}
      data-slot="thread-content-messages"
      {...props}
    >
      {filteredMessages.map((message, index) => {
        const hasError = !!message.error;
        const isCancelled = hasError && (
          typeof message.error === 'string' 
            ? message.error.toLowerCase().includes('cancel')
            : (message.error as any)?.message?.toLowerCase().includes('cancel')
        );
        const isLastMessage = index === filteredMessages.length - 1;
        
        // Don't show loading if there's an error or if cancelled
        const shouldShowLoading = isGenerating && isLastMessage && !hasError && !hasAnyError;
        
        return (
          <div
            key={
              message.id ??
              `${message.role}-${message.createdAt ?? `${index}`}-${message.content?.toString().substring(0, 10)}`
            }
            data-slot="thread-content-item"
          >
            <Message
              role={message.role === "assistant" ? "assistant" : "user"}
              message={message}
              variant={variant}
              isLoading={shouldShowLoading}
              className={cn(
                "flex w-full",
                message.role === "assistant" ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "flex flex-col",
                  message.role === "assistant" ? "w-full" : "max-w-3xl",
                )}
              >
                <ReasoningInfo />
                <MessageImages />
                <MessageContent
                  className={
                    message.role === "assistant"
                      ? "text-foreground/90 font-sans"
                      : "glass text-foreground font-sans shadow-none border-0 bg-secondary/80 backdrop-blur-md"
                  }
                />
                <ToolcallInfo />
                {/* Show error with retry button if message has error (not for cancelled - those get cleared on reload) */}
                {hasError && !isCancelled && (
                  <MessageErrorDisplay 
                    message={message} 
                    lastUserMessage={lastUserMessage}
                  />
                )}
                <MessageRenderedComponentArea className="w-full" />
              </div>
            </Message>
          </div>
        );
      })}
    </div>
  );
});
ThreadContentMessages.displayName = "ThreadContent.Messages";

export { ThreadContent, ThreadContentMessages };
