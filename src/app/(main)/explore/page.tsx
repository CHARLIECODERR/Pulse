"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp, Heart, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { explorePosts, trendingTags, mockUsers, formatCount } from "@/lib/mockData";
import { db } from "@/lib/firebase/client";
import { collection, query as firestoreQuery, orderBy, startAt, endAt, getDocs, limit } from "firebase/firestore";

export default function ExplorePage() {
    const [query, setQuery] = useState("");
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            const trimmedQuery = query.trim();
            if (!trimmedQuery) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            console.log(`[Explore] Searching for: ${trimmedQuery}`);
            try {
                // First simple prefix search on Firestore
                const lowerQ = String(trimmedQuery).toLowerCase();
                const q = firestoreQuery(
                    collection(db, 'profiles'),
                    orderBy('username'),
                    startAt(lowerQ),
                    endAt(lowerQ + '\uf8ff'),
                    limit(15)
                );
                const snapshot = await getDocs(q);
                const results = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

                setSearchResults(results);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(searchUsers, 150);
        return () => clearTimeout(timer);
    }, [query]);

    // Blend mock results for variety
    const filteredMock = mockUsers.filter(
        (u) =>
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.displayName.toLowerCase().includes(query.toLowerCase())
    );

    const allResults = [
        ...searchResults.map(u => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName || u.display_name || u.username,
            avatar: u.avatarUrl || u.avatar_url || "https://api.dicebear.com/7.x/adventurer/svg?seed=user",
            followers: 0,
            isFollowing: false
        })),
        ...filteredMock.filter(m => !searchResults.some(s => s.id === m.id))
    ];

    return (
        <>
            <TopBar title="Explore" />
            <main className="page-content">
                {/* Search bar */}
                <div style={{ padding: "12px 16px 0" }}>
                    <div style={{ position: "relative" }}>
                        {isSearching ? (
                            <Loader2
                                size={16}
                                className="animate-spin"
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--accent-purple)",
                                }}
                            />
                        ) : (
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
                        )}
                        <input
                            className="input-base"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search people, hashtags..."
                            style={{ width: "100%", padding: "11px 36px 11px 38px", fontSize: "0.88rem" }}
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(""); setSearchResults([]); }}
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
                            {allResults.length === 0 && !isSearching ? (
                                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: "0.87rem" }}>
                                    No results for "{query}"
                                </p>
                            ) : (
                                allResults.map((user) => (
                                    <Link key={user.id} href={`/profile/${user.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                                            borderBottom: "1px solid var(--border-subtle)",
                                            borderRadius: "var(--radius-md)",
                                            transition: "background 0.2s"
                                        }}
                                            className="search-result-item"
                                        >
                                            <Image src={user.avatar} alt={user.username} width={46} height={46} style={{ borderRadius: "var(--radius-full)" }} unoptimized />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: "0.88rem", fontWeight: 600 }}>{user.displayName}</p>
                                                <p style={{ fontSize: "0.77rem", color: "var(--text-muted)" }}>@{user.username} {user.followers > 0 && `· ${formatCount(user.followers)} followers`}</p>
                                            </div>
                                            <button
                                                className="btn-ghost"
                                                style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    // Follow logic here
                                                }}
                                            >
                                                {user.isFollowing ? "Following" : "Follow"}
                                            </button>
                                        </div>
                                    </Link>
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
