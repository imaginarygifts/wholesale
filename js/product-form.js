import { db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Inputs
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const priceInput = document.getElementById("price");
const catSelect = document.getElementById("category");
const imagesInput = document.getElementById("images");
const preview = document.getElementById("imagePreview");

// Tags & Bestseller
const tagBox = document.getElementById("tagCheckboxes");
const bestsellerCheckbox = document.getElementById("isBestseller");

// Payment & Discounts inputs
const allowOnline = document.getElementById("allowOnline");
const allowCOD = document.getElementById("allowCOD");
const allowAdvance = document.getElementById("allowAdvance");

const onlineDiscountType = document.getElementById("onlineDiscountType");
const onlineDiscountValue = document.getElementById("onlineDiscountValue");

const codDiscountType = document.getElementById("codDiscountType");
const codDiscountValue = document.getElementById("codDiscountValue");

const advanceDiscountType = document.getElementById("advanceDiscountType");
const advanceDiscountValue = document.getElementById("advanceDiscountValue");

const advanceType = document.getElementById("advanceType");
const advanceValue = document.getElementById("advanceValue");

// State
let colors = [];
let sizes = [];
let customOptions = [];
let images = [];
let relatedDesigns = [];
let allProducts = [];
let selectedTags = [];

// Accordion toggle
window.toggleSection = (id) => {
  document.getElementById(id).classList.toggle("hidden");
};

// Popup
function showPopup(msg) {
  const p = document.getElementById("popup");
  p.innerText = msg;
  p.classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// Load categories
async function loadCategories() {
  catSelect.innerHTML = `<option value="">Select category</option>`;
  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(doc => {
    const opt = document.createElement("option");
    opt.value = doc.id;
    opt.innerText = doc.data().name;
    catSelect.appendChild(opt);
  });
}
loadCategories();

// ========== IMAGE PICKER ==========
if (imagesInput) {
  imagesInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    images = [];
    files.forEach(file => images.push(file));
    renderImagePreview();
  });
}

function renderImagePreview() {
  preview.innerHTML = "";
  images.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      images.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });
}

// ========== COLORS ==========
window.addColor = () => {
  const name = document.getElementById("colorName").value.trim();
  const price = Number(document.getElementById("colorPrice").value || 0);
  if (!name) return;

  colors.push({ name, price });
  renderColors();
  document.getElementById("colorName").value = "";
  document.getElementById("colorPrice").value = "";
};

function renderColors() {
  const list = document.getElementById("colorList");
  list.innerHTML = "";
  colors.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerText = `${c.name} (+₹${c.price}) ❌`;
    div.onclick = () => {
      colors.splice(i, 1);
      renderColors();
    };
    list.appendChild(div);
  });
}

// ========== SIZES ==========
window.addSize = () => {
  const name = document.getElementById("sizeName").value.trim();
  const price = Number(document.getElementById("sizePrice").value || 0);
  if (!name) return;

  sizes.push({ name, price });
  renderSizes();
  document.getElementById("sizeName").value = "";
  document.getElementById("sizePrice").value = "";
};

function renderSizes() {
  const list = document.getElementById("sizeList");
  list.innerHTML = "";
  sizes.forEach((s, i) => {
    const div = document.createElement("div");
    div.innerText = `${s.name} (+₹${s.price}) ❌`;
    div.onclick = () => {
      sizes.splice(i, 1);
      renderSizes();
    };
    list.appendChild(div);
  });
}

// ========== CUSTOM OPTIONS ==========
window.addCustomOption = () => {
  const type = document.getElementById("customType").value;
  const label = document.getElementById("customLabel").value.trim();
  const price = Number(document.getElementById("customPrice").value || 0);
  const choicesRaw = document.getElementById("customChoices").value;

  if (!label) return;

  const option = { type, label, price };

  if (type === "dropdown") {
    option.choices = choicesRaw
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
  }

  customOptions.push(option);
  renderCustomOptions();

  document.getElementById("customLabel").value = "";
  document.getElementById("customPrice").value = "";
  document.getElementById("customChoices").value = "";
};

