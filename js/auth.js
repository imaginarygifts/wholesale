import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.login = async function () {
  const input = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    if (input.includes("@")) {
      await signInWithEmailAndPassword(auth, input, password);
      window.location.href = "dashboard.html";
    } else {
      const q = query(collection(db, "admins"), where("username", "==", input));
      const snap = await getDocs(q);

      if (snap.empty) throw "User not found";

      const email = snap.docs[0].data().email;
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    document.getElementById("error").innerText = err;
  }
};