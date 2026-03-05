"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase/client";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const router = useRouter();

    useEffect(() => {
        localStorage.removeItem("pulse_user");
        localStorage.removeItem("pulse_profile");
    }, []);

    const handleGoogleAuth = async () => {
        setGoogleLoading(true);
        setError(null);
        setSuccessMsg(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if profile exists
            const docRef = doc(db, "profiles", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                // Create profile for new Google user
                await setDoc(docRef, {
                    username: user.email?.split("@")[0].replace(/[^a-z0-9_.]/gi, "").toLowerCase() || `user_${user.uid.substring(0, 5)}`,
                    displayName: user.displayName || "User",
                    avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
                    bio: "Hey there! I am using Pulse.",
                    isVerified: false,
                });
            }

            router.push("/feed");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (isLogin) {
                // Sign In
                await signInWithEmailAndPassword(auth, email, password);
                router.push("/feed");
                router.refresh();
            } else {
                // Sign Up
                // Check if username exists
                const q = query(collection(db, "profiles"), where("username", "==", username));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    throw new Error("Username already taken. Please choose another.");
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Create profile
                await setDoc(doc(db, "profiles", user.uid), {
                    username,
                    displayName: displayName || username,
                    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.uid}`,
                    bio: "Hey there! I am using Pulse.",
                    isVerified: false,
                });

                // Send email verification with dynamic URL for Vercel/Localhost
                const actionCodeSettings = {
                    url: `${window.location.origin}/login?verified=true`,
                    handleCodeInApp: false,
                };
                await sendEmailVerification(user, actionCodeSettings);

                setSuccessMsg("Welcome! Please check your email to verify your account before logging in.");
                setIsLogin(true);
            }
        } catch (err: any) {
            // Friendly error messages mapping
            let msg = err.message;
            if (err.code === "auth/email-already-in-use") msg = "This email is already registered.";
            if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") msg = "Invalid email or password.";
            setError(msg);
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

                    <button disabled={loading || googleLoading} className="btn-primary" type="submit" style={{ width: "100%", padding: "14px", fontSize: "1rem", marginTop: 8, display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {loading ? <Loader2 size={20} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> : (isLogin ? "LOG IN" : "SIGN UP")}
                    </button>

                    <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: "var(--border-medium)" }} />
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>OR</span>
                        <div style={{ flex: 1, height: 1, background: "var(--border-medium)" }} />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={loading || googleLoading}
                        className="btn-ghost"
                        style={{ width: "100%", padding: "12px", fontSize: "0.95rem", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, border: "1px solid var(--border-medium)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                        {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continue with Google
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

