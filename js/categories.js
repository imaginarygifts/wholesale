import { db } from './firebase.js';
import { collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("catList");

async function load() {
  list.innerHTML = "";
  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(docu => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${docu.data().name}
      <button onclick="del('${docu.id}')">❌</button>
    `;
    list.appendChild(li);
  });
}

window.addCategory = async () => {
  const name = document.getElementById("catName").value;
  if (!name) return;
  await addDoc(collection(db, "categories"), { name });
  load();
};

window.del = async (id) => {
  await deleteDoc(doc(db, "categories", id));
  load();
};

load();