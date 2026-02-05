/**
 * @file tambo-tools.ts
 * @description Dedicated file for Tambo tools to ensure server-side safety.
 * This file MUST NOT import any UI components or "use client" directives.
 */

import {
    getCountryPopulations,
    getGlobalPopulationTrend,
} from "@/services/population-stats";
import { getActiveFires } from "@/services/nasa-firms";
import { searchGNews } from "@/services/gnews";
import { TamboTool } from "@tambo-ai/react";
import { crisisMarkerSchema } from "@/lib/markers";
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
 * - CRITICAL: When searching for data to GRAPH, you MUST explicitly search for "annual statistics", "yearly data", or "by country" to get aggregate numbers suitable for charts.
 * - ALWAYS LIMIT RESULTS to 5 items max when fetching data for graphs to prevent rate limits and ensure clean visualization.
 * - Use specific queries ("wildfire acres burned California 2024 by month")
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
    {
        name: "getGNews",
        description: `Fetch latest news articles from GNews API. Use this when the user asks for news, headlines, updates, or what's happening in a specific area.

USAGE:
- For general news: query="top news" or "headlines"
- For topic-specific: query="wildfires", "politics", "technology"
- For location-specific: Provide location parameter (e.g. "California", "India")

AFTER GETTING RESULTS - YOU MUST DO THESE 2 THINGS:

1. RENDER TacticalMap component with the markers:
   TacticalMap props: { markers: [returned markers], flyToMarkers: true, enableClustering: false }

2. RENDER NewsCard component in chat with articles:
   NewsCard props: { 
     articles: markers.map(m => ({id: m.id, title: m.title, description: m.description, url: m.url, source: m.source, publishedAt: m.date, image: m.image})),
     title: "News Headlines",
     location: "[location name]"
   }

DO NOT just output raw JSON - you MUST render both TacticalMap and NewsCard components!`,
        tool: searchGNews,
        inputSchema: z.object({
            query: z.string().describe("Search query (e.g. 'top news', 'headlines', 'wildfires')"),
            location: z.string().optional().describe("Location name (e.g. 'California', 'India', 'USA')")
        }),
        outputSchema: z.array(crisisMarkerSchema)
    },
];
