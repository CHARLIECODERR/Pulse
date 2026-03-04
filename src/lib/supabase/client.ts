import { createBrowserClient } from "@supabase/ssr"
import { SupabaseClient } from "@supabase/supabase-js"

let supabaseInstance: SupabaseClient | null = null;

export function createClient() {
    // Return existing instance if it exists
    if (supabaseInstance) return supabaseInstance;

    // Create a new instance if none exists
    supabaseInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    return supabaseInstance;
}
