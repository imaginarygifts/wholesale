import { db, storage } from './firebase.js';
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ===== CONFIG =====
const WHATSAPP_NUMBER = "917030191819";

// ===== GLOBALS =====
const id = new URLSearchParams(window.location.search).get("id");
let product = null;
let finalPrice = 0;
let relatedProducts = [];

let selected = {
  color: null,
  size: null,
  options: {},        // stores prices
  optionValues: {},   // stores actual user values (text, dropdown, etc)
  imageLinks: {}
};

// ===== LOAD PRODUCT =====
async function loadProduct() {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return;

  product = snap.data();
  finalPrice = product.basePrice;

  renderSlider(product.images);
  await loadRelatedDesigns();
  render();
}

loadProduct();

// ===== LOAD RELATED DESIGNS =====
async function loadRelatedDesigns() {
  relatedProducts = [];

  if (!product.relatedDesigns || !product.relatedDesigns.length) return;

  const snap = await getDocs(collection(db, "products"));

  snap.forEach(d => {
    if (product.relatedDesigns.includes(d.id) || d.id === id) {
      relatedProducts.push({ id: d.id, ...d.data() });
    }
  });
}

// ===== RENDER UI =====
function render() {
  const details = document.getElementById("productDetails");

  let html = `
    <h2>${product.name}</h2>
    <p>${product.description}</p>
    <h3>₹<span id="price">${finalPrice}</span></h3>
  `;

  // ===== RELATED DESIGNS =====
  if (relatedProducts.length > 1) {
    html += `
      <div class="design-wrap">
        <h4>Select Design</h4>
        <div class="design-row">
    `;

    relatedProducts.forEach(p => {
      const active = p.name === product.name ? "active" : "";
      html += `
        <div class="design-card ${active}" onclick="goToDesign('${p.id}')">
          <img src="${p.images?.[0] || ""}">
          <small>${p.name}</small>
          <div class="price">₹${p.basePrice}</div>
        </div>
      `;
    });

    html += `</div></div>`;
  }

  // COLORS
  if (product.variants?.colors?.length) {
    html += `<h4>Colors</h4><div class="variant-row">`;
    product.variants.colors.forEach((c, i) => {
      html += `<button class="btn-outline color-btn" onclick="selectColor(${i})">${c.name}</button>`;
    });
    html += `</div>`;
  }

  // SIZES
  if (product.variants?.sizes?.length) {
    html += `<h4>Sizes</h4><div class="variant-row">`;
    product.variants.sizes.forEach((s, i) => {
      html += `<button class="btn-outline size-btn" onclick="selectSize(${i})">${s.name}</button>`;
    });
    html += `</div>`;
  }

  // CUSTOM OPTIONS
  if (product.customOptions?.length) {
    html += `<h4>Custom Options</h4>`;
    product.customOptions.forEach((o, i) => {

      if (o.type === "text") {
        html += `<input class="custom-input" placeholder="${o.label}" oninput="addTextOption(${i}, this.value)">`;
      }

      if (o.type === "checkbox") {
        html += `
          <div class="option-row">
            <input type="checkbox" onchange="toggleCheckbox(${i}, this.checked)">
            <span>${o.label} (+₹${o.price})</span>
          </div>
        `;
      }

      if (o.type === "dropdown") {
        html += `
          <select class="custom-select" onchange="addDropdownOption(${i}, this.value)">
            <option value="">Select ${o.label}</option>
            ${o.choices.map(c => `<option value="${c}">${c}</option>`).join("")}
          </select>
        `;
      }

      if (o.type === "image") {
        html += `
          <div class="upload-box">
            <label>${o.label}</label>
            <input type="file" accept="image/*" onchange="uploadCustomImage(${i}, this.files[0])">
            <small id="uploadStatus${i}"></small>
          </div>
        `;
      }

    });
  }

  details.innerHTML = html;
}

// ===== DESIGN NAVIGATION =====
window.goToDesign = function(pid) {
  location.href = `product.html?id=${pid}`;
};

// ===== SLIDER =====
function renderSlider(images) {
  const slider = document.getElementById("slider");
  const dotsBox = document.getElementById("sliderDots");

  slider.innerHTML = "";
  dotsBox.innerHTML = "";

  images.forEach((img, index) => {
    const image = document.createElement("img");
    image.src = img;
    slider.appendChild(image);

    const dot = document.createElement("span");
    if (index === 0) dot.classList.add("active");
    dotsBox.appendChild(dot);
  });

  slider.addEventListener("scroll", () => {
    const i = Math.round(slider.scrollLeft / slider.clientWidth);
    [...dotsBox.children].forEach((d, idx) => {
      d.classList.toggle("active", idx === i);
    });
  });
}

// ===== VARIANTS =====
window.selectColor = function(i) {
  document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".color-btn")[i].classList.add("active");

  selected.color = product.variants.colors[i];
  recalcPrice();
};

window.selectSize = function(i) {
  document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".size-btn")[i].classList.add("active");

  selected.size = product.variants.sizes[i];
  recalcPrice();
};

// ===== OPTIONS =====
window.addTextOption = function(i, val) {
  if (!val) return;
  selected.options[i] = product.customOptions[i].price;
  selected.optionValues[i] = val;
  recalcPrice();
};

