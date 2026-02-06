"use client";

import { cn } from "@/lib/utils";
import { type GenerationStage, useTambo } from "@tambo-ai/react";
import { Loader2Icon } from "lucide-react";
import * as React from "react";

/**
 * Represents the generation stage of a message
 * @property {string} className - Optional className for custom styling
 * @property {boolean} showLabel - Whether to show the label
 */

export interface GenerationStageProps extends React.HTMLAttributes<HTMLDivElement> {
  showLabel?: boolean;
}

export function MessageGenerationStage({
  className,
  showLabel = true,
  ...props
}: GenerationStageProps) {
  const { thread, isIdle } = useTambo();
  const stage = thread?.generationStage;

  // Only render if we have a generation stage
  if (!stage) {
    return null;
  }

  // Map stage names to more user-friendly labels
  const stageLabels: Record<GenerationStage, string> = {
    IDLE: "Idle",
    CHOOSING_COMPONENT: "Choosing component",
    FETCHING_CONTEXT: "Fetching context",
    HYDRATING_COMPONENT: "Preparing component",
    STREAMING_RESPONSE: "Generating response",
    COMPLETE: "Complete",
    ERROR: "Error",
    CANCELLED: "Cancelled",
  };

  const label =
    stageLabels[stage] || stage.charAt(0).toUpperCase() + stage.slice(1);

  if (isIdle) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 py-3 px-4 text-sm text-muted-foreground animate-pulse">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>Thinking...</span>
    </div>
  );
}
