import { db } from "./firebase.js";
import { collection, getDocs } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("productGrid");
const categoryBar = document.getElementById("categoryBar");
const tagRow = document.getElementById("tagFilterRow");

let allProducts = [];
let allCategories = [];
let allTags = [];

let activeCategory = "all";
let activeTag = "all";

/* ================= CATEGORIES ================= */

async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategoryBar();
}

function renderCategoryBar() {
  categoryBar.innerHTML = "";

  categoryBar.appendChild(createCategoryBtn("All", "all"));

  allCategories.forEach(cat => {
    categoryBar.appendChild(createCategoryBtn(cat.name, cat.id));
  });
}

function createCategoryBtn(label, id) {
  const div = document.createElement("div");
  div.className = "category-pill" + (activeCategory === id ? " active" : "");
  div.innerText = label;

  div.onclick = () => {
    activeCategory = id;
    document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
    div.classList.add("active");
    renderProducts();
  };

  return div;
}

/* ================= TAGS ================= */

async function loadFrontendTags() {
  if (!tagRow) return;

  const snap = await getDocs(collection(db, "tags"));
  allTags = snap.docs.map(d => d.data());

  renderTags();
}

function renderTags() {
  tagRow.innerHTML = "";

  // ALL tag
  const allChip = createTagChip("All", "all");
  tagRow.appendChild(allChip);

  allTags.forEach(tag => {
    tagRow.appendChild(createTagChip(tag.name, tag.slug));
  });
}

function createTagChip(label, slug) {
  const chip = document.createElement("div");
  chip.className = "tag-chip" + (activeTag === slug ? " active" : "");
  chip.innerText = label;

  chip.onclick = () => {
    // toggle
    activeTag = activeTag === slug ? "all" : slug;
    updateTagUI();
    renderProducts();
  };

  return chip;
}

function updateTagUI() {
  document.querySelectorAll(".tag-chip").forEach(chip => {
    const tag = chip.innerText.toLowerCase();
    chip.classList.remove("active");

    if (
      (activeTag === "all" && tag === "all") ||
      tag === activeTag
    ) {
      chip.classList.add("active");
    }
  });
}

/* ================= PRODUCTS ================= */

async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}

function renderProducts() {
  grid.innerHTML = "";

  const filtered = allProducts.filter(p => {
    const categoryMatch =
      activeCategory === "all" || p.categoryId === activeCategory;

    const tagMatch =
      activeTag === "all" ||
      (p.tags && p.tags.includes(activeTag));

    return categoryMatch && tagMatch;
  });

  if (!filtered.length) {
    grid.innerHTML = `<p class="empty">No products found</p>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";

const isBestseller = p.tags && p.tags.includes("bestseller");

card.innerHTML = `
  <div class="img-wrap">
    ${isBestseller ? `<span class="badge">🔥 Bestseller</span>` : ""}
    <img src="${p.images?.[0] || ''}">
  </div>

  <div class="info">
    <h4>${p.name}</h4>
    <p>₹${p.basePrice}</p>
  </div>
`;

    card.onclick = () => {
      location.href = `product.html?id=${p.id}`;
    };

    grid.appendChild(card);
  });
}

/* ================= INIT ================= */

loadCategories();
loadFrontendTags();
loadProducts();