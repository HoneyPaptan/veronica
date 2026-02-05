"use client";

import dynamic from "next/dynamic";
import { AgenticLoading } from "@/components/agentic-loading";

// Dynamically import the content to avoid SSR issues with TamboProvider
// react-media-recorder uses Web Workers which are not available in Node.js
// By importing the entire file dynamically, the @tambo-ai/react import
// is deferred until client-side rendering
const VeronicaContent = dynamic(
  () => import("@/components/veronica-content").then((mod) => mod.VeronicaContent),
  {
    ssr: false,
    loading: () => <AgenticLoading />,
  }
);

/**
 * Home page component for Project Veronica - Veronica Command Center
 */
export default function Home() {
  return <VeronicaContent />;
}
