"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
        // Check active session on mount
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        };

        fetchSession();

        // Safety timeout: Ensure loading is ALWAYS turned off eventually (5s max)
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn("[AuthSafety] Auth check took too long, forcing loading to false");
                setLoading(false);
            }
        }, 5000);

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
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
            }
        } catch (e) {
            console.error("Error fetching profile", e);
        } finally {
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
