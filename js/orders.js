import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= STATE ================= */
let allOrders = [];
let filteredOrders = [];
let categoryMap = {};
let activeRange = "today";
let currentPage = 1;
const PAGE_SIZE = 25;


const params = new URLSearchParams(window.location.search);

const urlStatus = params.get("status");
const urlRange = params.get("range");
const urlPaymentStatus = params.get("paymentStatus");
const urlBalance = params.get("balance");

/* ================= DOM ================= */
const listEl = document.getElementById("ordersList");
const pageNoEl = document.getElementById("pageNo");
const searchInput = document.getElementById("searchInput");

const productFilter = document.getElementById("productFilter");
const categoryFilter = document.getElementById("categoryFilter");
const paymentFilter = document.getElementById("paymentFilter");
const tagFilter = document.getElementById("tagFilter");
const statusFilter = document.getElementById("statusFilter");
const paymentStatusFilter = document.getElementById("paymentStatusFilter");

const bulkType = document.getElementById("bulkActionType");
const bulkValue = document.getElementById("bulkActionValue");
const selectAllCheckbox = document.getElementById("selectAllOrders");

/* ================= BULK ACTION OPTIONS ================= */
bulkType.addEventListener("change", () => {
  bulkValue.innerHTML = `<option value="">Select Value</option>`;

  if (bulkType.value === "orderStatus") {
    ["pending","ready","shipped","delivered","cancelled","returned"]
      .forEach(v => bulkValue.innerHTML += `<option value="${v}">${v}</option>`);
  }

  if (bulkType.value === "paymentStatus") {
    ["pending","paid","refund"]
      .forEach(v => bulkValue.innerHTML += `<option value="${v}">${v}</option>`);
  }

  if (bulkType.value === "paymentMode") {
    ["online","cod","whatsapp","advance"]
      .forEach(v => bulkValue.innerHTML += `<option value="${v}">${v}</option>`);
  }
});

/* ================= HELPERS ================= */
function formatDateTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* ===== NORMALIZED PAYMENT MODE ===== */
function getPaymentMode(o) {
  return String(
    o.payment?.mode ||
    o.paymentMode ||
    "cod"
  ).toLowerCase();
}

/* ===== NORMALIZED PAYMENT STATUS ===== */
function getPaymentStatus(o) {
  return String(
    o.payment?.status ||
    o.paymentStatus ||
    (getPaymentMode(o) === "cod" ? "pending" : "paid")
  ).toLowerCase();
}

/* ===== PRODUCT KEY (NAME-BASED, NO DUPLICATES) ===== */
function getProductKey(o) {
  return (
    o.productName ||
    o.product?.name ||
    ""
  ).toLowerCase().trim();
}

function getProductLabel(o) {
  return (
    o.productName ||
    o.product?.name ||
    "Unknown Product"
  );
}

/* ================= LOAD CATEGORIES ================= */
async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(d => {
    categoryMap[d.id] = d.data().name;
  });
}

/* ================= LOAD ORDERS ================= */
async function loadOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  populateFilters();
  applyFilters();
}

await loadCategories();
await loadOrders();

