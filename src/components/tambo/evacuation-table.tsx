/**
 * @file evacuation-table.tsx
 * @description Component to display evacuation safe spots in a table format
 * 
 * Shows all available safe spots with details and emergency contacts.
 * This is a display-only component to avoid AI interaction loops.
 */

"use client";

import { toast } from "sonner";
import { Navigation, Phone, Building2, Trees, Plane, Home, School, AlertTriangle, MapPin } from "lucide-react";

interface SafeSpot {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance: number;
  address?: string;
  phone?: string;
}

interface EvacuationTableProps {
  crisisTitle?: string;
  safeSpots?: SafeSpot[];
  bestRoute?: {
    toSafeSpotName: string;
    toSafeSpotType: string;
    distance: number;
    duration: number;
  } | null;
  crisisLatitude?: number;
  crisisLongitude?: number;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hospital: Building2,
  park: Trees,
  airport: Plane,
  shelter: Home,
  school: School,
};

const typeColors: Record<string, string> = {
  hospital: "text-red-500 bg-red-50 border-red-200",
  park: "text-green-500 bg-green-50 border-green-200",
  airport: "text-blue-500 bg-blue-50 border-blue-200",
  shelter: "text-amber-500 bg-amber-50 border-amber-200",
  school: "text-purple-500 bg-purple-50 border-purple-200",
};

const typeLabels: Record<string, string> = {
  hospital: "Hospital",
  park: "Park/Open Area",
  airport: "Airport",
  shelter: "Emergency Shelter",
  school: "School",
};

// Global emergency numbers
const GLOBAL_EMERGENCY = {
  universal: "112",
  countries: [
    { country: "United States/Canada", number: "911" },
    { country: "United Kingdom", number: "999 or 112" },
    { country: "European Union", number: "112" },
    { country: "Australia", number: "000" },
    { country: "India", number: "112 or 100/101/102" },
    { country: "Indonesia", number: "112 or 110/118/119" },
    { country: "Japan", number: "119" },
    { country: "China", number: "110/120/119" },
    { country: "Brazil", number: "190/192/193" },
    { country: "Russia", number: "112 or 01/02/03" },
  ]
};

// Helper to validate coordinates
function isValidCoordinate(lat: number | undefined, lng: number | undefined): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

