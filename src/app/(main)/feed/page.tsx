"use client";

import { useState, useEffect, useRef } from "react";
import TopBar from "@/components/layout/TopBar";
import StoriesBar from "@/components/feed/StoriesBar";
import PostCard from "@/components/feed/PostCard";
import CommentSheet from "@/components/feed/CommentSheet";
import { mockPosts, mockUsers, type Post, type User } from "@/lib/mockData";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";

// Helper to format Supabase post to our UI Post interface
const mapDbPostToPost = (dbPost: any): Post => {
    // Supabase might return profiles as an object or a single-element array
    const authorData = Array.isArray(dbPost.profiles) ? dbPost.profiles[0] : dbPost.profiles;

    // Fallback author if join failed or no profile found
    const author = authorData || {
        id: dbPost.author_id || 'unknown',
        username: 'User',
        display_name: 'GenX User',
        avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=user",
        is_verified: false
    };

    return {
        id: dbPost.id,
        author: {
            id: author.id,
            username: author.username || 'user',
            displayName: author.display_name || author.username || 'User',
            avatar: author.avatar_url || "https://api.dicebear.com/7.x/adventurer/svg?seed=user",
            bio: author.bio || "",
            followers: 0,
            following: 0,
            posts: 0,
            isVerified: author.is_verified || false,
            isFollowing: false,
        },
        image: dbPost.image_url,
        caption: dbPost.caption || "",
        tags: dbPost.tags || [],
        likes: dbPost.likes_count || 0,
        comments: dbPost.comments_count || 0,
        shares: 0,
        isLiked: false,
        isBookmarked: false,
        timeAgo: dbPost.created_at ? new Date(dbPost.created_at).toLocaleDateString() : 'Just now',
        aspectRatio: "square" as const, // Default for now
    };
};

export default function FeedPage() {
    const { profile, loading: authLoading } = useAuth();
    const supabase = createClient();
    const [activePost, setActivePost] = useState<Post | null>(null);
    const [feedMode, setFeedMode] = useState<"following" | "trending">("following");
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const loaderRef = useRef<HTMLDivElement>(null);

    const fetchPosts = async () => {
        setLoading(true);
        console.log('[FeedFetch] Starting fetch...');
        try {
            // Fix join ambiguity by using specific FK
            const { data, error } = await supabase
                .from('posts')
                .select('*, profiles!author_id(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log('[FeedFetch] Success:', data?.length, 'posts');

            const realPosts = (data || []).map(mapDbPostToPost);
            setPosts([...realPosts, ...mockPosts]);
        } catch (err: any) {
            console.error('[FeedFetch] Global Error:', err.message || err);
            setPosts(mockPosts);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Real-time subscription for posts (NEW and UPDATES)
        const channel = supabase
            .channel('realtime-posts-sync')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
            }, async (payload) => {
                console.log('[FeedRealtime] New post:', payload.new.id);
                const { data, error } = await supabase
                    .from('posts')
                    .select('*, profiles!author_id(*)')
                    .eq('id', payload.new.id)
                    .single();

                if (!error && data) {
                    const newPost = mapDbPostToPost(data);
                    setPosts(prev => [newPost, ...prev]);
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'posts'
            }, (payload) => {
                console.log('[FeedRealtime] Post updated:', payload.new.id);
                setPosts(prev => prev.map(post => {
                    if (post.id === payload.new.id) {
                        return {
                            ...post,
                            likes: payload.new.likes_count,
                            comments: payload.new.comments_count
                        };
                    }
                    return post;
                }));
            })
            .subscribe();

        // Safety timeout: fetch anyway if auth takes too long (> 3s)
        const timeout = setTimeout(() => {
            if (loading && posts.length === 0) {
                console.log('[FeedSafety] Auth took too long, fetching anyway...');
                fetchPosts();
            }
        }, 3000);

        if (!authLoading) {
            clearTimeout(timeout);
            fetchPosts();
        }

        return () => {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
        };
    }, [authLoading]);

    const handleRefresh = () => {
        console.log('Manual refresh triggered');
        fetchPosts();
    };

    // Infinite scroll observer (simplified for now)
    useEffect(() => {
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && posts.length > 0) {
                    // Just a dummy infinite scroll for now
                }
            },
            { threshold: 0.1 }
        );
        if (loaderRef.current) obs.observe(loaderRef.current);
        return () => obs.disconnect();
    }, [loading, posts.length]);

    if (authLoading) return null;

    return (
        <>
            <TopBar showLogo showIcons />
            <main className="page-content">
                {/* Stories */}
                <StoriesBar />

                {/* Feed toggle */}
                <div style={{ padding: "8px 16px 4px" }}>
                    <div className="feed-toggle">
                        <button className={`feed-toggle-btn ${feedMode === "following" ? "active" : ""}`}
                            onClick={() => setFeedMode("following")}>Following</button>
                        <button className={`feed-toggle-btn ${feedMode === "trending" ? "active" : ""}`}
                            onClick={() => setFeedMode("trending")}>🔥 Trending</button>
                    </div>
                </div>

                {/* Posts */}
                <div style={{ padding: "8px 12px 0" }}>
                    {loading && posts.length === 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {[1, 2].map((i) => (
                                <div key={i} className="anime-card" style={{ overflow: "hidden" }}>
                                    <div style={{ height: 300 }} className="skeleton" />
                                </div>
                            ))}
                        </div>
                    ) : posts.length > 0 ? (
                        posts.map((post) => (
                            <PostCard key={post.id} post={post} onComment={setActivePost} />
                        ))
                    ) : (
                        <div style={{ padding: "40px 20px", textAlign: "center", background: "var(--bg-card)", borderRadius: "var(--radius-xl)", border: "1px dashed var(--border-medium)" }}>
                            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>No posts found in your feed.</p>
                            <button onClick={handleRefresh} className="btn-ghost" style={{ padding: "8px 20px" }}>
                                Refresh Feed
                            </button>
                        </div>
                    )}
                </div>

                {/* Infinite scroll loader */}
                <div ref={loaderRef} style={{ padding: "8px 12px 4px" }}>
                    {loading && posts.length > 0 && (
                        <div style={{ display: "flex", justifyContent: 'center', padding: 20 }}>
                            <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 'full' }} />
                        </div>
                    )}
                </div>

                {/* Suggested Users strip */}
                {posts.length > 3 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        style={{ margin: "4px 12px 20px" }}
                        className="anime-card"
                    >
                        <div style={{ padding: "12px 14px" }}>
                            <p style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: 12, letterSpacing: "0.5px" }}>
                                ✨ SUGGESTED FOR YOU
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {mockUsers.slice(0, 3).map((u) => (
                                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Link href={`/profile/${u.id}`}>
                                            <Image src={u.avatar} alt={u.username} width={42} height={42}
                                                style={{ borderRadius: "var(--radius-full)", border: "2px solid var(--border-medium)" }} unoptimized />
                                        </Link>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: "0.85rem", fontWeight: 700 }}>{u.displayName}</p>
                                            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>@{u.username}</p>
                                        </div>
                                        <button className="btn-primary" style={{ padding: "6px 14px", fontSize: "0.75rem" }}>Follow</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
            <CommentSheet post={activePost} onClose={() => setActivePost(null)} />
        </>
    );
}