/* ================= DATE RANGE ================= */
window.setRange = function (range, btn) {
  activeRange = range;
  currentPage = 1;

  document.querySelectorAll(".range-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  applyFilters();
};

function isInRange(ts) {
  if (activeRange === "all") return true;
  const DAY = 86400000;
  return Date.now() - ts < (activeRange === "today" ? DAY : Number(activeRange) * DAY);
}

/* ================= FILTER LOGIC ================= */
function applyFilters() {
  const search = searchInput.value.toLowerCase();

  filteredOrders = allOrders.filter(o => {
    if (!isInRange(o.createdAt)) return false;

    if (productFilter.value && getProductKey(o) !== productFilter.value) return false;
    if (categoryFilter.value && o.categoryId !== categoryFilter.value) return false;
    if (statusFilter.value && o.orderStatus !== statusFilter.value) return false;
    if (paymentFilter.value && getPaymentMode(o) !== paymentFilter.value) return false;
    if (paymentStatusFilter.value && getPaymentStatus(o) !== paymentStatusFilter.value) return false;
    if (tagFilter.value && !(o.tags || []).includes(tagFilter.value)) return false;

    if (search) {
      const t =
        (o.orderNumber || "") +
        (o.productName || "") +
        (o.customer?.name || "") +
        (o.customer?.phone || "");
      if (!t.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  currentPage = 1;
  renderOrders();
}

/* ================= POPULATE FILTERS ================= */
function populateFilters() {
  productFilter.innerHTML = `<option value="">All Products</option>`;
  categoryFilter.innerHTML = `<option value="">All Categories</option>`;
  tagFilter.innerHTML = `<option value="">All Tags</option>`;

  /* PRODUCTS */
  const productMap = new Map();
  allOrders.forEach(o => {
    const key = getProductKey(o);
    const label = getProductLabel(o);
    if (!key) return;
    if (!productMap.has(key)) productMap.set(key, label);
  });
  productMap.forEach((label, key) => {
    productFilter.innerHTML += `<option value="${key}">${label}</option>`;
  });

  /* CATEGORIES */
  const categorySet = new Set();
  allOrders.forEach(o => {
    if (o.categoryId) categorySet.add(o.categoryId);
  });
  categorySet.forEach(id => {
    categoryFilter.innerHTML += `
      <option value="${id}">
        ${categoryMap[id] || "Unknown Category"}
      </option>`;
  });

  /* TAGS */
  const tags = new Set();
  allOrders.forEach(o => (o.tags || []).forEach(t => tags.add(t)));
  tags.forEach(t => {
    tagFilter.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

/* ================= RENDER ================= */
function renderOrders() {
  listEl.innerHTML = "";

  if (!filteredOrders.length) {
    listEl.innerHTML = `<p style="opacity:.6;text-align:center">No orders found</p>`;
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageOrders = filteredOrders.slice(start, start + PAGE_SIZE);

  pageOrders.forEach(o => {
    const card = document.createElement("div");
    card.className = "order-card";

    card.innerHTML = `
      <input type="checkbox" class="order-check" data-id="${o.id}">
      <div class="order-left">
        <img src="${o.productImage || 'img/no-image.png'}" class="order-thumb">
      </div>

      <div class="order-middle">
        <div class="order-id">${o.orderNumber || "—"}</div>
        <div class="order-product">${o.productName || ""}</div>
        <div class="order-customer">${o.customer?.name || ""} • ${o.customer?.phone || ""}</div>
        <div class="order-date muted">${formatDateTime(o.createdAt)}</div>
      </div>

      <div class="order-right">
        <div class="status ${o.orderStatus}">${o.orderStatus}</div>
        <div class="payment ${getPaymentMode(o)}">${getPaymentMode(o)}</div>
        <div class="payment-status ${getPaymentStatus(o)}">${getPaymentStatus(o)}</div>
        <div class="order-price">₹${o.pricing?.finalAmount || o.finalAmount || o.price || 0}</div>
      </div>
    `;

    card.querySelector(".order-check").addEventListener("click", e => e.stopPropagation());
    card.onclick = () => location.href = `order-view.html?id=${o.id}`;

    listEl.appendChild(card);
  });

  pageNoEl.innerText = `Page ${currentPage}`;
}

/* ================= BULK APPLY ================= */
window.applyBulkAction = async function () {
  const type = bulkType.value;
  const value = bulkValue.value;
  if (!type || !value) return alert("Select action & value");

  const ids = [...document.querySelectorAll(".order-check:checked")]
    .map(c => c.dataset.id);

  if (!ids.length) return alert("Select orders first");

  for (const id of ids) {
    const ref = doc(db, "orders", id);
    const order = allOrders.find(o => o.id === id);

    if (type === "orderStatus") {
      await updateDoc(ref, { orderStatus: value });
    }

    if (type === "paymentMode") {
      await updateDoc(ref, { "payment.mode": value });
    }

    if (type === "paymentStatus") {
      const total =
        order?.pricing?.finalAmount ||
        order?.finalAmount ||
        order?.price ||
        0;

      if (value === "paid") {
        await updateDoc(ref, {
          payment: {
            mode: getPaymentMode(order),
            status: "paid",
            paidAmount: total
          }
        });
      } else if (value === "refund") {
        await updateDoc(ref, {
          orderStatus: "cancelled",
          payment: {
            mode: getPaymentMode(order),
            status: "refund",
            paidAmount: 0
          }
        });
      } else {
        await updateDoc(ref, {
          payment: {
            mode: getPaymentMode(order),
            status: value,
            paidAmount: order?.payment?.paidAmount || 0
          }
        });
      }
    }
  }

  alert("Bulk update successful");
  await loadOrders();
};

/* ================= SELECT ALL ================= */
selectAllCheckbox.addEventListener("change", () => {
  document.querySelectorAll(".order-check")
    .forEach(c => (c.checked = selectAllCheckbox.checked));
});

/* ================= EVENT LISTENERS ================= */
[
  productFilter,
  categoryFilter,
  paymentFilter,
  statusFilter,
  paymentStatusFilter,
  tagFilter
].forEach(el => el.addEventListener("change", applyFilters));

searchInput.addEventListener("input", applyFilters);