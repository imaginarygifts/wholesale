// Import your EXISTING Firebase app's exports here — adjust the path below
// if your firebase init file lives somewhere other than js/firebase-config.js
import { db, storage, auth } from "../js/firebase-config.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { SECTION_TYPES, defaultContent, renderSection } from "../js/home-sections-render.js";
import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/+esm";

const COLLECTION = "homepage_sections";

// Login already happens at the dashboard level. If someone lands on this
// page without a session (e.g. direct link, expired token), bounce them
// back to the dashboard login — update this path to match your app.
const DASHBOARD_LOGIN_URL = "/admin/index.html";

// ---------- repeatable-item field configs, per section type ----------
const ITEM_CONFIGS = {
  productCarousel: { itemLabel: "Product", fields: [
    { key: "imageUrl", label: "Image", type: "image" },
    { key: "title", label: "Title", type: "text" },
    { key: "price", label: "Price (₹)", type: "text" },
    { key: "originalPrice", label: "Original price (₹, optional — shows a discount badge)", type: "text" },
    { key: "bestseller", label: "Mark as Bestseller", type: "checkbox" },
    { key: "link", label: "Link URL", type: "url" },
  ]},
  imageCarousel: { itemLabel: "Image", fields: [
    { key: "imageUrl", label: "Image", type: "image" },
    { key: "caption", label: "Caption", type: "text" },
    { key: "link", label: "Link URL", type: "url" },
  ]},
  youtubeShorts: { itemLabel: "Short", fields: [
    { key: "videoId", label: "YouTube Video ID (e.g. dQw4w9WgXcQ)", type: "text" },
    { key: "title", label: "Title", type: "text" },
  ]},
  reviews: { itemLabel: "Review", fields: [
    { key: "avatarUrl", label: "Avatar", type: "image" },
    { key: "name", label: "Name", type: "text" },
    { key: "rating", label: "Rating (1-5)", type: "number" },
    { key: "text", label: "Review text", type: "textarea" },
  ]},
};

let state = { sections: [] };

// ============================================================
// AUTH CHECK (no login form here — just guards against a missing session)
// ============================================================
const appEl = document.getElementById("app");
onAuthStateChanged(auth, (user) => {
  if (user) {
    appEl.hidden = false;
    loadSections();
  } else {
    window.location.href = DASHBOARD_LOGIN_URL;
  }
});

// ============================================================
// LOAD + RENDER LIST
// ============================================================
const listEl = document.getElementById("section-list");
const emptyState = document.getElementById("empty-state");
const addButtonsEl = document.getElementById("add-section-buttons");

SECTION_TYPES.forEach(({ type, label }) => {
  const btn = document.createElement("button");
  btn.textContent = "+ " + label;
  btn.addEventListener("click", () => addSection(type));
  addButtonsEl.appendChild(btn);
});

async function loadSections() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("order", "asc")));
  state.sections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderList();
}

function renderList() {
  listEl.innerHTML = "";
  emptyState.hidden = state.sections.length > 0;
  state.sections.forEach((section, i) => listEl.appendChild(buildCard(section, i)));

  Sortable.create(listEl, {
    handle: ".drag-handle",
    animation: 150,
    onEnd: async () => {
      const newOrderIds = Array.from(listEl.children).map((li) => li.dataset.id);
      const batch = writeBatch(db);
      newOrderIds.forEach((id, index) => {
        const section = state.sections.find((s) => s.id === id);
        if (section) section.order = index;
        batch.update(doc(db, COLLECTION, id), { order: index });
      });
      state.sections.sort((a, b) => a.order - b.order);
      await batch.commit();
      updateOrderBadges();
    },
  });
}

function updateOrderBadges() {
  Array.from(listEl.children).forEach((li, i) => {
    const badge = li.querySelector(".order-badge");
    if (badge) badge.textContent = "#" + (i + 1);
  });
}

