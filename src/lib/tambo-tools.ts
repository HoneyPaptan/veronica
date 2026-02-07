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
import { planEvacuation, compactRouteToMapRoute, safeSpotsToMarkers } from "@/services/evacuation-service";
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
- For map-selected locations: ALWAYS pass latitude and longitude parameters!

CRITICAL - COORDINATE EXTRACTION:
When the user query contains coordinates like "31.3176, 75.4645" or "coordinates 31.3176, 75.4645":
1. Extract the FIRST number as latitude (e.g. 31.3176)
2. Extract the SECOND number as longitude (e.g. 75.4645)
3. Pass these as the latitude and longitude parameters

Example: "Get news for coordinates 31.3176, 75.4645 (Jalandhar)"
-> Call with: { query: "news", location: "Jalandhar", latitude: 31.3176, longitude: 75.4645 }

AFTER GETTING RESULTS - CRITICAL STEPS:

1. UPDATE TacticalMap with the EXACT markers returned by this tool:
   - DO NOT modify the marker coordinates!
   - Pass the markers array DIRECTLY to TacticalMap
   - TacticalMap props: { markers: <returned_markers>, flyToMarkers: true, enableClustering: false }

2. RENDER NewsCard component in chat:
   - Extract article info from the markers' relatedNews field
   - NewsCard props: { articles: [...], title: "News Headlines", location: "[location]" }

IMPORTANT: The markers returned by this tool already have the correct coordinates. 
DO NOT create new markers or change their latitude/longitude values!`,
        tool: searchGNews,
        inputSchema: z.object({
            query: z.string().describe("Search query (e.g. 'top news', 'headlines', 'wildfires')"),
            location: z.string().optional().describe("Location name (e.g. 'California', 'India', 'Jalandhar')"),
            latitude: z.number().optional().describe("REQUIRED for map selections: Exact latitude from user's selected coordinates"),
            longitude: z.number().optional().describe("REQUIRED for map selections: Exact longitude from user's selected coordinates")
        }),
        outputSchema: z.array(crisisMarkerSchema)
    },
    {
        name: "planEvacuation",
        description: `🚨 OPTIMIZED EVACUATION TOOL - Fast, lightweight emergency planning

WHAT THIS TOOL DOES:
1. Finds nearest safe spots prioritizing: hospitals (🏥) > shelters (🏠) > schools (🏫) > airports (✈️) > parks (🌳)
2. Calculates ONE primary route to the BEST safe spot (reduces data size)
3. Samples route coordinates (keeps every 10th point) to prevent streaming errors
4. Returns ALL safe spots for table display in chat

WHEN TO USE:
- User clicks "Plan Evacuation" button on any crisis marker
- User asks: "Plan evacuation" or "Show evacuation routes"

AUTOMATIC WORKFLOW:
1. Call planEvacuation tool
2. Render EvacuationTable with ALL props from result
3. Update TacticalMap with markers and routes
4. Provide brief summary

EXAMPLE:
const result = await planEvacuation({ crisisId, crisisTitle, latitude, longitude })

return (
  <>
    <EvacuationTable 
      crisisTitle={result.crisisTitle}
      safeSpots={result.allSafeSpots}
      bestRoute={result.primaryRoute}
      crisisLatitude={result.crisisLatitude}
      crisisLongitude={result.crisisLongitude}
    />
    <p>{result.summary}</p>
  </>
)

EXAMPLE CALL:
{ crisisId: "fire-001", crisisTitle: "Wildfire", latitude: 34.05, longitude: -118.24 }`,
        tool: async (input: { crisisId: string; crisisTitle: string; latitude: number; longitude: number }) => {
            const plan = await planEvacuation(input.crisisId, input.crisisTitle, input.latitude, input.longitude);
            
            // Build map routes - only one primary route to reduce payload
            const mapRoutes = plan.primaryRoute ? [compactRouteToMapRoute(plan.primaryRoute)] : [];
            
            return {
                summary: plan.summary,
                allSafeSpots: plan.allSafeSpots,
                primaryRoute: plan.primaryRoute,
                bestSafeSpot: plan.bestSafeSpot,
                crisisLatitude: plan.crisisLatitude,
                crisisLongitude: plan.crisisLongitude,
                // For map display
                markers: safeSpotsToMarkers(plan.allSafeSpots, input.crisisId),
                mapRoutes: mapRoutes,
            };
        },
        inputSchema: z.object({
            crisisId: z.string().describe("Unique identifier for the crisis event (use the marker's id)"),
            crisisTitle: z.string().describe("Title/name of the crisis for display purposes"),
            latitude: z.number().describe("Latitude of the crisis location"),
            longitude: z.number().describe("Longitude of the crisis location"),
        }),
        outputSchema: z.object({
            summary: z.string().describe("Human-readable summary of the evacuation plan"),
            allSafeSpots: z.array(z.object({
                id: z.string().default("unknown"),
                name: z.string().default("Unknown Location"),
                type: z.string().default("hospital"),
                latitude: z.number().default(0),
                longitude: z.number().default(0),
                distance: z.number().default(0),
                capacity: z.string().optional().default(""),
                address: z.string().optional().default(""),
                phone: z.string().optional().default(""),
            })),
            primaryRoute: z.object({
                id: z.string().default(""),
                crisisId: z.string().default(""),
                crisisName: z.string().default(""),
                toSafeSpotId: z.string().default(""),
                toSafeSpotName: z.string().default(""),
                toSafeSpotType: z.string().default("hospital"),
                coordinates: z.array(z.tuple([z.number(), z.number()])).default([]),
                totalPoints: z.number().default(0),
                distance: z.number().default(0),
                duration: z.number().default(0),
                color: z.string().default("#3b82f6"),
            }).nullable().default(null),
            bestSafeSpot: z.object({
                id: z.string().default(""),
                name: z.string().default(""),
                type: z.string().default("hospital"),
                latitude: z.number().default(0),
                longitude: z.number().default(0),
                distance: z.number().default(0),
                capacity: z.string().optional().default(""),
                address: z.string().optional().default(""),
                phone: z.string().optional().default(""),
            }).nullable().default(null),
            crisisLatitude: z.number().describe("Latitude of crisis location"),
            crisisLongitude: z.number().describe("Longitude of crisis location"),
            markers: z.array(crisisMarkerSchema),
            mapRoutes: z.array(z.object({
                id: z.string(),
                coordinates: z.array(z.tuple([z.number(), z.number()])),
                color: z.string(),
                width: z.number(),
                label: z.string(),
            })),
        }),
    },
];
