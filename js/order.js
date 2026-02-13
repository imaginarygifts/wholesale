import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ======================================================
   GLOBAL STATE
====================================================== */
let orderData = null;
let subTotal = 0;
let discount = 0;
let finalAmount = 0;
let appliedCoupon = null;
let selectedPaymentMode = "online";
let availableCoupons = [];
let orderNumber = null;

/* ======================================================
   LOAD ORDER DATA
====================================================== */
function loadOrder() {
  const raw = localStorage.getItem("checkoutData");
  if (!raw) {
    alert("No product selected");
    location.href = "index.html";
    return;
  }

  orderData = JSON.parse(raw);
  subTotal = Number(orderData.finalPrice || 0);

  renderSummary();
  setupPaymentModes();
  loadCoupons();
  recalcPrice();
}

loadOrder();

/* ======================================================
   ORDER NUMBER (AUTO INCREMENT)
====================================================== */
async function generateOrderNumber() {
  const ref = doc(db, "counters", "orders");
  const snap = await getDoc(ref);

  let next = 1001;

  if (snap.exists()) {
    next = (snap.data().current || 1000) + 1;
    await updateDoc(ref, { current: next });
  } else {
    await setDoc(ref, { current: next });
  }

  return `IG-${next}`;
}

/* ======================================================
   RENDER SUMMARY
====================================================== */
function renderSummary() {
  const box = document.getElementById("orderSummary");

  let html = `
    <div><b>${orderData.product.name}</b></div>
    <div>Base Price: ₹${orderData.product.basePrice}</div>
  `;

  if (orderData.color) html += `<div>Color: ${orderData.color.name}</div>`;
  if (orderData.size) html += `<div>Size: ${orderData.size.name}</div>`;

  if (orderData.options && Object.keys(orderData.options).length) {
    html += `<div style="margin-top:6px"><b>Options:</b></div>`;
    Object.keys(orderData.options).forEach(i => {
      const label = orderData.product.customOptions[i]?.label;
      const value = orderData.optionValues?.[i] || "Selected";
      html += `<div>- ${label}: ${value}</div>`;
    });
  }

  box.innerHTML = html;
}

/* ======================================================
   PAYMENT MODES
====================================================== */
function setupPaymentModes() {
  const ps = orderData.product.paymentSettings || {};

  const onlineLabel = document.getElementById("onlineOption");
  const codLabel = document.getElementById("codOption");
  const advanceLabel = document.getElementById("advanceOption");

  if (!ps.online?.enabled && onlineLabel) onlineLabel.style.display = "none";
  if (!ps.cod?.enabled && codLabel) codLabel.style.display = "none";
  if (!ps.advance?.enabled && advanceLabel) advanceLabel.style.display = "none";

  if (ps.online?.enabled) selectedPaymentMode = "online";
  else if (ps.cod?.enabled) selectedPaymentMode = "cod";
  else if (ps.advance?.enabled) selectedPaymentMode = "advance";

  const firstRadio = document.querySelector(`input[value="${selectedPaymentMode}"]`);
  if (firstRadio) firstRadio.checked = true;

  document.querySelectorAll("input[name='paymode']").forEach(radio => {
    radio.addEventListener("change", () => {
      selectedPaymentMode = radio.value;
      removeCoupon();
      loadCoupons();
      recalcPrice();
    });
  });
}

/* ======================================================
   PRICE
====================================================== */
function recalcPrice() {
  finalAmount = subTotal - discount;
  if (finalAmount < 0) finalAmount = 0;

  document.getElementById("subTotal").innerText = "₹" + subTotal;
  document.getElementById("discountAmount").innerText = "-₹" + discount;
  document.getElementById("finalAmount").innerText = "₹" + finalAmount;
}

/* ======================================================
   COUPONS
====================================================== */
async function loadCoupons() {
  const snap = await getDocs(collection(db, "coupons"));
  availableCoupons = [];
  const now = new Date();

  snap.forEach(d => {
    const c = d.data();

    if (!c.active) return;

    const expiry = c.expiry?.toDate ? c.expiry.toDate() : null;
    if (expiry && expiry < now) return;

    if (c.minOrder && subTotal < c.minOrder) return;
    if (c.allowedModes && !c.allowedModes.includes(selectedPaymentMode)) return;

    if (c.scope === "product" && c.productIds?.length) {
      if (!c.productIds.includes(orderData.product.id)) return;
    }

    availableCoupons.push({ id: d.id, ...c });
  });

  renderCoupons();
}

