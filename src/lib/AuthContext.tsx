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
        };

        fetchSession();

        // Safety timeout: Ensure loading is ALWAYS turned off eventually (6s max)
        const timeout = setTimeout(() => {
            if (loading && isMounted) {
                console.warn("[AuthSafety] Auth check took too long, forcing loading to false");
                setLoading(false);
            }
        }, 6000);

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                console.log("[AuthEvent]", event);

                if (event === 'SIGNED_IN') {
                    setUser(session?.user ?? null);
                    if (session?.user) await fetchProfile(session.user.id);
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                } else if (event === 'TOKEN_REFRESHED') {
                    setUser(session?.user ?? null);
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
        if (isFetchingProfile.current && !isRetry) {
            console.log("[Auth] Profile fetch already in progress, skipping...");
            return;
        }

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
                throw new Error("Profile not found, will retry...");
            }
        } catch (e) {
            console.error(`[Auth] Error fetching profile (retry: ${isRetry})`, e);
            if (!isRetry) {
                console.log("[Auth] Retrying profile fetch in 1s...");
                await new Promise(resolve => setTimeout(resolve, 1000));
                isFetchingProfile.current = false; // Allow retry
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