window.toggleCheckbox = function(i, checked) {
  if (checked) {
    selected.options[i] = product.customOptions[i].price;
    selected.optionValues[i] = "Yes";
  } else {
    delete selected.options[i];
    delete selected.optionValues[i];
  }
  recalcPrice();
};

window.addDropdownOption = function(i, val) {
  if (!val) return;
  selected.options[i] = product.customOptions[i].price;
  selected.optionValues[i] = val;
  recalcPrice();
};

// ===== IMAGE UPLOAD OPTION =====
window.uploadCustomImage = async function(i, file) {
  if (!file) return;

  const status = document.getElementById(`uploadStatus${i}`);
  status.innerText = "Uploading...";

  try {
    const storageRef = ref(storage, `custom-images/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    selected.options[i] = product.customOptions[i].price;
    selected.optionValues[i] = "Image uploaded";
    selected.imageLinks[i] = url;

    status.innerText = "Uploaded ✔";

    recalcPrice();
  } catch (err) {
    console.error(err);
    status.innerText = "Upload failed ❌";
    alert("Image upload failed: " + err.message);
  }
};

// ===== PRICE =====
function recalcPrice() {
  finalPrice = product.basePrice;

  if (selected.color) finalPrice += selected.color.price;
  if (selected.size) finalPrice += selected.size.price;

  Object.values(selected.options).forEach(p => finalPrice += p);

  document.getElementById("price").innerText = finalPrice;
}

// ===== WHATSAPP ORDER =====

window.orderNow = async function () {
  try {
    // ================================
    // 1️⃣ ENSURE PRODUCT ID EXISTS
    // ================================
    const productId =
      product?.id ||
      new URLSearchParams(location.search).get("id");

    if (!productId) {
      alert("Product ID missing");
      return;
    }

    // ================================
    // 2️⃣ GET / CREATE ORDER COUNTER
    // ================================
    const counterRef = doc(db, "counters", "orders");
    const counterSnap = await getDoc(counterRef);

    let nextNumber = 1001;

    if (counterSnap.exists()) {
      nextNumber = (counterSnap.data().current || 1000) + 1;
      await updateDoc(counterRef, { current: nextNumber });
    } else {
      await setDoc(counterRef, { current: nextNumber });
    }

    const orderNumber = `IG-${nextNumber}`;

    // ================================
    // 3️⃣ BUILD ORDER DATA (✅ FIXED SCHEMA)
    // ================================
    const orderData = {
      orderNumber,

      productId,
      productName: product?.name || "",
      productImage: product?.images?.[0] || "",
      categoryId: product?.categoryId || null,
      tags: product?.tags || [],

      variants: {
        color: selected?.color || null,
        size: selected?.size || null
      },

      customOptions: Object.keys(selected?.options || {}).map(i => ({
        label: product?.customOptions?.[i]?.label || "",
        value: selected?.optionValues?.[i] || "Selected",
        image: selected?.imageLinks?.[i] || null
      })),

      pricing: {
        finalAmount: Number(finalPrice) || 0
      },

      // ✅ UNIFIED PAYMENT OBJECT (VERY IMPORTANT)
      payment: {
        mode: "whatsapp",
        status: "pending",
        paidAmount: 0
      },

      orderStatus: "pending",
      source: "product-whatsapp",

      productLink: window.location.href,
      createdAt: Date.now()
    };

    // ================================
    // 4️⃣ SAVE ORDER
    // ================================
    await addDoc(collection(db, "orders"), orderData);

    // ================================
    // 5️⃣ BUILD WHATSAPP MESSAGE
    // ================================
    let msg = `🛍 *New Order — Imaginary Gifts*\n\n`;
    msg += `🧾 *Order No:* ${orderNumber}\n\n`;
    msg += `📦 *Product:* ${orderData.productName}\n`;

    if (orderData.variants.color)
      msg += `🎨 Color: ${orderData.variants.color.name}\n`;

    if (orderData.variants.size)
      msg += `📏 Size: ${orderData.variants.size.name}\n`;

    if (orderData.customOptions.length) {
      msg += `\n⚙ Options:\n`;
      orderData.customOptions.forEach(o => {
        msg += `- ${o.label}: ${o.value}\n`;
        if (o.image) msg += `  Image: ${o.image}\n`;
      });
    }

    msg += `\n💰 *Total:* ₹${orderData.pricing.finalAmount}\n`;
    msg += `💳 Payment: WhatsApp (Pending)\n\n`;
    msg += `🔗 Product Link:\n${orderData.productLink}`;

    // ================================
    // 6️⃣ OPEN WHATSAPP
    // ================================
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");

  } catch (err) {
    console.error(err);
    alert("Order failed: " + err.message);
  }
};

//===== buy now =====

window.buyNow = function () {
  const data = {
    product,
    finalPrice,
    color: selected.color,
    size: selected.size,
    options: selected.options,
    optionValues: selected.optionValues,
    imageLinks: selected.imageLinks
  };

  localStorage.setItem("checkoutData", JSON.stringify(data));

  location.href = "order.html";
};