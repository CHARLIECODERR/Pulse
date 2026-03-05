importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

// We must hardcode the config here or use URL params, 
// because process.env is not available in a standard service worker context.
// However, since we want to avoid hardcoding, we can initialize it using the URL query params 
// passed when registering, or we just hardcode it for simplicity as these are public keys.

const firebaseConfig = {
    apiKey: new URL(location).searchParams.get("apiKey") || "API_KEY_PLACEHOLDER",
    authDomain: new URL(location).searchParams.get("authDomain") || "AUTH_DOMAIN_PLACEHOLDER",
    projectId: new URL(location).searchParams.get("projectId") || "PROJECT_ID_PLACEHOLDER",
    storageBucket: new URL(location).searchParams.get("storageBucket") || "STORAGE_BUCKET_PLACEHOLDER",
    messagingSenderId: new URL(location).searchParams.get("messagingSenderId") || "MESSAGING_SENDER_ID_PLACEHOLDER",
    appId: new URL(location).searchParams.get("appId") || "APP_ID_PLACEHOLDER",
};

// Only initialize if we got the params
if (firebaseConfig.apiKey !== "API_KEY_PLACEHOLDER") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log("[firebase-messaging-sw.js] Received background message ", payload);

        const notificationTitle = payload.notification?.title || "New Pulse Notification";
        const notificationOptions = {
            body: payload.notification?.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png', // Small white icon for Android status bar
            data: payload.data
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}
