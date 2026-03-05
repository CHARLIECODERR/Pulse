"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase/client";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { requestNotificationPermissionAndGetToken } from "./firebase/messaging";

// Define the shape of our auth context
type PulseUser = {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    bio: string;
    isVerified: boolean;
};

type AuthContextType = {
    user: User | null;
    profile: PulseUser | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<PulseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        // --- Firebase Optimistic Load ---
        const cachedUser = localStorage.getItem("pulse_user");
        const cachedProfile = localStorage.getItem("pulse_profile");
        if (cachedUser && cachedProfile) {
            console.log("[Auth] Optimistic load from cache");
            setUser(JSON.parse(cachedUser));
            setProfile(JSON.parse(cachedProfile));
            setLoading(false);
        }

        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (!isMounted) return;

            if (authUser) {
                console.log("[Auth] Verified user:", authUser.uid);
                setUser(authUser);
                localStorage.setItem("pulse_user", JSON.stringify(authUser));
                await fetchProfile(authUser.uid);
            } else {
                console.log("[Auth] No session, clearing cache");
                localStorage.removeItem("pulse_user");
                localStorage.removeItem("pulse_profile");
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            console.log(`[Auth] Fetching profile for ${userId}...`);
            const docRef = doc(db, "profiles", userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const newProfile = {
                    id: userId,
                    username: data.username,
                    displayName: data.displayName || data.display_name,
                    avatarUrl: data.avatarUrl || data.avatar_url,
                    bio: data.bio || "",
                    isVerified: data.isVerified || false,
                };
                setProfile(newProfile);
                localStorage.setItem("pulse_profile", JSON.stringify(newProfile));

                // Request notification permission and save token silently in background
                if (typeof window !== "undefined") {
                    // Only request if VAPID key is configured
                    if (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY && process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY !== "REPLACE_WITH_VAPID_KEY_FROM_CONSOLE") {
                        requestNotificationPermissionAndGetToken(userId);
                    }
                }
            } else {
                console.log("[Auth] Profile document does not exist yet.");
                setProfile(null);
            }
        } catch (e) {
            console.error(`[Auth] Profile fetch failed:`, e);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        localStorage.removeItem("pulse_user");
        localStorage.removeItem("pulse_profile");
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
        router.push("/login");
        router.refresh();
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
