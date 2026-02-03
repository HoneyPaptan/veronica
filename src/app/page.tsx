"use client";

import dynamic from "next/dynamic";

// Dynamically import the content to avoid SSR issues with TamboProvider
// react-media-recorder uses Web Workers which are not available in Node.js
// By importing the entire file dynamically, the @tambo-ai/react import
// is deferred until client-side rendering
const VeronicaContent = dynamic(
  () => import("@/components/veronica-content").then((mod) => mod.VeronicaContent),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-1">
            <span className="size-2 rounded-full bg-muted-foreground/60 animate-pulse" />
            <span className="size-2 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
            <span className="size-2 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-muted-foreground">Loading Veronica...</p>
        </div>
      </div>
    ),
  }
);

/**
 * Home page component for Project Veronica - Veronica Command Center
 */
export default function Home() {
  return <VeronicaContent />;
}
