"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart } from "lucide-react";
import type { Post } from "@/lib/mockData";
import { mockComments, currentUser } from "@/lib/mockData";

interface CommentSheetProps {
    post: Post | null;
    onClose: () => void;
}

export default function CommentSheet({ post, onClose }: CommentSheetProps) {
    const [input, setInput] = useState("");
    const [localComments, setLocalComments] = useState(post ? (mockComments[post.id] || []) : []);

    const handleSend = () => {
        if (!input.trim()) return;
        setLocalComments((prev) => [
            ...prev,
            { id: `new-${Date.now()}`, author: currentUser, body: input.trim(), likes: 0, timeAgo: "just now" },
        ]);
        setInput("");
    };

    return (
        <AnimatePresence>
            {post && (
                <>
                    <motion.div
                        className="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            position: "fixed",
                            bottom: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "100%",
                            maxWidth: 480,
                            background: "var(--bg-card)",
                            borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
                            border: "1px solid var(--border-subtle)",
                            zIndex: 300,
                            maxHeight: "70vh",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* Handle */}
                        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
                            <div style={{ width: 36, height: 4, borderRadius: "var(--radius-full)", background: "var(--border-medium)" }} />
                        </div>

                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 10px" }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Comments</h3>
                            <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                                <X size={20} />
                            </motion.button>
                        </div>

                        {/* Comments list */}
                        <div className="custom-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
                            {localComments.length === 0 && (
                                <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "32px 0" }}>
                                    No comments yet. Be the first!
                                </p>
                            )}
                            {localComments.map((comment, i) => (
                                <motion.div
                                    key={comment.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}
                                >
                                    <Image
                                        src={comment.author.avatar}
                                        alt={comment.author.username}
                                        width={34}
                                        height={34}
                                        style={{ borderRadius: "var(--radius-full)", flexShrink: 0 }}
                                        unoptimized
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <p style={{ fontSize: "0.82rem" }}>
                                                <span style={{ fontWeight: 600 }}>{comment.author.username} </span>
                                                <span style={{ color: "var(--text-secondary)" }}>{comment.body}</span>
                                            </p>
                                            <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", flexShrink: 0, padding: "0 0 0 8px" }}>
                                                <Heart size={13} />
                                            </button>
                                        </div>
                                        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{comment.timeAgo}</span>
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{comment.likes > 0 ? `${comment.likes} likes` : ""}</span>
                                            <button style={{ background: "none", border: "none", fontSize: "0.7rem", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}>Reply</button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Input */}
                        <div style={{
                            padding: "10px 16px 20px",
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            borderTop: "1px solid var(--border-subtle)",
                        }}>
                            <Image
                                src={currentUser.avatar}
                                alt="You"
                                width={32}
                                height={32}
                                style={{ borderRadius: "var(--radius-full)", flexShrink: 0 }}
                                unoptimized
                            />
                            <input
                                className="input-base"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder="Add a comment..."
                                style={{ flex: 1, padding: "9px 12px", fontSize: "0.85rem" }}
                            />
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={handleSend}
                                disabled={!input.trim()}
                                style={{
                                    background: input.trim() ? "var(--gradient-main)" : "var(--bg-elevated)",
                                    border: "none",
                                    borderRadius: "var(--radius-md)",
                                    width: 36,
                                    height: 36,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: input.trim() ? "pointer" : "default",
                                    flexShrink: 0,
                                }}
                            >
                                <Send size={15} color={input.trim() ? "white" : "var(--text-muted)"} />
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
