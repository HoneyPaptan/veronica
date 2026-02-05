"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Calendar, MapPin } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

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
            document.body.style.overflow = "hidden"; // Prevent scrolling
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

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleBackdropClick}
                    />

                    {/* Modal */}
                    <motion.div
                        className={cn(
                            "relative bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col m-4",
                            className
                        )}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold truncate pr-4">{title}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {articles.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No articles found.</p>
                            ) : (
                                articles.map((article) => (
                                    <div
                                        key={article.id}
                                        className="group relative bg-muted/30 border border-border/50 rounded-lg p-4 hover:bg-muted/50 hover:border-border transition-all"
                                    >
                                        <div className="flex gap-4">
                                            {/* Thumbnail Image */}
                                            {article.image && (
                                                <div className="hidden sm:block w-24 h-24 shrink-0 rounded-md overflow-hidden bg-muted">
                                                    <img
                                                        src={article.image}
                                                        alt=""
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex-1 space-y-2 min-w-0">
                                                <h3 className="font-medium text-foreground leading-snug">
                                                    <a
                                                        href={article.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-emerald-500 transition-colors block"
                                                    >
                                                        {article.title}
                                                    </a>
                                                </h3>

                                                {article.snippet && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {article.snippet}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-muted-foreground/70 pt-1">
                                                    {article.source && (
                                                        <span className="font-medium text-foreground/80">{article.source}</span>
                                                    )}
                                                    {article.publishedAt && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(article.publishedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>


                                            {article.url && (
                                                <a
                                                    href={article.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-background border border-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-emerald-500 hover:border-emerald-500"
                                                    title="Read detailed article"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border bg-muted/10 text-xs text-center text-muted-foreground">
                            News data provided by GNews API
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
};
