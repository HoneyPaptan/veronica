/**
 * @file local-storage.ts
 * @description Local storage utilities for persisting thread data and map markers
 * 
 * This module provides functions to save and restore:
 * - Chat thread messages
 * - Accumulated map markers (wildfires, news, etc.)
 * - Map view state (center, zoom)
 */

import type { CrisisMarker } from "@/lib/markers";

const STORAGE_KEYS = {
    THREAD_DATA: "veronica_thread_data",
    MAP_MARKERS: "veronica_map_markers",
    MAP_VIEW: "veronica_map_view",
} as const;

/**
 * Map view state to persist
 */
export interface MapViewState {
    centerLatitude: number;
    centerLongitude: number;
    zoomLevel: number;
    regionName?: string;
    highlightRegions?: string[];
}

/**
 * Thread data structure for persistence
 */
export interface PersistedThreadData {
    threadId?: string;
    messages: any[]; // TamboThreadMessage[]
    createdAt: string;
    updatedAt: string;
}

/**
 * Complete persisted state
 */
export interface PersistedState {
    thread?: PersistedThreadData;
    markers: CrisisMarker[];
    mapView?: MapViewState;
    version: number;
}

const CURRENT_VERSION = 1;

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get the complete persisted state from local storage
 */
export function getPersistedState(): PersistedState | null {
    if (!isBrowser()) return null;

    try {
        const data = localStorage.getItem(STORAGE_KEYS.THREAD_DATA);
        if (!data) return null;

        const parsed = JSON.parse(data) as PersistedState;
        
        // Version check for future migrations
        if (parsed.version !== CURRENT_VERSION) {
            clearPersistedState();
            return null;
        }

        return parsed;
    } catch (error) {
        return null;
    }
}

/**
 * Save the complete state to local storage
 */
export function savePersistedState(state: Omit<PersistedState, "version">): void {
    if (!isBrowser()) return;

    try {
        const dataToSave: PersistedState = {
            ...state,
            version: CURRENT_VERSION,
        };
        localStorage.setItem(STORAGE_KEYS.THREAD_DATA, JSON.stringify(dataToSave));
    } catch (error) {
    }
}

/**
 * Clear all persisted state
 */
export function clearPersistedState(): void {
    if (!isBrowser()) return;

    try {
        localStorage.removeItem(STORAGE_KEYS.THREAD_DATA);
    } catch (error) {
    }
}

/**
 * Get accumulated markers from local storage
 */
export function getPersistedMarkers(): CrisisMarker[] {
    const state = getPersistedState();
    return state?.markers ?? [];
}

/**
 * Add new markers to the accumulated list (deduplicates by id)
 */
export function addMarkersToStorage(newMarkers: CrisisMarker[]): CrisisMarker[] {
    if (!isBrowser() || !newMarkers.length) return getPersistedMarkers();

    const state = getPersistedState() ?? { markers: [] };
    const existingIds = new Set(state.markers.map(m => m.id));
    
    // Add only new markers (deduplicate by id)
    const uniqueNewMarkers = newMarkers.filter(m => !existingIds.has(m.id));
    const allMarkers = [...state.markers, ...uniqueNewMarkers];
    
    // Limit total markers to prevent storage bloat (keep most recent 100)
    const limitedMarkers = allMarkers.slice(-100);

    savePersistedState({
        ...state,
        markers: limitedMarkers,
    });

    return limitedMarkers;
}

/**
 * Replace all markers in storage
 */
export function setMarkersInStorage(markers: CrisisMarker[]): void {
    if (!isBrowser()) return;

    const state = getPersistedState() ?? { markers: [] };
    savePersistedState({
        ...state,
        markers: markers.slice(-100), // Limit to 100 markers
    });
}

/**
 * Clear only markers from storage
 */
export function clearMarkersFromStorage(): void {
    if (!isBrowser()) return;

    const state = getPersistedState();
    if (state) {
        savePersistedState({
            ...state,
            markers: [],
        });
    }
}

/**
 * Save map view state
 */
export function saveMapViewState(view: MapViewState): void {
    if (!isBrowser()) return;

    const state = getPersistedState() ?? { markers: [] };
    savePersistedState({
        ...state,
        mapView: view,
    });
}

/**
 * Get persisted map view state
 */
export function getPersistedMapView(): MapViewState | null {
    const state = getPersistedState();
    return state?.mapView ?? null;
}

/**
 * Save thread data
 */
export function saveThreadData(threadId: string | undefined, messages: any[]): void {
    if (!isBrowser()) return;

    const state = getPersistedState();
    const now = new Date().toISOString();

    savePersistedState({
        markers: state?.markers ?? [],
        mapView: state?.mapView,
        thread: {
            threadId,
            messages,
            createdAt: state?.thread?.createdAt ?? now,
            updatedAt: now,
        },
    });
}

/**
 * Get persisted thread data
 */
export function getPersistedThreadData(): PersistedThreadData | null {
    const state = getPersistedState();
    return state?.thread ?? null;
}

/**
 * Check if there's any persisted data
 */
export function hasPersistedData(): boolean {
    const state = getPersistedState();
    if (!state) return false;
    
    const hasMarkers = Boolean(state.markers && state.markers.length > 0);
    const hasMessages = Boolean(state.thread?.messages && state.thread.messages.length > 0);
    
    return hasMarkers || hasMessages;
}

/**
 * Get storage size in bytes (approximate)
 */
export function getStorageSize(): number {
    if (!isBrowser()) return 0;

    try {
        const data = localStorage.getItem(STORAGE_KEYS.THREAD_DATA);
        return data ? new Blob([data]).size : 0;
    } catch {
        return 0;
    }
}

/**
 * Format storage size for display
 */
export function formatStorageSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
