/**
 * NASA FIRMS (Fire Information for Resource Management System) Service
 * 
 * This service fetches active fire data from NASA's FIRMS API and converts
 * it to CrisisMarker format for display on the TacticalMap.
 * 
 * API Documentation: https://firms.modaps.eosdis.nasa.gov/api/area/
 * 
 * Requires: NEXT_PUBLIC_NASA_FIRMS_MAP_KEY environment variable
 */

import type { CrisisMarker } from "@/lib/markers";

// Region presets with bounding box coordinates [west, south, east, north]
export const REGION_PRESETS: Record<string, [number, number, number, number]> = {
    world: [-180, -90, 180, 90],
    north_america: [-170, 15, -50, 75],
    south_america: [-85, -57, -32, 14],
    europe: [-25, 35, 45, 72],
    africa: [-20, -37, 55, 38],
    asia: [25, -15, 180, 75],
    oceania: [110, -50, 180, 0],
    california: [-125, 32, -114, 42],
    australia: [112, -45, 155, -10],
    usa: [-125, 24, -66, 50],
    brazil: [-74, -34, -28, 6],
    indonesia: [95, -11, 141, 6],
    canada: [-141, 42, -52, 84],
    russia: [20, 41, 180, 82],
    mediterranean: [-10, 30, 40, 48],
};

// Available satellite data sources
export type FIRMSSource =
    | "VIIRS_SNPP_NRT"
    | "VIIRS_NOAA20_NRT"
    | "VIIRS_NOAA21_NRT"
    | "MODIS_NRT"
    | "LANDSAT_NRT";

// Raw fire data point from FIRMS CSV
export interface FIRMSFirePoint {
    latitude: number;
    longitude: number;
    brightness: number;
    scan: number;
    track: number;
    acq_date: string;
    acq_time: string;
    satellite: string;
    instrument: string;
    confidence: string | number;
    version: string;
    bright_t31: number;
    frp: number; // Fire Radiative Power
    daynight: "D" | "N";
}

// Input parameters for the tool
export interface GetActiveFiresInput {
    region?: keyof typeof REGION_PRESETS;
    bounds?: {
        west: number;
        south: number;
        east: number;
        north: number;
    };
    days?: number;
    source?: FIRMSSource;
}

/**
 * Parse CSV response from FIRMS API
 */
function parseCSV(csv: string): FIRMSFirePoint[] {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");
    const fires: FIRMSFirePoint[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length < headers.length) continue;

        const fire: Record<string, string | number> = {};
        headers.forEach((header, index) => {
            const value = values[index];
            // Parse numeric fields
            if (["latitude", "longitude", "brightness", "scan", "track", "bright_t31", "frp"].includes(header)) {
                fire[header] = parseFloat(value) || 0;
            } else {
                fire[header] = value;
            }
        });

        fires.push(fire as unknown as FIRMSFirePoint);
    }

    return fires;
}

/**
 * Convert FIRMS fire point confidence to severity level
 */
function getFireSeverity(confidence: string | number, frp: number): CrisisMarker["severity"] {
    // FRP (Fire Radiative Power) is a good indicator of fire intensity
    if (frp > 100) return "critical";
    if (frp > 50) return "high";
    if (frp > 20) return "medium";

    // Fallback to confidence if FRP is low
    const conf = typeof confidence === "string" ? confidence.toLowerCase() : confidence;
    if (conf === "high" || conf === "h" || (typeof conf === "number" && conf > 80)) return "high";
    if (conf === "nominal" || conf === "n" || (typeof conf === "number" && conf > 50)) return "medium";
    return "low";
}

/**
 * Convert FIRMS fire points to CrisisMarker format for the TacticalMap
 */
function firesToCrisisMarkers(fires: FIRMSFirePoint[], limit = 100): CrisisMarker[] {
    // Sort by FRP (fire intensity) descending and take the most significant fires
    const sortedFires = [...fires]
        .sort((a, b) => (b.frp || 0) - (a.frp || 0))
        .slice(0, limit);

    return sortedFires.map((fire, index) => ({
        id: `fire-${fire.latitude}-${fire.longitude}-${index}`,
        title: `Active Fire ${fire.daynight === "D" ? "(Day)" : "(Night)"}`,
        description: `Satellite: ${fire.satellite} | FRP: ${fire.frp?.toFixed(1) || "N/A"} MW | Confidence: ${fire.confidence}`,
        latitude: fire.latitude,
        longitude: fire.longitude,
        category: "wildfire" as const,
        severity: getFireSeverity(fire.confidence, fire.frp || 0),
        date: fire.acq_date,
        source: `NASA FIRMS (${fire.instrument})`,
        markerStyle: "default" as const,
        safeSpotType: "hospital" as const,
    }));
}

