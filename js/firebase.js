import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaeaJy8haKhn3Ve5rUdrj7XItXPI-ujDU",
  authDomain: "sellfix-designing.firebaseapp.com",
  projectId: "sellfix-designing",
  storageBucket: "sellfix-designing.firebasestorage.app",
  messagingSenderId: "129826052151",
  appId: "1:129826052151:web:ff6f1cb5fce219d65087b2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);