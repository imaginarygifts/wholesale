import { db } from './firebase.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("catList");
const input = document.getElementById("catName");

let draggedItem = null;

/* ---------- LOAD CATEGORIES ---------- */
async function load() {
  list.innerHTML = "";

  const q = query(collection(db, "categories"), orderBy("order"));
  const snap = await getDocs(q);

  snap.forEach(docu => {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.id = docu.id;

    li.innerHTML = `
      <span>${docu.data().name}</span>
      <button onclick="del('${docu.id}')">❌</button>
    `;

    /* ---- DRAG EVENTS ---- */

    li.addEventListener("dragstart", () => {
      draggedItem = li;
      li.classList.add("dragging");
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      clearDragOver();
    });

    li.addEventListener("dragover", e => {
      e.preventDefault();
      li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });

    li.addEventListener("drop", async () => {
      li.classList.remove("drag-over");
      await reorderCategories(draggedItem, li);
    });

    list.appendChild(li);
  });
}

/* ---------- CLEAR DRAG STYLES ---------- */
function clearDragOver() {
  document
    .querySelectorAll(".drag-over")
    .forEach(el => el.classList.remove("drag-over"));
}

/* ---------- REORDER LOGIC ---------- */
async function reorderCategories(item1, item2) {
  if (!item1 || !item2 || item1 === item2) return;

  const items = [...list.children];
  const fromIndex = items.indexOf(item1);
  const toIndex = items.indexOf(item2);

  if (fromIndex === toIndex) return;

  // update UI instantly
  if (fromIndex < toIndex) {
    list.insertBefore(item1, item2.nextSibling);
  } else {
    list.insertBefore(item1, item2);
  }

  // update order in Firestore
  const updates = [...list.children].map((li, index) => {
    return updateDoc(doc(db, "categories", li.dataset.id), {
      order: index
    });
  });

  await Promise.all(updates);
}

/* ---------- ADD CATEGORY ---------- */
window.addCategory = async () => {
  const name = input.value.trim();
  if (!name) return;

  const snap = await getDocs(collection(db, "categories"));
  const order = snap.size;

  await addDoc(collection(db, "categories"), {
    name,
    order
  });

  input.value = "";
  load();
};

/* ---------- DELETE CATEGORY ---------- */
window.del = async (id) => {
  await deleteDoc(doc(db, "categories", id));
  load();
};

load();