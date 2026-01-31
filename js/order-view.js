import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", init);

let orderId = null;
let orderData = null;

function init() {
  const params = new URLSearchParams(window.location.search);
  orderId = params.get("id");

  if (!orderId) {
    alert("Order ID missing");
    return;
  }

  loadOrder();
  bindEvents();
}

/* ================= LOAD ORDER ================= */
async function loadOrder() {
  const ref = doc(db, "orders", orderId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Order not found");
    return;
  }

  orderData = snap.data();
  renderOrder(orderData);
}

/* ================= PAYMENT HELPERS ================= */
function getPaymentMode(o) {
  return (
    o.payment?.mode ||
    o.paymentMode ||
    "cod"
  ).toLowerCase();
}

function getPaymentStatus(o) {
  return (
    o.payment?.status ||
    o.paymentStatus ||
    "pending"
  ).toLowerCase();
}

/* ================= RENDER ================= */
function renderOrder(o) {
  // META
  document.getElementById("orderMeta").innerHTML = `
    <div><b>Order No:</b> ${o.orderNumber}</div>
    <div><b>Date:</b> ${formatDate(o.createdAt)}</div>
    <div><b>Status:</b> ${o.orderStatus}</div>
  `;

  // PRODUCT
  document.getElementById("productBox").innerHTML = `
    <img class="product-img" src="${o.productImage || "../img/no-image.png"}">
    <div class="product-info">
      <b>${o.productName}</b>
      <div class="muted">${renderVariants(o)}</div>
      <div class="muted">${renderOptions(o)}</div>
    </div>
  `;

  // CUSTOMER
  document.getElementById("customerBox").innerHTML = `
    <div><b>${o.customer?.name || ""}</b></div>
    <div>${o.customer?.phone || ""}</div>
    <div class="muted">${o.customer?.address || ""}</div>
  `;

  // ===== PAYMENT LOGIC (🔥 FIXED) =====
  const paymentMode = getPaymentMode(o);
  const paymentStatus = getPaymentStatus(o);

  const total =
    o.pricing?.finalAmount ||
    o.finalAmount ||
    o.price ||
    0;

  let paid =
    o.payment?.paidAmount || 0;

  // 🔥 AUTO-FIX: RECEIVED PAID ORDERS
  if (paymentStatus === "paid" && paid === 0) {
    paid = total;
  }

  document.getElementById("paymentMode").value = paymentMode;
  document.getElementById("paymentMode").disabled = true; // 🔒 locked

  document.getElementById("paymentStatus").value = paymentStatus;
  document.getElementById("totalAmount").value = total;
  document.getElementById("paidAmount").value = paid;
  document.getElementById("orderStatus").value = o.orderStatus;

  calcBalance();
}

/* ================= HELPERS ================= */
function formatDate(ts) {
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

function renderVariants(o) {
  const v = [];
  if (o.variants?.color?.name) v.push(`Color: ${o.variants.color.name}`);
  if (o.variants?.size?.name) v.push(`Size: ${o.variants.size.name}`);
  return v.length ? v.join(" • ") : "No variants";
}

function renderOptions(o) {
  if (!o.customOptions?.length) return "No custom options";

  return o.customOptions.map(opt => {
    let html = `
      <div class="option-row">
        <b>${opt.label}:</b> ${opt.value || "Selected"}
      </div>
    `;

    if (opt.image) {
      html += `
        <div class="option-image">
          <a href="${opt.image}" target="_blank">
            <img src="${opt.image}" alt="${opt.label}">
          </a>
          <div class="option-link">
            <a href="${opt.image}" target="_blank">View uploaded image</a>
          </div>
        </div>
      `;
    }

    return html;
  }).join("");
}

/* ================= EVENTS ================= */
function bindEvents() {
  document
    .getElementById("paidAmount")
    .addEventListener("input", calcBalance);

  document
    .getElementById("paymentStatus")
    .addEventListener("change", handlePaymentStatusChange);

  document
    .getElementById("updateOrderBtn")
    .addEventListener("click", updateOrder);
}

/* ================= SMART LOGIC ================= */
function handlePaymentStatusChange() {
  const status = document.getElementById("paymentStatus").value;
  const total = Number(document.getElementById("totalAmount").value || 0);

  if (status === "paid") {
    document.getElementById("paidAmount").value = total;
  }

  if (status === "refund") {
    document.getElementById("orderStatus").value = "cancelled";
    document.getElementById("paidAmount").value = 0;
  }

  calcBalance();
}

function calcBalance() {
  const total = Number(document.getElementById("totalAmount").value || 0);
  const paid = Number(document.getElementById("paidAmount").value || 0);
  const balance = Math.max(total - paid, 0);

  document.getElementById("balanceBox").innerText = "₹" + balance;

  // 🔁 AUTO SYNC STATUS
  if (balance === 0 && total > 0) {
    document.getElementById("paymentStatus").value = "paid";
  }

  if (balance > 0 && document.getElementById("paymentStatus").value === "paid") {
    document.getElementById("paymentStatus").value = "pending";
  }
}

/* ================= UPDATE ORDER ================= */
async function updateOrder() {
  const ref = doc(db, "orders", orderId);

  const paymentStatus =
    document.getElementById("paymentStatus").value;

  const paidAmount =
    Number(document.getElementById("paidAmount").value || 0);

  const orderStatus =
    document.getElementById("orderStatus").value;

  await updateDoc(ref, {
    orderStatus,
    payment: {
      mode: getPaymentMode(orderData), // ✅ preserved
      status: paymentStatus,
      paidAmount
    },
    updatedAt: Date.now()
  });

  alert("Order updated successfully");
  loadOrder();
}