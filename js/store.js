import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("productGrid");
const categoryBar = document.getElementById("categoryBar");
const tagRow = document.getElementById("tagFilterRow");

let allProducts = [];
let allCategories = [];
let allTags = [];

let activeCategory = "all";
let activeTag = "all";

/* ================= HELPERS ================= */

function getUsedCategoryIds() {
  return new Set(allProducts.map(p => p.categoryId).filter(Boolean));
}

function getUsedTagSlugs() {
  const set = new Set();
  allProducts.forEach(p => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach(t => set.add(t));
    }
  });
  return set;
}

/* ================= PRODUCTS ================= */

async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}

/* ================= CATEGORIES ================= */

async function loadCategories() {
  const q = query(
    collection(db, "categories"),
    orderBy("order")
  );

  const snap = await getDocs(q);
  const usedCategoryIds = getUsedCategoryIds();

  allCategories = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(cat => usedCategoryIds.has(cat.id));

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
    document
      .querySelectorAll(".category-pill")
      .forEach(p => p.classList.remove("active"));

    div.classList.add("active");
    renderProducts();
  };

  return div;
}

/* ================= TAGS ================= */

async function loadFrontendTags() {
  if (!tagRow) return;

  const snap = await getDocs(collection(db, "tags"));
  const usedTagSlugs = getUsedTagSlugs();

  allTags = snap.docs
    .map(d => d.data())
    .filter(tag => usedTagSlugs.has(tag.slug));

  renderTags();
}

function renderTags() {
  tagRow.innerHTML = "";

  tagRow.appendChild(createTagChip("All", "all"));

  allTags.forEach(tag => {
    tagRow.appendChild(createTagChip(tag.name, tag.slug));
  });
}

function createTagChip(label, slug) {
  const chip = document.createElement("div");
  chip.className = "tag-chip" + (activeTag === slug ? " active" : "");
  chip.innerText = label;

  chip.onclick = () => {
    activeTag = activeTag === slug ? "all" : slug;
    updateTagUI();
    renderProducts();
  };

  return chip;
}

function updateTagUI() {
  document.querySelectorAll(".tag-chip").forEach(chip => {
    const slug = chip.innerText.toLowerCase();
    chip.classList.remove("active");

    if (
      (activeTag === "all" && slug === "all") ||
      slug === activeTag
    ) {
      chip.classList.add("active");
    }
  });
}

/* ================= RENDER PRODUCTS ================= */

function renderProducts() {
  grid.innerHTML = "";

  const filtered = allProducts.filter(p => {
    const categoryMatch =
      activeCategory === "all" || p.categoryId === activeCategory;

    const tagMatch =
      activeTag === "all" ||
      (Array.isArray(p.tags) && p.tags.includes(activeTag));

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
        <img src="${p.images?.[0] || ""}">
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

(async function init() {
  await loadProducts();
  await loadCategories();
  await loadFrontendTags();
})();