// Mounts the homepage builder's sections into <div id="ig-home-sections"></div>.
// Import your EXISTING Firebase app's db export here — adjust the path below
// if your firebase init file lives somewhere other than js/firebase-config.js
import { db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { renderSection } from "./home-sections-render.js";

const mount = document.getElementById("ig-home-sections");

if (mount) {
  mount.classList.add("ig-home");

  const q = query(
    collection(db, "homepage_sections"),
    where("visible", "==", true),
    orderBy("order", "asc")
  );

  // Live updates: edits made in the page builder appear instantly, no redeploy needed.
  onSnapshot(q, (snapshot) => {
    mount.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const section = { id: docSnap.id, ...docSnap.data() };
      mount.appendChild(renderSection(section));
    });
  }, (err) => {
    console.error("Failed to load homepage sections:", err);
  });
} else {
  console.warn('home-sections-public.js: no element with id="ig-home-sections" found on this page.');
}
