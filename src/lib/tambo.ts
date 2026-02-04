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
import { TacticalMap, tacticalMapSchema, crisisMarkerSchema } from "@/components/tactical-map";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import { getActiveFires, REGION_PRESETS } from "@/services/nasa-firms";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

/**
 * tools
 *
 * This array contains all the Tambo tools that are registered for use within the application.
 * Each tool is defined with its name, description, and expected props. The tools
 * can be controlled by AI to dynamically fetch data based on user interactions.
 * 
 * CRITICAL WORKFLOW - ALWAYS follow this for ANY location-based request:
 * 1. Fetch data (NASA API, Tavily MCP, etc.)
 * 2. ALWAYS plot results on the TacticalMap with appropriate markers
 * 3. ALWAYS zoom to the relevant region (flyToMarkers=true)
 * 4. For NEWS/Tavily results: Include the source URL in each marker!
 * 
 * MARKER RULES FOR NEWS/TAVILY:
 * - category: "news" for article markers
 * - url: ALWAYS include the source article URL (required for news)
 * - When user clicks the marker, they can see the link to the full article
 * 
 * DATA SOURCES:
 * 1. getActiveFires: Wildfires from NASA FIRMS
 * 2. TAVILY MCP: Earthquakes, volcanoes, floods, storms, news articles
 * 
 * TAVILY TIPS:
 * - Request 5-10 results max
 * - Use specific queries ("earthquakes Japan 2024 magnitude 6+")
 * - Extract location coordinates and source URLs
 * - ALWAYS plot on map even if user doesn't explicitly ask
 */

export const tools: TamboTool[] = [
  {
    name: "getActiveFires",
    description:
      "Fetch real-time active fire/wildfire data from NASA FIRMS satellite imagery. Use this tool when the user asks about fires, wildfires, burning areas, or wants to see fire locations. Returns fire markers that should be displayed on the TacticalMap component. You can specify a region (like 'california', 'australia', 'europe') or custom bounding box coordinates.",
    tool: getActiveFires,
    inputSchema: z.object({
      region: z
        .enum([
          "world",
          "north_america",
          "south_america",
          "europe",
          "africa",
          "asia",
          "oceania",
          "california",
          "australia",
          "usa",
          "brazil",
          "indonesia",
          "canada",
          "russia",
          "mediterranean",
        ])
        .optional()
        .describe("Predefined region to fetch fires for. Use 'california' for California wildfires, 'australia' for Australian bushfires, etc."),
      bounds: z
        .object({
          west: z.number().describe("Western longitude boundary"),
          south: z.number().describe("Southern latitude boundary"),
          east: z.number().describe("Eastern longitude boundary"),
          north: z.number().describe("Northern latitude boundary"),
        })
        .optional()
        .describe("Custom bounding box coordinates for a specific area"),
      days: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("Number of days of fire data to fetch (1-5, default: 1)"),
      source: z
        .enum(["VIIRS_SNPP_NRT", "MODIS_NRT", "VIIRS_NOAA20_NRT"])
        .optional()
        .describe("Satellite data source (default: VIIRS_SNPP_NRT for best coverage)"),
    }),
    outputSchema: z.array(crisisMarkerSchema),
  },
  {
    name: "countryPopulation",
    description:
      "A tool to get population statistics by country with advanced filtering options",
    tool: getCountryPopulations,
    inputSchema: z.object({
      continent: z.string().optional(),
      sortBy: z.enum(["population", "growthRate"]).optional(),
      limit: z.number().optional(),
      order: z.enum(["asc", "desc"]).optional(),
    }),
    outputSchema: z.array(
      z.object({
        countryCode: z.string(),
        countryName: z.string(),
        continent: z.enum([
          "Asia",
          "Africa",
          "Europe",
          "North America",
          "South America",
          "Oceania",
        ]),
        population: z.number(),
        year: z.number(),
        growthRate: z.number(),
      }),
    ),
  },
  {
    name: "globalPopulation",
    description:
      "A tool to get global population trends with optional year range filtering",
    tool: getGlobalPopulationTrend,
    inputSchema: z.object({
      startYear: z.number().optional(),
      endYear: z.number().optional(),
    }),
    outputSchema: z.array(
      z.object({
        year: z.number(),
        population: z.number(),
        growthRate: z.number(),
      }),
    ),
  },
  // Add more tools here
];

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
- enableClustering: true (ALWAYS use for multiple markers)`,
    component: TacticalMap,
    propsSchema: tacticalMapSchema,
  },
  {
    name: "Graph",
    description: `A data visualization component that renders bar, line, and pie charts using Recharts.

USE THIS WHEN: User asks to visualize data, show trends, compare statistics, or display charts/graphs.

DATA SOURCES (in priority order):
1. LOCAL TOOLS: Use getActiveFires for wildfires, countryPopulation/globalPopulation for population data
2. TAVILY MCP: For earthquakes, volcanoes, floods, storms, historical data, or ANY data not available locally - use Tavily to search for real data first, then display it

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
