window.sharePage = async function () {
  const url = window.location.href;
  const title = document.title || "Check this out";
  const text = "Have a look at this product 👇";

  // ✅ Modern browsers (Mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url
      });
    } catch (err) {
      console.log("Share cancelled", err);
    }
    return;
  }

  // 🔁 Fallback — Copy link
  try {
    await navigator.clipboard.writeText(url);
    showShareToast("Link copied 📋");
  } catch (err) {
    alert("Copy this link:\n" + url);
  }
};

/* ===== SMALL TOAST ===== */
function showShareToast(msg) {
  let toast = document.createElement("div");
  toast.innerText = msg;

  toast.style.position = "fixed";
  toast.style.bottom = "90px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#000";
  toast.style.color = "#fff";
  toast.style.padding = "10px 16px";
  toast.style.borderRadius = "20px";
  toast.style.fontSize = "14px";
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity .3s ease";

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}