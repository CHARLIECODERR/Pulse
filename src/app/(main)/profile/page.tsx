"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Settings, Grid3X3, Bookmark, UserCheck, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { currentUser, mockPosts, formatCount, type Post } from "@/lib/mockData";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { getFollowCounts } from "@/lib/supabase/follows";
import PostDetailModal from "@/components/profile/PostDetailModal";

const TABS = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    { id: "tagged", icon: UserCheck, label: "Tagged" },
];

export default function ProfilePage() {
    const { profile, user, loading: authLoading } = useAuth();
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState("posts");
    const [posts, setPosts] = useState<Post[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const fetchFollowStats = async () => {
        if (!profile?.id) return;
        const counts = await getFollowCounts(profile.id);
        setFollowerCount(counts.followers);
        setFollowingCount(counts.following);
    };

    const fetchUserPosts = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('author_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedPosts = (data || []).map((p: any) => ({
                id: p.id,
                author: {
                    id: profile.id,
                    username: profile.username,
                    displayName: profile.displayName,
                    avatar: profile.avatarUrl
                } as any,
                image: p.image_url,
                caption: p.caption,
                tags: p.tags,
                likes: p.likes_count,
                comments: p.comments_count,
                shares: 0,
                isLiked: false,
                isBookmarked: false,
                timeAgo: new Date(p.created_at).toLocaleDateString(),
                aspectRatio: "square" as const,
            }));

            setPosts(mappedPosts);
        } catch (err) {
            console.error('Error fetching own posts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Real-time stat sync
        const channel = supabase.channel('profile-posts-sync')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'posts'
            }, (payload) => {
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

        // Safety timeout for loading
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('[ProfileSafety] Loading took too long, showing fallback');
                setLoading(false);
            }
        }, 3000);

        if (profile) {
            clearTimeout(timeout);
            fetchUserPosts();
            fetchFollowStats();
        }

        return () => {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
        };
    }, [profile]);

    const savedPosts = mockPosts.filter((p) => p.isBookmarked);
    const tabPosts = activeTab === "posts" ? posts : activeTab === "saved" ? savedPosts : [];

    const effectiveProfile = profile || (user ? {
        id: user.id,
        username: "loading...",
        displayName: "User",
        avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=" + user.id,
        bio: "Loading profile data...",
        isVerified: false
    } : null);

    // Only block if we have NO user and auth is still loading
    if (authLoading && !effectiveProfile) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "var(--bg-primary)" }}>
                <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
            </div>
        );
    }

    if (!effectiveProfile) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 16, background: "var(--bg-primary)" }}>
                <p style={{ fontWeight: 700 }}>Identity missing. Please log in again.</p>
                <button onClick={() => window.location.href = '/login'} className="btn-primary">Go to Login</button>
            </div>
        );
    }

    return (
        <>
            {/* Custom top bar with settings */}
            <header className="top-bar">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", padding: "0 16px" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700 }}>@{effectiveProfile.username}</span>
                    <motion.button whileTap={{ scale: 0.88 }} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                        <Settings size={20} />
                    </motion.button>
                </div>
            </header>

            <main className="page-content">
                {/* Profile header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: "20px 20px 0" }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                        {/* Avatar */}
                        <div
                            style={{
                                padding: 3,
                                borderRadius: "var(--radius-full)",
                                background: "var(--gradient-main)",
                            }}
                        >
                            <div style={{ padding: 3, background: "var(--bg-primary)", borderRadius: "var(--radius-full)" }}>
                                <Image
                                    src={effectiveProfile.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=user"}
                                    alt={effectiveProfile.displayName}
                                    width={78}
                                    height={78}
                                    style={{ borderRadius: "var(--radius-full)", display: "block" }}
                                    unoptimized
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
                            {[
                                { label: "Posts", value: posts.length },
                                { label: "Followers", value: followerCount },
                                { label: "Following", value: followingCount },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ textAlign: "center" }}>
                                    <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{formatCount(value)}</p>
                                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Name + bio */}
                    <div style={{ marginBottom: 14 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{effectiveProfile.displayName}</p>
                        <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.4 }}>{effectiveProfile.bio}</p>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            style={{
                                flex: 1, padding: "9px 0", borderRadius: "var(--radius-md)",
                                background: "var(--bg-elevated)", border: "1px solid var(--border-medium)",
                                color: "var(--text-primary)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                            }}
                        >
                            Edit Profile
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            style={{
                                padding: "9px 16px", borderRadius: "var(--radius-md)",
                                background: "var(--bg-elevated)", border: "1px solid var(--border-medium)",
                                color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                            }}
                        >
                            Share
                        </motion.button>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", marginTop: 6 }}>
                    {TABS.map(({ id, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            style={{
                                flex: 1, padding: "12px 0", background: "none", border: "none",
                                cursor: "pointer",
                                borderBottom: activeTab === id ? "2px solid var(--accent-purple)" : "2px solid transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "border-color 0.2s",
                            }}
                        >
                            <Icon
                                size={19}
                                style={{ color: activeTab === id ? "var(--accent-purple)" : "var(--text-muted)" }}
                                strokeWidth={activeTab === id ? 2.2 : 1.7}
                            />
                        </button>
                    ))}
                </div>

                {/* Post grid */}
                <div style={{ padding: "2px 2px 0" }}>
                    {loading ? (
                        <div style={{ display: "flex", justifyContent: 'center', padding: 40 }}>
                            <Loader2 className="spin" size={24} color="var(--border-medium)" />
                        </div>
                    ) : tabPosts.length === 0 ? (
                        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0", fontSize: "0.87rem" }}>
                            {activeTab === "saved" ? "No saved posts yet" : activeTab === "tagged" ? "No tagged posts yet" : "No posts yet"}
                        </p>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                            {tabPosts.map((post, i) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.04 }}
                                    onClick={() => setSelectedPost(post)}
                                    style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", cursor: "pointer" }}
                                >
                                    {post.image.match(/\.(mp4|webm|ogg|mov)$|^.*video.*$/i) ? (
                                        <video src={post.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                                    ) : (
                                        <Image src={post.image} alt="Post" fill style={{ objectFit: "cover" }} unoptimized />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
        </>
    );
}
