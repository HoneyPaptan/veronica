# Veronica - Crisis Management Application

A tactical crisis management platform for monitoring natural disasters, planning evacuations, and coordinating emergency response with AI-powered assistance.

## Overview

Veronica provides real-time crisis monitoring on an interactive 3D globe map, identifying safe evacuation routes and nearest emergency resources during natural disasters.

## Features

- **Interactive Crisis Map**: 3D globe view with real-time crisis markers (wildfires, earthquakes, floods, storms, volcanoes)
- **AI-Powered Assistance**: Tambo AI integration for intelligent crisis analysis and response planning
- **Evacuation Planning**: Automatically identifies nearest safe spots (hospitals, shelters, schools, airports, parks)
- **News Aggregation**: Real-time crisis news from multiple sources
- **Mobile Responsive**: Full-featured mobile drawer for chat-based interaction
- **Persistent Storage**: LocalStorage-based persistence for markers and conversation history

## Technologies

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

## API Integrations

| API | Purpose | Data |
|-----|---------|------|
| **NASA FIRMS** | Fire detection data | Active wildfires with intensity, confidence, satellite source |
| **Overpass OSM** | Safe spot locations | Hospitals, shelters, schools, airports, parks via OpenStreetMap |
| **Tavily** | Crisis news search | Real-time news articles about disasters |
| **GNews** | News aggregation | Alternative news source for crisis events |
| **Nominatim** | Geocoding | Reverse geocoding for location names |

## Data Flow

```
User Request
     ↓
Tambo AI → Tools → External APIs
     ↓                    ↓
  Response ←──────────────┘
     ↓
TacticalMap ← Accumulator ← LocalStorage
     ↓
Interactive Map Display
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── chat/              # Chat interface route
│   └── layout.tsx         # Root layout with TamboProvider
├── components/
│   ├── tactical-map.tsx    # Core map component with marker rendering
│   ├── veronica-content.tsx # Main layout with MapChatProvider
│   ├── news-dialog.tsx     # News article display modal
│   └── ui/drawer.tsx       # Mobile chat drawer
├── lib/
│   ├── tambo.ts            # Tambo configuration & tools
│   ├── markers.ts          # CrisisMarker schema & types
│   └── utils.ts            # Utility functions
├── services/
│   ├── nasa-firms.ts       # NASA FIRMS API integration
│   ├── evacuation-service.ts # Safe spot finding logic
│   └── gnews.ts            # GNews API integration
└── hooks/
    └── thread-hooks.ts     # Thread management hooks
```

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

## Usage Examples

Ask Veronica:
- *"Show me active wildfires globally"*
- *"Plan evacuation for the fire in California"*
- *"What's happening in Japan right now?"*
- *"Show me hospitals near the earthquake"*

## ⚠️ Disclaimer

**This is a crisis management demonstration application.**

- May contain bugs or display inaccurate information
- **DO NOT** use for real emergency decisions without professional validation
- Always verify crisis information through official government channels
- API data may be delayed or incomplete
- Safe spot recommendations should be confirmed with local authorities

**For production deployment:** Conduct thorough testing, implement proper authentication, and ensure compliance with emergency management regulations.

## License

**Commercial License**
- Made by: **HoneyPattans**
- All rights reserved

## Issues

Encountered a problem in the deployed version? Please report issues at:
https://github.com/anomalyco/opencode/issues

Include:
- Steps to reproduce
- Browser/environment details
- Console error messages
- Screenshot if applicable
