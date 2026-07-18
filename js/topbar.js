document.addEventListener("DOMContentLoaded", () => {
  const drawer = document.getElementById("ig-nav-drawer");
  const openBtn = document.getElementById("ig-menu-btn");
  const closeBtn = document.getElementById("ig-drawer-close");
  const backdrop = drawer?.querySelector(".ig-nav-drawer-backdrop");

  const open = () => drawer.classList.add("open");
  const close = () => drawer.classList.remove("open");

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
});
