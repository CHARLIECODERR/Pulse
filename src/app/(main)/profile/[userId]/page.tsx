"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Grid3X3, ExternalLink, Loader2 } from "lucide-react";
import { mockUsers, mockPosts, formatCount, type Post } from "@/lib/mockData";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, where, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { getFollowCounts, checkIsFollowing, followUser, unfollowUser } from "@/lib/firebase/follows";
import PostDetailModal from "@/components/profile/PostDetailModal";

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { profile: currentUser } = useAuth();
    const [user, setUser] = useState<any>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProfileAndPosts = async () => {
        setLoading(true);
        try {
            // 1. Fetch Follow Stats (always)
            const stats = await getFollowCounts(userId);
            setFollowStats(stats);

            // 2. Check if following (if logged in)
            if (currentUser?.id) {
                const status = await checkIsFollowing(currentUser.id, userId);
                setIsFollowing(status);
            }

            // 3. Fetch User Profile
            const mockUser = mockUsers.find((u) => u.id === userId);
            if (mockUser) {
                setUser(mockUser);
                setIsFollowing(mockUser.isFollowing);
                const userPosts = mockPosts.filter((_, i) => i % 2 === (userId === "u1" ? 0 : 1)).slice(0, 6);
                setPosts(userPosts);
                setLoading(false);
                return;
            }

            // If not mock, fetch from Firestore
            const profileSnap = await getDoc(doc(db, 'profiles', userId));
            if (!profileSnap.exists()) throw new Error("Profile not found");
            const profileData = profileSnap.data();

            setUser({
                id: profileSnap.id,
                username: profileData.username,
                displayName: profileData.displayName || profileData.username,
                avatar: profileData.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=user",
                bio: profileData.bio || "",
                followers: 0,
                following: 0,
                posts: 0,
                isVerified: profileData.isVerified || false,
            });

            // 2. Fetch User Posts
            const q = query(
                collection(db, 'posts'),
                where('author_id', '==', userId),
                orderBy('created_at', 'desc')
            );
            const postsSnap = await getDocs(q);

            const mappedPosts = postsSnap.docs.map((d) => {
                const p = d.data();
                return {
                    id: d.id,
                    author: { id: userId, username: profileData.username, avatar: profileData.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=user" } as any,
                    image: p.image_url,
                    caption: p.caption,
                    tags: p.tags || [],
                    likes: p.likes_count || 0,
                    comments: p.comments_count || 0,
                    shares: 0,
                    isLiked: false,
                    isBookmarked: false,
                    timeAgo: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Just now',
                    aspectRatio: "square" as const,
                };
            });

            setPosts(mappedPosts);

            // Update post count
            setUser((prev: any) => prev ? { ...prev, posts: mappedPosts.length } : null);

        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFollow = async () => {
        if (!currentUser?.id || actionLoading) return;

        setActionLoading(true);
        try {
            if (isFollowing) {
                await unfollowUser(currentUser.id, userId);
                setIsFollowing(false);
                setFollowStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            } else {
                await followUser(currentUser.id, userId);
                setIsFollowing(true);
                setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (err) {
            console.error('Action failed:', err);
        } finally {
            setActionLoading(false);
        }
    };

    useEffect(() => {
        // Real-time stat sync
        const q = query(
            collection(db, 'posts'),
            where('author_id', '==', userId),
            orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(prev => {
                const newPosts = [...prev];
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'modified') {
                        const data = change.doc.data();
                        const idx = newPosts.findIndex(p => p.id === change.doc.id);
                        if (idx !== -1) {
                            newPosts[idx] = {
                                ...newPosts[idx],
                                likes: data.likes_count || 0,
                                comments: data.comments_count || 0
                            };
                        }
                    } else if (change.type === 'added') {
                        // Already handled by initial fetch, but could append new ones here
                    }
                });
                return newPosts;
            });
        });

        // Safety timeout for loading
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('[UserProfileSafety] Loading took too long, showing partial data');
                setLoading(false);
            }
        }, 4000);

        fetchProfileAndPosts().then(() => {
            clearTimeout(timeout);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [userId]);

    if (loading && !user) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh" }}>
                <Loader2 className="spin" size={32} color="var(--accent-purple)" />
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", gap: 16 }}>
                <p style={{ fontSize: "3rem" }}>😶</p>
                <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>User not found</p>
                <Link href="/feed" style={{ color: "var(--accent-purple)", textDecoration: "none", fontWeight: 600 }}>← Back to Feed</Link>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100dvh", background: "var(--bg-primary)", paddingBottom: 80 }}>
            {/* Custom header */}
            <header style={{
                position: "sticky", top: 0, zIndex: 100, padding: "12px 16px",
                background: "rgba(13,13,26,0.95)", backdropFilter: "blur(24px)",
                borderBottom: "var(--stroke-width) solid var(--border-subtle)",
                display: "flex", alignItems: "center", gap: 12,
            }}>
                <Link href="/feed">
                    <motion.button whileTap={{ scale: 0.85 }} style={{
                        background: "var(--bg-elevated)", border: "var(--stroke-width) solid var(--border-medium)",
                        borderRadius: "var(--radius-md)", width: 36, height: 36,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", boxShadow: "2px 2px 0 var(--border-medium)",
                    }}>
                        <ArrowLeft size={18} style={{ color: "var(--text-secondary)" }} />
                    </motion.button>
                </Link>
                <div>
                    <p style={{ fontSize: "1rem", fontWeight: 800 }}>{user.username}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{user.posts} posts</p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <motion.button whileTap={{ scale: 0.9 }} style={{
                        background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)",
                    }}>
                        <ExternalLink size={18} />
                    </motion.button>
                </div>
            </header>

            {/* Profile info */}
            <div style={{ padding: "24px 20px 0" }}>
                {/* Avatar + stats row */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                    <div style={{ padding: 3, borderRadius: "var(--radius-full)", background: "var(--gradient-main)", boxShadow: "3px 3px 0 rgba(100,0,150,0.4)" }}>
                        <div style={{ padding: 3, background: "var(--bg-primary)", borderRadius: "var(--radius-full)" }}>
                            <Image src={user.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=user"} alt={user.displayName} width={82} height={82} style={{ borderRadius: "var(--radius-full)", display: "block" }} unoptimized />
                        </div>
                    </div>
                    <div style={{ flex: 1, display: "flex", justifyContent: "space-around" }}>
                        {[
                            { label: "Posts", value: user.posts },
                            { label: "Followers", value: followStats.followers },
                            { label: "Following", value: followStats.following },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: "center" }}>
                                <p style={{ fontSize: "1.1rem", fontWeight: 900, fontFamily: "'Nunito', sans-serif" }}>{formatCount(value)}</p>
                                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Name, bio */}
                <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontWeight: 900, fontSize: "1rem", fontFamily: "'Nunito', sans-serif" }}>{user.displayName}</p>
                        {user.isVerified && (
                            <div className="verified-badge">✓</div>
                        )}
                    </div>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.45 }}>{user.bio}</p>
                </div>

                {/* CTA buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={toggleFollow}
                        disabled={actionLoading}
                        className={isFollowing ? "btn-ghost" : "btn-primary"}
                        style={{ flex: 1, padding: "10px 0", fontSize: "0.88rem", opacity: actionLoading ? 0.7 : 1 }}
                    >
                        {actionLoading ? "..." : isFollowing ? "✓ Following" : "Follow"}
                    </motion.button>
                    <Link href={`/messages?userId=${userId}`} style={{ flex: 1 }}>
                        <motion.button whileTap={{ scale: 0.93 }} className="btn-ghost"
                            style={{ width: "100%", padding: "10px 0", fontSize: "0.88rem" }}>
                            Message
                        </motion.button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: "var(--stroke-width) solid var(--border-subtle)" }}>
                <div style={{ display: "flex" }}>
                    <div style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
                        borderBottom: "2.5px solid var(--accent-purple)",
                    }}>
                        <Grid3X3 size={19} style={{ color: "var(--accent-purple)" }} strokeWidth={2.2} />
                    </div>
                </div>
            </div>

            {/* Post grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: 2 }}>
                {posts.map((post, i) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedPost(post)}
                        style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden", borderRadius: 2, cursor: "pointer" }}
                    >
                        {post.image.match(/\.(mp4|webm|ogg|mov)$|^.*video.*$/i) ? (
                            <video src={post.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                            <Image src={post.image} alt="Post" fill style={{ objectFit: "cover" }} unoptimized />
                        )}
                    </motion.div>
                ))}
            </div>

            <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
        </div>
    );
}
