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
        .enum(["wildfire", "volcano", "earthquake", "flood", "storm", "other"])
        .describe("Category of the crisis event"),
    severity: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("Severity level of the crisis"),
    date: z.string().optional().describe("Date of the crisis event"),
    source: z.string().optional().describe("Data source for this crisis"),
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
    const colors: Record<CrisisMarker["category"], string> = {
        wildfire: "bg-orange-500",
        volcano: "bg-red-600",
        earthquake: "bg-amber-500",
        flood: "bg-blue-500",
        storm: "bg-purple-500",
        other: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
}

/**
 * Get cluster/point color based on category
 */
function getClusterPointColor(category?: string): string {
    const colors: Record<string, string> = {
        wildfire: "#f97316", // orange-500
        volcano: "#dc2626", // red-600
        earthquake: "#f59e0b", // amber-500
        flood: "#3b82f6", // blue-500
        storm: "#a855f7", // purple-500
        other: "#6b7280", // gray-500
    };
    return colors[category || "wildfire"] || "#f97316";
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
 */
function isValidMarker(marker: CrisisMarker): boolean {
    return (
        marker &&
        typeof marker.latitude === "number" &&
        typeof marker.longitude === "number" &&
        !isNaN(marker.latitude) &&
        !isNaN(marker.longitude) &&
        marker.latitude >= -90 &&
        marker.latitude <= 90 &&
        marker.longitude >= -180 &&
        marker.longitude <= 180 &&
        typeof marker.id === "string" &&
        typeof marker.category === "string"
    );
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

    // Filter out invalid markers to prevent runtime errors
    const validMarkers = useMemo(() => {
        const filtered = (markers || []).filter(isValidMarker);
        if (filtered.length !== markers?.length) {
            console.warn(
                `TacticalMap: Filtered out ${(markers?.length || 0) - filtered.length} invalid markers`
            );
        }
        return filtered;
    }, [markers]);

    // Determine if clustering should be used (auto-enable for 10+ markers)
    const useClustering = enableClustering ?? validMarkers.length >= 10;

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
        }, 300);

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
                    >
                        <MarkerContent>
                            <div
                                className={`
                                    relative flex items-center justify-center
                                    w-8 h-8 rounded-full
                                    ${getMarkerColor(marker.category)}
                                    border-2 border-white shadow-lg
                                    text-lg cursor-pointer
                                    hover:scale-110 transition-transform
                                    animate-pulse
                                `}
                            >
                                {getMarkerIcon(marker.category)}
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
                                        className={`
                                            inline-block px-2 py-0.5 rounded text-xs text-white mb-2
                                            ${getSeverityColor(marker.severity)}
                                        `}
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
                            </div>
                        </MarkerPopup>
                    </MapMarker>
                ))}

                {/* Render routes if provided */}
                {routes && routes.length > 0 && routes.map((route) => (
                    <MapRoute
                        key={route.id}
                        id={route.id}
                        coordinates={route.points.map((p) => [p.longitude, p.latitude] as [number, number])}
                        color={route.color || "#3b82f6"}
                        width={route.width || 4}
                    />
                ))}
            </Map>

            {/* Crisis counter overlay - only show for actual crisis events, not routes */}
            {(() => {
                // Only count actual crisis categories, not route waypoints or generic markers
                const crisisCategories = ["wildfire", "volcano", "earthquake", "flood", "storm"];
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
            })()}
        </div>
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

