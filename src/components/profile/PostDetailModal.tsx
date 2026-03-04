"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import PostCard from "@/components/feed/PostCard";
import type { Post } from "@/lib/mockData";
import { useEffect } from "react";

interface PostDetailModalProps {
    post: Post | null;
    onClose: () => void;
}

export default function PostDetailModal({ post, onClose }: PostDetailModalProps) {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (post) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [post]);

    return (
        <AnimatePresence>
            {post && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <motion.div
                        className="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", zIndex: -1 }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                        style={{
                            width: "100%",
                            maxWidth: 440,
                            maxHeight: "85vh",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            position: "relative",
                        }}
                    >
                        {/* Close button at top-right of mobile view or just above card */}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={onClose}
                                style={{
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    color: "white",
                                    borderRadius: "var(--radius-full)",
                                    width: 36,
                                    height: 36,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    backdropFilter: "blur(8px)"
                                }}
                            >
                                <X size={20} />
                            </motion.button>
                        </div>

                        <div style={{
                            overflowY: "auto",
                            borderRadius: "var(--radius-xl)",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                        }} className="custom-scroll">
                            <PostCard post={post} onComment={() => { }} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
