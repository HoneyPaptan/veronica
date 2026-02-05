"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";

/**
 * Schema for the NewsCard component props that Tambo AI can control
 */
export const newsCardSchema = z.object({
  articles: z
    .array(
      z.object({
        id: z.string().describe("Unique identifier for the article"),
        title: z.string().describe("Headline of the news article"),
        description: z.string().optional().describe("Brief description or snippet"),
        url: z.string().optional().describe("URL to the full article"),
        source: z.string().optional().describe("News source name"),
        publishedAt: z.string().optional().describe("Publication date"),
        image: z.string().optional().describe("Image URL for the article"),
      })
    )
    .describe("Array of news articles to display"),
  title: z.string().optional().describe("Optional title for the news section"),
  location: z.string().optional().describe("Location context for the news"),
});

export type NewsCardProps = z.infer<typeof newsCardSchema>;

/**
 * NewsCard Component
 * 
 * A component that displays news articles in a clean card format.
 * Tambo can use this to show news results in the chat after fetching from GNews.
 */
export function NewsCard({ articles, title, location }: NewsCardProps) {
  if (!articles || articles.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-muted-foreground">
        <Newspaper className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>No news articles found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      {(title || location) && (
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Newspaper className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-sm">
            {title || `News${location ? ` from ${location}` : ""}`}
          </h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {articles.length} article{articles.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-2">
        {articles.map((article, index) => (
          <div
            key={article.id || index}
            className="group rounded-lg border border-border bg-card/50 p-3 transition-all hover:bg-card hover:border-emerald-500/30"
          >
            <div className="flex gap-3">
              {/* Thumbnail */}
              {article.image && (
                <div className="hidden sm:block w-20 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                  <img
                    src={article.image}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-medium text-sm leading-snug line-clamp-2 text-foreground group-hover:text-emerald-500 transition-colors">
                  {article.url ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {article.title}
                    </a>
                  ) : (
                    article.title
                  )}
                </h4>

                {article.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {article.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 pt-1">
                  {article.source && (
                    <span className="font-medium text-foreground/70">
                      {article.source}
                    </span>
                  )}
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Read
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
