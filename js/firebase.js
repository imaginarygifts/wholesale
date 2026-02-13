import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyATNHNTN0S_otYHNGuydqOjcr1AhCgD6yc",
  authDomain: "imaginary-gifts.firebaseapp.com",
  projectId: "imaginary-gifts",
  storageBucket: "imaginary-gifts.firebasestorage.app",
  messagingSenderId: "759826392629",
  appId: "1:759826392629:web:9d9bbe53c8ab36ad07737c",
  measurementId: "G-KXGKEFBC1F"
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);