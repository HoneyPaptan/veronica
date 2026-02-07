/**
 * @file evacuation-service.ts
 * @description Simplified service for finding nearby safe spots during crises
 * 
 * SIMPLIFIED VERSION:
 * - Finds up to 5 nearest safe spots (hospitals, shelters, schools, airports, parks)
 * - Returns markers compatible with crisisMarkerSchema
 * - No complex routes - just markers on the map
 */

import { z } from "zod";
import type { CrisisMarker } from "@/lib/markers";

// Safe spot types that can be evacuation destinations
export type SafeSpotType = "hospital" | "park" | "airport" | "shelter" | "school";

// Schema for a safe spot location
export const safeSpotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  distance: z.number(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type SafeSpot = z.infer<typeof safeSpotSchema>;

// Priority order for safe spot types (hospital is best for emergencies)
const SAFE_SPOT_PRIORITY: SafeSpotType[] = ["hospital", "shelter", "school", "airport", "park"];

// Glow colors for each safe spot type
const GLOW_COLORS: Record<SafeSpotType, { gradient: string; glow: string }> = {
  hospital: { gradient: "from-red-500 to-red-600", glow: "shadow-red-500/50" },
  shelter: { gradient: "from-amber-500 to-amber-600", glow: "shadow-amber-500/50" },
  school: { gradient: "from-purple-500 to-purple-600", glow: "shadow-purple-500/50" },
  airport: { gradient: "from-blue-500 to-blue-600", glow: "shadow-blue-500/50" },
  park: { gradient: "from-green-500 to-green-600", glow: "shadow-green-500/50" },
};

// Icon components for each type
const ICONS: Record<SafeSpotType, string> = {
  hospital: "🏥",
  shelter: "🏠",
  school: "🏫",
  airport: "✈️",
  park: "🌳",
};

/**
 * Query Overpass API for nearby safe spots
 */
async function findSafeSpots(
  latitude: number,
  longitude: number,
  radius: number = 20000
): Promise<SafeSpot[]> {
  const safeSpots: SafeSpot[] = [];

  const overpassQuery = `
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:${radius},${latitude},${longitude});
      way["amenity"="hospital"](around:${radius},${latitude},${longitude});
      node["amenity"="clinic"](around:${radius},${latitude},${longitude});
      node["amenity"="shelter"](around:${radius},${latitude},${longitude});
      node["amenity"="school"](around:${radius},${latitude},${longitude});
      node["aeroway"="aerodrome"](around:${radius},${latitude},${longitude});
      node["leisure"="park"](around:${radius},${latitude},${longitude});
    );
    out center 15;
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
        address: tags["addr:street"],
        phone: tags.phone,
      });
    }

    // Sort by priority then distance
    safeSpots.sort((a, b) => {
      const priorityA = SAFE_SPOT_PRIORITY.indexOf(a.type as SafeSpotType);
      const priorityB = SAFE_SPOT_PRIORITY.indexOf(b.type as SafeSpotType);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.distance - b.distance;
    });

    return safeSpots.slice(0, 5);

  } catch (error) {
    return safeSpots;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
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
 * Find safe spots near a crisis location
 * Returns markers compatible with crisisMarkerSchema
 */
export async function findEvacuationSpots(
  crisisId: string,
  crisisTitle: string,
  crisisLatitude: number,
  crisisLongitude: number,
  options: { searchRadius?: number } = {}
): Promise<{
  crisisId: string;
  crisisTitle: string;
  crisisLatitude: number;
  crisisLongitude: number;
  safeSpots: SafeSpot[];
  markers: CrisisMarker[];
  summary: string;
  found: boolean;
}> {
  const { searchRadius = 20000 } = options;

  const safeSpots = await findSafeSpots(crisisLatitude, crisisLongitude, searchRadius);

  // Convert to CrisisMarker array
  const markers: CrisisMarker[] = safeSpots.map((spot, index) => {
    const safeType = spot.type as SafeSpotType;
    const glowColors = GLOW_COLORS[safeType];
    
    return {
      id: `${crisisId}-safe-${index}`,
      title: spot.name,
      description: `${ICONS[safeType]} ${safeType.toUpperCase()} - ${spot.distance}km away${spot.address ? ` | ${spot.address}` : ""}`,
      latitude: spot.latitude,
      longitude: spot.longitude,
      category: "other",
      markerStyle: "safeSpot",
      safeSpotType: safeType,
      distance: spot.distance,
    };
  });

  // Generate summary
  const summary = safeSpots.length > 0
    ? `Found ${safeSpots.length} safe location(s) near ${crisisTitle}. Nearest: ${safeSpots[0].name} (${safeSpots[0].type}) - ${safeSpots[0].distance}km away.`
    : `No safe locations found within 20km of ${crisisTitle}. Please contact emergency services: 112 (universal emergency number).`;

  return {
    crisisId,
    crisisTitle,
    crisisLatitude,
    crisisLongitude,
    safeSpots,
    markers,
    summary,
    found: safeSpots.length > 0,
  };
}
