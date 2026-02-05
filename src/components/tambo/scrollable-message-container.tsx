"use client";

import { GenerationStage, useTambo } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

/**
 * Props for the ScrollableMessageContainer component
 */
export type ScrollableMessageContainerProps =
  React.HTMLAttributes<HTMLDivElement>;

/**
 * A scrollable container for message content with auto-scroll functionality.
 * Used across message thread components for consistent scrolling behavior.
 *
 * @example
 * ```tsx
 * <ScrollableMessageContainer>
 *   <ThreadContent variant="default">
 *     <ThreadContentMessages />
 *   </ThreadContent>
 * </ScrollableMessageContainer>
 * ```
 */
export const ScrollableMessageContainer = React.forwardRef<
  HTMLDivElement,
  ScrollableMessageContainerProps
>(({ className, children, ...props }, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { thread } = useTambo();
  const [shouldAutoscroll, setShouldAutoscroll] = useState(true);
  const lastScrollTopRef = useRef(0);

  // Handle forwarded ref
  React.useImperativeHandle(ref, () => scrollContainerRef.current!, []);

  // Create a dependency that represents all content that should trigger autoscroll
  const messagesContent = useMemo(() => {
    if (!thread.messages) return null;

    return thread.messages.map((message) => ({
      id: message.id,
      content: message.content,
      tool_calls: message.tool_calls,
      component: message.component,
      reasoning: message.reasoning,
      componentState: message.componentState,
    }));
  }, [thread.messages]);

  const generationStage = useMemo(
    () => thread?.generationStage ?? GenerationStage.IDLE,
    [thread?.generationStage],
  );

  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 8; // 8px tolerance for rounding

    // If user scrolled up, disable autoscroll
    if (scrollTop < lastScrollTopRef.current) {
      setShouldAutoscroll(false);
    }
    // If user is at bottom, enable autoscroll
    else if (isAtBottom) {
      setShouldAutoscroll(true);
    }

    lastScrollTopRef.current = scrollTop;
  }, []);

  // Auto-scroll to bottom when messages change or during generation
  useEffect(() => {
    // Always scroll if we're in "stick to bottom" mode
    if (shouldAutoscroll && scrollContainerRef.current) {
      const scroll = () => {
        if (scrollContainerRef.current) {
          // instant scroll if the distance is large to prevent "chasing", smooth otherwise
          const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
          const distance = scrollHeight - scrollTop - clientHeight;

          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: distance > 300 ? "auto" : "smooth",
          });
        }
      };

      // Use requestAnimationFrame for smoother updates during streaming
      requestAnimationFrame(scroll);

      // Double check after a small delay to catch layout shifts (e.g. images loading)
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(scroll);
      });

      return () => cancelAnimationFrame(frameId);
    }
  }, [messagesContent, generationStage, shouldAutoscroll, thread.messages?.length]); // added thread.messages.length dep

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto",
        "[&::-webkit-scrollbar]:w-[6px]",
        "[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30",
        "[&::-webkit-scrollbar:horizontal]:h-[4px]",
        className,
      )}
      data-slot="scrollable-message-container"
      {...props}
    >
      {children}
    </div>
  );
});
ScrollableMessageContainer.displayName = "ScrollableMessageContainer";
