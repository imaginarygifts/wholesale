import { db, storage } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  listAll,
  getMetadata,
  deleteObject,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* ================= DOM ================= */
const statsBox = document.getElementById("stats");
const cleanupList = document.getElementById("cleanupList");

/* ================= STATE ================= */
let cleanupFiles = [];
let allSelected = false;


function normalizeTimestamp(ts) {
  if (!ts) return 0;

  // Firestore Timestamp
  if (ts.toMillis) {
    return ts.toMillis();
  }

  // Seconds → milliseconds
  if (typeof ts === "number" && ts < 1000000000000) {
    return ts * 1000;
  }

  // Already milliseconds
  if (typeof ts === "number") {
    return ts;
  }

  return 0;
}

/* ================= HELPERS ================= */
function getOrderAmount(o) {
  return (
    o.finalAmount ||
    o.pricing?.finalAmount ||
    o.price ||
    0
  );
}

function getCreatedAt(o) {
  return o.createdAt?.toMillis?.() || o.createdAt || 0;
}

/* ================== STATS ================== */
async function loadStats() {
  const productsSnap = await getDocs(collection(db, "products"));
  const catsSnap = await getDocs(collection(db, "categories"));
  const ordersSnap = await getDocs(collection(db, "orders"));

  let pendingOrders = 0;
  let todayOrders = 0;
  let todaySale = 0;
  let totalBalance = 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  ordersSnap.forEach(doc => {
    const o = doc.data();

    const createdAt = normalizeTimestamp(o.createdAt);

    const amount =
      o.finalAmount ||
      o.pricing?.finalAmount ||
      o.price ||
      0;

    if (o.orderStatus === "pending") {
      pendingOrders++;
    }

    if (createdAt >= todayTs) {
      todayOrders++;
      todaySale += amount;
    }

    const paid =
  o.payment?.paidAmount ||
  (o.payment?.status === "paid" ? amount : 0);

const balance = Math.max(amount - paid, 0);

totalBalance += balance;
  });

  statsBox.innerHTML = `
      
      <div class="card clickable" onclick="location.href='products.html'">
      <b>${productsSnap.size}</b>
      <small>Total Products</small>
    </div>
    
    <div class="card clickable" onclick="location.href='products.html'">
      <b>${catsSnap.size}</b>
      <small>Total Categories</small>
    </div>
    
    <div class="card clickable"
     onclick="location.href='orders.html?status=pending'">
  <b>${pendingOrders}</b>
  <small>Pending Orders</small>
</div>

<div class="card clickable"
     onclick="location.href='orders.html?range=today'">
  <b>${todayOrders}</b>
  <small>Today Orders</small>
</div>

<div class="card clickable"
     onclick="location.href='orders.html?range=today&paymentStatus=paid'">
  <b>₹${todaySale}</b>
  <small>Today Sale</small>
</div>

<div class="card clickable"
     onclick="location.href='orders.html?balance=due'">
  <b>₹${totalBalance}</b>
  <small>Total Balance</small>
</div>
  `;
}
/* ================== CUSTOM IMAGES ================== */
async function loadCustomImages() {
  try {
    const folderRef = ref(storage, "custom-images/");
    const res = await listAll(folderRef);

    cleanupFiles = [];

    for (const item of res.items) {
      const meta = await getMetadata(item);
      const url = await getDownloadURL(item);

      const created = new Date(meta.timeCreated).getTime();
      const ageDays = Math.floor(
        (Date.now() - created) / (1000 * 60 * 60 * 24)
      );

      cleanupFiles.push({
        ref: item,
        url,
        ageDays,
        name: item.name
      });
    }

    renderCleanupList();
  } catch (err) {
    console.error("Load images error:", err);
  }
}

/* ================== RENDER CLEANUP ================== */
function renderCleanupList() {
  cleanupList.innerHTML = "";

  cleanupFiles.forEach(f => {
    const card = document.createElement("div");
    card.className = "cleanup-card";

    card.innerHTML = `
      <input type="checkbox" class="cleanup-check" data-path="${f.ref.fullPath}">
      <img src="${f.url}">
      <small>${f.ageDays} days old</small>
    `;

    cleanupList.appendChild(card);
  });
}

/* ================== BULK DELETE ================== */
window.deleteSelectedImages = async function () {
  const checks = document.querySelectorAll(".cleanup-check:checked");

  if (!checks.length) {
    alert("No images selected");
    return;
  }

  if (!confirm("Delete selected images?")) return;

  try {
    for (const c of checks) {
      const fileRef = ref(storage, c.dataset.path);
      await deleteObject(fileRef);
    }

    alert("Deleted successfully");
    loadCustomImages();
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

window.deleteOlderThan7Days = async function () {
  if (!confirm("Delete all images older than 7 days?")) return;

  try {
    for (const f of cleanupFiles) {
      if (f.ageDays > 7) {
        await deleteObject(f.ref);
      }
    }

    alert("Old images deleted");
    loadCustomImages();
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
};

/* ================== SELECT ALL ================== */
window.toggleSelectAll = function () {
  const checks = document.querySelectorAll(".cleanup-check");
  allSelected = !allSelected;

  checks.forEach(c => (c.checked = allSelected));
  document.getElementById("selectAllBtn").innerText =
    allSelected ? "Deselect All" : "Select All";
};

/* ================== NAV ================== */
window.goOrders = function () {
  location.href = "orders.html";
};

/* ================== INIT ================== */
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadCustomImages();
});