# Project Veronica

**Veronica Command Center** is an AI-powered tactical map interface powered by [Tambo](https://tambo.co) and [Next.js](https://nextjs.org/).

It features real-time integration with NASA FIRMS for wildfire tracking, population statistics, and an interactive map that can be controlled via natural language.

## Features

- **Natural Language Map Control**: Ask Veronica (via Tambo) to zoom to locations, show wildfires, or draw routes.
- **NASA FIRMS Integration**: Real-time satellite data for active wildfires and thermal anomalies.
- **Interactive Tactical Map**:
  - **Auto-Clustering**: Handles large datasets efficiently.
  - **Location Zoom**: "Zoom to New York", "Show me India", etc.
  - **Route Drawing**: "Show route from London to Paris".
  - **Auto-Fly**: Map automatically focuses on new data points.
- **Crisis Monitoring**: Real-time tracking of crisis events with severity indicators.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Ensure you have your `.env.local` set up with:
   ```
   NEXT_PUBLIC_TAMBO_API_KEY=your_key_here
   NEXT_PUBLIC_NASA_FIRMS_MAP_KEY=your_key_here
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

- `src/components/veronica-content.tsx`: Main entry point and layout.
- `src/components/tactical-map.tsx`: The core map component (Interactive & generative).
- `src/services/nasa-firms.ts`: NASA API integration service.
- `src/lib/tambo.ts`: Tambo configuration, tools, and component registration.

## Usage Examples

Try asking Veronica:
- *"Show me all active wildfires globally"*
- *"Zoom in on California and show local fires"*
- *"Give me an overview of crisis events in Australia"*
- *"Draw a route from Mumbai to Delhi"*
- *"Show population statistics for Japan"*

## Technologies

- **Tambo AI**: Generative UI and agentic capabilities.
- **MapLibre GL / MapCN**: data-viz focused map components.
- **Next.js 14**: React framework.
- **Tailwind CSS**: Styling.
