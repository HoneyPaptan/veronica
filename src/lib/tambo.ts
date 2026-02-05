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
import { TacticalMap, tacticalMapSchema } from "@/components/tactical-map";
import { TamboTool, TamboComponent } from "@tambo-ai/react";

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
  {
    name: "TacticalMap",
    description: `IMPORTANT: This component controls the EXISTING map on the LEFT SIDE of the screen. 
DO NOT render a new map in the chat - just UPDATE the existing one by setting props.

CRITICAL RULES:
1. ALWAYS set flyToMarkers=true when adding markers so the map auto-zooms to show them
2. Set enableClustering=true ONLY if you have > 50 markers
3. For wildfires: Call getActiveFires FIRST, then update map with returned markers
4. For NEWS/Tavily results: Use category="news" and INCLUDE the url field!
5. For Tavily results WITHOUT precise coordinates: set regionName to a country/region string (e.g. "india", "europe") so the map can still center on the correct area, and set highlightRegions (e.g. ["india","china"]) so those regions are shaded on the map using GeoJSON layers.

MARKER CATEGORIES:
- wildfire, volcano, earthquake, flood, storm: Crisis events
- news: Articles from Tavily (MUST include url property for clickable links)

NEWS MARKER EXAMPLE:
{ id: "1", title: "Earthquake in Japan", category: "news", latitude: 35.6, longitude: 139.6, url: "https://..." }

LOCATION PRESETS (for zooming):
- USA: lat=39.8, lng=-98.5, zoom=4 | Europe: lat=54.5, lng=15.2, zoom=3
- Asia: lat=34.0, lng=100.6, zoom=3 | World: lat=20, lng=0, zoom=2

PROPS:
- markers: Array with id, title, lat, lng, category, url (for news)
- flyToMarkers: true (ALWAYS use when adding markers!)
- enableClustering: true (ALWAYS use for multiple markers)
- regionName: string region/country name to center the view when there are no markers
- highlightRegions: array of region names to draw shaded tactical coverage polygons for (e.g. ["india","china"])`,
    component: TacticalMap,
    propsSchema: tacticalMapSchema,
  },
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
  // Add more components here
];