export function EvacuationTable(props: EvacuationTableProps) {
  try {
    const {
      crisisTitle: rawCrisisTitle,
      safeSpots: rawSafeSpots,
      bestRoute: rawBestRoute,
      crisisLatitude: rawCrisisLatitude,
      crisisLongitude: rawCrisisLongitude,
    } = props || {};

    const crisisTitle = typeof rawCrisisTitle === 'string' && rawCrisisTitle.length > 0
      ? rawCrisisTitle
      : "Evacuation Plan";

    const safeSpots = Array.isArray(rawSafeSpots) ? rawSafeSpots : [];
    const bestRoute = rawBestRoute && typeof rawBestRoute === 'object' ? rawBestRoute : null;
    const crisisLatitude = typeof rawCrisisLatitude === 'number' ? rawCrisisLatitude : undefined;
    const crisisLongitude = typeof rawCrisisLongitude === 'number' ? rawCrisisLongitude : undefined;

    // Check if we're still in a streaming/loading state (no crisis title or coordinates yet)
    const isLoading = !rawCrisisTitle && crisisLatitude === undefined && crisisLongitude === undefined;

    // Filter out invalid safe spots (those with missing critical data)
    const validSafeSpots = safeSpots.filter(spot =>
      spot &&
      typeof spot.name === 'string' &&
      typeof spot.type === 'string' &&
      typeof spot.latitude === 'number' &&
      typeof spot.longitude === 'number'
    );

    // Sort by priority type then distance
    const priorityOrder = ["hospital", "shelter", "school", "airport", "park"];
    const sortedSpots = [...validSafeSpots].sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a.type);
      const priorityB = priorityOrder.indexOf(b.type);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.distance || 0) - (b.distance || 0);
    });

    const hasSafeSpots = sortedSpots.length > 0;
    const hasValidCoordinates = isValidCoordinate(crisisLatitude, crisisLongitude);

    // Show loading state while data is streaming
    if (isLoading) {
      return (
        <div className="w-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-muted/50 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary animate-pulse" />
              <h3 className="font-semibold text-foreground">Planning Evacuation Route...</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Searching for nearby safe locations and calculating routes...
            </p>
          </div>
          <div className="p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Finding hospitals, shelters, and safe spots...</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Evacuation Plan: {crisisTitle}</h3>
          </div>
          {bestRoute && (
            <p className="text-sm text-muted-foreground mt-1">
              Best route: <span className="font-medium text-foreground">{bestRoute.toSafeSpotName}</span>
              {" "}({bestRoute.distance}km, {bestRoute.duration} min drive)
            </p>
          )}
        </div>

        {hasSafeSpots ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Location</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Distance</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedSpots.map((spot) => {
                    const Icon = typeIcons[spot.type] || Building2;
                    const colorClass = typeColors[spot.type] || "text-gray-500 bg-gray-50 border-gray-200";
                    const label = typeLabels[spot.type] || spot.type || "Location";

                    return (
                      <tr
                        key={spot.id || `spot-${Math.random()}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${colorClass}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{spot.name || "Unknown Location"}</div>
                          {spot.address && (
                            <div className="text-xs text-muted-foreground mt-0.5">{spot.address}</div>
                          )}
                          {spot.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Phone className="h-3 w-3" />
                              {spot.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{typeof spot.distance === 'number' ? spot.distance : '?'} km</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {typeof spot.latitude === 'number' ? spot.latitude.toFixed(4) : '?'}, {typeof spot.longitude === 'number' ? spot.longitude.toFixed(4) : '?'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div className="px-4 py-2 bg-muted/20 border-t border-border text-xs text-muted-foreground">
              Click on markers directly on the map to zoom to locations. Hospitals are prioritized for emergencies.
            </div>
          </>
        ) : (
          /* No safe spots found - Show emergency contacts */
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-700">No Safe Locations Found</h4>
                <p className="text-sm text-red-600 mt-1">
                  No hospitals, shelters, or evacuation centers were found within 30km of this crisis location.
                  This area may be remote or the data may be incomplete.
                </p>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contacts
              </h4>

              {/* Universal Number */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm text-muted-foreground">Universal Emergency Number</div>
                <div className="text-2xl font-bold text-primary mt-1">{GLOBAL_EMERGENCY.universal}</div>
                <div className="text-xs text-muted-foreground mt-1">Works in most countries worldwide</div>
              </div>

              {/* Country-specific numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GLOBAL_EMERGENCY.countries.map((item) => (
                  <div key={item.country} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm text-foreground">{item.country}</span>
                    <span className="font-semibold text-primary">{item.number}</span>
                  </div>
                ))}
              </div>

              {/* Coordinates info */}
              {hasValidCoordinates && (
                <div className="pt-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Crisis coordinates: {crisisLatitude!.toFixed(4)}, {crisisLongitude!.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask Tambo to search for safe locations within 100km.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    toast.error("Error displaying evacuation data", {
      description: "Please try clicking 'Plan Evacuation' again from the map",
    });
    return (
      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
        <h4 className="font-semibold text-red-700">Error Displaying Evacuation Data</h4>
        <p className="text-sm text-red-600 mt-1">
          There was an error displaying the evacuation information. Please try again or contact emergency services directly.
        </p>
        <div className="mt-3 p-3 bg-white rounded border border-red-100">
          <div className="text-sm text-muted-foreground">Universal Emergency Number</div>
          <div className="text-xl font-bold text-primary mt-1">112</div>
        </div>
      </div>
    );
  }
}
