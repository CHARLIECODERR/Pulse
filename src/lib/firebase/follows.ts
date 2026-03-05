import { db } from "./client";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc, getCountFromServer } from "firebase/firestore";

export const getFollowCounts = async (userId: string) => {
    try {
        const followersCol = collection(db, 'follows');

        const followersQ = query(followersCol, where('followingId', '==', userId));
        const followingQ = query(followersCol, where('followerId', '==', userId));

        const [followersSnap, followingSnap] = await Promise.all([
            getCountFromServer(followersQ),
            getCountFromServer(followingQ)
        ]);

        return {
            followers: followersSnap.data().count || 0,
            following: followingSnap.data().count || 0
        };
    } catch (e) {
        console.error('Error fetching follow counts:', e);
        return { followers: 0, following: 0 };
    }
};

export const checkIsFollowing = async (followerId: string, followingId: string) => {
    try {
        const docId = `${followerId}_${followingId}`;
        const docRef = doc(db, 'follows', docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (e) {
        console.error('Error checking follow status:', e);
        return false;
    }
};

export const followUser = async (followerId: string, followingId: string) => {
    try {
        const docId = `${followerId}_${followingId}`;
        const docRef = doc(db, 'follows', docId);
        await setDoc(docRef, {
            followerId,
            followingId,
            createdAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('Error following user:', e);
        throw e;
    }
};

export const unfollowUser = async (followerId: string, followingId: string) => {
    try {
        const docId = `${followerId}_${followingId}`;
        const docRef = doc(db, 'follows', docId);
        await deleteDoc(docRef);
    } catch (e) {
        console.error('Error unfollowing user:', e);
        throw e;
    }
};
