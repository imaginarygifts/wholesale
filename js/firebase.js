import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCvqsHjq_SZCPC3vGSLRjE8lxVir24lXW8",
  authDomain: "wholesale-12cc1.firebaseapp.com",
  projectId: "wholesale-12cc1",
  storageBucket: "wholesale-12cc1.firebasestorage.app",
  messagingSenderId: "972836157627",
  appId: "1:972836157627:web:dd7a25e73b64e092cbd19e",
  measurementId: "G-S51ETN7RQ6"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);