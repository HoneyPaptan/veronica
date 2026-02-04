"use client";

import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MapClusterLayer,
    MapRoute,
    type MapRef,
} from "@/components/ui/map";
import { withInteractable } from "@tambo-ai/react";
import { z } from "zod";
import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Schema for crisis markers that Tambo can manipulate
 */
export const crisisMarkerSchema = z.object({
    id: z.string().describe("Unique identifier for the crisis event"),
    title: z.string().describe("Title or name of the crisis event"),
    description: z.string().optional().describe("Detailed description of the crisis"),
    latitude: z.number().describe("Latitude coordinate of the crisis location"),
    longitude: z.number().describe("Longitude coordinate of the crisis location"),
    category: z
        .enum(["wildfire", "volcano", "earthquake", "flood", "storm", "news", "other"])
        .describe("Category of the crisis event. Use 'news' for article markers from Tavily."),
    severity: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("Severity level of the crisis"),
    date: z.string().optional().describe("Date of the crisis event"),
    source: z.string().optional().describe("Data source for this crisis"),
    url: z.string().optional().describe("URL link to the source article or more information. ALWAYS include this for Tavily news results."),
});

export type CrisisMarker = z.infer<typeof crisisMarkerSchema>;

/**
 * Schema for the TacticalMap component props that Tambo AI can control
 */

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

// Route point schema for drawing routes on the map
export const routePointSchema = z.object({
    latitude: z.number().describe("Latitude of the route waypoint"),
    longitude: z.number().describe("Longitude of the route waypoint"),
    label: z.string().optional().describe("Optional label for this waypoint"),
});

export const routeSchema = z.object({
    id: z.string().describe("Unique identifier for the route"),
    points: z.array(routePointSchema).describe("Array of waypoints defining the route path"),
    color: z.string().optional().describe("Route line color (hex or CSS color)"),
    width: z.number().optional().describe("Route line width in pixels"),
    label: z.string().optional().describe("Label for the route"),
});

export type RoutePoint = z.infer<typeof routePointSchema>;
export type Route = z.infer<typeof routeSchema>;

