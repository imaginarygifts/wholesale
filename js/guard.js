import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const ref = doc(db, "admins", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Not authorized");
    await auth.signOut();
    window.location.href = "login.html";
  }
});