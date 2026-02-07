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
import { EvacuationTable } from "@/components/tambo/evacuation-table";
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
    description: `REQUIRED: Display news articles in the chat after fetching news with getGNews tool.

ALWAYS render this component when showing news to users. It displays clickable article cards with thumbnails, titles, descriptions, and links.

PROPS:
- articles: Array of {id, title, description, url, source, publishedAt, image}
- title: Header text (e.g. "Top Headlines from India")
- location: Location context

EXAMPLE:
{
  articles: [
    {id: "1", title: "Breaking News", description: "Details...", url: "https://...", source: "CNN", publishedAt: "2024-01-15", image: "https://..."}
  ],
  title: "Latest News",
  location: "India"
}`,
    component: NewsCard,
    propsSchema: newsCardSchema,
  },
  {
    name: "EvacuationTable",
    description: `REQUIRED: Display-only component showing evacuation safe spots in a table format.

ALWAYS render this component when showing evacuation plans. The component is display-only and does not require AI interaction.

CRITICAL INSTRUCTIONS:
1. Call this component IMMEDIATELY after planEvacuation
2. Pass ALL props from the tool result
3. Component displays safe spots OR emergency contacts if none found
4. NEVER skip this component

PROPS to pass from tool result:
- crisisTitle: Use result.crisisTitle (string)
- safeSpots: Use result.allSafeSpots (array of objects with: id, name, type, latitude, longitude, distance)
- bestRoute: Use result.primaryRoute (object with: toSafeSpotName, toSafeSpotType, distance, duration) or null
- crisisLatitude: Use result.crisisLatitude (number)
- crisisLongitude: Use result.crisisLongitude (number)

NOTE: Users can click map markers directly to zoom. No zoom buttons in the table.`,
    component: EvacuationTable,
    propsSchema: z.object({
      crisisTitle: z.string().describe("Title of the crisis event"),
      safeSpots: z.array(
        z.object({
          id: z.string().describe("Safe spot ID"),
          name: z.string().describe("Safe spot name"),
          type: z.string().describe("Type of safe spot (hospital, park, airport, shelter, school)"),
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
          distance: z.number().describe("Distance from crisis in km"),
          address: z.string().optional().describe("Optional address"),
          phone: z.string().optional().describe("Optional phone number"),
        })
      ).describe("Array of all safe spots from allSafeSpots"),
      bestRoute: z.object({
        toSafeSpotName: z.string().describe("Name of the best safe spot"),
        toSafeSpotType: z.string().describe("Type of the best safe spot"),
        distance: z.number().describe("Route distance in km"),
        duration: z.number().describe("Route duration in minutes"),
      }).nullable().describe("Primary route from plan result"),
      crisisLatitude: z.number().describe("Crisis latitude from plan result"),
      crisisLongitude: z.number().describe("Crisis longitude from plan result"),
    }),
  },
];
