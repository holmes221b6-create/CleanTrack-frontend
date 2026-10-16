
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
      { id: "billing", label: "Billing", icon: "$" },
      { id: "settings", label: "Settings", icon: "⚙" },
      { id: "audit", label: "My Activity", icon: "◷" }
    ]
  };

  let activePage = null;

  function getMenu(role) {
    const normalizedRole = String(role || "").toLowerCase();
    return (routes[normalizedRole] || []).map(function (item) {
      return { ...item };
    });
  }

  function setActivePage(pageId) {
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

    menu.forEach(function (item) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nav-item";
      button.dataset.page = item.id;
      button.setAttribute("aria-current", "false");

      const icon = document.createElement("span");
      icon.className = "nav-item-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = item.icon;

      const label = document.createElement("span");
      label.className = "nav-item-label";
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

      fragment.appendChild(button);
    });

    container.replaceChildren(fragment);
    updateActiveItem();
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