/**
 * @file evacuation-service.ts
 * @description Optimized service for planning evacuation routes from crisis locations
 * 
 * OPTIMIZED VERSION:
 * - Finds only ONE best safe spot for routing (prioritizes hospitals)
 * - Samples route coordinates to reduce payload size
 * - Returns list of ALL safe spots for table display
 * - Minimal data transfer to prevent streaming errors
 */

import { z } from "zod";

// Safe spot types that can be evacuation destinations
export type SafeSpotType = "hospital" | "park" | "airport" | "shelter" | "school";

// Schema for a safe spot location - using string for type to match component schema
export const safeSpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // Changed from enum to string for JSON Schema compatibility
  latitude: z.number(),
  longitude: z.number(),
  distance: z.number().describe("Distance from crisis in kilometers"),
  capacity: z.string().optional().describe("Capacity info if available"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type SafeSpot = z.infer<typeof safeSpotSchema>;

// Compact route schema - samples coordinates to reduce size
export const compactRouteSchema = z.object({
  id: z.string(),
  crisisId: z.string(),
  crisisName: z.string(),
  toSafeSpotId: z.string(),
  toSafeSpotName: z.string(),
  toSafeSpotType: z.string(), // Changed from enum to string for JSON Schema compatibility
  // Sampled coordinates (every Nth point) to reduce payload
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  totalPoints: z.number().describe("Original number of coordinate points before sampling"),
  distance: z.number().describe("Route distance in kilometers"),
  duration: z.number().describe("Estimated duration in minutes"),
  color: z.string(),
});

export type CompactRoute = z.infer<typeof compactRouteSchema>;

// Schema for evacuation plan response - OPTIMIZED
export const evacuationPlanSchema = z.object({
  crisisId: z.string(),
  crisisTitle: z.string(),
  crisisLatitude: z.number(),
  crisisLongitude: z.number(),
  // ALL safe spots for table display
  allSafeSpots: z.array(safeSpotSchema),
  // ONLY ONE route to the best safe spot (for map display)
  primaryRoute: compactRouteSchema.nullable(),
  // Best safe spot details
  bestSafeSpot: safeSpotSchema.nullable(),
  summary: z.string().describe("Human-readable summary"),
});

export type EvacuationPlan = z.infer<typeof evacuationPlanSchema>;

// Priority order for safe spot types (hospital is best for emergencies)
const SAFE_SPOT_PRIORITY: SafeSpotType[] = ["hospital", "shelter", "school", "airport", "park"];

/**
 * Query Overpass API for nearby safe spots
 * LIMITED search to prevent too many results
 */
async function findSafeSpots(
  latitude: number,
  longitude: number,
  radius: number = 30000 // Reduced to 30km for faster response
): Promise<SafeSpot[]> {
  const safeSpots: SafeSpot[] = [];
  
  // Simplified Overpass query - only essential data
  const overpassQuery = `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radius},${latitude},${longitude});
      way["amenity"="hospital"](around:${radius},${latitude},${longitude});
      node["amenity"="clinic"](around:${radius},${latitude},${longitude});
      node["amenity"="shelter"](around:${radius},${latitude},${longitude});
      node["amenity"="school"](around:${radius},${latitude},${longitude});
      node["aeroway"="aerodrome"](around:${radius},${latitude},${longitude});
      node["leisure"="park"](around:${radius},${latitude},${longitude});
    );
    out center 20;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) return safeSpots;
    const data = await response.json();
    if (!data.elements || !Array.isArray(data.elements)) return safeSpots;

    for (const element of data.elements) {
      const tags = element.tags || {};
      
      let type: SafeSpotType = "shelter";
      if (tags.amenity === "hospital" || tags.amenity === "clinic") type = "hospital";
      else if (tags.amenity === "shelter") type = "shelter";
      else if (tags.amenity === "school") type = "school";
      else if (tags.aeroway === "aerodrome") type = "airport";
      else if (tags.leisure === "park") type = "park";

      let lat: number, lon: number;
      if (element.type === "node") {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else continue;

      const distance = calculateDistance(latitude, longitude, lat, lon);

      safeSpots.push({
        id: `safe-${element.id}`,
        name: tags.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        latitude: lat,
        longitude: lon,
        distance: Math.round(distance * 10) / 10,
        capacity: tags.capacity || tags.beds,
        address: tags["addr:street"],
        phone: tags.phone,
      });
    }

    // Sort by priority (hospitals first) then by distance
    safeSpots.sort((a, b) => {
      const priorityA = SAFE_SPOT_PRIORITY.indexOf(a.type as SafeSpotType);
      const priorityB = SAFE_SPOT_PRIORITY.indexOf(b.type as SafeSpotType);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.distance - b.distance;
    });

    return safeSpots;

  } catch (error) {
    console.error("Error finding safe spots:", error);
    return safeSpots;
  }
}

/**
 * Calculate route using OSRM with coordinate sampling
 * Returns COMPACT route data with sampled coordinates
 */
async function calculateCompactRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  sampleInterval: number = 10 // Keep every 10th coordinate point
): Promise<{ coordinates: [number, number][]; totalPoints: number; distance: number; duration: number } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const allCoordinates = route.geometry.coordinates as [number, number][];
    
    // SAMPLE coordinates to reduce payload size
    // Always keep first and last, sample in between
    const sampledCoordinates: [number, number][] = [];
    for (let i = 0; i < allCoordinates.length; i += sampleInterval) {
      sampledCoordinates.push(allCoordinates[i]);
    }
    // Always ensure last point is included
    if (sampledCoordinates[sampledCoordinates.length - 1] !== allCoordinates[allCoordinates.length - 1]) {
      sampledCoordinates.push(allCoordinates[allCoordinates.length - 1]);
    }

    return {
      coordinates: sampledCoordinates,
      totalPoints: allCoordinates.length,
      distance: Math.round((route.distance / 1000) * 10) / 10,
      duration: Math.round(route.duration / 60),
    };

  } catch (error) {
    console.error("Error calculating route:", error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * OPTIMIZED evacuation planning - finds ONE best route + list of all options
 */
export async function planEvacuation(
  crisisId: string,
  crisisTitle: string,
  crisisLatitude: number,
  crisisLongitude: number,
  options: {
    searchRadius?: number;
    sampleInterval?: number; // Coordinate sampling rate
  } = {}
): Promise<EvacuationPlan> {
  const { searchRadius = 30000, sampleInterval = 10 } = options;

  console.log(`🚨 Evacuation planning: ${crisisTitle} at ${crisisLatitude}, ${crisisLongitude}`);

  // Find safe spots (limited query)
  const allSafeSpots = await findSafeSpots(crisisLatitude, crisisLongitude, searchRadius);
  
  console.log(`🏥 Found ${allSafeSpots.length} safe spots`);

  // Get the BEST safe spot (first one after sorting by priority + distance)
  const bestSafeSpot = allSafeSpots[0] || null;
  
  // Calculate route ONLY to the best safe spot
  let primaryRoute: CompactRoute | null = null;
  
  if (bestSafeSpot) {
    console.log(`🛣️ Calculating route to ${bestSafeSpot.name} (${bestSafeSpot.type})`);
    
    const routeData = await calculateCompactRoute(
      crisisLatitude,
      crisisLongitude,
      bestSafeSpot.latitude,
      bestSafeSpot.longitude,
      sampleInterval
    );

    if (routeData) {
      primaryRoute = {
        id: `route-${crisisId}-${bestSafeSpot.id}`,
        crisisId,
        crisisName: crisisTitle,
        toSafeSpotId: bestSafeSpot.id,
        toSafeSpotName: bestSafeSpot.name,
        toSafeSpotType: bestSafeSpot.type,
        coordinates: routeData.coordinates,
        totalPoints: routeData.totalPoints,
        distance: routeData.distance,
        duration: routeData.duration,
        color: getRouteColor(bestSafeSpot.type as SafeSpotType),
      };
      
      console.log(`✅ Route calculated: ${routeData.distance}km, ${routeData.duration}min (${routeData.totalPoints} -> ${routeData.coordinates.length} points)`);
    }
  }

  // Generate summary
  const summary = generateEvacuationSummary(crisisTitle, allSafeSpots, primaryRoute);

  return {
    crisisId,
    crisisTitle,
    crisisLatitude,
    crisisLongitude,
    allSafeSpots,
    primaryRoute,
    bestSafeSpot,
    summary,
  };
}

/**
 * Get route color based on safe spot type
 */
function getRouteColor(type: SafeSpotType): string {
  const colors: Record<SafeSpotType, string> = {
    hospital: "#ef4444",
    park: "#22c55e",
    airport: "#3b82f6",
    shelter: "#f59e0b",
    school: "#8b5cf6",
  };
  return colors[type] || "#3b82f6";
}

/**
 * Generate summary
 */
function generateEvacuationSummary(
  crisisTitle: string,
  allSafeSpots: SafeSpot[],
  primaryRoute: CompactRoute | null
): string {
  if (!primaryRoute || allSafeSpots.length === 0) {
    return `No evacuation routes available for ${crisisTitle}. Contact emergency services immediately.`;
  }

  const hospitals = allSafeSpots.filter(s => s.type === "hospital").length;
  const shelters = allSafeSpots.filter(s => s.type === "shelter").length;
  const schools = allSafeSpots.filter(s => s.type === "school").length;
  const airports = allSafeSpots.filter(s => s.type === "airport").length;
  const parks = allSafeSpots.filter(s => s.type === "park").length;

  return `Evacuation plan for ${crisisTitle}: Best route is to ${primaryRoute.toSafeSpotName} (${primaryRoute.toSafeSpotType}) - ${primaryRoute.distance}km, ${primaryRoute.duration} min. ${allSafeSpots.length} total safe locations available (${hospitals} hospitals, ${shelters} shelters, ${schools} schools, ${airports} airports, ${parks} parks).`;
}

/**
 * Convert ALL safe spots to markers for table display
 */
export function safeSpotsToMarkers(
  safeSpots: SafeSpot[],
  crisisId: string
): Array<{
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: "other";
  severity?: "low" | "medium" | "high" | "critical";
}> {
  return safeSpots.map(spot => ({
    id: `${crisisId}-safe-${spot.id}`,
    title: spot.name,
    description: `${spot.type.toUpperCase()} - ${spot.distance}km away${spot.address ? ` | ${spot.address}` : ""}${spot.phone ? ` | ${spot.phone}` : ""}`,
    latitude: spot.latitude,
    longitude: spot.longitude,
    category: "other" as const,
    severity: "low" as const,
  }));
}

/**
 * Convert primary route to map route format
 */
export function compactRouteToMapRoute(
  route: CompactRoute
): {
  id: string;
  coordinates: [number, number][];
  color: string;
  width: number;
  label: string;
} {
  return {
    id: route.id,
    coordinates: route.coordinates,
    color: route.color,
    width: 4,
    label: `${route.crisisName} → ${route.toSafeSpotName} (${route.distance}km, ${route.duration}min)`,
  };
}
