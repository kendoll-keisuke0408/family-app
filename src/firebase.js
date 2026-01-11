import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

let app = null;
let db = null;
let auth = null;

try {
    const configStr = localStorage.getItem('firebase_config');
    if (configStr) {
        const firebaseConfig = JSON.parse(configStr);
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("🔥 Firebase initialized successfully.");
    } else {
        console.log("⚠️ Firebase config not found. Running in offline/local mode.");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

export { db, auth };
