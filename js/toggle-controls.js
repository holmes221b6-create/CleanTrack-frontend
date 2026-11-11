/* Convert native checkbox controls to settings-style switches everywhere
   except Team pages. Keep native inputs and all existing handlers intact. */
(function () {
  "use strict";
  const AUTH_PAGE = "#auth-view";
  const TEAM_PAGE = [
    ".ct-team-manager",
    ".ct-team-fullscreen-workspace",
    ".ct-team-channel",
    ".ct-team-page",
    "[data-page='teams']"
  ].join(",");

  function enhance(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches('input[type="checkbox"]')) {
      if (!root.closest(AUTH_PAGE) && !root.closest(TEAM_PAGE)) root.classList.add("ct-settings-toggle");
      else root.classList.remove("ct-settings-toggle");
    }
    if (root.querySelectorAll) {
      root.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
        if (!checkbox.closest(AUTH_PAGE) && !checkbox.closest(TEAM_PAGE)) checkbox.classList.add("ct-settings-toggle");
        else checkbox.classList.remove("ct-settings-toggle");
      });
    }
  }

  function start() {
    enhance(document.documentElement);
    const observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) enhance(node);
        });
        if (record.type === "attributes" && record.target.nodeType === 1) {
          enhance(record.target);
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["type"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
