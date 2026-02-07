/**
 * Overpass API Service
 * 
 * Queries OpenStreetMap data for safe evacuation points near crisis locations.
 * Includes hospitals, airports, parks, and other emergency facilities.
 */

export interface SafePoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'hospital' | 'airport' | 'park' | 'shelter' | 'other';
  category: string; // amenity type from OSM
  capacity?: string;
  address?: string;
  phone?: string;
}

export interface RouteSegment {
  coordinates: [number, number][];
  distance: number; // meters
  duration: number; // seconds
}

/**
 * Find safe evacuation points near a crisis location
 * Searches for hospitals, airports, parks, and emergency shelters
 */
export async function findSafePointsNear(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<SafePoint[]> {
  try {
    // Simple, reliable query for safe evacuation points
    const query = `
      [out:json][timeout:30];
      (
        node["amenity"="hospital"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"="hospital"](around:${radiusKm * 1000},${latitude},${longitude});
        node["aeroway"="aerodrome"](around:${radiusKm * 1000},${latitude},${longitude});
        way["aeroway"="aerodrome"](around:${radiusKm * 1000},${latitude},${longitude});
        node["leisure"="park"](around:${radiusKm * 1000},${latitude},${longitude});
        way["leisure"="park"](around:${radiusKm * 1000},${latitude},${longitude});
        node["amenity"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
        way["amenity"="shelter"](around:${radiusKm * 1000},${latitude},${longitude});
      );
      out center;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    const safePoints: SafePoint[] = data.elements
      .map((element: any) => {
        // Get coordinates - for ways, use center
        const lat = element.lat || element.center?.lat;
        const lon = element.lon || element.center?.lon;

        if (!lat || !lon) return null;

        const tags = element.tags || {};
        
        // Determine type based on OSM tags
        let type: SafePoint['type'] = 'other';
        if (tags.amenity === 'hospital') type = 'hospital';
        else if (tags.aeroway === 'aerodrome') type = 'airport';
        else if (tags.leisure === 'park') type = 'park';
        else if (tags.amenity === 'shelter') type = 'shelter';
        
        return {
          id: `osm-${element.type}-${element.id}`,
          name: tags.name || tags['name:en'] || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
          latitude: lat,
          longitude: lon,
          type,
          category: tags.amenity || tags.aeroway || tags.leisure || 'safe_point',
          capacity: tags.capacity || tags.beds || undefined,
          address: [
            tags['addr:street'],
            tags['addr:housenumber'],
            tags['addr:city'],
          ]
            .filter(Boolean)
            .join(', ') || undefined,
          phone: tags.phone || tags['contact:phone'] || undefined,
        };
      })
      .filter((p: SafePoint | null): p is SafePoint => p !== null);

    // Sort by distance (approximate)
    safePoints.sort((a, b) => {
      const distA = Math.hypot(a.latitude - latitude, a.longitude - longitude);
      const distB = Math.hypot(b.latitude - latitude, b.longitude - longitude);
      return distA - distB;
    });

    return safePoints;
    
  } catch (error) {
    return [];
  }
}

/**
 * Calculate route from safe point to crisis location using OSRM
 */
export async function calculateRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteSegment | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.routes?.[0]?.geometry?.coordinates) {
      return null;
    }

    const route = data.routes[0];

    return {
      coordinates: route.geometry.coordinates as [number, number][],
      distance: route.distance, // meters
      duration: route.duration, // seconds
    };
  } catch (error) {
    return null;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
}