// ============================================================
// ADD / DELETE
// ============================================================
async function addSection(type) {
  const newDoc = {
    type,
    order: state.sections.length,
    visible: true,
    style: { height: null, width: "contained", bgColor: "" },
    content: defaultContent(type),
  };
  const ref_ = await addDoc(collection(db, COLLECTION), newDoc);
  const section = { id: ref_.id, ...newDoc };
  state.sections.push(section);
  const card = buildCard(section, state.sections.length - 1);
  listEl.appendChild(card);
  emptyState.hidden = true;
  card.querySelector(".section-card-body").classList.add("open");
  card.querySelector(".expand-btn").textContent = "Collapse";
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteSection(section, li) {
  if (!confirm("Delete this section? This can't be undone.")) return;
  await deleteDoc(doc(db, COLLECTION, section.id));
  state.sections = state.sections.filter((s) => s.id !== section.id);
  li.remove();
  emptyState.hidden = state.sections.length > 0;
  updateOrderBadges();
}

// ============================================================
// SAVE
// ============================================================
async function saveSection(section) {
  await updateDoc(doc(db, COLLECTION, section.id), {
    content: section.content,
    style: section.style,
    visible: section.visible,
  });
}

// ============================================================
// IMAGE UPLOAD
// ============================================================
async function uploadImage(file, sectionId) {
  const path = `homepage/${sectionId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ============================================================
// CARD BUILDER
// ============================================================
function buildCard(section, index) {
  const li = document.createElement("li");
  li.className = "section-card";
  li.dataset.id = section.id;

  const typeLabel = SECTION_TYPES.find((t) => t.type === section.type)?.label || section.type;

  li.innerHTML = `
    <div class="section-card-header">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="order-badge">#${index + 1}</span>
      <span class="section-type-label">${typeLabel}</span>
      <label class="visibility-toggle">
        <input type="checkbox" class="visible-checkbox" ${section.visible ? "checked" : ""}>
        Visible
      </label>
      <button type="button" class="expand-btn">Edit</button>
    </div>
    <div class="section-card-body"></div>
  `;

  const body = li.querySelector(".section-card-body");
  const expandBtn = li.querySelector(".expand-btn");
  let built = false;

  expandBtn.addEventListener("click", () => {
    const open = body.classList.toggle("open");
    expandBtn.textContent = open ? "Collapse" : "Edit";
    if (open && !built) {
      buildCardBody(body, section);
      built = true;
    }
  });

  li.querySelector(".visible-checkbox").addEventListener("change", async (e) => {
    section.visible = e.target.checked;
    await saveSection(section);
  });

  return li;
}

function buildCardBody(body, section) {
  // --- style controls (size / width / background) ---
  const styleBox = document.createElement("div");
  styleBox.className = "style-controls";
  styleBox.innerHTML = `
    <div class="field-row">
      <label>Width</label>
      <select class="style-width">
        <option value="contained" ${section.style.width !== "full" ? "selected" : ""}>Contained</option>
        <option value="full" ${section.style.width === "full" ? "selected" : ""}>Full width</option>
      </select>
    </div>
    <div class="field-row">
      <label>Background color</label>
      <input type="text" class="style-bg" placeholder="#000000 or leave blank" value="${section.style.bgColor || ""}">
    </div>
    <div class="field-row">
      <label>Height (px, or drag the preview corner below)</label>
      <input type="number" class="style-height" value="${section.style.height || ""}" placeholder="auto">
    </div>
  `;
  body.appendChild(styleBox);

  styleBox.querySelector(".style-width").addEventListener("change", (e) => {
    section.style.width = e.target.value;
    refreshPreview();
  });
  styleBox.querySelector(".style-bg").addEventListener("input", (e) => {
    section.style.bgColor = e.target.value;
    refreshPreview();
  });
  styleBox.querySelector(".style-height").addEventListener("change", (e) => {
    section.style.height = e.target.value ? Number(e.target.value) : null;
    refreshPreview();
  });

  // --- type-specific fields ---
  const fieldsBox = document.createElement("div");
  body.appendChild(fieldsBox);

  if (section.type === "heading") buildHeadingFields(fieldsBox, section, refreshPreview);
  else if (section.type === "banner") buildBannerFields(fieldsBox, section, refreshPreview);
  else if (ITEM_CONFIGS[section.type]) buildItemsFields(fieldsBox, section, ITEM_CONFIGS[section.type], refreshPreview);

  // --- live preview (resizable) ---
  const previewBox = document.createElement("div");
  previewBox.className = "preview-box";
  body.appendChild(previewBox);
  const previewLabel = document.createElement("p");
  previewLabel.className = "preview-label";
  previewLabel.textContent = "Drag the bottom-right corner of the box above to set this section's height.";
  body.appendChild(previewLabel);

  function refreshPreview() {
    previewBox.innerHTML = "";
    previewBox.appendChild(renderSection(section));
  }
  refreshPreview();

  new ResizeObserver(() => {
    const h = previewBox.clientHeight;
    if (Math.abs((section.style.height || 0) - h) > 4) {
      section.style.height = h;
      styleBox.querySelector(".style-height").value = h;
    }
  }).observe(previewBox);
  previewBox.addEventListener("mouseup", () => saveSection(section));

  // --- actions ---
  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.innerHTML = `
    <button type="button" class="btn btn-danger btn-small delete-btn">Delete</button>
    <button type="button" class="btn btn-primary btn-small save-btn">Save changes</button>
  `;
  body.appendChild(actions);
  actions.querySelector(".delete-btn").addEventListener("click", () => deleteSection(section, body.closest("li")));
  actions.querySelector(".save-btn").addEventListener("click", async () => {
    const btn = actions.querySelector(".save-btn");
    btn.textContent = "Saving…";
    await saveSection(section);
    btn.textContent = "Saved ✓";
    setTimeout(() => (btn.textContent = "Save changes"), 1200);
  });
}

// ---------- heading fields ----------
function buildHeadingFields(box, section, refreshPreview) {
  const c = section.content;
  box.innerHTML = `
    <div class="field-row">
      <label>Content type</label>
      <select class="f-mode">
        <option value="text" ${c.mode !== "logo" ? "selected" : ""}>Text</option>
        <option value="logo" ${c.mode === "logo" ? "selected" : ""}>Logo image</option>
      </select>
    </div>
    <div class="field-row f-title-row" ${c.mode === "logo" ? 'style="display:none"' : ""}>
      <label>Heading</label>
      <input type="text" class="f-title" value="${c.title || ""}">
    </div>
    <div class="field-row f-logo-row" ${c.mode === "logo" ? "" : 'style="display:none"'}>
      <label>Logo image</label>
      <label class="upload-btn">Upload logo<input type="file" accept="image/*" class="f-logo-upload"></label>
      ${c.logoUrl ? `<img class="thumb" src="${c.logoUrl}">` : ""}
    </div>
    <div class="field-row">
      <label>Sub-heading</label>
      <input type="text" class="f-subtitle" value="${c.subtitle || ""}">
    </div>
    <div class="field-row">
      <label>Alignment</label>
      <select class="f-align">
        <option value="left" ${c.align === "left" ? "selected" : ""}>Left</option>
        <option value="center" ${(!c.align || c.align === "center") ? "selected" : ""}>Center</option>
        <option value="right" ${c.align === "right" ? "selected" : ""}>Right</option>
      </select>
    </div>
  `;
  box.querySelector(".f-mode").addEventListener("change", (e) => {
    c.mode = e.target.value;
    box.querySelector(".f-title-row").style.display = c.mode === "logo" ? "none" : "";
    box.querySelector(".f-logo-row").style.display = c.mode === "logo" ? "" : "none";
    refreshPreview();
  });
  box.querySelector(".f-title").addEventListener("input", (e) => { c.title = e.target.value; refreshPreview(); });
  box.querySelector(".f-subtitle").addEventListener("input", (e) => { c.subtitle = e.target.value; refreshPreview(); });
  box.querySelector(".f-align").addEventListener("change", (e) => { c.align = e.target.value; refreshPreview(); });
  box.querySelector(".f-logo-upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    c.logoUrl = await uploadImage(file, section.id);
    refreshPreview();
  });
}

// ---------- banner fields ----------
function buildBannerFields(box, section, refreshPreview) {
  const c = section.content;
  box.innerHTML = `
    <div class="field-row">
      <label>Banner image</label>
      <label class="upload-btn">Upload image<input type="file" accept="image/*" class="f-image-upload"></label>
      ${c.imageUrl ? `<img class="thumb" src="${c.imageUrl}">` : ""}
    </div>
    <div class="field-row"><label>Title</label><input type="text" class="f-title" value="${c.title || ""}"></div>
    <div class="field-row"><label>Subtitle</label><input type="text" class="f-subtitle" value="${c.subtitle || ""}"></div>
    <div class="field-inline">
      <div class="field-row"><label>Button text</label><input type="text" class="f-btntext" value="${c.buttonText || ""}"></div>
      <div class="field-row"><label>Button link</label><input type="url" class="f-btnlink" value="${c.buttonLink || ""}"></div>
    </div>
    <div class="field-row">
      <label><input type="checkbox" class="f-overlay" ${c.overlay ? "checked" : ""}> Darken image for text readability</label>
    </div>
  `;
  box.querySelector(".f-image-upload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    c.imageUrl = await uploadImage(file, section.id);
    refreshPreview();
  });
  box.querySelector(".f-title").addEventListener("input", (e) => { c.title = e.target.value; refreshPreview(); });
  box.querySelector(".f-subtitle").addEventListener("input", (e) => { c.subtitle = e.target.value; refreshPreview(); });
  box.querySelector(".f-btntext").addEventListener("input", (e) => { c.buttonText = e.target.value; refreshPreview(); });
  box.querySelector(".f-btnlink").addEventListener("input", (e) => { c.buttonLink = e.target.value; refreshPreview(); });
  box.querySelector(".f-overlay").addEventListener("change", (e) => { c.overlay = e.target.checked; refreshPreview(); });
}

// ---------- repeatable items (products / images / shorts / reviews) ----------
function buildItemsFields(box, section, config, refreshPreview) {
  const c = section.content;
  if (!Array.isArray(c.items)) c.items = [];

  const list = document.createElement("div");
  list.className = "items-list";
  box.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn btn-ghost-dark btn-small";
  addBtn.textContent = "+ Add " + config.itemLabel.toLowerCase();
  box.appendChild(addBtn);

  function renderItems() {
    list.innerHTML = "";
    c.items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<button type="button" class="remove-item" title="Remove">✕</button>`;
      config.fields.forEach((f) => {
        const wrap = document.createElement("div");
        wrap.className = "field-row";
        if (f.type === "image") {
          wrap.innerHTML = `
            <label>${f.label}</label>
            ${item[f.key] ? `<img class="thumb" src="${item[f.key]}">` : ""}
            <label class="upload-btn">Upload<input type="file" accept="image/*" class="item-upload"></label>
          `;
          wrap.querySelector(".item-upload").addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            item[f.key] = await uploadImage(file, section.id);
            refreshPreview();
            renderItems();
          });
        } else if (f.type === "textarea") {
          wrap.innerHTML = `<label>${f.label}</label><textarea>${item[f.key] || ""}</textarea>`;
          wrap.querySelector("textarea").addEventListener("input", (e) => { item[f.key] = e.target.value; refreshPreview(); });
        } else if (f.type === "checkbox") {
          wrap.innerHTML = `<label><input type="checkbox" ${item[f.key] ? "checked" : ""}> ${f.label}</label>`;
          wrap.querySelector("input").addEventListener("change", (e) => { item[f.key] = e.target.checked; refreshPreview(); });
        } else {
          wrap.innerHTML = `<label>${f.label}</label><input type="${f.type}" value="${item[f.key] || ""}">`;
          wrap.querySelector("input").addEventListener("input", (e) => { item[f.key] = e.target.value; refreshPreview(); });
        }
        row.appendChild(wrap);
      });
      row.querySelector(".remove-item").addEventListener("click", () => {
        c.items.splice(idx, 1);
        refreshPreview();
        renderItems();
      });
      list.appendChild(row);
    });
  }

  addBtn.addEventListener("click", () => {
    c.items.push({ id: crypto.randomUUID() });
    refreshPreview();
    renderItems();
  });

  renderItems();
}
