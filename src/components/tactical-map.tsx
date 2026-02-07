"use client";

import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapPopup,
  MapClusterLayer,
  MapRoute,
  useMap,
  type MapRef,
} from "@/components/ui/map";
import { withInteractable } from "@tambo-ai/react";
import type maplibregl from "maplibre-gl";
import { z } from "zod";
import { useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { NewsDialog, type NewsArticle } from "@/components/news-dialog";
import { ExternalLink, MousePointer2, X, MapPin, Crosshair } from "lucide-react";

import {
  crisisMarkerSchema,
  LOCATION_PRESETS,
  type CrisisMarker,
} from "@/lib/markers";
import { useMapChatContext } from "@/components/veronica-content";
import { Ambulance } from "lucide-react";

/**
 * Schema for the TacticalMap component props that Tambo AI can control
 */

// Route schema for drawing routes on the map (simple format like mapcn)
export const routeSchema = z.object({
  id: z.string().describe("Unique identifier for the route"),
  coordinates: z
    .array(z.tuple([z.number(), z.number()]))
    .describe("Array of [longitude, latitude] coordinate pairs defining the route path"),
  color: z.string().optional().describe("Route line color (hex or CSS color)"),
  width: z.number().optional().describe("Route line width in pixels"),
  label: z.string().optional().describe("Label for the route"),
});

export type Route = z.infer<typeof routeSchema>;

export const tacticalMapSchema = z.object({
  markers: z
    .array(crisisMarkerSchema)
    .optional()
    .describe(
      "Array of crisis markers to display on the map. Each marker has id, title, latitude, longitude, category, and optional severity."
    ),
  routes: z
    .array(routeSchema)
    .optional()
    .describe(
      "Array of routes to draw on the map. Each route has waypoints with lat/lng coordinates."
    ),
  centerLongitude: z
    .number()
    .optional()
    .describe(
      "Longitude to center the map on (-180 to 180). Use for zooming to specific locations."
    ),
  centerLatitude: z
    .number()
    .optional()
    .describe(
      "Latitude to center the map on (-90 to 90). Use for zooming to specific locations."
    ),
  zoomLevel: z
    .number()
    .min(1)
    .max(18)
    .optional()
    .describe(
      "Zoom level: 1-3 (continent), 4-6 (country), 7-10 (city), 11-14 (neighborhood), 15-18 (street)"
    ),
  enableClustering: z
    .boolean()
    .optional()
    .describe(
      "Enable clustering of markers for better performance with many points (default: true for 10+ markers)"
    ),
  flyToMarkers: z
    .boolean()
    .optional()
    .describe(
      "Automatically fly to fit all markers in view. Set to true when displaying new data."
    ),
  regionName: z
    .string()
    .optional()
    .describe(
      "High-level region, country, or city name to highlight when precise coordinates are unavailable (e.g. from Tavily results). Examples: 'india', 'myanmar', 'europe', 'north america'. The map will center and highlight this region even if markers have no lat/long."
    ),
  highlightRegions: z
    .array(z.string())
    .optional()
    .describe(
      "Array of region names to shade on the map using tactical polygons (e.g. ['india', 'china']). Uses approximate bounds per region, similar to mapcn's custom GeoJSON layer example."
    ),
});

export type TacticalMapProps = z.infer<typeof tacticalMapSchema>;


/**
 * Get marker color based on crisis category
 */
function getMarkerColor(category: CrisisMarker["category"]): string {
  // Using bright colors that are visible on dark map backgrounds
  const colors: Record<CrisisMarker["category"], string> = {
    wildfire: "bg-orange-400",
    volcano: "bg-red-500",
    earthquake: "bg-yellow-400",
    flood: "bg-sky-400",
    storm: "bg-violet-400",
    news: "bg-emerald-400",
    other: "bg-slate-400",
  };
  return colors[category] || "bg-slate-400";
}

/**
 * Get cluster/point color based on category
 */
function getClusterPointColor(category?: string): string {
  // Bright colors for cluster points - visible on dark backgrounds
  const colors: Record<string, string> = {
    wildfire: "#fb923c", // orange-400 - bright orange
    volcano: "#ef4444", // red-500 - vivid red
    earthquake: "#facc15", // yellow-400 - bright yellow
    flood: "#38bdf8", // sky-400 - bright sky blue
    storm: "#a78bfa", // violet-400 - bright violet
    news: "#34d399", // emerald-400 - bright green
    other: "#94a3b8", // slate-400 - light slate
  };
  return colors[category || "wildfire"] || "#fb923c";
}

/**
 * Get severity badge color
 */
function getSeverityColor(severity?: CrisisMarker["severity"]): string {
  if (!severity) return "bg-gray-500";
  const colors: Record<NonNullable<CrisisMarker["severity"]>, string> = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };
  return colors[severity] || "bg-gray-500";
}

