"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";

export const newsCardSchema = z.object({
  articles: z
    .optional(
      z.array(
        z.object({
          id: z.string().describe("Unique identifier for the article"),
          title: z.string().optional().describe("Headline of the news article"),
          description: z.string().optional().describe("Brief description or snippet"),
          url: z.string().optional().describe("URL to the full article"),
          source: z.string().optional().describe("News source name"),
          publishedAt: z.string().optional().describe("Publication date"),
          image: z.string().optional().describe("Image URL for the article"),
        })
      )
    )
    .describe("Array of news articles to display"),
  title: z.string().optional().describe("Optional title for the news section"),
  location: z.string().optional().describe("Location context for the news"),
});

export type NewsCardProps = z.infer<typeof newsCardSchema>;

export function NewsCard(props: NewsCardProps) {
  try {
    const {
      articles: rawArticles,
      title: rawTitle,
      location: rawLocation,
    } = props || {};

    const articles = Array.isArray(rawArticles) ? rawArticles : [];
    const title = typeof rawTitle === 'string' && rawTitle.length > 0 ? rawTitle : "Latest News";
    const location = typeof rawLocation === 'string' && rawLocation.length > 0 ? rawLocation : undefined;

    // Filter out articles with invalid/missing essential data
    const validArticles = articles.filter(article =>
      article &&
      typeof article.title === 'string' &&
      article.title.trim().length > 0
    );

    if (validArticles.length === 0) {
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
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Newspaper className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-sm">
            {title}{location ? ` from ${location}` : ""}
          </h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {validArticles.length} article{validArticles.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Articles List */}
        <div className="space-y-2">
          {validArticles.map((article, index) => (
            <div
              key={article.id || index}
              className="group rounded-lg border border-border bg-card/50 p-3 transition-all hover:bg-card hover:border-emerald-500/30"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                {article.image && typeof article.image === 'string' && article.image.length > 0 && (
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
                    {article.url && typeof article.url === 'string' && article.url.length > 0 ? (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {article.title || "Untitled Article"}
                      </a>
                    ) : (
                      (article.title || "Untitled Article")
                    )}
                  </h4>

                  {article.description && typeof article.description === 'string' && article.description.length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {article.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 pt-1">
                    {article.source && typeof article.source === 'string' && article.source.length > 0 && (
                      <span className="font-medium text-foreground/70">
                        {article.source}
                      </span>
                    )}
                    {article.publishedAt && typeof article.publishedAt === 'string' && article.publishedAt.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                    {article.url && typeof article.url === 'string' && article.url.length > 0 && (
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
  } catch (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-600">
        <Newspaper className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>Unable to display news articles.</p>
      </div>
    );
  }
}
