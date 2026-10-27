
/* =========================================
   CleanTrack - Navigation
   File: js/navigation.js
   ========================================= */

(function () {
  "use strict";

  const auth = window.CleanTrackAuth;

  if (!auth) {
    throw new Error(
      "CleanTrackAuth is missing. Load js/auth.js before js/navigation.js."
    );
  }

  const routes = {
    admin: [
      { id: "home", label: "Home", icon: "⌂" },
      { id: "dashboard", label: "Dashboard", icon: "▦" },
      { id: "staff", label: "Staff", icon: "♙" },
      { id: "invitations", label: "Invitations", icon: "✉" },
      { id: "teams", label: "Teams", icon: "♧" },
      { id: "locations", label: "Locations", icon: "⌖" },
      { id: "zones", label: "Zones", icon: "▦" },
      { id: "operations", label: "Operations Management", icon: "☷" },
      { id: "reviews", label: "Logs", icon: "✓" },
      { id: "analytics", label: "Analytics", icon: "▥" },
      { id: "reports", label: "Reports", icon: "▤" },
      { id: "announcements", label: "Announcements & Alerts", icon: "♢" },
      { id: "audit", label: "Audit Trail", icon: "◷" },
      { id: "settings", label: "Settings", icon: "⚙" },
      { id: "org-settings", label: "Organization Settings", icon: "◇" },
      { id: "billing", label: "Billing", icon: "$" }
    ],

    supervisor: [
      { id: "workspace", label: "My Workspace", icon: "⌂" },
      { id: "personnel", label: "Personnel", icon: "♙" },
      { id: "operations", label: "Operations Management", icon: "☷" },
      { id: "reviews", label: "Review Queue", icon: "✓" },
      { id: "sites", label: "Sites and Zones", icon: "⌖" },
      { id: "team-channel", label: "Team Channel", icon: "♧" },
      { id: "performance", label: "Performance Arena", icon: "▥" },
      { id: "team-pulse", label: "Team Pulse", icon: "♡" },
      { id: "skills", label: "Skills and Eligibility", icon: "★" },
      { id: "coverage", label: "Delegation and Temporary Coverage", icon: "⇄" },
      { id: "settings", label: "Settings", icon: "⚙" },
      { id: "audit", label: "Settings & Audit History", icon: "◷" }
    ],

    employee: [
      { id: "my-desk", label: "My Desk", icon: "⌂" },
      { id: "my-tasks", label: "My Work", icon: "☷" },
      { id: "my-history", label: "Work History", icon: "◷" },
      { id: "announcements", label: "Announcements", icon: "♢" },
      { id: "team-channel", label: "Team Channel", icon: "♧" },
      { id: "skills", label: "My Skills", icon: "★" },
      { id: "settings", label: "Settings", icon: "⚙" },
      { id: "audit", label: "My Activity", icon: "◷" }
    ]
  };

  let activePage = null;
  const pageHistory = [];

  function getMenu(role) {
    const normalizedRole = String(role || "").toLowerCase();
    return (routes[normalizedRole] || []).map(function (item) {
      return { ...item };
    });
  }

  function setActivePage(pageId, options) {
    const user = auth.getCurrentUser();

    if (!user) {
      return false;
    }

    const allowedRoutes = getMenu(user.role);
    const allowed = allowedRoutes.some(function (item) {
      return item.id === pageId;
    });

    if (!allowed) {
      console.warn("Navigation denied for this role:", pageId);
      return false;
    }

    if (activePage && activePage !== pageId && !(options && options.fromHistory)) {
      pageHistory.push(activePage);
      if (pageHistory.length > 100) pageHistory.shift();
    }
    activePage = pageId;

    window.dispatchEvent(
      new CustomEvent("cleantrack:navigate", {
        detail: {
          page: pageId,
          role: user.role
        }
      })
    );

    return true;
  }

  function getActivePage() {
    return activePage;
  }

  function canGoBack() {
    return pageHistory.length > 0;
  }

  function goBack() {
    while (pageHistory.length) {
      const previousPage = pageHistory.pop();
      if (previousPage && previousPage !== activePage) {
        return setActivePage(previousPage, { fromHistory: true });
      }
    }
    return false;
  }

  function getDefaultPage(role) {
    const defaults = {
      admin: "home",
      supervisor: "workspace",
      employee: "my-desk"
    };

    return defaults[String(role || "").toLowerCase()] || null;
  }

  function renderMenu(container) {
    if (!container) {
      throw new Error("A navigation container is required.");
    }

    const user = auth.getCurrentUser();
    if (!user) {
      container.replaceChildren();
      return;
    }

    const menu = getMenu(user.role);
    const fragment = document.createDocumentFragment();

    // Group the existing role-authorized pages into expandable sidebar sections.
    // Every route is rendered exactly once; no route or permission is changed.
    const groupDefinitions = [
      { id: "workspace", label: "Workspace", icon: "⌂", pages: ["home", "dashboard", "workspace", "my-desk"] },
      { id: "people-places", label: "People & Places", icon: "▦", pages: ["staff", "personnel", "invitations", "teams", "locations", "zones", "sites"] },
      { id: "operations", label: "Operations", icon: "☷", pages: ["operations", "my-tasks", "my-history", "reviews", "skills", "coverage"] },
      { id: "insights-admin", label: "Insights & Admin", icon: "▥", pages: ["analytics", "reports", "performance", "team-pulse", "announcements", "team-channel", "audit", "settings", "org-settings", "billing"] }
    ];

    const menuIds = new Set(menu.map(item => item.id));
    const assigned = new Set();
    const groups = groupDefinitions.map(group => ({
      ...group,
      items: menu.filter(item => group.pages.includes(item.id))
    })).filter(group => group.items.length);

    // Fail-safe for any future route: keep it visible in a final "More" section.
    const ungrouped = menu.filter(item => !assigned.has(item.id) &&
      !groupDefinitions.some(group => group.pages.includes(item.id)));
    if (ungrouped.length) groups.push({ id: "more", label: "More", icon: "⋯", items: ungrouped });

    function createNavItem(item) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-item";
      button.dataset.page = item.id;
      button.setAttribute("aria-current", "false");
      button.title = item.label;

      const icon = document.createElement("span");
      icon.className = "nav-item-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = item.icon;

      const label = document.createElement("span");
      label.className = "nav-item-label nav-label";
      label.textContent = item.label;
      button.append(icon, label);

      if (item.id === "announcements") {
        const badge = document.createElement("span");
        badge.className = "nav-unread-count";
        badge.dataset.unreadBadge = "announcements";
        badge.hidden = true;
        badge.setAttribute("aria-label", "Unread announcements");
        button.appendChild(badge);
      }

      button.addEventListener("click", function () {
        setActivePage(item.id);
      });
      return button;
    }

    groups.forEach(function (group) {
      const section = document.createElement("section");
      section.className = "ct-nav-group";
      section.dataset.navGroup = group.id;

      const heading = document.createElement("button");
      heading.type = "button";
      heading.className = "ct-nav-group-toggle";
      heading.setAttribute("aria-controls", "ct-nav-group-items-" + group.id);
      heading.setAttribute("aria-expanded", "true");

      const headingLabel = document.createElement("span");
      headingLabel.className = "ct-nav-group-label";
      headingLabel.textContent = group.label;

      const chevron = document.createElement("span");
      chevron.className = "ct-nav-group-chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "⌄";
      heading.append(headingLabel, chevron);

      const items = document.createElement("div");
      items.className = "ct-nav-group-items";
      items.id = "ct-nav-group-items-" + group.id;

      group.items.forEach(function (item) {
        assigned.add(item.id);
        items.appendChild(createNavItem(item));
      });

      heading.addEventListener("click", function () {
        const expanded = heading.getAttribute("aria-expanded") === "true";
        heading.setAttribute("aria-expanded", String(!expanded));
        items.hidden = expanded;
        section.classList.toggle("is-collapsed", expanded);
      });

      section.append(heading, items);
      fragment.appendChild(section);
    });

    container.replaceChildren(fragment);
    updateActiveItem();

    // Expand the section containing the current page so navigation never hides it.
    const active = container.querySelector(".nav-item.active, .nav-item[aria-current='page']");
    const activeGroup = active && active.closest(".ct-nav-group");
    if (activeGroup) {
      const heading = activeGroup.querySelector(".ct-nav-group-toggle");
      const items = activeGroup.querySelector(".ct-nav-group-items");
      if (heading && items) {
        heading.setAttribute("aria-expanded", "true");
        items.hidden = false;
        activeGroup.classList.remove("is-collapsed");
      }
    }
  }

  function updateActiveItem() {
    document.querySelectorAll(".nav-item[data-page]").forEach(
      function (button) {
        const active = button.dataset.page === activePage;
        button.classList.toggle("active", active);
        button.setAttribute(
          "aria-current",
          active ? "page" : "false"
        );
      }
    );
  }

  window.addEventListener("cleantrack:navigate", function (event) {
    activePage = event.detail.page;
    updateActiveItem();
  });

  window.CleanTrackNavigation = Object.freeze({
    getMenu: getMenu,
    setActivePage: setActivePage,
    getActivePage: getActivePage,
    canGoBack: canGoBack,
    goBack: goBack,
    getDefaultPage: getDefaultPage,
    renderMenu: renderMenu,
    setAnnouncementUnreadCount: function (count) {
      const value = Math.max(0, Number(count) || 0);
      document.querySelectorAll('[data-unread-badge="announcements"]').forEach(function (badge) {
        badge.textContent = value > 99 ? "99+" : String(value);
        badge.hidden = value <= 0;
        badge.setAttribute("aria-label", value + " unread announcements");
      });
    }
  });
})();