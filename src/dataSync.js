
import { db } from './firebase';
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// Check if cloud mode is active
const isCloudMode = () => !!db;

/**
 * Save data to both LocalStorage and Firestore (if available)
 */
export const saveData = async (key, data) => {
    // 1. Always save to LocalStorage for speed & backup
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("LocalStorage save failed (quota exceeded?)", e);
    }

    // 2. Save to Cloud
    if (isCloudMode()) {
        try {
            // Save under collection "family_data", document ID = key
            await setDoc(doc(db, "family_data", key), {
                payload: data,
                updatedAt: new Date().toISOString(),
                updatedBy: localStorage.getItem('family_app_user_id') || 'unknown'
            });
        } catch (e) {
            console.error("Cloud save failed:", e);
        }
    }
};

/**
 * Subscribe to real-time updates.
 * Returns an unsubscribe function.
 */
export const subscribeData = (key, callback) => {
    // Initial load from LocalStorage to show something instantly
    const local = localStorage.getItem(key);
    if (local) {
        try {
            callback(JSON.parse(local));
        } catch (e) {
            console.error("Local data parse error", e);
        }
    }

    if (!isCloudMode()) {
        return () => { }; // No-op for offline
    }

    // Listen to Firestore
    const unsub = onSnapshot(doc(db, "family_data", key), (docSnap) => {
        if (docSnap.exists()) {
            const remoteData = docSnap.data().payload;

            // Basic conflict check: simple overwrite for now (last win)
            // Save to local
            localStorage.setItem(key, JSON.stringify(remoteData));

            // Notify UI
            callback(remoteData);
            console.log(`📡 Synced [${key}] from cloud.`);
        }
    }, (error) => {
        console.error(`Sync error for [${key}]:`, error);
    });

    return unsub;
};
