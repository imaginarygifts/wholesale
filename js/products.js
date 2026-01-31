import { db } from "./firebase.js";
import { collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("productList");
const categoryBar = document.getElementById("categoryBar"); // ADD THIS

let allProducts = [];
let categories = [];
let activeCategory = "all";

// LOAD CATEGORIES
async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategoryBar();
}

// RENDER CATEGORY BAR
function renderCategoryBar() {
  categoryBar.innerHTML = "";

  const allBtn = createCategoryBtn("All", "all");
  categoryBar.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = createCategoryBtn(cat.name, cat.id);
    categoryBar.appendChild(btn);
  });
}

// CREATE CATEGORY BUTTON
function createCategoryBtn(label, id) {
  const btn = document.createElement("div");
  btn.className = "category-pill" + (activeCategory === id ? " active" : "");
  btn.innerText = label;

  btn.onclick = () => {
    activeCategory = id;
    document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    renderProducts();
  };

  return btn;
}

// LOAD PRODUCTS (your logic preserved)
async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = snap.docs.map(p => ({ id: p.id, ...p.data() }));
  renderProducts();
}

// RENDER PRODUCTS (your logic wrapped)
function renderProducts() {
  list.innerHTML = "";

  const filtered = activeCategory === "all"
    ? allProducts
    : allProducts.filter(p => p.categoryId === activeCategory);

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";

div.innerHTML = `
  <div class="card-content">
    <h3>${p.name}</h3>
    <p>₹${p.basePrice}</p>

    <div style="display:flex;gap:10px">
      <button class="btn-outline" onclick="editProduct('${p.id}')">Edit</button>
      <button class="btn-outline" onclick="deleteProduct('${p.id}')">Delete</button>
    </div>
  </div>

  <img src="${p.images?.[0] || ''}">
`;
    list.appendChild(div);
  });
}

window.editProduct = (id) => {
  location.href = `edit-product.html?id=${id}`;
};

window.deleteProduct = async (id) => {
  if (!confirm("Delete this product?")) return;
  await deleteDoc(doc(db, "products", id));
  loadProducts();
};

// INIT
loadCategories(); // ADD
loadProducts();