/**
 * Fetch active fires from NASA FIRMS API
 * 
 * @param input - Query parameters including region, bounds, days, and source
 * @returns Array of CrisisMarker objects for display on the map
 */
export async function getActiveFires(input: GetActiveFiresInput = {}): Promise<CrisisMarker[]> {
    const mapKey = process.env.NEXT_PUBLIC_NASA_FIRMS_MAP_KEY;

    if (!mapKey) {
        console.error("NASA FIRMS API key not configured. Set NEXT_PUBLIC_NASA_FIRMS_MAP_KEY in .env.local");
        // Return mock data for demo purposes
        return getMockFireData(input);
    }

    // Determine bounding box
    let bounds: [number, number, number, number];

    if (input.bounds) {
        bounds = [input.bounds.west, input.bounds.south, input.bounds.east, input.bounds.north];
    } else if (input.region && REGION_PRESETS[input.region]) {
        bounds = REGION_PRESETS[input.region];
    } else {
        bounds = REGION_PRESETS.world;
    }

    const source = input.source || "VIIRS_SNPP_NRT";
    const days = Math.min(Math.max(input.days || 1, 1), 5); // Clamp to 1-5

    const areaCoords = bounds.join(",");
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${areaCoords}/${days}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`FIRMS API error: ${response.status} ${response.statusText}`);
        }

        const csv = await response.text();
        const fires = parseCSV(csv);

        // Limit to 20 fires to reduce load on Tambo and improve performance
        const markers = firesToCrisisMarkers(fires, 20);

        return markers;
    } catch (error) {
        console.error("Failed to fetch FIRMS data:", error);
        // Return mock data as fallback
        return getMockFireData(input);
    }
}

/**
 * Get mock fire data for demo/testing when API key is not available
 */
function getMockFireData(input: GetActiveFiresInput): CrisisMarker[] {
    const region = input.region || "world";
    const bounds = input.bounds || (REGION_PRESETS[region] ? {
        west: REGION_PRESETS[region][0],
        south: REGION_PRESETS[region][1],
        east: REGION_PRESETS[region][2],
        north: REGION_PRESETS[region][3]
    } : { west: -180, south: -90, east: 180, north: 90 });

    // Generate some mock fires within the bounds
    const mockFires: CrisisMarker[] = [];
    const numFires = 20; // Limit mock fires to 20

    for (let i = 0; i < numFires; i++) {
        const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
        const lng = bounds.west + Math.random() * (bounds.east - bounds.west);
        const severities: CrisisMarker["severity"][] = ["low", "medium", "high", "critical"];

        mockFires.push({
            id: `mock-fire-${i}`,
            title: `Active Fire #${i + 1}`,
            description: `Mock fire data - NASA FIRMS API key required for real data`,
            latitude: lat,
            longitude: lng,
            category: "wildfire",
            severity: severities[Math.floor(Math.random() * severities.length)],
            date: new Date().toISOString().split("T")[0],
            source: "Mock Data (Configure API Key)",
            markerStyle: "default" as const,
            safeSpotType: "hospital" as const,
        });
    }

    return mockFires;
}

/**
 * Get region center coordinates for map fly-to animation
 */
export function getRegionCenter(region: keyof typeof REGION_PRESETS): { lat: number; lng: number; zoom: number } {
    const bounds = REGION_PRESETS[region];
    if (!bounds) {
        return { lat: 20, lng: 0, zoom: 2 };
    }

    const lng = (bounds[0] + bounds[2]) / 2;
    const lat = (bounds[1] + bounds[3]) / 2;

    // Estimate zoom based on region size
    const width = bounds[2] - bounds[0];
    let zoom = 2;
    if (width < 20) zoom = 6;
    else if (width < 50) zoom = 4;
    else if (width < 100) zoom = 3;

    return { lat, lng, zoom };
}