function resolveRegionFromName(name?: string) {
  if (!name) return null;

  const normalized = name.toLowerCase().trim();
  if (!normalized) return null;

  const presetKey = Object.keys(LOCATION_PRESETS).find((key) => {
    const k = key.toLowerCase();
    return normalized === k || normalized.includes(k) || k.includes(normalized);
  });

  if (!presetKey) return null;
  const preset = LOCATION_PRESETS[presetKey];
  return { ...preset, key: presetKey };
}

// Approximate rectangular bounds for key regions/countries, used to draw shaded coverage
// polygons when we only know coarse locations (e.g. "india", "china").
const REGION_BOUNDS: Record<string, [number, number, number, number]> = {
  world: [-180, -85, 180, 85],
  china: [73.0, 18.0, 135.0, 54.0],
  india: [68.0, 6.0, 98.0, 36.0],
  "south asia": [60.0, 0.0, 105.0, 35.0],
  "south-east asia": [90.0, -10.0, 150.0, 25.0],
  "north america": [-170, 10, -50, 75],
  "south america": [-85, -57, -32, 14],
  europe: [-25, 35, 45, 72],
  africa: [-20, -37, 55, 38],
  asia: [25, -15, 180, 75],
  "middle east": [30, 10, 70, 40],
};

function buildRegionFeature(name: string): GeoJSON.Feature<GeoJSON.Polygon> | null {
  const key =
    Object.keys(REGION_BOUNDS).find((k) => {
      const nk = k.toLowerCase();
      const nn = name.toLowerCase();
      return nk === nn || nk.includes(nn) || nn.includes(nk);
    }) ?? null;

  const bounds = key ? REGION_BOUNDS[key] : null;
  if (!bounds) return null;

  const [west, south, east, north] = bounds;
  const coordinates: [number, number][][] = [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ];

  return {
    type: "Feature",
    properties: {
      name,
      key,
    },
    geometry: {
      type: "Polygon",
      coordinates,
    },
  };
}

/**
 * RegionHighlightLayer
 *
 * Draws translucent polygons for high-level regions (e.g. "india", "china") using
 * MapLibre GeoJSON layers, similar to the "Show Parks" example from mapcn.
 */
function RegionHighlightLayer({ regions }: { regions: string[] }) {
  const { map, isLoaded } = useMap();
  const sourceId = "tactical-regions";
  const fillLayerId = "tactical-regions-fill";
  const outlineLayerId = "tactical-regions-outline";

  const geoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon>>(
    () => ({
      type: "FeatureCollection",
      features: regions
        .map((name) => buildRegionFeature(name))
        .filter((f): f is GeoJSON.Feature<GeoJSON.Polygon> => !!f),
    }),
    [regions]
  );

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add or update source
    const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (!existingSource) {
      map.addSource(sourceId, {
        type: "geojson",
        data: geoJson,
      });
    } else {
      existingSource.setData(geoJson);
    }

    // Add fill layer if missing
    if (!map.getLayer(fillLayerId)) {
      map.addLayer({
        id: fillLayerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.25,
        },
      });
    }

    // Add outline layer if missing
    if (!map.getLayer(outlineLayerId)) {
      map.addLayer({
        id: outlineLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#22c55e",
          "line-width": 2,
        },
      });
    }

    return () => {
      if (!map) return;
      try {
        if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [map, isLoaded, geoJson]);

  return null;
}

/**
 * Map style selector - allows switching between different map styles
 * Includes Default (Carto), OpenStreetMap, and OpenStreetMap 3D
 */
function MapStyleSelector() {
  const { map } = useMap();
  const [style, setStyle] = useState<"default" | "openstreetmap" | "openstreetmap3d">("default");

  const styles = {
    default: undefined, // Uses default Carto style
    openstreetmap: "https://tiles.openfreemap.org/styles/bright",
    openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
  };

  const handleStyleChange = (newStyle: typeof style) => {
    if (!map) return;
    
    setStyle(newStyle);
    
    const styleUrl = styles[newStyle];
    const is3D = newStyle === "openstreetmap3d";
    
    // Change map style if not default
    if (styleUrl) {
      map.setStyle(styleUrl);
    }
    
    // Adjust pitch for 3D view
    map.easeTo({ pitch: is3D ? 60 : 0, duration: 500 });
  };

  return (
    <div className="pointer-events-auto absolute left-4 bottom-4 z-20">
      <select
        value={style}
        onChange={(e) => handleStyleChange(e.target.value as typeof style)}
        className="rounded-md border border-border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-sm hover:bg-background transition-colors cursor-pointer"
      >
        <option value="default">Default (Carto)</option>
        <option value="openstreetmap">OpenStreetMap</option>
        <option value="openstreetmap3d">OpenStreetMap 3D</option>
      </select>
    </div>
  );
}

/**
 * Selected location info for the select mode feature
 */
export interface SelectedLocation {
  latitude: number;
  longitude: number;
  placeName?: string;
}

/**
 * SelectModeToggle - Button to enable/disable location selection mode
 */
