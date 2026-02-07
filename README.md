# Veronica - Crisis Management Application

[![Tambo AI](https://img.shields.io/badge/Powered%20by-Tambo%20AI-blue)](https://docs.tambo.co/)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js%2015-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-blue)](https://www.typescriptlang.org/)

---

## Demo

[![Veronica Demo](https://img.youtube.com/vi/wxHcYOVRByE/0.jpg)](https://youtu.be/wxHcYOVRByE)

---

## About Veronica

Veronica is a tactical crisis management platform built with **Tambo AI** for monitoring natural disasters, planning evacuations, and coordinating emergency response with AI-powered assistance. The application demonstrates how Tambo's generative UI architecture enables intelligent, real-time crisis analysis through natural language interactions.

At its core, Veronica leverages Tambo's component registration and tool systems to dynamically render crisis data on an interactive 3D globe. Users can communicate with the AI assistant through a chat interface, asking complex questions about disaster situations, evacuation routes, and emergency resources. The AI interprets these requests, invokes appropriate tools to fetch data from external APIs (NASA FIRMS, OpenStreetMap, news services), and generates actionable visualizations on the map.

This project serves as a comprehensive example of Tambo AI's capabilities, showcasing real-time streaming responses, dynamic component rendering, thread-based conversation management, and seamless integration of external data sources into an immersive map-based interface.

## Tambo AI Architecture

Tambo provides the foundational architecture for Veronica's AI-driven user experience. Understanding Tambo's core concepts is essential for working with and extending this application.

### Component Registration System

Veronica registers its UI components with Tambo's registry system, enabling the AI to dynamically render visualizations based on user requests. Components are defined with Zod schemas that specify their props, allowing Tambo to validate and inject data at runtime.

The registry in `src/lib/tambo.ts` maps component names to their implementations:

```typescript
components: [
  {
    name: "CrisisMap",
    description: "Interactive 3D globe displaying crisis markers and safe spots",
    component: CrisisMap,
    propsSchema: CrisisMapSchema,
  },
  {
    name: "NewsPanel",
    description: "Display crisis-related news articles",
    component: NewsPanel,
    propsSchema: NewsPanelSchema,
  },
]
```

When the AI determines that a visualization is needed, it returns structured data conforming to the component's schema. Tambo automatically renders the appropriate component with the provided props, enabling fluid transitions between chat and visual outputs.

### Tool System

External functionality is exposed to the AI through Tambo's tool system. Each tool is defined with input and output schemas using Zod, allowing the AI to understand when and how to invoke external services.

Tools in Veronica include:

- **`searchCrises`**: Queries the NASA FIRMS API for active wildfires, earthquakes, floods, storms, and volcanic activity
- **`findSafeSpots`**: Retrieves nearby emergency resources (hospitals, shelters, schools, airports, parks) from OpenStreetMap
- **`searchNews`**: Fetches real-time crisis news from Tavily and GNews APIs
- **`getLocationInfo`**: Performs reverse geocoding to identify locations by coordinates

The AI intelligently routes user requests to appropriate tools, combines results, and generates responses augmented with dynamic visualizations.

### Streaming Architecture

Veronica utilizes Tambo's streaming capabilities for real-time feedback during AI processing. The `useTamboStreaming` hook provides progressive updates as the AI generates responses, displaying partial content as it becomes available. This creates a responsive user experience even for complex queries that require multiple API calls.

### Provider Pattern

The `TamboProvider` wraps the application in `src/app/layout.tsx`, initializing the AI context with the configured API key, registered components, and available tools. This enables any component within the tree to access Tambo's hooks for thread management, registry operations, and streaming.

---

## Features

- **Interactive Crisis Map**: 3D globe view with real-time crisis markers (wildfires, earthquakes, floods, storms, volcanoes)
- **AI-Powered Assistance**: Tambo AI integration for intelligent crisis analysis and response planning
- **Evacuation Planning**: Automatically identifies nearest safe spots (hospitals, shelters, schools, airports, parks)
- **News Aggregation**: Real-time crisis news from multiple sources
- **Mobile Responsive**: Full-featured mobile drawer for chat-based interaction
- **Persistent Storage**: LocalStorage-based persistence for markers and conversation history

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.5.12 (App Router) |
| Language | TypeScript 5.7 |
| UI Library | React 19.1.0 |
| AI Integration | Tambo AI SDK |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Maps | MapLibre GL |
| Icons | Lucide React |

---

## API Integrations

| API | Purpose | Data |
|-----|---------|------|
| **NASA FIRMS** | Fire detection data | Active wildfires with intensity, confidence, satellite source |
| **Overpass OSM** | Safe spot locations | Hospitals, shelters, schools, airports, parks via OpenStreetMap |
| **Tavily** | Crisis news search | Real-time news articles about disasters |
| **GNews** | News aggregation | Alternative news source for crisis events |
| **Nominatim** | Geocoding | Reverse geocoding for location names |

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interaction                            │
│                         (Chat / Voice)                              │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Tambo AI Engine                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  Thread Manager │    │  Tool Dispatch │    │ Component       │  │
│  │  (Conversation) │    │  (External APIs)│    │ Orchestrator    │  │
│  └────────┬────────┘    └───────┬─────────┘    └────────┬────────┘  │
│           │                     │                         │           │
│           └────────────────────┼─────────────────────────┘           │
│                                │                                      │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌─────────────────────┐   ┌─────────────────────┐
        │   External Services │   │   Local Storage     │
        │  (NASA, OSM, News)  │   │  (Markers, History) │
        └─────────────────────┘   └─────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Dynamic Component Rendering                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐       │
│  │  CrisisMap   │  │  NewsPanel   │  │  EvacuationRoutes    │       │
│  └──────────────┘  └──────────────┘  └──────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Interactive 3D Globe Display                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── app/                           # Next.js App Router pages
│   ├── chat/                      # Chat interface route
│   │   └── page.tsx               # Chat page component
│   ├── layout.tsx                 # Root layout with TamboProvider
│   └── page.tsx                   # Main entry point
├── components/
│   ├── tactical-map.tsx           # Core MapLibre globe with crisis markers
│   ├── veronica-content.tsx       # Main layout with MapChatProvider
│   ├── news-dialog.tsx            # News article display modal
│   ├── ui/                         # Reusable UI components
│   │   ├── drawer.tsx             # Mobile chat drawer
│   │   └── ...
│   └── tambo/                      # Tambo-specific components
│       ├── graph.tsx              # Data visualization with Recharts
│       ├── message*.tsx           # Chat message components
│       └── thread*.tsx            # Thread management UI
├── lib/
│   ├── tambo.ts                   # CENTRAL: Component & tool registration
│   ├── markers.ts                 # CrisisMarker schema & types
│   └── utils.ts                   # Utility functions
├── services/
│   ├── nasa-firms.ts              # NASA FIRMS API integration
│   ├── evacuation-service.ts      # Safe spot finding logic
│   ├── gnews.ts                   # GNews API integration
│   └── population-stats.ts        # Demo data service
└── hooks/
    └── thread-hooks.ts            # Custom thread management hooks
```

---

## Tambo Usage Guide

### Registering New Components

To add a new visualization component for AI rendering:

1. Create the component in `src/components/tambo/`
2. Define a Zod schema for props validation
3. Register in `src/lib/tambo.ts` components array

```typescript
import { z } from "zod"

export const MyComponentSchema = z.object({
  title: z.string(),
  data: z.array(z.object({ label: z.string(), value: z.number() }))
})

export function MyComponent({ title, data }: z.infer<typeof MyComponentSchema>) {
  // Component implementation
}
```

### Registering New Tools

To expose new functionality to the AI:

1. Implement the tool function in `src/services/`
2. Define input/output Zod schemas
3. Register in `src/lib/tambo.ts` tools array

```typescript
import { z } from "zod"

export const analyzeCrisisInput = z.object({
  location: z.string(),
  crisisType: z.enum(["fire", "flood", "earthquake"])
})

export const analyzeCrisisOutput = z.object({
  severity: z.number(),
  recommendations: z.array(z.string())
})

export async function analyzeCrisis(input: z.infer<typeof analyzeCrisisInput>) {
  // Tool implementation
  return { severity: 8, recommendations: [...] }
}
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys (optional - mock data available):
  - `NEXT_PUBLIC_NASA_FIRMS_MAP_KEY` - NASA FIRMS API key
  - `TAVILY_API_KEY` - Tavily search API key
  - `GNEWS_API_KEY` - GNews API key

### Installation

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
npm run start
```

---

## Usage Examples

Ask Veronica:

- *"Show me active wildfires globally"*
- *"Plan evacuation for the fire in California"*
- *"What's happening in Japan right now?"*
- *"Show me hospitals near the earthquake"*

---

## Tambo AI Resources

- **Documentation**: https://docs.tambo.co/llms.txt
- **CLI**: Run `npx tambo` to add UI components or upgrade
- **GitHub**: https://github.com/anomalyco/opencode/issues

---

## ⚠️ Disclaimer

**This is a crisis management demonstration application.**

- May contain bugs or display inaccurate information
- **DO NOT** use for real emergency decisions without professional validation
- Always verify crisis information through official government channels
- API data may be delayed or incomplete
- Safe spot recommendations should be confirmed with local authorities

**For production deployment:** Conduct thorough testing, implement proper authentication, and ensure compliance with emergency management regulations.

---

## License

**Commercial License**
- Made by: **HoneyPattans**
- All rights reserved

---

## Issues

Encountered a problem in the deployed version? Please report issues at:
https://github.com/HoneyPaptan/veronica/issues

Include:
- Steps to reproduce
- Browser/environment details
- Console error messages
- Screenshot if applicable
