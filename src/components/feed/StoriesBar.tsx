"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { mockStories } from "@/lib/mockData";
import { Plus } from "lucide-react";
import { currentUser } from "@/lib/mockData";
import Link from "next/link";

export default function StoriesBar() {
    return (
        <div style={{ overflowX: "auto", display: "flex", gap: 14, padding: "14px 16px 10px", scrollbarWidth: "none" }}>
            {/* Add your story */}
            <motion.div whileTap={{ scale: 0.9 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <div style={{
                    position: "relative", width: 62, height: 62,
                    border: "var(--stroke-width) dashed var(--border-strong)",
                    borderRadius: "var(--radius-full)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", background: "var(--bg-elevated)",
                }}>
                    <Image src={currentUser.avatar} alt="Your story" width={56} height={56}
                        style={{ borderRadius: "var(--radius-full)", opacity: 0.55 }} unoptimized />
                    <motion.div
                        whileHover={{ scale: 1.15 }}
                        style={{
                            position: "absolute", bottom: -3, right: -3,
                            width: 22, height: 22, borderRadius: "var(--radius-full)",
                            background: "var(--gradient-main)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "2.5px solid var(--bg-primary)",
                            boxShadow: "0 0 8px var(--accent-purple)",
                        }}>
                        <Plus size={11} color="white" strokeWidth={3} />
                    </motion.div>
                </div>
                <span style={{ fontSize: "0.67rem", color: "var(--text-muted)", fontWeight: 700 }}>Your story</span>
            </motion.div>

            {/* Stories */}
            {mockStories.map((story, i) => (
                <motion.div key={story.id}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 280, damping: 18 }}
                    whileTap={{ scale: 0.88 }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer" }}>
                    <Link href={`/profile/${story.user.id}`} style={{ textDecoration: "none" }}>
                        <div style={{
                            padding: story.hasNew ? 2.5 : 2,
                            borderRadius: "var(--radius-full)",
                            background: story.hasNew
                                ? "var(--gradient-main)"
                                : "var(--border-medium)",
                            opacity: story.isViewed ? 0.5 : 1,
                            boxShadow: story.hasNew && !story.isViewed ? "0 0 12px rgba(180,77,255,0.5)" : "none",
                        }}>
                            <div style={{ padding: 2.5, background: "var(--bg-primary)", borderRadius: "var(--radius-full)" }}>
                                <Image src={story.user.avatar} alt={story.user.username} width={54} height={54}
                                    style={{ borderRadius: "var(--radius-full)", display: "block" }} unoptimized />
                            </div>
                        </div>
                    </Link>
                    <span style={{
                        fontSize: "0.67rem", fontWeight: 700,
                        color: story.isViewed ? "var(--text-muted)" : "var(--text-secondary)",
                        maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center",
                    }}>
                        {story.user.username.split(".")[0]}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}