function SelectModeToggle({
  isSelectMode,
  onToggle
}: {
  isSelectMode: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "pointer-events-auto absolute right-4 top-4 z-20 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition-all",
        isSelectMode
          ? "border-cyan-500 bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500/30"
          : "border-border bg-background/80 text-foreground hover:bg-accent/70"
      )}
      title={isSelectMode ? "Click anywhere on the map to select a location" : "Enable location selection mode"}
    >
      <Crosshair className={cn("h-4 w-4", isSelectMode && "animate-pulse")} />
      {isSelectMode ? "Select Mode ON" : "Select Location"}
    </button>
  );
}

/**
 * SelectedLocationPopup - Shows info about the selected location with action buttons
 */
function SelectedLocationPopup({
  location,
  onClose,
  onSendToChat,
}: {
  location: SelectedLocation;
  onClose: () => void;
  onSendToChat: (query: string) => void;
}) {
  const quickActions = [
    { label: "Get News", query: `Get news for this location at coordinates ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${location.placeName ? ` (${location.placeName})` : ''}` },
    { label: "Check Wildfires", query: `Show wildfires near coordinates ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${location.placeName ? ` (${location.placeName})` : ''}` },
    { label: "Weather Info", query: `What's the weather at ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${location.placeName ? ` (${location.placeName})` : ''}?` },
  ];

  return (
    <div className="glass-card min-w-[260px] max-w-[320px] rounded-lg p-4 text-sm backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Selected Location</h3>
            {location.placeName && (
              <p className="text-xs text-muted-foreground">{location.placeName}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Coordinates */}
      <div className="mb-4 rounded-md bg-muted/50 p-2 font-mono text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lat:</span>
          <span className="text-foreground">{location.latitude.toFixed(6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lng:</span>
          <span className="text-foreground">{location.longitude.toFixed(6)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => onSendToChat(action.query)}
              className="rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-accent hover:border-cyan-500/50 hover:text-cyan-400"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Query Hint */}
      <p className="mt-3 text-[10px] text-muted-foreground/70 text-center">
        Or type your own query in the chat with this location
      </p>
    </div>
  );
}

/**
 * MapClickHandler - Handles map clicks when in select mode
 */
function MapClickHandler({
  isSelectMode,
  onLocationSelect,
}: {
  isSelectMode: boolean;
  onLocationSelect: (location: SelectedLocation) => void;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !isSelectMode) return;

    const handleClick = async (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;

      // Try to get place name via reverse geocoding (using Nominatim - free)
      let placeName: string | undefined;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
          { headers: { 'User-Agent': 'VeronicaApp/1.0' } }
        );
        if (response.ok) {
          const data = await response.json();
          placeName = data.display_name?.split(',').slice(0, 3).join(',') || data.name;
        }
      } catch {
        // Ignore geocoding errors - we'll just use coordinates
      }

      onLocationSelect({
        latitude: lat,
        longitude: lng,
        placeName,
      });
    };

    map.on('click', handleClick);

    // Change cursor to crosshair when in select mode
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isLoaded, isSelectMode, onLocationSelect]);

  return null;
}

function isValidMarker(marker: CrisisMarker): boolean {
  if (!marker) return false;

  // Silently ignore completely empty objects (common during streaming)
  if (Object.keys(marker).length === 0) return false;

  const anyMarker = marker as any;

  // Prefer explicit latitude/longitude (already coerced by Zod), but fall back to lat/lng
  let lat: number | undefined = anyMarker.latitude ?? anyMarker.lat;
  let lng: number | undefined = anyMarker.longitude ?? anyMarker.lng;

  if (typeof lat === "string") lat = parseFloat(lat);
  if (typeof lng === "string") lng = parseFloat(lng);

  if (typeof lat !== "number" || !Number.isFinite(lat)) return false;
  if (typeof lng !== "number" || !Number.isFinite(lng)) return false;

  anyMarker.latitude = lat;
  anyMarker.longitude = lng;

  return true;
}

/**
 * Convert markers to GeoJSON FeatureCollection for clustering
 */
function markersToGeoJSON(markers: CrisisMarker[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: markers.map((marker) => ({
      type: "Feature" as const,
      properties: {
        id: marker.id,
        title: marker.title,
        description: marker.description,
        category: marker.category,
        severity: marker.severity,
        date: marker.date,
        source: marker.source,
        url: marker.url,
        relatedNews: marker.relatedNews ?? [],
      },
      geometry: {
        type: "Point" as const,
        coordinates: [marker.longitude, marker.latitude],
      },
    })),
  };
}

/**
 * TacticalMap Component
 * 
 * A map component that displays crisis markers and can be controlled by Tambo AI.
 * This component is registered with Tambo so the AI can add markers, pan, and zoom.
 * 
 * Features:
 * - Crisis marker display with category icons and severity badges
 * - Automatic clustering for large datasets (50+ markers)
 * - Smooth fly-to animations
 * - Responsive popups with crisis details
 */
