import { createClient } from "./client";

export const getFollowCounts = async (userId: string) => {
    const supabase = createClient();

    const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

    if (followersError || followingError) {
        console.error('Error fetching follow counts:', followersError || followingError);
        return { followers: 0, following: 0 };
    }

    return {
        followers: followersCount || 0,
        following: followingCount || 0
    };
};

export const checkIsFollowing = async (followerId: string, followingId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle();

    if (error) {
        console.error('Error checking follow status:', error);
        return false;
    }

    return !!data;
};

export const followUser = async (followerId: string, followingId: string) => {
    const supabase = createClient();
    const { error } = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });

    if (error) {
        console.error('Error following user:', error);
        throw error;
    }
};

export const unfollowUser = async (followerId: string, followingId: string) => {
    const supabase = createClient();
    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

    if (error) {
        console.error('Error unfollowing user:', error);
        throw error;
    }
};
