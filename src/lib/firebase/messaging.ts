import { getToken } from "firebase/messaging";
import { messaging } from "./client";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./client";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const requestNotificationPermissionAndGetToken = async (userId: string) => {
    try {
        if (!messaging) {
            console.log("[FCM] Messaging not supported or initialized on this browser.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY
            });

            if (token) {
                console.log("[FCM] Token generated:", token);
                // Save the token to the user's profile
                const userRef = doc(db, 'profiles', userId);
                await updateDoc(userRef, {
                    fcmToken: token,
                    notificationsEnabled: true,
                });
                return token;
            } else {
                console.log("[FCM] No registration token available. Request permission to generate one.");
                return null;
            }
        } else {
            console.log("[FCM] Notification permission denied.");
            // If they denied, maybe we want to save that state as well
            const userRef = doc(db, 'profiles', userId);
            await updateDoc(userRef, {
                notificationsEnabled: false,
            });
            return null;
        }
    } catch (error) {
        console.error("[FCM] An error occurred while retrieving token:", error);
        return null;
    }
};
