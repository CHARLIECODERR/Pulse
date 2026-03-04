"use client";

import { motion } from "framer-motion";
import { Search, Bell, Sun, Moon, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";

interface TopBarProps {
    title?: string;
    showLogo?: boolean;
    showIcons?: boolean;
}

export default function TopBar({ title, showLogo = false, showIcons = false }: TopBarProps) {
    const { theme, toggle } = useTheme();
    const { signOut } = useAuth();
    const pathname = usePathname();
    const isProfilePage = pathname === "/profile";

    return (
        <header className="top-bar">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", padding: "0 16px" }}>
                {/* Left side */}
                {showLogo ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "var(--radius-md)",
                            background: "var(--gradient-main)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, fontWeight: 900, color: "white",
                            boxShadow: "3px 3px 0 rgba(100,0,150,0.5)",
                            fontFamily: "'Nunito', sans-serif",
                        }}>ϟ</div>
                        <span className="gradient-text" style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.5px", fontFamily: "'Nunito', sans-serif" }}>
                            Pulse
                        </span>
                    </motion.div>
                ) : (
                    <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {title}
                    </motion.h1>
                )}

                {/* Right icons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Theme toggle */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={toggle}
                        style={{
                            background: "var(--bg-elevated)",
                            border: "var(--stroke-width) solid var(--border-medium)",
                            borderRadius: "var(--radius-md)",
                            color: theme === "dark" ? "var(--accent-yellow)" : "var(--accent-purple)",
                            width: 36, height: 36,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "2px 2px 0 var(--border-medium)",
                        }}
                    >
                        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                    </motion.button>

                    {showIcons && (
                        <>
                            <Link href="/messages">
                                <motion.button whileTap={{ scale: 0.85 }} style={{
                                    background: "var(--bg-elevated)", border: "var(--stroke-width) solid var(--border-medium)",
                                    borderRadius: "var(--radius-md)", color: "var(--text-secondary)",
                                    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", boxShadow: "2px 2px 0 var(--border-medium)",
                                }}>
                                    <MessageCircle size={17} />
                                </motion.button>
                            </Link>
                            <Link href="/notifications">
                                <motion.button whileTap={{ scale: 0.85 }} style={{
                                    background: "var(--bg-elevated)", border: "var(--stroke-width) solid var(--border-medium)",
                                    borderRadius: "var(--radius-md)", color: "var(--text-secondary)",
                                    width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", position: "relative", boxShadow: "2px 2px 0 var(--border-medium)",
                                }}>
                                    <Bell size={17} />
                                    <span style={{
                                        position: "absolute", top: 5, right: 5,
                                        width: 8, height: 8, borderRadius: "var(--radius-full)",
                                        background: "var(--accent-pink)",
                                        border: "1.5px solid var(--bg-primary)",
                                        boxShadow: "0 0 6px var(--accent-pink)",
                                    }} />
                                </motion.button>
                            </Link>
                        </>
                    )}

                    {isProfilePage && !showIcons && (
                        <motion.button whileTap={{ scale: 0.85 }} onClick={signOut} style={{
                            background: "rgba(255,45,120,0.1)", border: "var(--stroke-width) solid var(--accent-pink)",
                            borderRadius: "var(--radius-md)", color: "var(--accent-pink)",
                            padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                            boxShadow: "2px 2px 0 var(--accent-pink)",
                        }}>
                            Log Out
                        </motion.button>
                    )}
                </div>
            </div>
        </header>
    );
}
