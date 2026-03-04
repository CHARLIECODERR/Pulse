"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isLogin) {
                // Sign In
                const { error: authError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (authError) throw authError;
                router.push("/feed");
                router.refresh();
            } else {
                // Sign Up
                // 1. Check if username exists first since auth meta data won't error out on duplicates until trigger runs
                const { data: existingUser } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("username", username)
                    .single();

                if (existingUser) {
                    throw new Error("Username already taken. Please choose another.");
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username,
                            display_name: displayName || username,
                        },
                    },
                });
                if (signUpError) throw signUpError;

                // Success: Show Email Verification Alert
                setSuccessMsg("Welcome! Please check your email to verify your account before logging in.");
                setIsLogin(true); // Switch to login form so they can log in after verifying
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "var(--bg-primary)"
        }}>
            {/* Background decorations */}
            <div style={{ position: "fixed", top: "-10%", left: "-10%", width: 300, height: 300, background: "var(--accent-purple)", filter: "blur(120px)", opacity: 0.15, pointerEvents: "none" }} />
            <div style={{ position: "fixed", bottom: "-10%", right: "-10%", width: 300, height: 300, background: "var(--accent-cyan)", filter: "blur(120px)", opacity: 0.15, pointerEvents: "none" }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="anime-card"
                style={{ width: "100%", maxWidth: 400, padding: "32px 24px", position: "relative", zIndex: 10 }}
            >
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 50, height: 50, borderRadius: "var(--radius-md)",
                        background: "var(--gradient-main)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, fontWeight: 900, color: "white", margin: "0 auto 16px",
                        boxShadow: "4px 4px 0 rgba(100,0,150,0.5)", fontFamily: "'Nunito', sans-serif"
                    }}>ϟ</div>
                    <h1 className="gradient-text" style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-1px" }}>
                        Welcome to Pulse
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 8 }}>
                        {isLogin ? "Enter the grid" : "Create your identity"}
                    </p>
                </div>

                <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <AnimatePresence mode="popLayout">
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}
                            >
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>USERNAME *</label>
                                    <input required={!isLogin} className="input-base" type="text" placeholder="cyberpunk2077"
                                        value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                                        style={{ width: "100%", padding: "12px 14px" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>FULL NAME</label>
                                    <input className="input-base" type="text" placeholder="John Doe"
                                        value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                        style={{ width: "100%", padding: "12px 14px" }} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>EMAIL</label>
                        <input required className="input-base" type="email" placeholder="runner@example.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            style={{ width: "100%", padding: "12px 14px" }} />
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>PASSWORD</label>
                        <input required className="input-base" type="password" placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            style={{ width: "100%", padding: "12px 14px" }} />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{ background: "rgba(255,45,120,0.1)", border: "1px solid var(--accent-pink)", padding: "10px 14px", borderRadius: "var(--radius-sm)", color: "var(--accent-pink)", fontSize: "0.85rem", fontWeight: 600 }}>
                                {error}
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{ background: "rgba(57, 255, 20, 0.1)", border: "1px solid var(--accent-green)", padding: "12px 14px", borderRadius: "var(--radius-sm)", color: "var(--accent-green)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <MailCheck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>{successMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button disabled={loading} className="btn-primary" type="submit" style={{ width: "100%", padding: "14px", fontSize: "1rem", marginTop: 8, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {loading ? <Loader2 size={20} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : (isLogin ? "LOG IN" : "SIGN UP")}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: 24 }}>
                    <button onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <span style={{ color: "var(--accent-cyan)", textDecoration: "underline" }}>
                            {isLogin ? "Sign up" : "Log in"}
                        </span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
