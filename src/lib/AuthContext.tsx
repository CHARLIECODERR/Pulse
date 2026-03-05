"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        // --- NUCLEAR RESCUE: Optimistic Load ---
        const cachedUser = localStorage.getItem("pulse_user");
        const cachedProfile = localStorage.getItem("pulse_profile");
        if (cachedUser && cachedProfile) {
            console.log("[Auth] Optimistic load from cache");
            setUser(JSON.parse(cachedUser));
            setProfile(JSON.parse(cachedProfile));
            setLoading(false);
        }

        const fetchSession = async () => {
            console.log("[Auth] Fast-track session check...");
            try {
                // getUser() is often more reliable/faster for initial check than getSession()
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (!isMounted) return;

                if (authUser) {
                    console.log("[Auth] Verified user:", authUser.id);
                    setUser(authUser);
                    localStorage.setItem("pulse_user", JSON.stringify(authUser));
                    await fetchProfile(authUser.id);
                } else {
                    console.log("[Auth] No session, clearing cache");
                    localStorage.removeItem("pulse_user");
                    localStorage.removeItem("pulse_profile");
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                }
            } catch (err) {
                console.error("[Auth] Fast-track failed", err);
                if (isMounted) setLoading(false);
            }
        };

        fetchSession();

        // Safety timeout: 4s for feedback, 10s for force-ready
        const timeout = setTimeout(() => {
            if (loading && isMounted) {
                console.warn("[AuthSafety] Connection slow, using optimistic or waiting...");
                // Don't force loading false yet, give it more time if no cache
                if (!cachedProfile) {
                    setTimeout(() => { if (loading && isMounted) setLoading(false); }, 6000);
                }
            }
        }, 4000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;
                console.log("[AuthEvent]", event);

                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                    const u = session?.user ?? null;
                    setUser(u);
                    if (u) {
                        localStorage.setItem("pulse_user", JSON.stringify(u));
                        await fetchProfile(u.id);
                    }
                } else if (event === 'SIGNED_OUT') {
                    localStorage.removeItem("pulse_user");
                    localStorage.removeItem("pulse_profile");
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const isFetchingProfile = useRef(false);

    const fetchProfile = async (userId: string, isRetry = false) => {
        if (isFetchingProfile.current && !isRetry) return;
        isFetchingProfile.current = true;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) throw error;
            if (data) {
                const newProfile = {
                    id: data.id,
                    username: data.username,
                    displayName: data.display_name,
                    avatarUrl: data.avatar_url,
                    bio: data.bio,
                    isVerified: data.is_verified,
                };
                setProfile(newProfile);
                localStorage.setItem("pulse_profile", JSON.stringify(newProfile));
            }
        } catch (e) {
            console.error(`[Auth] Profile error`, e);
            if (!isRetry) {
                await new Promise(r => setTimeout(r, 1000));
                isFetchingProfile.current = false;
                return fetchProfile(userId, true);
            }
        } finally {
            isFetchingProfile.current = false;
            setLoading(false);
        }
    };

    const signOut = async () => {
        isFetchingProfile.current = false;
        localStorage.removeItem("pulse_user");
        localStorage.removeItem("pulse_profile");
        // Clear all cookies by signing out
        await supabase.auth.signOut();
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
