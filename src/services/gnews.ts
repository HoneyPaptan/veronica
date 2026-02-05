
import { crisisMarkerSchema, LOCATION_PRESETS } from "@/lib/markers";
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
 * Search GNews API for articles.
 * @param query The search query (e.g. "wildfires").
 * @param locationName Optional location name to refine coordinates (e.g. "California").
 */
export async function searchGNews(
    query: string,
    locationName?: string
): Promise<z.infer<typeof crisisMarkerSchema>[]> {
    const apiKey = process.env.NEXT_PUBLIC_GNEWS_API_KEY;

    if (!apiKey) {
        console.warn("Missing NEXT_PUBLIC_GNEWS_API_KEY. News search disabled.");
        return [];
    }

    if (!checkRateLimit()) {
        console.warn("GNews rate limit reached for today.");
        throw new Error("GNews rate limit reached. Please try again tomorrow.");
    }

    // Construct URL - Switch to top-headlines
    const url = new URL(`${GNEWS_API_BASE}/top-headlines`);

    // top-headlines supports 'q' for keyword filtering within headlines
    url.searchParams.append("q", query);
    url.searchParams.append("lang", "en");
    url.searchParams.append("max", "10");
    url.searchParams.append("apikey", apiKey);

    // Default to general category if just querying headlines, but query usually overrides or works with it
    url.searchParams.append("category", "general");

    if (locationName) {
        // For top-headlines, we can pass 'q' with location for relevance
        url.searchParams.set("q", `${query} ${locationName}`);
    }

    try {
        incrementRateLimit();
        const response = await fetch(url.toString());

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("Invalid GNews API Key or Rate Limit Exceeded");
            }
            throw new Error(`GNews API Error: ${response.statusText}`);
        }

        const data: GNewsResponse = await response.json();

        if (!data.articles || data.articles.length === 0) {
            return [];
        }

        // Determine coordinates
        // If locationName is provided, find its coordinates from presets
        // GNews results don't have lat/lng, so we map them to the requested location
        // or a single central point if no location requested.
        let lat = 0;
        let lng = 0;

        if (locationName) {
            const normalizedLoc = locationName.toLowerCase();
            // Try exact match or partial match in PRESETS
            const presetKey = Object.keys(LOCATION_PRESETS).find(k =>
                normalizedLoc.includes(k) || k.includes(normalizedLoc)
            );

            if (presetKey) {
                lat = LOCATION_PRESETS[presetKey].lat;
                lng = LOCATION_PRESETS[presetKey].lng;
            }
        }

        // Map articles to a SINGLE marker that contains all news
        const topArticle = data.articles[0];

        const marker: z.infer<typeof crisisMarkerSchema> = {
            id: `gnews-${Date.now()}`,
            title: `Headlines: ${query} ${locationName ? `in ${locationName}` : ""}`,
            description: `Top stories for ${query}. Top headline: ${topArticle.title}`,
            category: "news",
            severity: "low", // News is informational
            latitude: lat,
            longitude: lng,
            date: topArticle.publishedAt,
            source: "GNews Headlines",
            url: topArticle.url,
            // Populate related news with ALL fetched articles
            relatedNews: data.articles.map((article, idx) => ({
                id: `news-${idx}-${Date.now()}`,
                title: article.title,
                url: article.url,
                source: article.source.name,
                snippet: article.description,
                publishedAt: article.publishedAt,
                image: article.image // Add image from GNews
            }))
        };

        return [marker];

    } catch (error) {
        console.error("GNews fetch failed:", error);
        return [];
    }
}
