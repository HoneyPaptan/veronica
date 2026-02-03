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
    description: `The main interactive map component for Project Veronica. ALWAYS update this map when displaying any geographic data.

CRITICAL RULES:
1. ALWAYS set flyToMarkers=true when adding new markers so the map zooms to show them
2. ALWAYS set enableClustering=true when you have markers to ensure they display nicely
3. For wildfires/fires: FIRST call getActiveFires tool, THEN update the map with the returned markers
4. For ROUTES: Only use the routes array, do NOT add markers for route waypoints - routes are drawn as lines, not crisis events

LOCATION ZOOM - Use these coordinates when user asks to zoom to a location:
- New York: lat=40.7128, lng=-74.0060, zoom=10
- Los Angeles: lat=34.0522, lng=-118.2437, zoom=10
- London: lat=51.5074, lng=-0.1278, zoom=10
- Tokyo: lat=35.6762, lng=139.6503, zoom=10
- Sydney: lat=-33.8688, lng=151.2093, zoom=10
- Paris: lat=48.8566, lng=2.3522, zoom=10
- USA: lat=39.8283, lng=-98.5795, zoom=4
- Europe: lat=54.5260, lng=15.2551, zoom=3
- Asia: lat=34.0479, lng=100.6197, zoom=3
- California: lat=36.7783, lng=-119.4179, zoom=6

PROPS:
- markers: ONLY for crisis events (wildfire, volcano, earthquake, flood, storm). Do NOT use for routes.
- routes: Array of {id, points: [{latitude, longitude}], color?, width?} - for drawing paths/routes
- centerLatitude, centerLongitude: Map center (use for location zoom)
- zoomLevel: 1-3(continent), 4-6(country), 7-10(city), 11-14(neighborhood), 15-18(street)
- flyToMarkers: true = auto-zoom to fit all markers (ALWAYS use when adding markers)
- enableClustering: true = cluster nearby markers (ALWAYS use with markers)

CATEGORIES (for markers only): wildfire, volcano, earthquake, flood, storm
SEVERITY: low, medium, high, critical`,
    component: TacticalMap,
    propsSchema: tacticalMapSchema,
  },
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
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