function renderCustomOptions() {
  const list = document.getElementById("customList");
  list.innerHTML = "";
  customOptions.forEach((o, i) => {
    const div = document.createElement("div");
    div.innerText = `${o.type}: ${o.label} (+₹${o.price}) ❌`;
    div.onclick = () => {
      customOptions.splice(i, 1);
      renderCustomOptions();
    };
    list.appendChild(div);
  });
}

// ========== RELATED DESIGNS ==========
async function loadDesignProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = [];

  snap.forEach(d => {
    allProducts.push({ id: d.id, ...d.data() });
  });

  renderDesignList(allProducts);
}

function renderDesignList(list) {
  const box = document.getElementById("designList");
  if (!box) return;

  box.innerHTML = "";

  list.forEach(p => {
    const row = document.createElement("div");
    row.className = "design-item";

    const checked = relatedDesigns.includes(p.id);

    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleDesign('${p.id}')">
      <img src="${p.images?.[0] || ''}">
      <span>${p.name}</span>
    `;

    box.appendChild(row);
  });
}

window.toggleDesign = function(pid) {
  if (relatedDesigns.includes(pid)) {
    relatedDesigns = relatedDesigns.filter(x => x !== pid);
  } else {
    relatedDesigns.push(pid);
  }
};

window.filterDesigns = function() {
  const q = document.getElementById("designSearch").value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q)
  );
  renderDesignList(filtered);
};

loadDesignProducts();

// ========== TAGS ==========
async function loadTags() {
  if (!tagBox) return;

  const snap = await getDocs(collection(db, "tags"));
  tagBox.innerHTML = "";

  snap.forEach(d => {
    const t = d.data();
    const row = document.createElement("div");
    row.className = "design-item";

    row.innerHTML = `
      <input type="checkbox" onchange="toggleTag('${t.slug}', this.checked)">
      <span>${t.name}</span>
    `;

    tagBox.appendChild(row);
  });
}

window.toggleTag = function(slug, checked) {
  if (checked) {
    if (!selectedTags.includes(slug)) selectedTags.push(slug);
  } else {
    selectedTags = selectedTags.filter(t => t !== slug);
  }
};

loadTags();
// ========== SAVE PRODUCT ==========
window.saveProduct = async () => {
  const name = nameInput.value.trim();
  const price = priceInput.value;
  const cat = catSelect.value;
  const isBestseller = document.getElementById("isBestseller")?.checked || false;

  if (!name || !price || !cat) {
    showPopup("⚠ Fill all required fields");
    setTimeout(hidePopup, 1500);
    return;
  }

  try {
    showPopup("Uploading images...");

    const uploadedImages = [];

    for (let file of images) {
      const imgRef = ref(storage, `products/${Date.now()}-${file.name}`);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);
      uploadedImages.push(url);
    }

    showPopup("Saving product...");

    const paymentSettings = {
      online: {
        enabled: allowOnline.checked,
        discountType: onlineDiscountType.value,
        discountValue: Number(onlineDiscountValue.value || 0)
      },
      cod: {
        enabled: allowCOD.checked,
        discountType: codDiscountType.value,
        discountValue: Number(codDiscountValue.value || 0)
      },
      advance: {
        enabled: allowAdvance.checked,
        discountType: advanceDiscountType.value,
        discountValue: Number(advanceDiscountValue.value || 0),
        type: advanceType.value,
        value: Number(advanceValue.value || 0)
      }
    };

    const docRef = await addDoc(collection(db, "products"), {
      name,
      description: descInput.value,
      basePrice: Number(price),
      categoryId: cat,
      images: uploadedImages,
      variants: {
        colors,
        sizes
      },
      customOptions,
      paymentSettings,
      relatedDesigns,
      tags: selectedTags,
      isBestseller,
      createdAt: Date.now()
    });

    const newId = docRef.id;

    // ========== BIDIRECTIONAL RELATED DESIGNS ==========
    for (const rid of relatedDesigns) {
      const refDoc = doc(db, "products", rid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const data = snap.data();
        const arr = data.relatedDesigns || [];

        if (!arr.includes(newId)) {
          arr.push(newId);
          await updateDoc(refDoc, { relatedDesigns: arr });
        }
      }
    }

    showPopup("✅ Product saved");

    setTimeout(() => {
      hidePopup();
      location.href = "products.html";
    }, 1200);

  } catch (e) {
    showPopup("❌ " + e.message);
    console.error(e);
  }
};