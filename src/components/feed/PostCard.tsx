"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Repeat2 } from "lucide-react";
import Link from "next/link";
import type { Post } from "@/lib/mockData";
import { formatCount } from "@/lib/mockData";

interface PostCardProps {
    post: Post;
    onComment: (post: Post) => void;
}

export default function PostCard({ post, onComment }: PostCardProps) {
    const [liked, setLiked] = useState(post.isLiked);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [bookmarked, setBookmarked] = useState(post.isBookmarked);
    const [showHeart, setShowHeart] = useState(false);
    const [reposted, setReposted] = useState(false);

    const handleLike = useCallback(() => {
        const next = !liked;
        setLiked(next);
        setLikeCount((c) => (next ? c + 1 : c - 1));
    }, [liked]);

    const handleDoubleTap = useCallback(() => {
        if (!liked) { setLiked(true); setLikeCount((c) => c + 1); }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 900);
    }, [liked]);

    const aspectRatioMap: Record<string, string> = {
        portrait: "4/5", square: "1/1", landscape: "16/9",
    };

    return (
        <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="anime-card"
            style={{ marginBottom: 20, overflow: "hidden" }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
                <Link href={`/profile/${post.author.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                        <div style={{
                            padding: 2, borderRadius: "var(--radius-full)",
                            background: "var(--gradient-main)",
                            boxShadow: "2px 2px 0 rgba(100,0,150,0.4)",
                        }}>
                            <div style={{ padding: 1.5, background: "var(--bg-card)", borderRadius: "var(--radius-full)" }}>
                                <Image src={post.author.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=user"} alt={post.author.username} width={36} height={36}
                                    style={{ borderRadius: "var(--radius-full)", display: "block" }} unoptimized />
                            </div>
                        </div>
                        {post.author.isVerified && (
                            <div className="verified-badge" style={{ position: "absolute", bottom: -2, right: -2 }}>✓</div>
                        )}
                    </div>
                    <div>
                        <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{post.author.username}</p>
                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{post.timeAgo}</p>
                    </div>
                </Link>
                <motion.button whileTap={{ scale: 0.82 }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                    <MoreHorizontal size={18} />
                </motion.button>
            </div>

            {/* Media */}
            <div
                style={{ position: "relative", aspectRatio: aspectRatioMap[post.aspectRatio || 'square'], overflow: "hidden", cursor: "pointer" }}
                onDoubleClick={handleDoubleTap}
            >
                {post.image.match(/\.(mp4|webm|ogg|mov)$|^.*video.*$/i) ? (
                    <video
                        src={post.image}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                ) : (
                    <Image src={post.image} alt="Post" fill style={{ objectFit: "cover" }} unoptimized />
                )}
                {/* Anime-style gradient overlay at bottom */}
                <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
                    background: "linear-gradient(to top, rgba(13,13,26,0.7) 0%, transparent 100%)",
                }} />
                {/* Double-tap heart */}
                <AnimatePresence>
                    {showHeart && (
                        <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 260 }}
                            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}
                        >
                            <Heart size={80} fill="var(--accent-pink)" stroke="white" strokeWidth={1} />
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Tags on image */}
                {post.tags.length > 0 && (
                    <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {post.tags.slice(0, 2).map((t) => (
                            <span key={t} style={{
                                background: "rgba(13,13,26,0.75)",
                                border: "1px solid rgba(180,77,255,0.4)",
                                borderRadius: "var(--radius-full)",
                                padding: "2px 10px",
                                fontSize: "0.68rem", fontWeight: 700, color: "var(--accent-cyan)",
                                backdropFilter: "blur(8px)",
                            }}>#{t}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions bar */}
            <div style={{ padding: "10px 14px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* Like */}
                        <motion.button whileTap={{ scale: 0.7 }} onClick={handleLike}
                            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                            <motion.div animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                                <Heart size={22} fill={liked ? "var(--accent-pink)" : "none"}
                                    stroke={liked ? "var(--accent-pink)" : "var(--text-secondary)"} strokeWidth={2}
                                    style={{ filter: liked ? "drop-shadow(0 0 6px var(--accent-pink))" : "none", transition: "filter 0.2s" }} />
                            </motion.div>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: liked ? "var(--accent-pink)" : "var(--text-secondary)" }}>
                                {formatCount(likeCount)}
                            </span>
                        </motion.button>

                        {/* Comment */}
                        <motion.button whileTap={{ scale: 0.82 }} onClick={() => onComment(post)}
                            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
                            <MessageCircle size={22} stroke="var(--text-secondary)" strokeWidth={2} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>{formatCount(post.comments)}</span>
                        </motion.button>

                        {/* Repost */}
                        <motion.button whileTap={{ scale: 0.82 }} onClick={() => setReposted((r) => !r)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            <Repeat2 size={21} stroke={reposted ? "var(--accent-green)" : "var(--text-secondary)"} strokeWidth={2}
                                style={{ filter: reposted ? "drop-shadow(0 0 6px var(--accent-green))" : "none", transition: "filter 0.2s" }} />
                        </motion.button>

                        {/* Share */}
                        <motion.button whileTap={{ scale: 0.82 }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            <Send size={20} stroke="var(--text-secondary)" strokeWidth={2} />
                        </motion.button>
                    </div>

                    {/* Bookmark */}
                    <motion.button whileTap={{ scale: 0.75 }} onClick={() => setBookmarked((b) => !b)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <Bookmark size={20}
                            fill={bookmarked ? "var(--accent-purple)" : "none"}
                            stroke={bookmarked ? "var(--accent-purple)" : "var(--text-secondary)"} strokeWidth={2}
                            style={{ filter: bookmarked ? "drop-shadow(0 0 6px var(--accent-purple))" : "none", transition: "filter 0.2s" }} />
                    </motion.button>
                </div>

                {/* Caption */}
                <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
                    <Link href={`/profile/${post.author.id}`} style={{ fontWeight: 800, color: "var(--text-primary)", textDecoration: "none" }}>
                        {post.author.username}{" "}
                    </Link>
                    <span style={{ color: "var(--text-secondary)" }}>{post.caption.replace(/#\w+/g, "").trim()}</span>
                </p>
                {post.comments > 0 && (
                    <button onClick={() => onComment(post)} style={{
                        background: "none", border: "none", marginTop: 5,
                        fontSize: "0.78rem", color: "var(--text-muted)", cursor: "pointer", padding: 0, fontFamily: "inherit",
                    }}>
                        View all {post.comments} comments
                    </button>
                )}
            </div>
        </motion.article>
    );
}
