(function () {
  "use strict";

  function installSidebar() {
    const workspace = document.getElementById("workspace-view");
    const navigation = document.getElementById("workspace-navigation");
    if (!workspace || !navigation || workspace.dataset.ctSidebarReady === "true") return;
    if (!workspace.contains(navigation)) return;

    workspace.dataset.ctSidebarReady = "true";

    const shell = document.createElement("div");
    shell.className = "ct-workspace-shell";

    const sidebar = document.createElement("aside");
    sidebar.className = "ct-sidebar";
    sidebar.setAttribute("aria-label", "Main navigation");

    const brand = document.createElement("div");
    brand.className = "ct-sidebar-brand";
    brand.innerHTML = '<span class="ct-sidebar-brand-mark" aria-hidden="true">C</span><span><strong>CleanTrack</strong><small>Operations</small></span>';

    const navLabel = document.createElement("div");
    navLabel.className = "ct-sidebar-label";
    navLabel.textContent = "WORKSPACE";

// Preserve the existing role and organization display.
// The original #sidebar is replaced below, so move this element
// before replacing the workspace contents.
const identity = workspace.querySelector(".workspace-identity");

if (identity) {
  sidebar.append(brand, identity, navLabel, navigation);
} else {
  sidebar.append(brand, navLabel, navigation);
}
    const main = document.createElement("div");
    main.className = "ct-workspace-main";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "ct-sidebar-toggle";
    toggle.setAttribute("aria-label", "Collapse sidebar");
    toggle.setAttribute("aria-expanded", "true");
    toggle.title = "Collapse or expand navigation";
    toggle.innerHTML = '<span class="ct-hamburger" aria-hidden="true"><span></span><span></span><span></span></span>';

    const toolbar = document.createElement("div");
    toolbar.className = "ct-workspace-toolbar";
    toolbar.append(toggle);

    const existingChildren = Array.from(workspace.childNodes);

existingChildren.forEach(function (node) {
  if (node === navigation) return;

  if (
    node.nodeType === Node.ELEMENT_NODE &&
    (
      node.id === "sidebar" ||
      node.classList.contains("ct-workspace-shell")
    )
  ) {
    return;
  }

  main.appendChild(node);
});


    // Keep the existing page/navigation element so app.js references remain valid.
    shell.append(sidebar, main);
    workspace.replaceChildren(shell);
    main.prepend(toolbar);

    toggle.addEventListener("click", function () {
      const collapsed = shell.classList.toggle("ct-sidebar-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "Open navigation" : "Close navigation");
      toggle.title = collapsed ? "Open navigation" : "Close navigation";
    });

    // Keep the active navigation page highlighted by the existing navigation renderer.
    navigation.addEventListener("click", function (event) {
      const target = event.target.closest("button, a");
      if (!target) return;
      window.setTimeout(function () {
        navigation.querySelectorAll(".active, [aria-current='page']").forEach(function (item) {
          item.classList.add("ct-nav-active");
        });
      }, 0);
    });

    // On small screens the menu button opens/closes the drawer.
    const media = window.matchMedia("(max-width: 760px)");
    function updateMobileMode() {
      shell.classList.toggle("ct-sidebar-mobile", media.matches);
      // Keep the menu closed by default on both desktop and mobile.
      shell.classList.add("ct-sidebar-collapsed");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      toggle.title = "Open navigation";
    }
    if (media.addEventListener) media.addEventListener("change", updateMobileMode);
    else if (media.addListener) media.addListener(updateMobileMode);
    updateMobileMode();
  }

  function boot() {
    installSidebar();
    const workspace = document.getElementById("workspace-view");
    if (!workspace || !workspace.contains(document.getElementById("workspace-navigation"))) {
      const observer = new MutationObserver(function () {
        installSidebar();
        const view = document.getElementById("workspace-view");
        if (view && view.dataset.ctSidebarReady === "true") observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
