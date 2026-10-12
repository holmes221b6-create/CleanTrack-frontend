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
    brand.innerHTML = '<span class="ct-sidebar-brand-mark" aria-hidden="true"><svg class="ct-logo-symbol" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path d="M32 4 57 23 32 60 7 23Z" fill="#786dbb"/><path d="M32 4 57 23 32 60Z" fill="#36a88a"/><path d="M32 4 43 23 32 48 21 23Z" fill="#10141c"/><path d="M7 23h50" fill="none" stroke="#080b10" stroke-width="2"/><path d="M21 23 32 60 43 23" fill="none" stroke="#080b10" stroke-opacity=".6" stroke-width="2"/></svg></span><span><strong>CleanTrack</strong><small>Operations</small></span>';

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

    const toolbar = document.createElement("header");
    toolbar.className = "ct-workspace-toolbar";
    toolbar.setAttribute("aria-label", "Workspace tools");

    const toolbarSpacer = document.createElement("span");
    toolbarSpacer.className = "ct-toolbar-leading-space";
    toolbarSpacer.setAttribute("aria-hidden", "true");

    const searchWrap = document.createElement("div");
    searchWrap.className = "ct-global-search";
    searchWrap.innerHTML = `
      <span class="ct-global-search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.2 4.2"></path></svg>
      </span>
      <input id="ct-global-search-input" type="search" placeholder="Search pages, tasks, people…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ct-global-search-results" aria-label="Search across CleanTrack">
      <kbd class="ct-global-search-shortcut" aria-hidden="true">Ctrl K</kbd>
      <div id="ct-global-search-results" class="ct-global-search-results" role="listbox" hidden></div>
    `;

    const actions = document.createElement("div");
    actions.className = "ct-toolbar-actions";

    const notificationsButton = document.createElement("button");
    notificationsButton.type = "button";
    notificationsButton.className = "ct-toolbar-icon-button";
    notificationsButton.setAttribute("aria-label", "Notifications");
    notificationsButton.title = "Notifications";
    notificationsButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>';

    const assistantButton = document.createElement("button");
    assistantButton.type = "button";
    assistantButton.className = "ct-toolbar-icon-button";
    assistantButton.setAttribute("aria-label", "Open AI assistant");
    assistantButton.title = "CleanTrack AI assistant";
    assistantButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 14.2 9.8 21.2 12l-7 2.2-2.2 7-2.2-7L2.8 12l7-2.2z"/><path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8z"/></svg>';

    const profileButton = document.createElement("button");
    profileButton.type = "button";
    profileButton.className = "ct-profile-trigger";
    profileButton.setAttribute("aria-label", "Open profile and account data");
    profileButton.title = "Profile and account";
    profileButton.innerHTML = '<span class="ct-profile-avatar" aria-hidden="true">U</span><span class="ct-profile-trigger-name">Account</span><svg class="ct-profile-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>';

    toolbar.append(toolbarSpacer, searchWrap, actions);
    actions.append(toggle, notificationsButton, assistantButton, profileButton);

    function getUser() {
      return window.CleanTrackAuth && window.CleanTrackAuth.getCurrentUser
        ? window.CleanTrackAuth.getCurrentUser()
        : null;
    }

    function userInitials(user) {
      const source = String(user && (user.name || user.email) || "U").trim();
      const parts = source.includes("@") ? [source.split("@")[0]] : source.split(/\\s+/);
      const initials = parts.slice(0, 2).map(part => part.charAt(0)).join("");
      return (initials || "U").toUpperCase();
    }

    function updateProfileTrigger() {
      const user = getUser();
      const avatar = profileButton.querySelector(".ct-profile-avatar");
      const name = profileButton.querySelector(".ct-profile-trigger-name");
      if (avatar) avatar.textContent = userInitials(user);
      if (name) name.textContent = user && (user.name || user.email) || "Account";
      profileButton.title = user ? (user.name || user.email || "Profile and account") : "Profile and account";
    }

    function closeSearch() {
      searchWrap.querySelector("#ct-global-search-results").hidden = true;
      searchWrap.querySelector("#ct-global-search-input").setAttribute("aria-expanded", "false");
    }

    function normalized(value) {
      return String(value || "").toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").trim();
    }

    const pageKeywords = {
      dashboard: "overview today organization-wide metrics compliance progress overdue summary",
      home: "home workspace landing welcome shortcuts",
      workspace: "my workspace supervisor desk daily work",
      "my-desk": "my desk employee assigned work tasks today",
      staff: "staff people employees personnel users workforce",
      personnel: "personnel team members employees people staffing",
      invitations: "invite join registration members access",
      teams: "teams group members workforce",
      locations: "locations sites buildings facilities places",
      sites: "sites locations buildings zones facilities",
      zones: "zones areas rooms sections locations",
      operations: "tasks task assignments work orders schedules checklist due dates execution",
      "my-tasks": "my tasks assigned work checklist due date",
      reviews: "reviews approvals verification evidence submissions logs",
      "my-history": "history previous completed tasks activity records",
      analytics: "analytics performance trends metrics charts insights",
      performance: "performance service levels quality rates scores",
      reports: "reports export csv summaries data",
      announcements: "announcements alerts notices notifications updates",
      "team-channel": "team channel messages collaboration discussion",
      skills: "skills eligibility training qualification",
      coverage: "delegation coverage shifts handover responsibilities",
      audit: "audit trail access changes accountability events",
      settings: "settings preferences organization account configuration",
      billing: "billing plan subscription invoice payment",
      profile: "profile account personal information email role organization"
    };

    function buildSearchResults(query) {
      const user = getUser();
      const menu = window.CleanTrackNavigation && window.CleanTrackNavigation.getMenu
        ? window.CleanTrackNavigation.getMenu(user && user.role)
        : [];
      const q = normalized(query);
      if (q.length < 2) return [];

      const terms = q.split(/\\s+/).filter(Boolean);
      const pages = menu.map(item => {
        const searchable = normalized(item.label + " " + item.id + " " + (pageKeywords[item.id] || ""));
        const matches = terms.every(term => searchable.includes(term)) ||
          searchable.includes(q);
        if (!matches) return null;
        const exact = normalized(item.label).startsWith(q) ? 20 : normalized(item.label).includes(q) ? 12 : 0;
        return { kind: "page", id: item.id, label: item.label, detail: "Open page", icon: item.icon || "•", score: exact + terms.filter(term => searchable.includes(term)).length };
      }).filter(Boolean);

      const visibleMatches = [];
      const pageContent = document.getElementById("page-content");
      if (pageContent) {
        const candidates = Array.from(pageContent.querySelectorAll("h1,h2,h3,h4,p,label,button,a,th,td,[data-searchable]"))
          .filter(el => !el.closest("[hidden]") && el.offsetParent !== null && el.textContent.trim());
        candidates.forEach(el => {
          const text = el.textContent.trim().replace(/\\s+/g, " ");
          const searchable = normalized(text + " " + (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("title") || ""));
          if (!searchable.includes(q) && !terms.every(term => searchable.includes(term))) return;
          if (visibleMatches.some(match => match.element === el || match.element.contains(el) || el.contains(match.element))) return;
          visibleMatches.push({ kind: "content", id: "", label: text.slice(0, 90), detail: "Match on this page", element: el, icon: "↳", score: normalized(text).startsWith(q) ? 14 : 4 });
        });
      }

      return pages.concat(visibleMatches).sort((a,b) => b.score-a.score).slice(0, 8);
    }

    function navigateToResult(result) {
      closeSearch();
      const input = searchWrap.querySelector("#ct-global-search-input");
      input.blur();
      if (result.kind === "page") {
        window.CleanTrackNavigation.setActivePage(result.id);
      } else if (result.element && result.element.isConnected) {
        result.element.scrollIntoView({ behavior: "smooth", block: "center" });
        result.element.classList.add("ct-search-highlight");
        window.setTimeout(() => result.element && result.element.classList.remove("ct-search-highlight"), 1800);
      }
    }

    function renderSearchResults() {
      const input = searchWrap.querySelector("#ct-global-search-input");
      const results = searchWrap.querySelector("#ct-global-search-results");
      const query = input.value.trim();
      results.replaceChildren();
      if (normalized(query).length < 2) {
        results.hidden = true;
        input.setAttribute("aria-expanded", "false");
        return;
      }

      const matches = buildSearchResults(query);
      const heading = document.createElement("div");
      heading.className = "ct-search-results-heading";
      heading.textContent = "SEARCH RESULTS";
      results.appendChild(heading);

      if (!matches.length) {
        const empty = document.createElement("div");
        empty.className = "ct-search-empty";
        empty.textContent = "No matching pages or visible content. Try another keyword.";
        results.appendChild(empty);
      } else {
        matches.forEach((result, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "ct-search-result";
          button.setAttribute("role", "option");
          button.setAttribute("aria-selected", "false");
          button.dataset.resultIndex = String(index);
          const icon = document.createElement("span");
          icon.className = "ct-search-result-icon";
          icon.textContent = result.icon;
          const copy = document.createElement("span");
          copy.className = "ct-search-result-copy";
          const label = document.createElement("strong");
          label.textContent = result.label;
          const detail = document.createElement("small");
          detail.textContent = result.detail;
          copy.append(label, detail);
          const enter = document.createElement("span");
          enter.className = "ct-search-result-enter";
          enter.textContent = "↵";
          button.append(icon, copy, enter);
          button.addEventListener("click", () => navigateToResult(result));
          results.appendChild(button);
        });
      }
      results.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    const searchInput = searchWrap.querySelector("#ct-global-search-input");
    searchInput.addEventListener("input", renderSearchResults);
    searchInput.addEventListener("focus", renderSearchResults);
    searchInput.addEventListener("keydown", function (event) {
      const results = searchWrap.querySelector("#ct-global-search-results");
      const items = Array.from(results.querySelectorAll(".ct-search-result"));
      const active = items.findIndex(item => item.getAttribute("aria-selected") === "true");
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!items.length) return;
        event.preventDefault();
        const next = event.key === "ArrowDown"
          ? (active + 1) % items.length
          : (active <= 0 ? items.length - 1 : active - 1);
        items.forEach((item, index) => {
          item.setAttribute("aria-selected", String(index === next));
        });
        items[next].scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = items.find(item => item.getAttribute("aria-selected") === "true") || items[0];
        if (selected) selected.click();
      } else if (event.key === "Escape") {
        closeSearch();
      }
    });
    document.addEventListener("click", function (event) {
      if (!searchWrap.contains(event.target)) closeSearch();
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    function openWorkspaceDialog(title, buildContent) {
      const dialog = document.getElementById("app-modal");
      const titleElement = document.getElementById("modal-title");
      const content = document.getElementById("modal-content");
      if (!dialog || !titleElement || !content) return;
      titleElement.textContent = title;
      content.replaceChildren();
      buildContent(content);
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    }

    function appendText(parent, tag, value, className) {
      const el = document.createElement(tag);
      if (className) el.className = className;
      el.textContent = value;
      parent.appendChild(el);
      return el;
    }

    function addDialogButton(parent, label, handler, className) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className || "ct-help-secondary-button";
      button.textContent = label;
      button.addEventListener("click", handler);
      parent.appendChild(button);
      return button;
    }

    function appendDialogActions(parent, buttons) {
      const row = document.createElement("div");
      row.className = "ct-help-dialog-actions";
      buttons.forEach(button => addDialogButton(row, button.label, button.action, button.className));
      parent.appendChild(row);
    }

    function openNotifications() {
      const user = getUser();
      openWorkspaceDialog("Notifications", content => {
        const wrap = appendText(content, "div", "", "ct-help-dialog");
        appendText(wrap, "p", "You’re all caught up.", "ct-help-lead");
        appendText(wrap, "p", "New announcements and updates for your role will appear here when the notification service is connected.", "ct-help-note");
        const menu = window.CleanTrackNavigation.getMenu(user && user.role);
        const announcements = menu.find(item => item.id === "announcements");
        if (announcements) {
          appendDialogActions(wrap, [{ label: "Open announcements and alerts", action: () => { document.getElementById("app-modal").close(); window.CleanTrackNavigation.setActivePage("announcements"); } }]);
        }
      });
    }

    function openAssistant() {
      openWorkspaceDialog("CleanTrack Assistant", content => {
        const wrap = appendText(content, "div", "", "ct-help-dialog");
        appendText(wrap, "p", "What would you like help finding?", "ct-help-lead");
        appendText(wrap, "p", "Search your available CleanTrack sections, or ask a quick question about where to start.", "ct-help-note");
        const form = document.createElement("form");
        form.className = "ct-assistant-form";
        const input = document.createElement("input");
        input.type = "text";
        input.name = "question";
        input.placeholder = "Try “find overdue tasks” or “manage staff”…";
        input.setAttribute("aria-label", "Ask CleanTrack Assistant");
        const output = appendText(wrap, "div", "Suggested pages will appear here.", "ct-assistant-output");
        const go = document.createElement("button");
        go.type = "submit";
        go.className = "ct-help-action-button";
        go.textContent = "Find guidance";
        form.append(input, go);
        form.addEventListener("submit", event => {
          event.preventDefault();
          const q = input.value.trim();
          if (!q) {
            output.textContent = "Enter a question or keyword to get started.";
            return;
          }
          const matches = buildSearchResults(q).filter(item => item.kind === "page").slice(0, 4);
          output.replaceChildren();
          if (!matches.length) {
            appendText(output, "p", "I couldn't match that to a page available to your role. Try words like tasks, staff, locations, reports, reviews, or settings.");
            return;
          }
          appendText(output, "p", "Here are the most relevant sections:", "ct-help-lead");
          const list = document.createElement("div");
          list.className = "ct-assistant-matches";
          matches.forEach(result => addDialogButton(list, result.label, () => {
            document.getElementById("app-modal").close();
            window.CleanTrackNavigation.setActivePage(result.id);
          }, "ct-help-secondary-button"));
          output.appendChild(list);
        });
        wrap.appendChild(form);
      });
    }

    function openProfile() {
      const user = getUser();
      const menu = window.CleanTrackNavigation.getMenu(user && user.role);
      openWorkspaceDialog("Profile and account", content => {
        const wrap = appendText(content, "div", "", "ct-help-dialog ct-profile-dialog");
        const top = document.createElement("div");
        top.className = "ct-profile-summary";
        appendText(top, "div", userInitials(user), "ct-profile-avatar ct-profile-avatar-large");
        const info = document.createElement("div");
        appendText(info, "h3", user && (user.name || "CleanTrack user"), "ct-profile-name");
        appendText(info, "p", user && user.email || "Email not available", "ct-profile-email");
        top.appendChild(info);
        wrap.appendChild(top);
        const data = document.createElement("dl");
        data.className = "ct-profile-data";
        const fields = [
          ["Role", user && user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Not available"],
          ["Organization", user && user.organization_name || "Not available"],
          ["Account ID", user && user.id != null ? String(user.id) : "Not available"],
          ["Email verified", user && user.emailVerified ? "Yes" : "Not confirmed"]
        ];
        fields.forEach(([label, value]) => {
          appendText(data, "dt", label);
          appendText(data, "dd", value);
        });
        wrap.appendChild(data);
        const actionsRow = document.createElement("div");
        actionsRow.className = "ct-help-dialog-actions";
        const profilePage = menu.find(item => item.id === "profile");
        const settingsPage = menu.find(item => item.id === "settings");
        if (profilePage) appendDialogActions(actionsRow, [{ label: "Open My Profile", action: () => { document.getElementById("app-modal").close(); window.CleanTrackNavigation.setActivePage("profile"); } }]);
        if (settingsPage) appendDialogActions(actionsRow, [{ label: "Open Settings", action: () => { document.getElementById("app-modal").close(); window.CleanTrackNavigation.setActivePage("settings"); } }]);
        appendDialogActions(actionsRow, [{ label: "Close", action: () => document.getElementById("app-modal").close() }]);
        wrap.appendChild(actionsRow);
      });
    }

    notificationsButton.addEventListener("click", openNotifications);
    assistantButton.addEventListener("click", openAssistant);
    profileButton.addEventListener("click", openProfile);
    window.addEventListener("cleantrack:login", updateProfileTrigger);
    window.addEventListener("cleantrack:session-restored", updateProfileTrigger);
    window.addEventListener("cleantrack:logout", updateProfileTrigger);
    updateProfileTrigger();


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