export const tacticalMapSchema = z.object({
    markers: z
        .array(crisisMarkerSchema)
        .optional()
        .describe("Array of crisis markers to display on the map. Each marker has id, title, latitude, longitude, category, and optional severity."),
    routes: z
        .array(routeSchema)
        .optional()
        .describe("Array of routes to draw on the map. Each route has waypoints with lat/lng coordinates."),
    centerLongitude: z
        .number()
        .optional()
        .describe("Longitude to center the map on (-180 to 180). Use for zooming to specific locations."),
    centerLatitude: z
        .number()
        .optional()
        .describe("Latitude to center the map on (-90 to 90). Use for zooming to specific locations."),
    zoomLevel: z
        .number()
        .min(1)
        .max(18)
        .optional()
        .describe("Zoom level: 1-3 (continent), 4-6 (country), 7-10 (city), 11-14 (neighborhood), 15-18 (street)"),
    enableClustering: z
        .boolean()
        .optional()
        .describe("Enable clustering of markers for better performance with many points (default: true for 10+ markers)"),
    flyToMarkers: z
        .boolean()
        .optional()
        .describe("Automatically fly to fit all markers in view. Set to true when displaying new data."),
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
 * Get marker icon based on crisis category
 */
function getMarkerIcon(category: CrisisMarker["category"]): string {
    const icons: Record<CrisisMarker["category"], string> = {
        wildfire: "🔥",
        volcano: "🌋",
        earthquake: "🌍",
        flood: "🌊",
        storm: "🌪️",
        news: "📰",
        other: "⚠️",
    };
    return icons[category] || "⚠️";
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

/**
 * Validate that a marker has valid coordinates
 * Handles streaming gracefully - silently ignores empty partial objects
 */
function isValidMarker(marker: CrisisMarker): boolean {
    if (!marker) return false;

    // Silently ignore completely empty objects (common during streaming)
    if (Object.keys(marker).length === 0) return false;

    // Support both lat/lng and latitude/longitude (common AI variation)
    const anyMarker = marker as Record<string, unknown>;
    const lat = marker.latitude ?? (anyMarker.lat as number);
    const lng = marker.longitude ?? (anyMarker.lng as number);

    const checks = {
        hasLatitude: typeof lat === "number",
        hasLongitude: typeof lng === "number",
        latNotNaN: lat !== undefined && !isNaN(lat),
        lngNotNaN: lng !== undefined && !isNaN(lng),
        latInRange: lat >= -90 && lat <= 90,
        lngInRange: lng >= -180 && lng <= 180,
        hasId: typeof marker.id === "string" && marker.id.length > 0,
        hasCategory: typeof marker.category === "string" && marker.category.length > 0,
    };

    const isValid = Object.values(checks).every(Boolean);

    // Only warn for markers that have SOME data but are incomplete (not empty streaming objects)
    if (!isValid && Object.keys(marker).length > 2) {
        const failedChecks = Object.entries(checks)
            .filter(([, v]) => !v)
            .map(([k]) => k);
        console.warn("Invalid marker:", { marker, failedChecks, lat, lng });
    }

    return isValid;
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
    markers = [],
    routes = [],
    centerLongitude = 0,
    centerLatitude = 20,
    zoomLevel = 2,
    enableClustering,
    flyToMarkers, // Default will be set based on markers presence
}: TacticalMapProps) {
    const mapRef = useRef<MapRef>(null);

    // Normalize and filter out invalid markers to prevent runtime errors
    // Limit to 20 markers max for performance and clarity
    const validMarkers = useMemo(() => {
        // First normalize markers to handle lat/lng vs latitude/longitude variations
        const normalized = (markers || []).map((m) => {
            const anyM = m as Record<string, unknown>;
            return {
                ...m,
                latitude: m.latitude ?? (anyM.lat as number),
                longitude: m.longitude ?? (anyM.lng as number),
            };
        });

        const filtered = normalized.filter(isValidMarker);
        // Limit to 20 markers for performance
        const limited = filtered.slice(0, 20);

        if (limited.length > 0) {
            console.info(`TacticalMap: ${limited.length} markers${filtered.length > 20 ? ` (limited from ${filtered.length})` : ''}`);
        }
        return limited;
    }, [markers]);

    // Determine if clustering should be used
    // CRITICAL: Force clustering OFF for < 50 markers even if enabled by prop
    // This ensures we show rich Emoji icons with popups for small datasets
    const useClustering = (enableClustering && validMarkers.length >= 50);

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
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "wildfire";
    }, [validMarkers]);

    // Auto-fly to fit all markers when they are present (unless explicitly disabled)
    // Default: auto-fly when markers exist and flyToMarkers is not explicitly false
    const shouldFlyToMarkers = flyToMarkers ?? (validMarkers.length > 0);

    useEffect(() => {
        if (!shouldFlyToMarkers || !mapRef.current || validMarkers.length === 0) return;

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
    }, [shouldFlyToMarkers, validMarkers]);

    // Fly to center when centerLatitude/centerLongitude/zoomLevel change (for location zoom)
    // This enables Tambo to update the map view in real-time
    useEffect(() => {
        if (!mapRef.current) return;

        // Only fly if we have no markers (markers take priority via flyToMarkers)
        // OR if markers is empty and we're explicitly setting center
        const hasMarkers = validMarkers.length > 0;

        // Small delay to ensure map is ready
        const timer = setTimeout(() => {
            if (!mapRef.current) return;

            // If we have markers and flyToMarkers is enabled, that effect handles it
            // Only fly to center if there are no markers
            if (!hasMarkers) {
                mapRef.current.flyTo({
                    center: [centerLongitude, centerLatitude],
                    zoom: zoomLevel,
                    duration: 1500,
                });
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [centerLatitude, centerLongitude, zoomLevel, validMarkers.length]);

    return (
        <div className="w-full h-full">
            <Map
                ref={mapRef}
                theme="dark"
                center={[centerLongitude, centerLatitude]}
                zoom={zoomLevel}
                minZoom={1.5}
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
                            console.log("Fire point clicked:", feature.properties);
                        }}
                    />
                )}

                {/* Render individual markers when not clustering */}
                {!useClustering && validMarkers.map((marker) => (
                    <MapMarker
                        key={marker.id}
                        longitude={marker.longitude}
                        latitude={marker.latitude}
                        offset={[0, -10]}
                    >
                        <MarkerContent>
                            <div
                                className={cn(
                                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 border-white shadow-xl cursor-pointer hover:scale-110 transition-transform duration-200 bg-background/50 backdrop-blur-sm",
                                    getMarkerColor(marker.category)
                                )}
                                title={marker.title}
                            >
                                <span className="text-xl filter drop-shadow-sm select-none">
                                    {getMarkerIcon(marker.category)}
                                </span>
                            </div>
                        </MarkerContent>

                        <MarkerPopup closeButton>
                            <div className="min-w-[200px] max-w-[300px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{getMarkerIcon(marker.category)}</span>
                                    <h3 className="font-bold text-sm">{marker.title}</h3>
                                </div>

                                {marker.severity && (
                                    <span
                                        className={cn(
                                            "inline-block px-2 py-0.5 rounded text-xs text-white mb-2",
                                            getSeverityColor(marker.severity)
                                        )}
                                    >
                                        {marker.severity.toUpperCase()}
                                    </span>
                                )}

                                {marker.description && (
                                    <p className="text-xs text-muted-foreground mb-2">
                                        {marker.description}
                                    </p>
                                )}

                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>📍 {marker.latitude.toFixed(4)}, {marker.longitude.toFixed(4)}</p>
                                    {marker.date && <p>📅 {marker.date}</p>}
                                    {marker.source && <p>📊 Source: {marker.source}</p>}
                                </div>

                                {marker.url && (
                                    <a
                                        href={marker.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                                    >
                                        🔗 Read Full Article →
                                    </a>
                                )}
                            </div>
                        </MarkerPopup>
                    </MapMarker>
                ))}

                {/* Render routes if provided */}
                {
                    routes && routes.length > 0 && routes.map((route) => (
                        <MapRoute
                            key={route.id}
                            id={route.id}
                            coordinates={route.points.map((p) => [p.longitude, p.latitude] as [number, number])}
                            color={route.color || "#3b82f6"}
                            width={route.width || 4}
                        />
                    ))
                }
            </Map >

            {/* Crisis counter overlay - only show for actual crisis events, not routes */}
            {
                (() => {
                    // Only count actual crisis categories including news, not route waypoints or generic markers
                    const crisisCategories = ["wildfire", "volcano", "earthquake", "flood", "storm", "news"];
                    const crisisMarkers = validMarkers.filter(m => crisisCategories.includes(m.category));

                    if (crisisMarkers.length === 0) return null;

                    return (
                        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-red-500 animate-pulse">●</span>
                                <span className="text-sm font-medium">
                                    {crisisMarkers.length} Active Crisis Event{crisisMarkers.length !== 1 ? "s" : ""}
                                </span>
                                {useClustering && (
                                    <span className="text-xs text-muted-foreground">(clustered)</span>
                                )}
                            </div>
                        </div>
                    );
                })()
            }
        </div >
    );
}

/**
 * InteractableTacticalMap - A version of TacticalMap that Tambo can modify in-place
 * 
 * Use this component in your layout when you want Tambo to update an existing map
 * rather than rendering new maps in the chat. This component registers itself
 * with Tambo automatically when mounted.
 */
export const InteractableTacticalMap = withInteractable(TacticalMap, {
    componentName: "TacticalMap",
    description: "A tactical crisis map that displays wildfires, volcanoes, earthquakes, and other crisis events. Tambo can update the markers, zoom level, and center position to show crisis data from NASA FIRMS and other sources.",
    propsSchema: tacticalMapSchema,
});

