
/* =========================================
   CleanTrack - Application Startup
   File: js/app.js
   ========================================= */

(function () {
  "use strict";

  const auth = window.CleanTrackAuth;
  const navigation = window.CleanTrackNavigation;

  if (!auth || !navigation) {
    throw new Error(
      "CleanTrack dependencies are missing. Load config.js, api.js, auth.js, and navigation.js first."
    );
  }

  const state = {
    started: false,
    loading: false,
    error: null,
    currentPage: null
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function showMessage(message, type) {
    const container =
      getElement("app-message") ||
      getElement("auth-message");

    if (!container) {
      console.info(message);
      return;
    }

    container.textContent = message;
    container.className = "auth-message " + (type || "");
    container.hidden = false;
  }

  function clearMessage() {
    const container =
      getElement("app-message") ||
      getElement("auth-message");

    if (container) {
      container.textContent = "";
      container.hidden = true;
    }
  }

  function setLoading(isLoading) {
    state.loading = Boolean(isLoading);
    document.documentElement.classList.toggle(
      "app-loading",
      state.loading
    );

    document.querySelectorAll("[data-app-loading]").forEach(
      function (element) {
        element.hidden = !state.loading;
      }
    );
  }

  function setVisible(element, visible) {
    if (element) {
      element.hidden = !visible;
    }
  }

  function showAuthenticatedLayout(user) {
    setVisible(getElement("auth-view"), false);
    setVisible(getElement("workspace-view"), true);

    const nameElement = getElement("header-user-name");
    const roleElement = getElement("workspace-role");
    const organizationElement = getElement("workspace-organization");
    const menuElement = getElement("workspace-navigation");

    if (nameElement) {
      nameElement.textContent = user.name || user.email || "User";
    }

    if (roleElement) {
      roleElement.textContent = formatRole(user.role);
    }

    if (organizationElement) {
      const organization =
        user.organization_name ||
        user.organizationName ||
        user.organization?.name ||
        user.organization;

      organizationElement.textContent =
        typeof organization === "string" && organization.trim()
          ? organization.trim()
          : "Organization";
    }

    if (menuElement) {
      navigation.renderMenu(menuElement);
    }

    const defaultPage = navigation.getDefaultPage(user.role);

    if (defaultPage) {
      navigation.setActivePage(defaultPage);
    }
  }
  
  
  function showUnauthenticatedLayout() {
    setVisible(getElement("workspace-view"), false);
    setVisible(getElement("auth-view"), true);
    setVisible(getElement("login-view"), true);
    setVisible(getElement("register-view"), false);
  }


  function formatRole(role) {
    const labels = {
      admin: "Administrator",
      supervisor: "Supervisor",
      employee: "Employee"
    };

    return labels[String(role || "").toLowerCase()] || "User";
  }

  async function renderPage(pageId) {
    state.currentPage = pageId;

    const pageTitle = getElement("page-title");
    const pageContent = getElement("page-content");
    const menuElement = getElement("workspace-navigation");

    const user = auth.getCurrentUser();
    const activeMenuItem = navigation
      .getMenu(user?.role)
      .find(function (item) {
        return item.id === pageId;
      });

    const title = activeMenuItem ? activeMenuItem.label : "CleanTrack";

    if (pageTitle) {
      pageTitle.textContent = title;
    }

    if (menuElement) {
      navigation.renderMenu(menuElement);
    }

    if (!pageContent) return;

    pageContent.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = title;
    pageContent.appendChild(heading);
    
    
    // Dedicated dashboard is available only to Admin users.
    if (pageId === "dashboard") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        const message = document.createElement("p");
        message.textContent = "The Dashboard is available to Admin users only.";
        pageContent.appendChild(message);
        return;
      }

      const organizationName =
        user?.organization_name ||
        user?.organizationName ||
        user?.organization?.name ||
        (typeof user?.organization === "string" ? user.organization : "") ||
        "Your organization";

      const shell = document.createElement("div");
      shell.className = "admin-dashboard";

      const welcome = document.createElement("section");
      welcome.className = "admin-dashboard-welcome";
      const eyebrow = document.createElement("p");
      eyebrow.className = "admin-dashboard-eyebrow";
      eyebrow.textContent = "ADMIN OVERVIEW";
      const welcomeTitle = document.createElement("h2");
      welcomeTitle.textContent = "Welcome back, " + (user?.name || "Administrator");
      const welcomeText = document.createElement("p");
      welcomeText.textContent =
        "Here is your workspace overview for " + organizationName + ". Choose a section below to manage your operations.";
      welcome.append(eyebrow, welcomeTitle, welcomeText);
      shell.appendChild(welcome);

      const sectionTitle = document.createElement("h3");
      sectionTitle.className = "admin-dashboard-section-title";
      sectionTitle.textContent = "Workspace management";
      shell.appendChild(sectionTitle);

      const descriptions = {
        staff: "Manage staff accounts and role access.",
        invitations: "Invite people to join your organization.",
        teams: "Organize staff into teams.",
        locations: "Manage your work locations.",
        zones: "Configure work areas and zones.",
        operations: "Review and coordinate operational tasks.",
        reviews: "Inspect logs and review submitted work.",
        analytics: "Explore operational performance insights.",
        reports: "Open reports for your organization.",
        announcements: "Share important updates and alerts.",
        audit: "Review activity and accountability records.",
        settings: "Configure your organization workspace.",
        billing: "Review plan and billing information."
      };
      const menu = navigation.getMenu(user?.role).filter(item => item.id !== "dashboard" && item.id !== "home");
      const grid = document.createElement("div");
      grid.className = "admin-dashboard-grid";

      menu.forEach(function (item) {
        const card = document.createElement("article");
        card.className = "admin-dashboard-card";
        const icon = document.createElement("span");
        icon.className = "admin-dashboard-card-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = item.icon;
        const title = document.createElement("h4");
        title.textContent = item.label;
        const description = document.createElement("p");
        description.textContent = descriptions[item.id] || ("Open " + item.label.toLowerCase() + " for your organization.");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "admin-dashboard-card-action";
        button.textContent = "Open section";
        button.addEventListener("click", function () {
          navigation.setActivePage(item.id);
        });
        card.append(icon, title, description, button);
        grid.appendChild(card);
      });

      shell.appendChild(grid);
      pageContent.appendChild(shell);
      return;
    }

    // Render the landing page instead of the generic placeholder.
    if (["home", "workspace", "my-desk"].includes(pageId)) {
      const intro = document.createElement("p");
      const userName = user?.name || user?.email || "there";
      intro.textContent = `Welcome back, ${userName}.`;
      pageContent.appendChild(intro);

      const cards = [
        { id: "teams", title: "Teams", description: "View and manage teams." },
        { id: "operations", title: "Operations", description: "Review work and operational tasks." },
        { id: "reports", title: "Reports", description: "Review available reports." },
        { id: "my-tasks", title: "My Tasks", description: "View your assigned tasks." },
        { id: "my-history", title: "My History", description: "Review your work history." }
      ];

      const allowedIds = navigation.getMenu(user?.role).map(item => item.id);
      const grid = document.createElement("div");
      grid.className = "content-grid";

      cards.filter(card => allowedIds.includes(card.id)).forEach(card => {
        const section = document.createElement("section");
        section.className = "span-4";
        section.style.cssText =
          "padding:20px;margin:8px 0;border:1px solid #2a3850;" +
          "border-radius:12px;background:#111a2b;color:#e7edf7;";

        const titleElement = document.createElement("h3");
        titleElement.textContent = card.title;

        const description = document.createElement("p");
        description.textContent = card.description;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `Open ${card.title}`;
        button.addEventListener("click", () => {
          navigation.setActivePage(card.id);
        });

        section.append(titleElement, description, button);
        grid.appendChild(section);
      });

      pageContent.appendChild(grid);
      return;
    }
    
    
    if (pageId === "teams") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        const message = document.createElement("p");
        message.textContent = "Team management is available to Admin users.";
        pageContent.appendChild(message);
        return;
      }

      // The existing Teams module will render this page.
      if (window.CleanTrackTeams &&
          typeof window.CleanTrackTeams.render === "function") {
        await window.CleanTrackTeams.render(pageContent);
      } else {
        const message = document.createElement("p");
        message.textContent =
          "The Teams module has not loaded. Check the teams.js script path.";
        pageContent.appendChild(message);
      }

      return;
    }

    const message = document.createElement("p");
    message.className = "page-placeholder";
    message.textContent =
      "This section will be connected as its feature is implemented.";
    pageContent.appendChild(message);
  }

    function bindLogoutButton() {
    const button = getElement("logout-button");

    if (!button) {
      return;
    }

    button.addEventListener("click", async function () {
      setLoading(true);

      try {
        await auth.logout();
      } catch (error) {
        showMessage(
          error.message || "There was a problem signing out.",
          "error"
        );
      } finally {
        state.started = false;
        showUnauthenticatedLayout();
        clearMessage();
        setLoading(false);
      }
    });
  }

