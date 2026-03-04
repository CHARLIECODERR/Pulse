"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, MessageCircle, UserPlus, AtSign } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { mockNotifications, type Notification } from "@/lib/mockData";

const iconMap = {
    like: { icon: Heart, color: "#ec4899", bg: "rgba(236,72,153,0.15)" },
    comment: { icon: MessageCircle, color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
    follow: { icon: UserPlus, color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
    mention: { icon: AtSign, color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
};

export default function NotificationsPage() {
    const unread = mockNotifications.filter((n) => !n.isRead);
    const read = mockNotifications.filter((n) => n.isRead);

    const renderNotification = (n: Notification, i: number) => {
        const { icon: Icon, color, bg } = iconMap[n.type];
        return (
            <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: n.isRead ? "transparent" : "rgba(139,92,246,0.04)",
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                }}
            >
                {/* Avatar with icon badge */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                    <Image
                        src={n.actor.avatar}
                        alt={n.actor.username}
                        width={46}
                        height={46}
                        style={{ borderRadius: "var(--radius-full)" }}
                        unoptimized
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            width: 20,
                            height: 20,
                            borderRadius: "var(--radius-full)",
                            background: bg,
                            border: `1.5px solid var(--bg-primary)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Icon size={10} color={color} fill={n.type === "like" ? color : "none"} strokeWidth={2.5} />
                    </div>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.83rem", lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600 }}>{n.actor.username} </span>
                        <span style={{ color: "var(--text-secondary)" }}>{n.message}</span>
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{n.timeAgo}</p>
                </div>

                {/* Post thumbnail */}
                {n.postImage && (
                    <div style={{ position: "relative", width: 44, height: 44, borderRadius: "var(--radius-sm)", overflow: "hidden", flexShrink: 0 }}>
                        <Image src={n.postImage} alt="Post" fill style={{ objectFit: "cover" }} unoptimized />
                    </div>
                )}

                {/* Unread dot */}
                {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: "var(--accent-purple)", flexShrink: 0 }} />
                )}
            </motion.div>
        );
    };

    return (
        <>
            <TopBar title="Notifications" />
            <main className="page-content">
                {unread.length > 0 && (
                    <div>
                        <div style={{ padding: "12px 16px 4px" }}>
                            <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>NEW</h2>
                        </div>
                        {unread.map((n, i) => renderNotification(n, i))}
                    </div>
                )}

                {read.length > 0 && (
                    <div>
                        <div style={{ padding: "16px 16px 4px" }}>
                            <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>EARLIER</h2>
                        </div>
                        {read.map((n, i) => renderNotification(n, i + unread.length))}
                    </div>
                )}
            </main>
        </>
    );
}
