import { z } from "zod";

/**
 * Schema for crisis markers that Tambo can manipulate
 */
export const crisisMarkerSchema = z.object({
    id: z.string().describe("Unique identifier for the crisis event"),
    title: z.string().describe("Title or name of the crisis event"),
    description: z
        .string()
        .optional()
        .describe("Detailed description of the crisis"),
    latitude: z
        .coerce.number()
        .describe(
            "Latitude coordinate of the crisis location. Can be a number or numeric string."
        ),
    longitude: z
        .coerce.number()
        .describe(
            "Longitude coordinate of the crisis location. Can be a number or numeric string."
        ),
    category: z
        .enum(["wildfire", "volcano", "earthquake", "flood", "storm", "news", "other"])
        .describe(
            "Category of the crisis event. Use 'news' for article markers from Tavily."
        ),
    severity: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("Severity level of the crisis"),
    date: z.string().optional().describe("Date of the crisis event"),
    source: z.string().optional().describe("Data source for this crisis"),
    url: z
        .string()
        .optional()
        .describe(
            "URL link to the primary source article for this crisis event (e.g. Tavily or NASA)."
        ),
    relatedNews: z
        .array(
            z.object({
                id: z.string().describe("Stable identifier for the news article"),
                title: z.string().describe("Headline or title of the news article"),
                url: z
                    .string()
                    .optional()
                    .describe("URL to the full news article (if available)"),
                source: z
                    .string()
                    .optional()
                    .describe("Name of the news outlet or data provider"),
                snippet: z
                    .string()
                    .optional()
                    .describe("Short summary or snippet describing the article"),
                publishedAt: z
                    .string()
                    .optional()
                    .describe("Published date/time in ISO 8601 format if known"),
                image: z
                    .string()
                    .optional()
                    .describe("URL to the article image/thumbnail"),
            })
        )
        .optional()
        .describe(
            "Optional list of local news articles related to this crisis, typically fetched from Tavily for the marker's location. Only populate for real crisis events (not generic regions or routes)."
        ),
});

export type CrisisMarker = z.infer<typeof crisisMarkerSchema>;

// Common location coordinates that Tambo can use for zooming
export const LOCATION_PRESETS: Record<string, { lat: number; lng: number; zoom: number }> = {
    // Major Cities
    "new york": { lat: 40.7128, lng: -74.0060, zoom: 10 },
    "los angeles": { lat: 34.0522, lng: -118.2437, zoom: 10 },
    "chicago": { lat: 41.8781, lng: -87.6298, zoom: 10 },
    "london": { lat: 51.5074, lng: -0.1278, zoom: 10 },
    "paris": { lat: 48.8566, lng: 2.3522, zoom: 10 },
    "tokyo": { lat: 35.6762, lng: 139.6503, zoom: 10 },
    "sydney": { lat: -33.8688, lng: 151.2093, zoom: 10 },
    "mumbai": { lat: 19.0760, lng: 72.8777, zoom: 10 },
    "dubai": { lat: 25.2048, lng: 55.2708, zoom: 10 },
    "singapore": { lat: 1.3521, lng: 103.8198, zoom: 11 },
    "hong kong": { lat: 22.3193, lng: 114.1694, zoom: 11 },
    "berlin": { lat: 52.5200, lng: 13.4050, zoom: 10 },
    "moscow": { lat: 55.7558, lng: 37.6173, zoom: 10 },
    "beijing": { lat: 39.9042, lng: 116.4074, zoom: 10 },
    "san francisco": { lat: 37.7749, lng: -122.4194, zoom: 11 },
    // Countries
    "usa": { lat: 39.8283, lng: -98.5795, zoom: 4 },
    "india": { lat: 20.5937, lng: 78.9629, zoom: 4 },
    "china": { lat: 35.8617, lng: 104.1954, zoom: 4 },
    "australia": { lat: -25.2744, lng: 133.7751, zoom: 4 },
    "brazil": { lat: -14.2350, lng: -51.9253, zoom: 4 },
    "russia": { lat: 61.5240, lng: 105.3188, zoom: 3 },
    "japan": { lat: 36.2048, lng: 138.2529, zoom: 5 },
    "germany": { lat: 51.1657, lng: 10.4515, zoom: 5 },
    "france": { lat: 46.2276, lng: 2.2137, zoom: 5 },
    "uk": { lat: 55.3781, lng: -3.4360, zoom: 5 },
    "canada": { lat: 56.1304, lng: -106.3468, zoom: 3 },
    "mexico": { lat: 23.6345, lng: -102.5528, zoom: 5 },
    "italy": { lat: 41.8719, lng: 12.5674, zoom: 5 },
    "spain": { lat: 40.4637, lng: -3.7492, zoom: 5 },
    // Regions
    "europe": { lat: 54.5260, lng: 15.2551, zoom: 3 },
    "asia": { lat: 34.0479, lng: 100.6197, zoom: 3 },
    "africa": { lat: -8.7832, lng: 34.5085, zoom: 3 },
    "north america": { lat: 54.5260, lng: -105.2551, zoom: 3 },
    "south america": { lat: -8.7832, lng: -55.4915, zoom: 3 },
    "oceania": { lat: -22.7359, lng: 140.0188, zoom: 3 },
    "middle east": { lat: 29.2985, lng: 42.5510, zoom: 4 },
    "california": { lat: 36.7783, lng: -119.4179, zoom: 6 },
};
