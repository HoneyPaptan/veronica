/**
 * GNews API Service
 * 
 * Fetches news articles from GNews API and converts them to CrisisMarker format
 * for display on the TacticalMap.
 * 
 * API Documentation: https://gnews.io/docs/v4
 */

import { crisisMarkerSchema, LOCATION_PRESETS, type CrisisMarker } from "@/lib/markers";
import { z } from "zod";

const GNEWS_API_BASE = "https://gnews.io/api/v4";
const RATE_LIMIT_KEY = "gnews_req_count";
const RATE_LIMIT_DATE = "gnews_req_date";
const DAILY_LIMIT = 100;

export interface GNewsArticle {
    title: string;
    description: string;
    content: string;
    url: string;
    image: string;
    publishedAt: string;
    source: {
        name: string;
        url: string;
    };
}

interface GNewsResponse {
    totalArticles: number;
    articles: GNewsArticle[];
}

// Country codes for GNews API
const COUNTRY_CODES: Record<string, string> = {
    "usa": "us",
    "united states": "us",
    "us": "us",
    "uk": "gb",
    "united kingdom": "gb",
    "britain": "gb",
    "india": "in",
    "australia": "au",
    "canada": "ca",
    "germany": "de",
    "france": "fr",
    "japan": "jp",
    "china": "cn",
    "brazil": "br",
    "mexico": "mx",
    "italy": "it",
    "spain": "es",
    "russia": "ru",
    "south korea": "kr",
    "netherlands": "nl",
    "singapore": "sg",
    "hong kong": "hk",
    "new zealand": "nz",
    "ireland": "ie",
    "south africa": "za",
    "israel": "il",
    "uae": "ae",
    "saudi arabia": "sa",
    "egypt": "eg",
    "nigeria": "ng",
    "pakistan": "pk",
    "indonesia": "id",
    "philippines": "ph",
    "thailand": "th",
    "vietnam": "vn",
    "malaysia": "my",
    "poland": "pl",
    "sweden": "se",
    "norway": "no",
    "denmark": "dk",
    "finland": "fi",
    "austria": "at",
    "switzerland": "ch",
    "belgium": "be",
    "portugal": "pt",
    "greece": "gr",
    "turkey": "tr",
    "argentina": "ar",
    "chile": "cl",
    "colombia": "co",
    "peru": "pe",
    "venezuela": "ve",
};

function checkRateLimit(): boolean {
    if (typeof window === "undefined") return true; // Skip on server

    const today = new Date().toISOString().split("T")[0];
    const lastDate = localStorage.getItem(RATE_LIMIT_DATE);
    const count = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);

    if (lastDate !== today) {
        // Reset for new day
        localStorage.setItem(RATE_LIMIT_DATE, today);
        localStorage.setItem(RATE_LIMIT_KEY, "0");
        return true;
    }

    return count < DAILY_LIMIT;
}

function incrementRateLimit() {
    if (typeof window === "undefined") return;
    const count = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
    localStorage.setItem(RATE_LIMIT_KEY, (count + 1).toString());
}

/**
 * Get country code from location name
 */
function getCountryCode(location: string): string | undefined {
    const normalized = location.toLowerCase().trim();
    
    // Direct match
    if (COUNTRY_CODES[normalized]) {
        return COUNTRY_CODES[normalized];
    }
    
    // Partial match
    for (const [key, code] of Object.entries(COUNTRY_CODES)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return code;
        }
    }
    
    return undefined;
}

/**
 * Get coordinates for a location
 */
function getLocationCoordinates(location: string): { lat: number; lng: number } | null {
    const normalized = location.toLowerCase().trim();
    
    // Direct match in presets
    if (LOCATION_PRESETS[normalized]) {
        return { lat: LOCATION_PRESETS[normalized].lat, lng: LOCATION_PRESETS[normalized].lng };
    }
    
    // Partial match
    for (const [key, coords] of Object.entries(LOCATION_PRESETS)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return { lat: coords.lat, lng: coords.lng };
        }
    }
    
    return null;
}

/**
 * Input schema for the getGNews tool
 */
export interface SearchGNewsInput {
    query: string;
    location?: string;
    /** Exact latitude for marker placement (from map selection) */
    latitude?: number;
    /** Exact longitude for marker placement (from map selection) */
    longitude?: number;
}

/**
 * Search GNews API for articles.
 * @param input - Object containing query and optional location/coordinates
 * @returns Array of CrisisMarker objects for display on the map
 */
