
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
    updateFooterGuide(user);

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
    updateFooterGuide(null);
  }


  function formatRole(role) {
    const labels = {
      admin: "Administrator",
      supervisor: "Supervisor",
      employee: "Employee"
    };

    return labels[String(role || "").toLowerCase()] || "User";
  }

  function updateFooterGuide(user) {
    const guide = getElement("footer-role-guide");
    if (!guide) return;

    const role = String(user?.role || "").toLowerCase();
    const labels = {
      admin: "Admin Guide",
      supervisor: "Supervisor Guide",
      employee: "Employee Guide"
    };
    guide.textContent = labels[role] || "Getting Started Guide";
    guide.dataset.guideRole = role || "guest";
  }

  function openFooterHelp(action) {
    const dialog = getElement("app-modal");
    const titleElement = getElement("modal-title");
    const content = getElement("modal-content");
    if (!dialog || !titleElement || !content) return;

    const user = auth.getCurrentUser();
    const role = String(user?.role || "").toLowerCase();
    const roleTitle = {
      admin: "Admin Guide",
      supervisor: "Supervisor Guide",
      employee: "Employee Guide"
    }[role] || "Getting Started Guide";

    content.replaceChildren();

    if (action === "center") {
      titleElement.textContent = "Help Center";
      content.innerHTML = `
        <div class="ct-help-dialog">
          <p class="ct-help-lead">Find your way around CleanTrack and get help with everyday work.</p>
          <section class="ct-help-topic">
            <h3>Finding your workspace</h3>
            <p>Use the left navigation to open the sections available to your account. On smaller screens, use the three-line menu button to open navigation.</p>
          </section>
          <section class="ct-help-topic">
            <h3>Roles and access</h3>
            <p>Your role determines which tools and actions are available. If a section is missing or you need access, contact your workspace administrator.</p>
          </section>
          <section class="ct-help-topic">
            <h3>Tasks and records</h3>
            <p>Open the task or operations area available to your role to review work. Follow the instructions shown for each task and record evidence when requested.</p>
          </section>
          <div class="ct-help-dialog-actions">
            <button type="button" class="ct-help-action-button" data-help-open="guide">Open ${roleTitle}</button>
            <button type="button" class="ct-help-secondary-button" data-help-open="contact">Contact Support</button>
          </div>
        </div>`;
    } else if (action === "guide") {
      titleElement.textContent = roleTitle;
      const guideContent = {
        admin: `
          <p class="ct-help-lead">Manage your organization and keep operations accountable.</p>
          <ol>
            <li><strong>Set up the workspace.</strong> Check organization details, locations, and zones.</li>
            <li><strong>Manage people.</strong> Review staff and invitations, and confirm that each person has the correct access.</li>
            <li><strong>Plan work.</strong> Create and organize tasks or operations, with clear ownership and timing.</li>
            <li><strong>Review execution.</strong> Check task progress, submitted evidence, and items that need attention.</li>
            <li><strong>Monitor performance.</strong> Use the dashboard, reports, logs, and audit trail to follow up on exceptions.</li>
          </ol>
          <p class="ct-help-note">Only grant access appropriate to each person's responsibilities. Server-side permissions determine what actions are allowed.</p>`,
        supervisor: `
          <p class="ct-help-lead">Coordinate the team, review work, and follow up on exceptions.</p>
          <ol>
            <li><strong>Check today's work.</strong> Open the workspace and operations areas available to you.</li>
            <li><strong>Coordinate coverage.</strong> Review personnel, sites, zones, and assigned responsibilities.</li>
            <li><strong>Follow progress.</strong> Watch for pending, delayed, or incomplete work and raise issues early.</li>
            <li><strong>Review submissions.</strong> Use the review queue to check records or evidence when that function is available to your account.</li>
            <li><strong>Report blockers.</strong> Escalate missing access, unclear instructions, or site issues to your administrator.</li>
          </ol>`,
        employee: `
          <p class="ct-help-lead">Use your workspace to understand assigned work and keep your records up to date.</p>
          <ol>
            <li><strong>Start with My Desk or My Tasks.</strong> Review the work and instructions available to you.</li>
            <li><strong>Complete the task as instructed.</strong> Follow site procedures and any timing or safety requirements.</li>
            <li><strong>Record completion accurately.</strong> Add requested evidence or notes when the task flow provides those options.</li>
            <li><strong>Check your history.</strong> Review prior activity and announcements available to your account.</li>
            <li><strong>Ask for help early.</strong> Contact your supervisor if an instruction is unclear or a task cannot be completed.</li>
          </ol>`,
        guest: `
          <p class="ct-help-lead">Get started with your CleanTrack workspace.</p>
          <ol>
            <li>Sign in with your work account, or complete registration if your organization allows it.</li>
            <li>Choose the role and organization details you were given by your organization.</li>
            <li>After signing in, use the navigation to find the tools available to your account.</li>
            <li>If you cannot access your workspace, contact your organization administrator.</li>
          </ol>`
      };
      content.innerHTML = `<div class="ct-help-dialog">${guideContent[role] || guideContent.guest}<div class="ct-help-dialog-actions"><button type="button" class="ct-help-secondary-button" data-help-open="center">Help Center</button><button type="button" class="ct-help-secondary-button" data-help-open="contact">Contact Support</button></div></div>`;
    } else if (action === "contact") {
      titleElement.textContent = "Contact Support";
      const replyEmail = user?.email || "";
      const accountName = user?.name || "";
      const org = user?.organization_name || user?.organizationName || user?.organization?.name || (typeof user?.organization === "string" ? user.organization : "");
      content.innerHTML = `
        <div class="ct-help-dialog">
          <p class="ct-help-lead">Prepare a support request with the details needed to investigate your issue.</p>
          <p class="ct-help-note">The support email address has not been configured in this workspace. When your email app opens, enter your organization's support contact or ask your workspace administrator for it. The message will not be sent automatically.</p>
          <form id="ct-support-form" class="ct-support-form">
            <label for="ct-support-name">Your name</label>
            <input id="ct-support-name" name="name" type="text" autocomplete="name" required>
            <label for="ct-support-email">Reply-to email</label>
            <input id="ct-support-email" name="email" type="email" autocomplete="email" required>
            <label for="ct-support-subject">Subject</label>
            <input id="ct-support-subject" name="subject" type="text" maxlength="120" value="CleanTrack support request" required>
            <label for="ct-support-message">What do you need help with?</label>
            <textarea id="ct-support-message" name="message" rows="4" maxlength="3000" required placeholder="Describe what happened and which page you were using."></textarea>
            <div class="ct-help-dialog-actions">
              <button type="submit" class="ct-help-action-button">Prepare email</button>
              <button type="button" class="ct-help-secondary-button" data-help-open="center">Help Center</button>
            </div>
          </form>
        </div>`;
      const nameInput = content.querySelector("#ct-support-name");
      const emailInput = content.querySelector("#ct-support-email");
      if (nameInput) nameInput.value = accountName;
      if (emailInput) emailInput.value = replyEmail;
      const supportForm = content.querySelector("#ct-support-form");
      if (supportForm) {
        supportForm.addEventListener("submit", function (event) {
          event.preventDefault();
          const formData = new FormData(supportForm);
          const body = [
            "Name: " + String(formData.get("name") || ""),
            "Reply-to email: " + String(formData.get("email") || ""),
            "Role: " + (role || "guest"),
            "Organization: " + (typeof org === "string" && org ? org : "Not available"),
            "",
            "Issue:",
            String(formData.get("message") || "")
          ].join("\n");
          const mailto = "mailto:?subject=" + encodeURIComponent(String(formData.get("subject") || "CleanTrack support request")) + "&body=" + encodeURIComponent(body);
          window.location.href = mailto;
        });
      }
    } else {
      return;
    }

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function bindFooterHelp() {
    const footer = getElement("app-footer");
    const dialog = getElement("app-modal");
    if (!footer || footer.dataset.helpReady === "true") return;
    footer.dataset.helpReady = "true";
    const year = getElement("footer-year");
    if (year) year.textContent = String(new Date().getFullYear());

    footer.addEventListener("click", function (event) {
      const link = event.target.closest("[data-help-action]");
      if (!link) return;
      event.preventDefault();
      openFooterHelp(link.dataset.helpAction);
    });

    if (dialog && dialog.dataset.footerHelpReady !== "true") {
      dialog.dataset.footerHelpReady = "true";
      dialog.addEventListener("click", function (event) {
        if (event.target.closest("[data-action='close-modal']")) {
          dialog.close ? dialog.close() : dialog.removeAttribute("open");
          return;
        }
        const opener = event.target.closest("[data-help-open]");
        if (opener) openFooterHelp(opener.dataset.helpOpen);
      });
    }
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

    // Home is the admin landing/control page; Dashboard remains the deeper analytics page.
    if (pageId === "home" && String(user?.role || "").toLowerCase() === "admin") {
      if (window.CleanTrackAdminHome && typeof window.CleanTrackAdminHome.render === "function") {
        await window.CleanTrackAdminHome.render(pageContent);
      } else {
        const message = document.createElement("p");
        message.textContent = "Home could not load. Refresh the page and try again.";
        pageContent.appendChild(message);
      }
      return;
    }

    // Admin-only live operational dashboard. Other roles never render this page.
    if (pageId === "dashboard") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        const message = document.createElement("p");
        message.textContent = "The Dashboard is available to Admin users only.";
        pageContent.appendChild(message);
        return;
      }
      if (window.CleanTrackDashboard) {
        window.CleanTrackDashboard.render(pageContent);
      } else {
        const message = document.createElement("p");
        message.textContent = "The Admin Dashboard could not load. Refresh the page and try again.";
        pageContent.appendChild(message);
      }
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

  function bindRegistrationForm() {
    const form = getElement("register-form");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    const nameGroup = getElement("organization-name-group");
    const codeGroup = getElement("organization-code-group");
    const organizationName = getElement("register-organization-name");
    const organizationCode = getElement("register-organization-code");
    const message = getElement("register-message");
    const submit = getElement("register-submit");
    const roleInputs = Array.from(form.querySelectorAll('input[name="role"]'));

    function updateRoleFields() {
      const selected = form.querySelector('input[name="role"]:checked');
      const role = selected ? selected.value : "";
      const isAdmin = role === "admin";
      const isJoining = role === "supervisor" || role === "employee";
      if (nameGroup) nameGroup.hidden = !isAdmin;
      if (codeGroup) codeGroup.hidden = !isJoining;
      if (organizationName) organizationName.required = isAdmin;
      if (organizationCode) organizationCode.required = isJoining;
      if (submit) submit.textContent = isAdmin ? "Create organization" : "Request to join";
    }
    roleInputs.forEach(input => input.addEventListener("change", updateRoleFields));
    updateRoleFields();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (message) {
        message.textContent = "";
        message.className = "form-message";
      }
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const role = String(data.get("role") || "").toLowerCase();
      if (!role) {
        if (message) {
          message.textContent = "Choose the role you are registering for.";
          message.className = "form-message error";
        }
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = role === "admin" ? "Creating organization…" : "Sending request…";
      }
      setLoading(true);
      try {
        const result = await auth.register({
          name: data.get("name"),
          email: data.get("email"),
          password: data.get("password"),
          role,
          organization_name: data.get("organization_name"),
          organization_code: data.get("organization_code"),
          accept_terms: data.get("accept_terms") === "on"
        });

        if (result.user && result.membershipStatus !== "pending") {
          showAuthenticatedLayout(result.user);
          navigation.setActivePage(navigation.getDefaultPage(result.user.role) || "home");
          if (message) message.textContent = "";
          form.reset();
          updateRoleFields();
          return;
        }

        if (message) {
          message.textContent = result.message || "Your request was submitted.";
          message.className = "form-message success";
        }
        form.reset();
        updateRoleFields();
      } catch (error) {
        if (message) {
          message.textContent = error.message || "Unable to create the account. Please check the details and try again.";
          message.className = "form-message error";
        }
      } finally {
        setLoading(false);
        if (submit) {
          submit.disabled = false;
          updateRoleFields();
        }
      }
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
    bindFooterHelp();
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