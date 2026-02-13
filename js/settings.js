import { db } from './firebase.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ref = doc(db, "settings", "store");

async function load() {
  const snap = await getDoc(ref);
  if (snap.exists()) {
    store.value = snap.data().storeName;
    whatsapp.value = snap.data().whatsapp;
  }
}

window.save = async () => {
  await setDoc(ref, {
    storeName: store.value,
    whatsapp: whatsapp.value
  });
  alert("Saved!");
};

load();