function renderCoupons() {
  const list = document.getElementById("couponListUI");
  if (!list) return;

  list.innerHTML = "";

  if (!availableCoupons.length) {
    list.innerHTML = `<p class="no-coupon">No coupons available</p>`;
    return;
  }

  availableCoupons.forEach(c => {
    const div = document.createElement("div");
    div.className = "coupon-card";

    if (appliedCoupon && appliedCoupon.id === c.id) div.classList.add("applied");

    const valueText =
      c.type === "percent" ? `${c.value}% OFF` : `₹${c.value} OFF`;

    const btnText =
      appliedCoupon && appliedCoupon.id === c.id ? "Remove" : "Apply";

    div.innerHTML = `
      <div>
        <b>${c.code}</b>
        <small>${valueText}</small>
      </div>
      <button onclick="${btnText === "Remove"
        ? `removeCoupon()`
        : `applyCoupon('${c.id}')`}">
        ${btnText}
      </button>
    `;

    list.appendChild(div);
  });
}

window.applyCoupon = function (id) {
  const c = availableCoupons.find(x => x.id === id);
  if (!c) return;

  discount =
    c.type === "percent"
      ? Math.round(subTotal * (c.value / 100))
      : c.value;

  appliedCoupon = c;
  renderCoupons();
  recalcPrice();
};

window.removeCoupon = function () {
  appliedCoupon = null;
  discount = 0;
  renderCoupons();
  recalcPrice();
};

/* ======================================================
   FORM VALIDATION
====================================================== */
function validateForm() {
  const name = custName.value.trim();
  const phone = custPhone.value.trim();
  const address = custAddress.value.trim();
  const pincode = custPincode.value.trim();

  if (!name || !phone || !address || !pincode) {
    alert("Please fill all fields");
    return null;
  }

  return { name, phone, address, pincode };
}

/* ======================================================
   SAVE ORDER (FIRESTORE)
====================================================== */
async function saveOrder(paymentMode, paymentStatus, paymentId = null) {
  const customer = validateForm();
  if (!customer) return null;

  orderNumber = await generateOrderNumber();

  const order = {
    orderNumber,

    productId: orderData.product.id || null,
    productName: orderData.product.name,
    productImage: orderData.product.images?.[0] || "",
    categoryId: orderData.product.categoryId || null,
    tags: orderData.product.tags || [],

    variants: {
      color: orderData.color || null,
      size: orderData.size || null
    },

    customOptions: Object.keys(orderData.options || {}).map(i => ({
      label: orderData.product.customOptions[i]?.label,
      value: orderData.optionValues?.[i] || "Selected",
      image: orderData.imageLinks?.[i] || null
    })),

    pricing: {
      subTotal,
      discount,
      finalAmount
    },

    customer,

    payment: {
      mode: paymentMode,
      status: paymentStatus,
      paymentId
    },

    orderStatus: "pending",
    source: "frontend",
    createdAt: Date.now()
  };

  await addDoc(collection(db, "orders"), order);
  return order;
}

/* ======================================================
   PLACE ORDER
====================================================== */
window.placeOrder = async function () {
  try {
    const customer = validateForm();
    if (!customer) return;

    if (selectedPaymentMode === "cod") {
      const order = await saveOrder("cod", "pending");
      sendWhatsApp(order);
      alert("Order placed successfully");
    } else {
      startPayment(customer);
    }
  } catch (e) {
    alert("Order failed: " + e.message);
  }
};

/* ======================================================
   WHATSAPP
====================================================== */
function sendWhatsApp(order) {
  let msg = `🛍 *New Order — Imaginary Gifts*\n\n`;
  msg += `🧾 Order No: *${order.orderNumber}*\n\n`;

  msg += `Name: ${order.customer.name}\n`;
  msg += `Phone: ${order.customer.phone}\n`;
  msg += `Address: ${order.customer.address}\n`;
  msg += `Pincode: ${order.customer.pincode}\n\n`;

  msg += `Product: ${order.productName}\n`;

  if (order.variants.color) msg += `Color: ${order.variants.color.name}\n`;
  if (order.variants.size) msg += `Size: ${order.variants.size.name}\n`;

  if (order.customOptions.length) {
    msg += `Options:\n`;
    order.customOptions.forEach(o => {
      msg += `- ${o.label}: ${o.value}\n`;
    });
  }

  msg += `\nTotal: ₹${order.pricing.finalAmount}\n`;
  msg += `Payment: ${order.payment.mode}\n`;

  const url = `https://wa.me/917030191819?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

/* ======================================================
   RAZORPAY
====================================================== */
function startPayment(customer) {
  const options = {
    key: "rzp_test_8OmRCO9SiPeXWg",
    amount: finalAmount * 100,
    currency: "INR",
    name: "Imaginary Gifts",
    description: "Order Payment",

    handler: async function (response) {
      const order = await saveOrder(
        "online",
        "paid",
        response.razorpay_payment_id
      );
      sendWhatsApp(order);
      alert("Payment successful");
    },

    prefill: {
      name: customer.name,
      contact: customer.phone
    },

    theme: { color: "#00f5ff" }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}