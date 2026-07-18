// ============================================================
// HOME SECTION RENDERERS — one function per section type.
// Used by BOTH the live homepage embed (home-sections-public.js)
// and the admin live preview (page-builder-admin.js).
// ============================================================

export const SECTION_TYPES = [
  { type: "heading", label: "Heading / Sub-heading" },
  { type: "productCarousel", label: "Product Carousel" },
  { type: "imageCarousel", label: "Image Carousel" },
  { type: "banner", label: "Banner / Flyer" },
  { type: "youtubeShorts", label: "YouTube Shorts Carousel" },
  { type: "reviews", label: "Reviews" },
];

export function defaultContent(type) {
  switch (type) {
    case "heading":
      return { mode: "text", title: "Your Heading", subtitle: "A short sub-heading goes here", logoUrl: "", align: "center" };
    case "productCarousel":
      return { items: [] };
    case "imageCarousel":
      return { items: [] };
    case "banner":
      return { imageUrl: "", title: "Big Announcement", subtitle: "", buttonText: "Shop Now", buttonLink: "", overlay: true };
    case "youtubeShorts":
      return { items: [] };
    case "reviews":
      return { items: [] };
    default:
      return {};
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function starString(rating = 5) {
  const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function addCarouselNav(wrap, track) {
  const prev = el("button", "ig-nav ig-prev");
  prev.type = "button";
  prev.innerHTML = "&#8249;";
  prev.onclick = () => track.scrollBy({ left: -track.clientWidth * 0.8, behavior: "smooth" });
  const next = el("button", "ig-nav ig-next");
  next.type = "button";
  next.innerHTML = "&#8250;";
  next.onclick = () => track.scrollBy({ left: track.clientWidth * 0.8, behavior: "smooth" });
  wrap.append(prev, track, next);
}

function renderHeading(content) {
  const wrap = el("div", `ig-heading ig-align-${content.align || "center"}`);
  if (content.mode === "logo" && content.logoUrl) {
    const img = el("img", "ig-heading-logo");
    img.src = content.logoUrl;
    img.alt = content.title || "logo";
    wrap.appendChild(img);
    if (content.subtitle) {
      const p = el("p", "ig-subtitle");
      p.textContent = content.subtitle;
      wrap.appendChild(p);
    }
  } else {
    if (content.title) {
      const h = el("h2", "ig-title");
      h.textContent = content.title;
      wrap.appendChild(h);
    }
    if (content.subtitle) {
      const p = el("p", "ig-subtitle");
      p.textContent = content.subtitle;
      wrap.appendChild(p);
    }
  }
  return wrap;
}

// Product cards mirror the storefront's own card style: white image tile,
// green "-NN%" badge when an original price is set, gold Bestseller badge.
function renderProductCarousel(content) {
  const wrap = el("div", "ig-carousel-wrap");
  const track = el("div", "ig-carousel-track");
  (content.items || []).forEach((item) => {
    const hasLink = !!item.link;
    const card = el(hasLink ? "a" : "div", "ig-product-card");
    if (hasLink) { card.href = item.link; card.target = "_blank"; card.rel = "noopener"; }

    const price = Number(item.price);
    const original = Number(item.originalPrice);
    let discountBadge = "";
    if (original && price && original > price) {
      const pct = Math.round((1 - price / original) * 100);
      discountBadge = `<span class="ig-badge ig-badge-discount">-${pct}%</span>`;
    }
    const bestBadge = item.bestseller ? `<span class="ig-badge ig-badge-best">🔥 Bestseller</span>` : "";

    card.innerHTML = `
      <div class="ig-product-image">
        ${discountBadge}${bestBadge}
        <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title || "")}" loading="lazy">
      </div>
      <div class="ig-product-body">
        <h4>${escapeHtml(item.title)}</h4>
        <div class="ig-product-price">
          ${price ? `<span class="ig-price-now">₹${escapeHtml(item.price)}</span>` : ""}
          ${original ? `<span class="ig-price-was">₹${escapeHtml(item.originalPrice)}</span>` : ""}
        </div>
      </div>
    `;
    track.appendChild(card);
  });
  addCarouselNav(wrap, track);
  return wrap;
}

function renderImageCarousel(content) {
  const wrap = el("div", "ig-carousel-wrap");
  const track = el("div", "ig-carousel-track");
  (content.items || []).forEach((item) => {
    const hasLink = !!item.link;
    const card = el(hasLink ? "a" : "div", "ig-image-card");
    if (hasLink) { card.href = item.link; card.target = "_blank"; card.rel = "noopener"; }
    card.innerHTML = `
      <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.caption || "")}" loading="lazy">
      ${item.caption ? `<div class="ig-card-body"><p>${escapeHtml(item.caption)}</p></div>` : ""}
    `;
    track.appendChild(card);
  });
  addCarouselNav(wrap, track);
  return wrap;
}

function renderBanner(content) {
  const wrap = el("div", "ig-banner");
  if (content.imageUrl) wrap.style.backgroundImage = `url(${content.imageUrl})`;
  if (content.overlay) wrap.classList.add("ig-banner-overlay");
  const inner = el("div", "ig-banner-inner");
  if (content.title) {
    const h = el("h2", "ig-banner-title");
    h.textContent = content.title;
    inner.appendChild(h);
  }
  if (content.subtitle) {
    const p = el("p", "ig-banner-subtitle");
    p.textContent = content.subtitle;
    inner.appendChild(p);
  }
  if (content.buttonText) {
    const a = el("a", "ig-banner-btn");
    a.textContent = content.buttonText;
    a.href = content.buttonLink || "#";
    inner.appendChild(a);
  }
  wrap.appendChild(inner);
  return wrap;
}

function renderYoutubeShorts(content) {
  const wrap = el("div", "ig-carousel-wrap");
  const track = el("div", "ig-carousel-track ig-shorts-track");
  (content.items || []).forEach((item) => {
    const card = el("div", "ig-short-card");
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube.com/embed/${encodeURIComponent(item.videoId || "")}`;
    frame.title = item.title || "YouTube short";
    frame.loading = "lazy";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    frame.allowFullscreen = true;
    card.appendChild(frame);
    if (item.title) {
      const cap = el("p", "ig-short-title");
      cap.textContent = item.title;
      card.appendChild(cap);
    }
    track.appendChild(card);
  });
  addCarouselNav(wrap, track);
  return wrap;
}

function renderReviews(content) {
  const wrap = el("div", "ig-carousel-wrap");
  const track = el("div", "ig-carousel-track");
  (content.items || []).forEach((item) => {
    const card = el("div", "ig-review-card");
    card.innerHTML = `
      ${item.avatarUrl ? `<img class="ig-review-avatar" src="${escapeHtml(item.avatarUrl)}" alt="${escapeHtml(item.name)}">` : ""}
      <div class="ig-review-stars">${starString(item.rating)}</div>
      <p class="ig-review-text">${escapeHtml(item.text)}</p>
      <span class="ig-review-name">${escapeHtml(item.name)}</span>
    `;
    track.appendChild(card);
  });
  addCarouselNav(wrap, track);
  return wrap;
}

// Builds the full <section> wrapper (handles size/width/background from `style`)
export function renderSection(section) {
  const { type, content = {}, style = {} } = section;
  let inner;
  switch (type) {
    case "heading": inner = renderHeading(content); break;
    case "productCarousel": inner = renderProductCarousel(content); break;
    case "imageCarousel": inner = renderImageCarousel(content); break;
    case "banner": inner = renderBanner(content); break;
    case "youtubeShorts": inner = renderYoutubeShorts(content); break;
    case "reviews": inner = renderReviews(content); break;
    default: inner = el("div");
  }
  const wrap = el("section", `ig-section ig-type-${type}`);
  wrap.dataset.sectionId = section.id || "";
  if (style.height) wrap.style.height = style.height + "px";
  if (style.bgColor) wrap.style.background = style.bgColor;
  wrap.classList.add(style.width === "full" ? "ig-full" : "ig-contained");
  wrap.appendChild(inner);
  return wrap;
}
