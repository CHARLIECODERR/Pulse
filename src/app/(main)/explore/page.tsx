"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Heart } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { explorePosts, trendingTags, mockUsers, formatCount } from "@/lib/mockData";

export default function ExplorePage() {
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);

    const filtered = mockUsers.filter(
        (u) =>
            !query ||
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.displayName.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <>
            <TopBar title="Explore" />
            <main className="page-content">
                {/* Search bar */}
                <div style={{ padding: "12px 16px 0" }}>
                    <div style={{ position: "relative" }}>
                        <Search
                            size={16}
                            style={{
                                position: "absolute",
                                left: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--text-muted)",
                            }}
                        />
                        <input
                            className="input-base"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search people, hashtags..."
                            style={{ width: "100%", padding: "11px 36px 11px 38px", fontSize: "0.88rem" }}
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                style={{
                                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                                    background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                                }}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search results */}
                <AnimatePresence>
                    {query && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{ padding: "8px 16px" }}
                        >
                            {filtered.length === 0 ? (
                                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: "0.87rem" }}>
                                    No results for "{query}"
                                </p>
                            ) : (
                                filtered.map((user) => (
                                    <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                                        <Image src={user.avatar} alt={user.username} width={46} height={46} style={{ borderRadius: "var(--radius-full)" }} unoptimized />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: "0.88rem", fontWeight: 600 }}>{user.displayName}</p>
                                            <p style={{ fontSize: "0.77rem", color: "var(--text-muted)" }}>@{user.username} · {formatCount(user.followers)} followers</p>
                                        </div>
                                        <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: "0.78rem" }}>
                                            {user.isFollowing ? "Following" : "Follow"}
                                        </button>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {!query && (
                    <>
                        {/* Trending */}
                        <div style={{ padding: "16px 16px 8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                <TrendingUp size={15} color="var(--accent-purple)" />
                                <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-secondary)" }}>TRENDING</h2>
                            </div>
                            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                                {trendingTags.map((tag, i) => (
                                    <motion.button
                                        key={tag}
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                        whileTap={{ scale: 0.93 }}
                                        className="tag-chip"
                                        style={activeTag === tag ? { borderColor: "var(--accent-purple)", color: "var(--accent-purple)" } : {}}
                                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                    >
                                        #{tag}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Grid */}
                        <div style={{ padding: "8px 12px 0" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
                                {explorePosts.map((p, i) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", borderRadius: 4, cursor: "pointer" }}
                                    >
                                        <Image src={p.image} alt="Explore" fill style={{ objectFit: "cover" }} unoptimized />
                                        <div style={{
                                            position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                                            display: "flex", alignItems: "flex-end", padding: 6,
                                            transition: "background 0.2s",
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 3, opacity: 0.9 }}>
                                                <Heart size={11} fill="white" stroke="none" />
                                                <span style={{ fontSize: "0.68rem", color: "white", fontWeight: 600 }}>{formatCount(p.likes)}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </main>
        </>
    );
}
