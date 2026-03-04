"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Search, PlusSquare, Bell, User, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
    { href: "/feed", icon: Home, label: "Feed" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/create", icon: PlusSquare, label: "Create", isCreate: true },
    { href: "/messages", icon: MessageCircle, label: "DMs" },
    { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { profile } = useAuth();

    return (
        <nav className="bottom-nav">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", height: "100%", padding: "0 6px" }}>
                {navItems.map(({ href, icon: Icon, label, isCreate }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");

                    return (
                        <Link key={href} href={href} style={{ textDecoration: "none", flex: 1, display: "flex", justifyContent: "center" }}>
                            <motion.div
                                whileTap={{ scale: 0.8 }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: isCreate ? "10px 14px" : "8px 10px",
                                    borderRadius: isCreate ? "var(--radius-lg)" : "var(--radius-md)",
                                    ...(isCreate && {
                                        background: "var(--gradient-main)",
                                        boxShadow: "3px 3px 0 rgba(100,0,150,0.5)",
                                    }),
                                }}
                            >
                                {isCreate ? (
                                    <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} style={{ color: "white" }} />
                                ) : href === "/profile" && profile ? (
                                    <div style={{
                                        position: "relative", width: 26, height: 26, borderRadius: "var(--radius-full)",
                                        border: `2px solid ${isActive ? "var(--accent-purple)" : "transparent"}`,
                                        boxShadow: isActive ? "0 0 8px var(--accent-purple)" : "none",
                                        padding: isActive ? 2 : 0, transition: "all 0.2s"
                                    }}>
                                        <Image src={profile.avatarUrl || "https://api.dicebear.com/7.x/adventurer/svg?seed=newuser"} alt="Profile" fill style={{ borderRadius: "var(--radius-full)" }} unoptimized />
                                    </div>
                                ) : (
                                    <Icon size={23} strokeWidth={isActive ? 2.5 : 1.8} style={{
                                        color: isActive ? "var(--accent-purple)" : "var(--text-muted)",
                                        filter: isActive ? "drop-shadow(0 0 6px var(--accent-purple))" : "none",
                                        transition: "color 0.2s, filter 0.2s",
                                    }} />
                                )}
                                {isActive && !isCreate && (
                                    <motion.div
                                        layoutId="nav-dot"
                                        className="nav-dot"
                                        style={{ marginTop: -2 }}
                                    />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
