"use client";

import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerPopup,
} from "@/components/ui/map";
import { z } from "zod";

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
export const tacticalMapSchema = z.object({
    markers: z
        .array(crisisMarkerSchema)
        .describe("Array of crisis markers to display on the map"),
    centerLongitude: z
        .number()
        .optional()
        .describe("Longitude to center the map on"),
    centerLatitude: z
        .number()
        .optional()
        .describe("Latitude to center the map on"),
    zoomLevel: z
        .number()
        .min(1)
        .max(18)
        .optional()
        .describe("Zoom level of the map (1-18)"),
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
    return colors[category];
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
    return icons[category];
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
    return colors[severity];
}

/**
 * TacticalMap Component
 * 
 * A map component that displays crisis markers and can be controlled by Tambo AI.
 * This component is registered with Tambo so the AI can add markers, pan, and zoom.
 */
export function TacticalMap({
    markers = [],
    centerLongitude = 0,
    centerLatitude = 20,
    zoomLevel = 2,
}: TacticalMapProps) {
    return (
        <div className="w-full h-full">
            <Map
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

                {/* Render crisis markers */}
                {markers.map((marker) => (
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
            </Map>

            {/* Crisis counter overlay */}
            {markers.length > 0 && (
                <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                    <div className="flex items-center gap-2">
                        <span className="text-red-500 animate-pulse">●</span>
                        <span className="text-sm font-medium">
                            {markers.length} Active Crisis Event{markers.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
