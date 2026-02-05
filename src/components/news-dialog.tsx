"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, Newspaper, Globe, Clock } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export interface NewsArticle {
    id: string;
    title: string;
    url?: string;
    source?: string;
    snippet?: string;
    publishedAt?: string;
    image?: string;
}

interface NewsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    articles: NewsArticle[];
    className?: string;
}

export const NewsDialog = ({
    isOpen,
    onClose,
    title,
    articles,
    className,
}: NewsDialogProps) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);

        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscapeKey);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscapeKey);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!mounted) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Get the main article (first one)
    const mainArticle = articles[0];

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleBackdropClick}
                    />

                    {/* Modal */}
                    <motion.div
                        className={cn(
                            "relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col m-4 overflow-hidden",
                            className
                        )}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 z-10 p-2 bg-background/80 hover:bg-muted rounded-full transition-colors backdrop-blur-sm"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {articles.length === 0 ? (
                            <div className="p-8 text-center">
                                <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No article details available.</p>
                            </div>
                        ) : (
                            <>
                                {/* Hero Image */}
                                {mainArticle?.image && (
                                    <div className="relative w-full h-48 bg-muted overflow-hidden">
                                        <img
                                            src={mainArticle.image}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = "none";
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {/* Category Badge */}
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-medium">
                                            <Newspaper className="w-3 h-3" />
                                            NEWS
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-xl font-bold leading-tight text-foreground">
                                        {title}
                                    </h2>

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                        {mainArticle?.source && (
                                            <span className="flex items-center gap-1.5">
                                                <Globe className="w-4 h-4 text-emerald-500" />
                                                <span className="font-medium">{mainArticle.source}</span>
                                            </span>
                                        )}
                                        {mainArticle?.publishedAt && (
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                {new Date(mainArticle.publishedAt).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        )}
                                    </div>

                                    {/* Description/Snippet */}
                                    {mainArticle?.snippet && (
                                        <div className="pt-2">
                                            <p className="text-muted-foreground leading-relaxed">
                                                {mainArticle.snippet}
                                            </p>
                                        </div>
                                    )}

                                    {/* Read Full Article Button */}
                                    {mainArticle?.url && (
                                        <div className="pt-4">
                                            <a
                                                href={mainArticle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full"
                                            >
                                                <Button 
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                                    size="lg"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    Read Full Article
                                                </Button>
                                            </a>
                                        </div>
                                    )}

                                    {/* Additional Articles (if more than one) */}
                                    {articles.length > 1 && (
                                        <div className="pt-4 border-t border-border mt-4">
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                                                Related Articles
                                            </h3>
                                            <div className="space-y-2">
                                                {articles.slice(1).map((article) => (
                                                    <a
                                                        key={article.id}
                                                        href={article.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-emerald-500/30 transition-all"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {article.image && (
                                                                <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-muted">
                                                                    <img
                                                                        src={article.image}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                        loading="lazy"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium line-clamp-2 text-foreground">
                                                                    {article.title}
                                                                </p>
                                                                {article.source && (
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        {article.source}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-3 border-t border-border bg-muted/20 text-xs text-center text-muted-foreground">
                                    News data provided by GNews API
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
};
