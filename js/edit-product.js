import { db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ===== GET PRODUCT ID =====
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
  alert("Product ID missing");
}

// ===== INPUTS =====
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const priceInput = document.getElementById("price");
const catSelect = document.getElementById("category");

const preview = document.getElementById("imagePreview");
const newImagesInput = document.getElementById("newImages");

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

const bestsellerCheckbox = document.getElementById("isBestseller");

// ===== STATE =====
let existingImages = [];
let newImages = [];

let colors = [];
let sizes = [];
let customOptions = [];
let relatedDesigns = [];
let allProducts = [];

let selectedTags = [];

// ===== POPUP =====
function showPopup(msg) {
  const p = document.getElementById("popup");
  p.innerText = msg;
  p.classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// ===== ACCORDION =====
window.toggleSection = (id) => {
  document.getElementById(id).classList.toggle("hidden");
};

// ===== LOAD CATEGORIES =====
async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  catSelect.innerHTML = `<option value="">Select category</option>`;
  snap.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.innerText = d.data().name;
    catSelect.appendChild(opt);
  });
}

// ===== LOAD PRODUCT =====
async function loadProduct() {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) {
    alert("Product not found");
    return;
  }

  const p = snap.data();

  nameInput.value = p.name || "";
  descInput.value = p.description || "";
  priceInput.value = p.basePrice || "";
  catSelect.value = p.categoryId || "";

  existingImages = p.images || [];

  colors = p.variants?.colors || [];
  sizes = p.variants?.sizes || [];
  customOptions = p.customOptions || [];
  relatedDesigns = p.relatedDesigns || [];

  selectedTags = p.tags || [];

  if (bestsellerCheckbox) {
    bestsellerCheckbox.checked = p.isBestseller || false;
  }

  const ps = p.paymentSettings || {};

  if (ps.online) {
    allowOnline.checked = ps.online.enabled ?? true;
    onlineDiscountType.value = ps.online.discountType || "none";
    onlineDiscountValue.value = ps.online.discountValue || "";
  }

  if (ps.cod) {
    allowCOD.checked = ps.cod.enabled ?? false;
    codDiscountType.value = ps.cod.discountType || "none";
    codDiscountValue.value = ps.cod.discountValue || "";
  }

  if (ps.advance) {
    allowAdvance.checked = ps.advance.enabled ?? false;
    advanceDiscountType.value = ps.advance.discountType || "none";
    advanceDiscountValue.value = ps.advance.discountValue || "";
    advanceType.value = ps.advance.type || "percent";
    advanceValue.value = ps.advance.value || "";
  }

  renderImagePreview();
  renderColors();
  renderSizes();
  renderCustomOptions();
  loadDesignProducts();
  loadTags();
}

// ===== IMAGE PREVIEW =====
function renderImagePreview() {
  preview.innerHTML = "";

  existingImages.forEach((url, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = url;

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      existingImages.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });

  newImages.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      newImages.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });
}

newImagesInput.addEventListener("change", () => {
  const files = Array.from(newImagesInput.files);
  files.forEach(file => newImages.push(file));
  renderImagePreview();
});
// ========== COLORS ==========
window.addEditColor = () => {
  const name = document.getElementById("editColorName").value.trim();
  const price = Number(document.getElementById("editColorPrice").value || 0);
  if (!name) return;

  colors.push({ name, price });
  renderColors();
  document.getElementById("editColorName").value = "";
  document.getElementById("editColorPrice").value = "";
};

function renderColors() {
  const list = document.getElementById("editColorList");
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
window.addEditSize = () => {
  const name = document.getElementById("editSizeName").value.trim();
  const price = Number(document.getElementById("editSizePrice").value || 0);
  if (!name) return;

  sizes.push({ name, price });
  renderSizes();
  document.getElementById("editSizeName").value = "";
  document.getElementById("editSizePrice").value = "";
};

function renderSizes() {
  const list = document.getElementById("editSizeList");
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
window.addEditCustomOption = () => {
  const type = document.getElementById("editCustomType").value;
  const label = document.getElementById("editCustomLabel").value.trim();
  const price = Number(document.getElementById("editCustomPrice").value || 0);
  const choicesRaw = document.getElementById("editCustomChoices").value;

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

  document.getElementById("editCustomLabel").value = "";
  document.getElementById("editCustomPrice").value = "";
  document.getElementById("editCustomChoices").value = "";
};

function renderCustomOptions() {
  const list = document.getElementById("editCustomList");
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
    if (p.id === id) return;

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

// ========== TAGS ==========
async function loadTags() {
  const box = document.getElementById("tagCheckboxes");
  if (!box) return;

  const snap = await getDocs(collection(db, "tags"));
  box.innerHTML = "";

  snap.forEach(d => {
    const t = d.data();

    const row = document.createElement("div");
    row.className = "tag-item";

    const checked = selectedTags.includes(t.slug);

    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""}>
      <span>${t.name}</span>
    `;

    const checkbox = row.querySelector("input");

    checkbox.addEventListener("change", () => {
      toggleTag(t.slug, checkbox.checked);
    });

    box.appendChild(row);
  });
}

window.toggleTag = function(slug, checked) {
  if (checked) {
    if (!selectedTags.includes(slug)) selectedTags.push(slug);
  } else {
    selectedTags = selectedTags.filter(t => t !== slug);
  }
};
// ========== UPDATE PRODUCT ==========
window.updateProduct = async () => {
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

    const finalImages = [...existingImages];

    for (let file of newImages) {
      const r = ref(storage, `products/${Date.now()}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      finalImages.push(url);
    }

    showPopup("Saving changes...");

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

    await updateDoc(doc(db, "products", id), {
      name,
      description: descInput.value,
      basePrice: Number(price),
      categoryId: cat,
      images: finalImages,
      variants: {
        colors,
        sizes
      },
      customOptions,
      paymentSettings,
      relatedDesigns,
      tags: selectedTags,
      bestseller: isBestseller
    });

    // ========== BIDIRECTIONAL LINKING ==========
    for (const rid of relatedDesigns) {
      const refDoc = doc(db, "products", rid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const data = snap.data();
        const arr = data.relatedDesigns || [];

        if (!arr.includes(id)) {
          arr.push(id);
          await updateDoc(refDoc, { relatedDesigns: arr });
        }
      }
    }

    showPopup("✅ Product updated");

    setTimeout(() => {
      hidePopup();
      location.href = "products.html";
    }, 1200);

  } catch (e) {
    console.error(e);
    showPopup("❌ " + e.message);
  }
};

// ========== INIT ==========
// ========== INIT ==========
loadCategories().then(() => {
  loadProduct().then(() => {
    loadDesignProducts();
    if (typeof loadTags === "function") {
      loadTags();
    }
  });
});