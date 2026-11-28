(function () {
  "use strict";
  const selectors = [
    ".mt-overlay", ".modal-backdrop", "#app-modal[open]", ".app-modal[open]",
    ".filter-modal:not([hidden])", '[role="dialog"][aria-modal="true"]'
  ];
  let locked = false, savedScrollY = 0, previous = null, frame = 0;
  function visible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" &&
      Number(cs.opacity || 1) !== 0 &&
      (el.getClientRects().length > 0 || el.matches("dialog[open]"));
  }
  function hasPanel() {
    return selectors.some(sel => [...document.querySelectorAll(sel)].some(visible));
  }
  function lock() {
    if (locked || !document.body) return;
    locked = true;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    const b = document.body, h = document.documentElement;
    previous = {
      position:b.style.position, top:b.style.top, left:b.style.left,
      right:b.style.right, width:b.style.width, overflow:b.style.overflow,
      htmlOverflow:h.style.overflow, overscroll:h.style.overscrollBehavior
    };
    h.style.overflow = "hidden";
    h.style.overscrollBehavior = "none";
    b.style.position = "fixed";
    b.style.top = -savedScrollY + "px";
    b.style.left = "0";
    b.style.right = "0";
    b.style.width = "100%";
    b.style.overflow = "hidden";
  }
  function unlock() {
    if (!locked || !previous) return;
    const b = document.body, h = document.documentElement, p = previous;
    b.style.position=p.position; b.style.top=p.top; b.style.left=p.left;
    b.style.right=p.right; b.style.width=p.width; b.style.overflow=p.overflow;
    h.style.overflow=p.htmlOverflow; h.style.overscrollBehavior=p.overscroll;
    locked = false; previous = null;
    window.scrollTo(0, savedScrollY);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => hasPanel() ? lock() : unlock());
  }
  function start() {
    new MutationObserver(sync).observe(document.body, {
      subtree:true, childList:true, attributes:true,
      attributeFilter:["class","style","open","hidden","aria-hidden"]
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") setTimeout(sync, 0);
    }, true);
    document.addEventListener("click", e => {
      if (e.target.closest(".mt-close,[data-action='close-modal'],[data-modal-close],.modal-close,.close-modal"))
        setTimeout(sync, 0);
    }, true);
    sync();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();