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
    brand.innerHTML = '<span class="ct-sidebar-brand-mark" aria-hidden="true"><svg class="ct-logo-symbol" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M28.4 6.4 21.2 3.7C12.1.3 4.5 7.3 4.5 16.3v15.4c0 9 7.6 16 16.7 12.6l7.2-2.7-5.2-7.9-3.5 1.3c-3.3 1.2-6.7-1.2-6.7-4.7V19.7c0-3.5 3.4-5.9 6.7-4.7l3.5 1.3z" fill="#786dbb"/><path d="M30.3 17.2 43.5 24 30.3 32.2 23.2 24z" fill="#36a88a"/><path d="m30.3 17.2 0 15 13.2-8.2z" fill="#25866f"/></svg></span><span><strong>CleanTrack</strong><small>Operations</small></span>';

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
      // Desktop starts with a normal open sidebar; mobile starts with its drawer closed.
      if (media.matches) {
        shell.classList.add("ct-sidebar-collapsed");
      } else {
        shell.classList.remove("ct-sidebar-collapsed");
      }
      const collapsed = shell.classList.contains("ct-sidebar-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "Open navigation" : "Close navigation");
      toggle.title = collapsed ? "Open navigation" : "Close navigation";
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