function bindNavigation() {
  window.addEventListener("cleantrack:navigate", function (event) {
    if (event.detail && event.detail.page) {
      renderPage(event.detail.page);
    }
  });

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-view]");
    if (!button) return;

    const view = button.dataset.view;
    const views = {
      "login": "login-view",
      "register": "register-view",
      "forgot-password": "forgot-password-view"
    };

    const targetId = views[view];
    if (!targetId) return;

    const authViews = [
      "login-view",
      "register-view",
      "forgot-password-view",
      "organization-view"
    ];

    authViews.forEach(function (id) {
      const element = document.getElementById(id);
      if (element) element.hidden = id !== targetId;
    });
  });
}

  function bindLoginForm() {
    const form = getElement("login-form");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearMessage();
      setLoading(true);

      const formData = new FormData(form);

      try {
        const user = await auth.login({
          email: formData.get("email"),
          password: formData.get("password")
        });

        state.started = true;
        showAuthenticatedLayout(user);
        showMessage("You are now signed in.", "success");
      } catch (error) {
        showMessage(
          error.message || "Unable to sign in. Please try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    });
  }



  async function start() {
    if (state.started) {
      return;
    }

    state.started = true;
    bindLoginForm();
    if (typeof bindRegistrationForm === "function") {
  bindRegistrationForm();
}
    bindLogoutButton();
    bindNavigation();

    setLoading(true);

    try {
      const user = await auth.restoreSession();

      if (user) {
        showAuthenticatedLayout(user);
      } else {
        showUnauthenticatedLayout();
      }
    } catch (error) {
      state.error = error.message;
      showUnauthenticatedLayout();
    } finally {
      setLoading(false);
    }
  }

  window.CleanTrackApp = Object.freeze({
    start: start,
    renderPage: renderPage,
    showMessage: showMessage,
    getState: function () {
      return { ...state };
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();