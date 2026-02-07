/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Graph, graphSchema } from "@/components/tambo/graph";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import { NewsCard, newsCardSchema } from "@/components/tambo/news-card";
// EvacuationTable removed - now using styled map markers instead
import { TamboTool, TamboComponent } from "@tambo-ai/react";
import { z } from "zod";

// Re-export tools from dedicated server-safe file
export { tools } from "@/lib/tambo-tools";

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  // NOTE: TacticalMap is NOT in this array because it's registered as an INTERACTABLE
  // via withInteractable() in tactical-map.tsx. This means Tambo will UPDATE the existing
  // map on the left side of the screen instead of rendering a new map in the chat.
  // The InteractableTacticalMap component handles this automatically.
  {
    name: "Graph",
    description: `A data visualization component that renders bar, line, and pie charts using Recharts.

USE THIS WHEN: User asks to visualize data, show trends, compare statistics, or display charts/graphs.

DATA SOURCES (in priority order):
1. LOCAL TOOLS: Use getActiveFires for wildfires, countryPopulation/globalPopulation for population data
2. TAVILY MCP: For earthquakes, volcanoes, floods, storms, historical data, or ANY data not available locally - use Tavily to search for real data first, then display it.
    IMPORTANT: When using Tavily for graph data, LIMIT search results to 5 items to avoid rate limits and ensure relevant data.

ALWAYS fetch real data before displaying a graph. Never show placeholder data without informing the user.

PROPS:
- data: Object containing chart configuration:
  - type: "bar" | "line" | "pie" (choose based on data type - bar for comparisons, line for trends, pie for proportions)
  - labels: Array of category labels (e.g., ["Jan", "Feb", "Mar"] or ["USA", "China", "India"])
  - datasets: Array of {label, data, color?} where data is array of numbers matching labels
- title: Clear descriptive title for the chart
- showLegend: true/false (default true)
- variant: "default" | "solid" | "bordered"
- size: "sm" | "default" | "lg"

EXAMPLE:
{
  data: { type: "bar", labels: ["USA", "China", "India"], datasets: [{label: "Population (millions)", data: [331, 1412, 1408]}] },
  title: "Top 3 Countries by Population"
}`,
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCard",
    description:
      "A component that displays options as clickable cards with links and summaries with the ability to select multiple items.",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
  {
    name: "NewsCard",
    description: `DEPRECATED - DO NOT USE.
News articles are now displayed ONLY as markers on the TacticalMap.
The AI should NOT render this component.

When users ask for news:
1. Call getGNews tool to update the map with news markers
2. Simply tell the user "Map updated with X news articles"
3. Users can click markers to read more about each article`,
    component: NewsCard,
    propsSchema: newsCardSchema,
  },
  // NOTE: EvacuationTable removed - evacuation now uses styled markers on the map
  // When planEvacuation is called, it returns markers with markerStyle="safeSpot"
  // which render as glowing markers with icons (hospital, shelter, school, airport, park)
];
