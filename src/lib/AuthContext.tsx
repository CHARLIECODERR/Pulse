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

        // Check active session on mount
        const fetchSession = async () => {
            console.log("[Auth] Checking active session...");
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!isMounted) return;

                if (session?.user) {
                    console.log("[Auth] Session found for", session.user.id);
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    console.log("[Auth] No active session");
                    setLoading(false);
                }
            } catch (err) {
                console.error("[Auth] Session check failed", err);
                if (isMounted) setLoading(false);
            }
        };

        fetchSession();

        // Safety timeout: 10s max
        const timeout = setTimeout(() => {
            if (loading && isMounted) {
                console.warn("[AuthSafety] Auth check timed out (10s), forcing ready.");
                setLoading(false);
            }
        }, 10000);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                console.log("[AuthEvent]", event);

                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    setUser(session?.user ?? null);
                    if (session?.user) await fetchProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
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

        console.log(`[Auth] Fetching profile (retry: ${isRetry}) for`, userId);
        isFetchingProfile.current = true;

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) throw error;
            if (data) {
                setProfile({
                    id: data.id,
                    username: data.username,
                    displayName: data.display_name,
                    avatarUrl: data.avatar_url,
                    bio: data.bio,
                    isVerified: data.is_verified,
                });
            } else if (!isRetry) {
                throw new Error("No data returned");
            }
        } catch (e) {
            console.error(`[Auth] Profile error (retry: ${isRetry})`, e);
            if (!isRetry) {
                console.log("[Auth] Retrying profile fetch in 1.5s...");
                await new Promise(r => setTimeout(r, 1500));
                isFetchingProfile.current = false;
                return fetchProfile(userId, true);
            }
        } finally {
            isFetchingProfile.current = false;
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