export function TacticalMap({
  markers,
  routes,
  centerLongitude,
  centerLatitude,
  zoomLevel,
  enableClustering,
  flyToMarkers,
  regionName,
  highlightRegions,
  // Internal props for select mode (passed from InteractableTacticalMap wrapper)
  _isSelectMode,
  _onLocationSelect,
}: TacticalMapProps & {
  _isSelectMode?: boolean;
  _onLocationSelect?: (location: SelectedLocation) => void;
}) {
  // Apply defaults safely - handle null, undefined, and empty values
  const safeMarkers = Array.isArray(markers) ? markers : [];
  const safeRoutes = Array.isArray(routes) ? routes : [];
  const safeCenterLongitude = typeof centerLongitude === 'number' ? centerLongitude : 0;
  const safeCenterLatitude = typeof centerLatitude === 'number' ? centerLatitude : 20;
  const safeZoomLevel = typeof zoomLevel === 'number' ? zoomLevel : 2;
  const safeHighlightRegions = Array.isArray(highlightRegions) ? highlightRegions : [];
  const safeRegionName = typeof regionName === 'string' && regionName.length > 0 ? regionName : undefined;

  // Debug logging
  console.log('TacticalMap received:', {
    markersCount: safeMarkers.length,
    markers: safeMarkers.slice(0, 2), // Log first 2 markers for debugging
    flyToMarkers,
    enableClustering,
    regionName: safeRegionName,
    centerLatitude: safeCenterLatitude,
    centerLongitude: safeCenterLongitude,
  });

  const mapRef = useRef<MapRef>(null);
  const [clusterPopup, setClusterPopup] = useState<{
    longitude: number;
    latitude: number;
    properties: Record<string, any>;
  } | null>(null);

  const [newsDialogState, setNewsDialogState] = useState<{
    open: boolean;
    title: string;
    articles: NewsArticle[];
    mainArticle?: {
      title: string;
      description?: string;
      url?: string;
      source?: string;
      date?: string;
      image?: string;
    };
  }>({
    open: false,
    title: "",
    articles: [],
  });

  // Get setPendingQuery from context to send messages to chat
  const { setPendingQuery } = useMapChatContext();

  // Handler to open news modal from marker
  const openNewsModal = (marker: CrisisMarker) => {
    // Safely handle relatedNews - it might be null, undefined, or not an array
    const relatedNewsArray = Array.isArray(marker.relatedNews) ? marker.relatedNews : [];

    const articles: NewsArticle[] = relatedNewsArray.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      source: item.source,
      snippet: item.snippet,
      publishedAt: item.publishedAt,
      image: item.image,
    }));

    // If no related news, create one from the marker itself
    if (articles.length === 0) {
      articles.push({
        id: marker.id,
        title: marker.title,
        url: marker.url,
        source: marker.source,
        snippet: marker.description,
        publishedAt: marker.date,
      });
    }

    setNewsDialogState({
      open: true,
      title: marker.title,
      articles,
      mainArticle: {
        title: marker.title,
        description: marker.description,
        url: marker.url,
        source: marker.source,
        date: marker.date,
      },
    });
  };

  // Handler to request evacuation plan for a specific marker
  const requestEvacuationPlan = (marker: CrisisMarker) => {
    const query = `Plan evacuation routes for the ${marker.category} at coordinates ${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)} (${marker.title})`;
    setPendingQuery(query);
  };

  // Normalize and filter out invalid markers to prevent runtime errors.
  // Limit to 20 markers max for performance and clarity.
  const filteredMarkers = safeMarkers.filter(isValidMarker);
  const validMarkers = filteredMarkers.slice(0, 20);

  // Debug: Log marker validation results
  if (safeMarkers.length > 0) {
    console.log('Marker validation:', {
      received: safeMarkers.length,
      valid: filteredMarkers.length,
      displayed: validMarkers.length,
      firstMarkerCoords: validMarkers[0] ? { lat: validMarkers[0].latitude, lng: validMarkers[0].longitude } : 'none',
      invalidMarkers: safeMarkers.filter(m => !isValidMarker(m)).map(m => ({ id: m?.id, lat: (m as any)?.latitude, lng: (m as any)?.longitude }))
    });
  }

  if (validMarkers.length > 0) {
    console.info(
      `TacticalMap: ${validMarkers.length} markers${filteredMarkers.length > 20 ? ` (limited from ${filteredMarkers.length})` : ""
      }`
    );
  }

  // Optional region highlight when we only have a coarse location string (Tavily-style)
  const regionFromProp = resolveRegionFromName(safeRegionName);
  const regionsToHighlight: string[] =
    safeHighlightRegions.length > 0
      ? safeHighlightRegions
      : !validMarkers.length && safeRegionName
        ? [safeRegionName]
        : [];

  // Determine if clustering should be used.
  // Default: auto-enable when there are many markers, but allow Tambo to override.
  const useClustering =
    (enableClustering ?? validMarkers.length > 25) && validMarkers.length > 0;

  // Convert markers to GeoJSON for clustering
  const geoJsonData = useMemo(
    () => markersToGeoJSON(validMarkers),
    [validMarkers]
  );

  // Get the most common category for cluster coloring
  const primaryCategory = useMemo(() => {
    if (validMarkers.length === 0) return "wildfire";
    const counts: Record<string, number> = {};
    validMarkers.forEach((m) => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return (
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "wildfire"
    );
  }, [validMarkers]);

  // Only fly to markers when explicitly requested by Tambo (flyToMarkers === true)
  // Don't auto-fly just because markers exist
  const shouldFlyToMarkers = flyToMarkers === true;
  const prevMarkerCountRef = useRef(0);

  useEffect(() => {
    if (!shouldFlyToMarkers || !mapRef.current || validMarkers.length === 0)
      return;

    // Only fly if this is a NEW set of markers (count changed)
    if (validMarkers.length === prevMarkerCountRef.current) {
      return;
    }

    prevMarkerCountRef.current = validMarkers.length;

    // Small delay to ensure map is ready
    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      const bounds = validMarkers.reduce(
        (acc, marker) => ({
          minLng: Math.min(acc.minLng, marker.longitude),
          maxLng: Math.max(acc.maxLng, marker.longitude),
          minLat: Math.min(acc.minLat, marker.latitude),
          maxLat: Math.max(acc.maxLat, marker.latitude),
        }),
        { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }
      );

      mapRef.current.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 80, duration: 1500, maxZoom: 10 }
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [shouldFlyToMarkers, validMarkers.length]);

  // Track if center/zoom was explicitly set by Tambo
  const prevCenterRef = useRef<{lat: number, lng: number, zoom: number} | null>(null);

  // Only fly to center when Tambo explicitly changes centerLatitude/centerLongitude/zoomLevel
  // Don't fly on initial render or when just interacting with the map
  useEffect(() => {
    if (!mapRef.current) return;

    const currentCenter = {
      lat: safeCenterLatitude,
      lng: safeCenterLongitude,
      zoom: safeZoomLevel
    };

    // Skip if this is the first render (no previous center)
    if (!prevCenterRef.current) {
      prevCenterRef.current = currentCenter;
      return;
    }

    // Only fly if Tambo explicitly changed the center/zoom
    const centerChanged = 
      prevCenterRef.current.lat !== currentCenter.lat ||
      prevCenterRef.current.lng !== currentCenter.lng ||
      prevCenterRef.current.zoom !== currentCenter.zoom;

    if (!centerChanged) {
      return;
    }

    prevCenterRef.current = currentCenter;

    // Only fly if we have no markers (markers take priority via flyToMarkers)
    const hasMarkers = validMarkers.length > 0;

    if (!hasMarkers) {
      const targetCenter =
        regionFromProp != null
          ? [regionFromProp.lng, regionFromProp.lat]
          : [safeCenterLongitude, safeCenterLatitude] as [number, number];
      const targetZoom = regionFromProp != null ? regionFromProp.zoom : safeZoomLevel;

      mapRef.current.flyTo({
        center: targetCenter as [number, number],
        zoom: targetZoom,
        duration: 1500,
      });
    }
  }, [safeCenterLatitude, safeCenterLongitude, safeZoomLevel, regionFromProp, validMarkers.length]);

  // Set initial camera angle for 3D globe view
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    
    const setupCamera = () => {
      console.log('🌍 Setting up 3D camera angle...');
      map.easeTo({
        pitch: 50,
        bearing: 0,
        duration: 1000,
      });
    };
    
    // Wait for map to load before adjusting camera
    if (map.loaded()) {
      setupCamera();
    } else {
      map.once('load', setupCamera);
    }
    
    return () => {
      map.off('load', setupCamera);
    };
  }, []);

  // Handle zoom level changes to switch between globe and flat view
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current;
    
    const handleZoom = () => {
      const zoom = map.getZoom();
      
      // Switch to flat mercator when zoomed in (zoom > 5)
      // Keep globe when zoomed out (zoom <= 5)
      if (zoom > 5) {
        const currentProjection = (map as any).getProjection();
        if (currentProjection?.name === "globe") {
          console.log('📍 Switching to flat mercator projection');
          (map as any).setProjection({ name: "mercator" });
          map.easeTo({ pitch: 0, duration: 800 });
        }
      } else {
        const currentProjection = (map as any).getProjection();
        if (currentProjection?.name !== "globe") {
          console.log('🌍 Switching to globe projection');
          (map as any).setProjection({ name: "globe" });
          map.easeTo({ pitch: 50, duration: 800 });
        }
      }
    };
    
    map.on('zoom', handleZoom);
    
    return () => {
      map.off('zoom', handleZoom);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <Map
        ref={mapRef}
        theme="dark"
        projection={{ type: "globe" }}
        center={
          regionFromProp != null
            ? [regionFromProp.lng, regionFromProp.lat]
            : [safeCenterLongitude, safeCenterLatitude]
        }
        zoom={regionFromProp != null ? regionFromProp.zoom : safeZoomLevel}
        minZoom={1}
        maxZoom={18}
      >
        <MapControls
          position="bottom-right"
          showZoom={true}
          showCompass={true}
          showLocate={true}
          showFullscreen={true}
        />

        {/* Use clustering for large datasets */}
        {useClustering && validMarkers.length > 0 && (
          <MapClusterLayer
            data={geoJsonData}
            clusterMaxZoom={14}
            clusterRadius={60}
            clusterColors={[
              getClusterPointColor(primaryCategory),
              "#f59e0b", // amber for medium clusters
              "#dc2626", // red for large clusters
            ]}
            clusterThresholds={[20, 100]}
            pointColor={getClusterPointColor(primaryCategory)}
            onPointClick={(feature, coordinates) => {
              // Open a popup for individual crisis points rendered via the cluster layer.
              setClusterPopup({
                longitude: coordinates[0],
                latitude: coordinates[1],
                properties: (feature.properties ?? {}) as Record<string, any>,
              });
            }}
          />
        )}

        {/* Render individual markers when not clustering */}
        {!useClustering &&
          validMarkers.map((marker) => (
            <MapMarker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              offset={[0, -12]}
            >
              <MarkerContent className="z-10 group cursor-pointer">
                {/* Clean pin-style marker like mapcn examples */}
                <div className="relative flex flex-col items-center">
                  {/* Pin head - solid circle with border */}
                  <div
                    className={cn(
                      "relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-110",
                      getMarkerColor(marker.category)
                    )}
                    title={marker.title}
                  >
                    {/* Inner dot for emphasis */}
                    <div className="h-2 w-2 rounded-full bg-white/90" />
                  </div>
                  {/* Pin point - triangle pointing down */}
                  <div 
                    className={cn(
                      "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-[1px]",
                      getMarkerColor(marker.category).replace('bg-', 'border-t-')
                    )}
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                    }}
                  />
                </div>
              </MarkerContent>


              <MarkerPopup closeButton>
                {/* Clean card design like mapcn Brooklyn Bridge example */}
                <div className="min-w-[280px] max-w-[320px] rounded-xl overflow-hidden bg-card border border-border shadow-xl">
                  {/* Category badge at top */}
                  <div className="px-4 pt-3 pb-2">
                    <span className={cn(
                      "inline-block px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white",
                      getMarkerColor(marker.category)
                    )}>
                      {marker.category}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <div className="px-4 pb-3">
                    <h3 className="text-base font-semibold text-foreground leading-tight line-clamp-2">
                      {marker.title}
                    </h3>
                    {marker.source && (
                      <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-muted-foreground/60">Source:</span>
                        {marker.source}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="px-4 pb-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => openNewsModal(marker)}
                      className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Details
                    </button>
                    
                    {/* Plan Evacuation button - only for crisis categories */}
                    {['wildfire', 'volcano', 'earthquake', 'flood', 'storm'].includes(marker.category) && (
                      <button
                        type="button"
                        onClick={() => requestEvacuationPlan(marker)}
                        className="w-full rounded-lg border-2 border-green-500 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 flex items-center justify-center gap-2"
                      >
                        <Ambulance className="h-4 w-4" />
                        Plan Evacuation
                      </button>
                    )}
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          ))}

        {/* Region coverage polygons for coarse locations (e.g. "india", "china").
            If Tambo doesn't explicitly provide highlightRegions, we fall back to regionName
            so that 'cover this region' instructions still produce a visible highlight. */}
        {regionsToHighlight.length > 0 && (
          <RegionHighlightLayer regions={regionsToHighlight} />
        )}

        {/* Map style selector overlay */}
        <MapStyleSelector />

        {/* Popup for crisis points rendered via the cluster layer (when zoomed out) */}
        {clusterPopup && (
          <MapPopup
            longitude={clusterPopup.longitude}
            latitude={clusterPopup.latitude}
            closeButton
            onClose={() => setClusterPopup(null)}
          >
            <div className="min-w-[220px] max-w-[280px] space-y-3">
              {/* Compact header with category indicator */}
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_8px_currentColor]",
                    getMarkerColor(clusterPopup.properties.category || "other").replace('bg-', 'text-')
                  )}
                  style={{ backgroundColor: 'currentColor' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    {clusterPopup.properties.category || "event"}
                  </span>
                  <h3 className="mt-1.5 font-medium leading-snug tracking-tight text-foreground line-clamp-2">
                    {clusterPopup.properties.title ?? "Crisis event"}
                  </h3>
                  {clusterPopup.properties.source && (
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      Via {clusterPopup.properties.source}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    // Create a marker-like object from cluster popup properties
                    const markerData: CrisisMarker = {
                      id: clusterPopup.properties.id || `cluster-${Date.now()}`,
                      title: clusterPopup.properties.title || "News",
                      description: clusterPopup.properties.description,
                      latitude: clusterPopup.latitude,
                      longitude: clusterPopup.longitude,
                      category: clusterPopup.properties.category || "news",
                      severity: clusterPopup.properties.severity,
                      date: clusterPopup.properties.date,
                      source: clusterPopup.properties.source,
                      url: clusterPopup.properties.url,
                      relatedNews: clusterPopup.properties.relatedNews,
                    };
                    openNewsModal(markerData);
                    setClusterPopup(null);
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Details
                </button>

                {/* Plan Evacuation button - only for crisis categories */}
                {['wildfire', 'volcano', 'earthquake', 'flood', 'storm'].includes(clusterPopup.properties.category) && (
                  <button
                    type="button"
                    onClick={() => {
                      const markerData: CrisisMarker = {
                        id: clusterPopup.properties.id || `cluster-${Date.now()}`,
                        title: clusterPopup.properties.title || "Crisis",
                        description: clusterPopup.properties.description,
                        latitude: clusterPopup.latitude,
                        longitude: clusterPopup.longitude,
                        category: clusterPopup.properties.category || "other",
                        severity: clusterPopup.properties.severity,
                        date: clusterPopup.properties.date,
                        source: clusterPopup.properties.source,
                        url: clusterPopup.properties.url,
                        relatedNews: clusterPopup.properties.relatedNews,
                      };
                      requestEvacuationPlan(markerData);
                      setClusterPopup(null);
                    }}
                    className="w-full rounded-md border-2 border-green-500 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 transition-all hover:bg-green-500/20 flex items-center justify-center gap-2"
                  >
                    <Ambulance className="h-3.5 w-3.5" />
                    Plan Evacuation
                  </button>
                )}
              </div>
            </div>
          </MapPopup>
        )}

        {/* Render routes if provided - simple format like mapcn */}
        {safeRoutes.length > 0 &&
          safeRoutes.map((route) => (
            <MapRoute
              key={route.id}
              id={route.id}
              coordinates={route.coordinates}
              color={route.color || "#3b82f6"}
              width={route.width || 4}
            />
          ))}

        {/* Map click handler for select mode - must be inside Map to access context */}
        {_isSelectMode && _onLocationSelect && (
          <MapClickHandler
            isSelectMode={_isSelectMode}
            onLocationSelect={_onLocationSelect}
          />
        )}
      </Map>

      {/* Crisis counter overlay - only show for actual crisis events, not routes */}
      {(() => {
        // Only count actual crisis categories including news, not route waypoints or generic markers
        const crisisCategories = [
          "wildfire",
          "volcano",
          "earthquake",
          "flood",
          "storm",
          "news",
        ];
        const crisisMarkers = validMarkers.filter((m) =>
          crisisCategories.includes(m.category)
        );

        if (crisisMarkers.length === 0) return null;

        return (
          <div className="absolute left-4 top-4 rounded-lg border border-border bg-background/80 px-3 py-2 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-medium">
                {crisisMarkers.length} Active Crisis Event
                {crisisMarkers.length !== 1 ? "s" : ""}
              </span>
              {useClustering && (
                <span className="text-xs text-muted-foreground">(clustered)</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* News Dialog Modal - opens when clicking "Read More" on a marker */}
      <NewsDialog
        isOpen={newsDialogState.open}
        onClose={() => setNewsDialogState({ ...newsDialogState, open: false })}
        title={newsDialogState.title}
        articles={newsDialogState.articles}
      />
    </div>
  );
}

/**
 * TacticalMapWithSelectMode - Wrapper that adds location selection functionality
 * 
 * This component wraps TacticalMap and adds:
 * - Select Mode toggle button
 * - Map click handling for location selection
 * - Popup with quick actions for selected location
 */
export function TacticalMapWithSelectMode({
  onLocationSelect,
  ...props
}: TacticalMapProps & {
  onLocationSelect?: (location: SelectedLocation, query: string) => void;
}) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
    // Don't auto-disable select mode so user can select multiple locations
  };

  const handleSendToChat = (query: string) => {
    if (selectedLocation && onLocationSelect) {
      onLocationSelect(selectedLocation, query);
    }
    // Close the popup after sending
    setSelectedLocation(null);
    setIsSelectMode(false);
  };

  const handleClosePopup = () => {
    setSelectedLocation(null);
  };

  return (
    <div className="relative w-full h-full">
      <TacticalMap {...props} />

      {/* Select Mode Toggle Button */}
      <SelectModeToggle
        isSelectMode={isSelectMode}
        onToggle={() => {
          setIsSelectMode(!isSelectMode);
          if (isSelectMode) {
            setSelectedLocation(null);
          }
        }}
      />

      {/* Map Click Handler - only active in select mode */}
      <MapClickHandlerWrapper
        isSelectMode={isSelectMode}
        onLocationSelect={handleLocationSelect}
      />

      {/* Selected Location Popup */}
      {selectedLocation && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
          <SelectedLocationPopup
            location={selectedLocation}
            onClose={handleClosePopup}
            onSendToChat={handleSendToChat}
          />
        </div>
      )}

      {/* Selected Location Marker */}
      {selectedLocation && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            // This is a visual indicator - actual marker would need map integration
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative">
            <div className="absolute -inset-4 bg-cyan-500/20 rounded-full animate-ping" />
            <div className="relative h-4 w-4 bg-cyan-500 rounded-full border-2 border-white shadow-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MapClickHandlerWrapper - Wrapper to use MapClickHandler outside of Map context
 * This needs to be rendered inside a Map component to access the map context
 */
function MapClickHandlerWrapper({
  isSelectMode,
  onLocationSelect,
}: {
  isSelectMode: boolean;
  onLocationSelect: (location: SelectedLocation) => void;
}) {
  // This component needs to be rendered inside the Map component
  // We'll use a portal-like approach by rendering it conditionally
  return null; // The actual handler is integrated into the Map component
}

/**
 * InteractableTacticalMap - A version of TacticalMap that Tambo can modify in-place
 * 
 * Use this component in your layout when you want Tambo to update an existing map
 * rather than rendering new maps in the chat. This component registers itself
 * with Tambo automatically when mounted.
 */
const BaseTacticalMap = withInteractable(TacticalMap, {
  componentName: "TacticalMap",
  description:
    "A tactical crisis map that displays wildfires, volcanoes, earthquakes, and other crisis events. Tambo can update the markers, zoom level, and center position to show crisis data from NASA FIRMS and other sources.",
  propsSchema: tacticalMapSchema,
});

/**
 * Wrapper component that intercepts Tambo's marker updates and accumulates them
 * This component must be stable (not recreated) to maintain Tambo's connection
 */
function TacticalMapAccumulator(props: TacticalMapProps & { _isSelectMode?: boolean; _onLocationSelect?: (location: SelectedLocation) => void }) {
  const { markers: tamboMarkers, ...restProps } = props;
  const { addMarkers, accumulatedMarkers } = useMapChatContext();

  // Debug: Log what Tambo is sending
  console.log('🔍 TacticalMapAccumulator render:', {
    tamboMarkersCount: tamboMarkers?.length || 0,
    accumulatedCount: accumulatedMarkers.length,
    tamboMarkers: tamboMarkers,
  });

  // When Tambo sends new markers, accumulate them IMMEDIATELY
  useEffect(() => {
    if (!tamboMarkers || tamboMarkers.length === 0) {
      console.log('⏭️ No markers from Tambo, skipping');
      return;
    }
    
    const validNewMarkers = tamboMarkers.filter(isValidMarker);
    console.log('🔍 Marker validation:', {
      received: tamboMarkers.length,
      valid: validNewMarkers.length,
      categories: validNewMarkers.map(m => m.category),
      ids: validNewMarkers.map(m => m.id),
    });
    
    if (validNewMarkers.length > 0) {
      console.log('✅ ADDING markers from Tambo:', validNewMarkers.length, validNewMarkers);
      addMarkers(validNewMarkers);
    } else {
      console.warn('⚠️ No valid markers to accumulate!', tamboMarkers);
    }
  }, [tamboMarkers, addMarkers]);

  // Always render with accumulated markers
  console.log('🎨 Rendering TacticalMap with', accumulatedMarkers.length, 'accumulated markers');
  return <TacticalMap {...restProps} markers={accumulatedMarkers} />;
}

// Create the interactable version ONCE at module level - this is critical!
// This ensures Tambo maintains its connection across updates
const InteractableAccumulatingMap = withInteractable(TacticalMapAccumulator, {
  componentName: "TacticalMap",
  description:
    "A tactical crisis map that displays wildfires, volcanoes, earthquakes, and other crisis events. Tambo can update the markers, zoom level, and center position to show crisis data from NASA FIRMS and other sources. IMPORTANT: Markers are ACCUMULATED - new markers are added to existing ones, not replaced.",
  propsSchema: tacticalMapSchema,
});

/**
 * InteractableTacticalMap with Select Mode
 * 
 * This is the main export that includes both Tambo interactability and location selection.
 * It also accumulates markers from multiple searches instead of replacing them.
 */
export function InteractableTacticalMap({
  onLocationSelect,
  ...props
}: TacticalMapProps & {
  onLocationSelect?: (location: SelectedLocation, query: string) => void;
}) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  const handleLocationSelect = (location: SelectedLocation) => {
    setSelectedLocation(location);
  };

  const handleSendToChat = (query: string) => {
    if (selectedLocation && onLocationSelect) {
      onLocationSelect(selectedLocation, query);
    }
    setSelectedLocation(null);
    setIsSelectMode(false);
  };

  const handleClosePopup = () => {
    setSelectedLocation(null);
  };

  return (
    <div className="relative w-full h-full">
      {/* Use the stable interactable component created at module level */}
      <InteractableAccumulatingMap
        {...props}
        _isSelectMode={isSelectMode}
        _onLocationSelect={handleLocationSelect}
      />

      {/* Select Mode Toggle Button - positioned top-right */}
      <SelectModeToggle
        isSelectMode={isSelectMode}
        onToggle={() => {
          setIsSelectMode(!isSelectMode);
          if (isSelectMode) {
            setSelectedLocation(null);
          }
        }}
      />

      {/* Select Mode Indicator Overlay */}
      {isSelectMode && !selectedLocation && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-lg" />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-cyan-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            Click anywhere on the map to select a location
          </div>
        </div>
      )}

      {/* Selected Location Popup - centered on screen */}
      {selectedLocation && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto">
          <SelectedLocationPopup
            location={selectedLocation}
            onClose={handleClosePopup}
            onSendToChat={handleSendToChat}
          />
        </div>
      )}
    </div>
  );
}