export async function searchGNews(
    input: SearchGNewsInput | string,
    locationName?: string
): Promise<CrisisMarker[]> {
    // Handle both object and string inputs for backward compatibility
    let query: string;
    let location: string | undefined;
    let exactLat: number | undefined;
    let exactLng: number | undefined;
    
    if (typeof input === "string") {
        query = input;
        location = locationName;
    } else {
        query = input.query;
        location = input.location;
        exactLat = input.latitude;
        exactLng = input.longitude;
    }

    const apiKey = process.env.NEXT_PUBLIC_GNEWS_API_KEY;

    if (!apiKey) {
        return [];
    }

    if (!checkRateLimit()) {
        throw new Error("GNews rate limit reached. Please try again tomorrow.");
    }

    // Try top-headlines first, then fall back to search
    let articles: GNewsArticle[] = [];
    
    try {
        incrementRateLimit();
        
        // First try: top-headlines with country filter if location is provided
        const countryCode = location ? getCountryCode(location) : undefined;
        
        // Limit to 5 articles for location-specific queries, 10 for general queries
        const maxArticles = location ? "5" : "10";
        
        const headlinesUrl = new URL(`${GNEWS_API_BASE}/top-headlines`);
        headlinesUrl.searchParams.append("lang", "en");
        headlinesUrl.searchParams.append("max", maxArticles);
        headlinesUrl.searchParams.append("apikey", apiKey);
        headlinesUrl.searchParams.append("category", "general");
        
        if (countryCode) {
            headlinesUrl.searchParams.append("country", countryCode);
        }
        
        // Add query if it's not just asking for "news" or "top news"
        const isGenericQuery = /^(top\s*)?(news|headlines?|stories?)$/i.test(query.trim());
        if (!isGenericQuery) {
            headlinesUrl.searchParams.append("q", query);
        }


        
        const headlinesResponse = await fetch(headlinesUrl.toString());
        
        if (headlinesResponse.ok) {
            const data: GNewsResponse = await headlinesResponse.json();
            articles = data.articles || [];
        }
        
        // If no results from headlines, try search endpoint
        if (articles.length === 0) {
            incrementRateLimit();
            
            const searchUrl = new URL(`${GNEWS_API_BASE}/search`);
            searchUrl.searchParams.append("lang", "en");
            searchUrl.searchParams.append("max", maxArticles); // Use same limit as headlines
            searchUrl.searchParams.append("apikey", apiKey);
            
            // Build search query
            let searchQuery = query;
            if (location && !query.toLowerCase().includes(location.toLowerCase())) {
                searchQuery = `${query} ${location}`;
            }
            searchUrl.searchParams.append("q", searchQuery);
            
            const searchResponse = await fetch(searchUrl.toString());

            if (searchResponse.ok) {
                const data: GNewsResponse = await searchResponse.json();
                articles = data.articles || [];
            }
        }
        
    } catch (error) {
        return [];
    }

    if (articles.length === 0) {
        return [];
    }

    // Determine base coordinates:
    // 1. Use exact coordinates if provided (from map selection)
    // 2. Fall back to location preset lookup
    // 3. Default to 0,0 if nothing available
    let baseLat: number;
    let baseLng: number;
    
    if (typeof exactLat === 'number' && typeof exactLng === 'number') {
        baseLat = exactLat;
        baseLng = exactLng;
    } else {
        const coords = location ? getLocationCoordinates(location) : null;
        baseLat = coords?.lat ?? 20;
        baseLng = coords?.lng ?? 0;
    }

    // Create individual markers for each article, spread around the location
    // Filter out articles with invalid/missing data before processing
    const validArticles = articles.filter(article =>
        article.title &&
        article.title.trim().length > 0 &&
        typeof article.title === 'string'
    );

    const markers: CrisisMarker[] = validArticles.map((article, idx) => {
        // Spread markers slightly around the center point for visibility
        // Use smaller offset (0.1 degree ~= 11km) for better clustering
        const offsetLat = (Math.random() - 0.5) * 0.2;
        const offsetLng = (Math.random() - 0.5) * 0.2;

        // Ensure no null/undefined values - use safe fallbacks
        const title = article.title || "";
        const description = article.description || article.content?.substring(0, 200) || "";
        const snippet = description;
        const sourceName = article.source?.name || "";
        const articleUrl = article.url || "";
        const publishedAt = article.publishedAt || "";
        const imageUrl = article.image || "";

        return {
            id: `gnews-${idx}-${Date.now()}`,
            title,
            description,
            category: "news" as const,
            severity: "low" as const,
            latitude: baseLat + offsetLat,
            longitude: baseLng + offsetLng,
            date: publishedAt,
            source: sourceName,
            url: articleUrl,
            relatedNews: [{
                id: `news-${idx}-${Date.now()}`,
                title,
                url: articleUrl,
                source: sourceName,
                snippet,
                publishedAt,
                image: imageUrl
            }],
            markerStyle: "default" as const,
            safeSpotType: "hospital" as const,
        };
    });

    return markers;
}
