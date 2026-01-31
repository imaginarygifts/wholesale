import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const listBox = document.getElementById("tagList");

// ================= SLUG =================
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

// ================= POPUP =================
function showPopup(msg) {
  const p = document.getElementById("popup");
  p.innerText = msg;
  p.classList.remove("hidden");
  setTimeout(() => p.classList.add("hidden"), 1500);
}

// ================= SAVE TAG =================
window.saveTag = async function () {
  const name = document.getElementById("tagName").value.trim();
  if (!name) return showPopup("Enter tag name");

  const slug = slugify(name);

  try {
    // Prevent duplicates
    const q = query(collection(db, "tags"), where("slug", "==", slug));
    const snap = await getDocs(q);

    if (!snap.empty) {
      showPopup("Tag already exists");
      return;
    }

    await addDoc(collection(db, "tags"), {
      name,
      slug,
      createdAt: Date.now()
    });

    document.getElementById("tagName").value = "";
    showPopup("Tag saved");
    loadTags();
  } catch (err) {
    alert(err.message);
  }
};

// ================= LOAD TAGS =================
async function loadTags() {
  listBox.innerHTML = "Loading...";
  const snap = await getDocs(collection(db, "tags"));

  listBox.innerHTML = "";

  if (snap.empty) {
    listBox.innerHTML = `<p style="opacity:0.6">No tags yet</p>`;
    return;
  }

  snap.forEach(d => {
    const t = d.data();
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <b>${t.name}</b>
      <small>${t.slug}</small>
      <button class="btn-outline" onclick="deleteTag('${d.id}')">Delete</button>
    `;

    listBox.appendChild(div);
  });
}

// ================= DELETE =================
window.deleteTag = async function (id) {
  if (!confirm("Delete this tag?")) return;
  await deleteDoc(doc(db, "tags", id));
  loadTags();
};

loadTags();