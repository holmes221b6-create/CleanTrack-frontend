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

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "ct-workspace-back";
    backButton.setAttribute("aria-label", "Go back one page");
    backButton.title = "Back to previous page (Escape)";
    backButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg><span>Back</span>';
    backButton.disabled = true;
    backButton.addEventListener("click", function () {
      const navApi = window.CleanTrackNavigation;
      if (navApi && navApi.goBack) navApi.goBack();
      updateBackButton();
    });

    function updateBackButton() {
      const navApi = window.CleanTrackNavigation;
      backButton.disabled = !(navApi && navApi.canGoBack && navApi.canGoBack());
    }
    window.addEventListener("cleantrack:navigate", updateBackButton);
    window.addEventListener("cleantrack:session-restored", updateBackButton);
    window.addEventListener("cleantrack:logout", updateBackButton);

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
    profileButton.innerHTML = '<span class="ct-profile-avatar" aria-hidden="true">U</span>';

    toolbar.append(backButton, toolbarSpacer, searchWrap, actions);
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

    function readAccountAvatar(id) { try { return localStorage.getItem("cleantrack.avatar." + id) || ""; } catch (_) { return ""; } }
    function updateProfileTrigger() {
      const user = getUser();
      const avatar = profileButton.querySelector(".ct-profile-avatar");
      const name = profileButton.querySelector(".ct-profile-trigger-name");
      const savedAvatar = user && user.id != null ? readAccountAvatar(user.id) : "";
      if (avatar) {
        avatar.textContent = savedAvatar ? "" : userInitials(user);
        avatar.style.backgroundImage = savedAvatar ? "url('" + savedAvatar + "')" : "";
        avatar.style.backgroundSize = savedAvatar ? "cover" : "";
        avatar.style.backgroundPosition = savedAvatar ? "center" : "";
        avatar.style.color = savedAvatar ? "transparent" : "";
      }
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
      settings: "settings preferences personal account profile",
      "org-settings": "organization settings company profile organization code membership policies archive audit trail permissions",
      billing: "billing plan subscription invoice payment",
      profile: "profile account personal information email role organization"
    };

    function buildSearchResults(query) {
      const user = getUser();
      const menu = window.CleanTrackNavigation && window.CleanTrackNavigation.getMenu
        ? window.CleanTrackNavigation.getMenu(user && user.role)
        : [];
      const q = normalized(query);
      if (!q) return [];

      const terms = q.split(/\\s+/).filter(Boolean);
      function scoreLabel(label, searchable) {
        const labelNorm = normalized(label);
        const words = labelNorm.split(/\\s+/);
        if (labelNorm.startsWith(q)) return 500;
        if (words.some(word => word.startsWith(q))) return 400;
        if (labelNorm.includes(q)) return 300;
        if (terms.length > 1 && terms.every(term => labelNorm.includes(term))) return 280;
        if (searchable.startsWith(q)) return 200;
        if (terms.every(term => searchable.includes(term))) return 100 + terms.filter(term => searchable.includes(term)).length;
        return -1;
      }

      const pages = menu.map(item => {
        const searchable = normalized(item.label + " " + item.id + " " + (pageKeywords[item.id] || ""));
        const score = scoreLabel(item.label, searchable);
        if (score < 0) return null;
        return { kind: "page", id: item.id, label: item.label, detail: "Open page", icon: item.icon || "•", score };
      }).filter(Boolean);

      const visibleMatches = [];
      const pageContent = document.getElementById("page-content");
      if (pageContent) {
        const candidates = Array.from(pageContent.querySelectorAll("h1,h2,h3,h4,p,label,button,a,th,td,[data-searchable]"))
          .filter(el => !el.closest("[hidden]") && el.offsetParent !== null && el.textContent.trim());
        candidates.forEach(el => {
          const text = el.textContent.trim().replace(/\\s+/g, " ");
          const searchable = normalized(text + " " + (el.getAttribute("aria-label") || "") + " " + (el.getAttribute("title") || ""));
          const score = scoreLabel(text, searchable);
          if (score < 0) return;
          if (visibleMatches.some(match => match.element === el || match.element.contains(el) || el.contains(match.element))) return;
          visibleMatches.push({ kind: "content", id: "", label: text.slice(0, 90), detail: "Match on this page", element: el, icon: "↳", score: score - 5 });
        });
      }

      return pages.concat(visibleMatches)
        .sort((a,b) => b.score-a.score || a.label.localeCompare(b.label))
        .slice(0, 10);
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
      if (normalized(query).length < 1) {
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
      if (event.key === "Escape" && !event.defaultPrevented) {
        const dialog = document.getElementById("app-modal");
        const active = document.activeElement;
        const isEditing = active && (
          active.matches("input, textarea, select, [contenteditable='true']") ||
          active.isContentEditable
        );
        const results = searchWrap.querySelector("#ct-global-search-results");
        const searchIsOpen = results && !results.hidden;
        if (searchIsOpen) {
          closeSearch();
          return;
        }
        if (isEditing || (dialog && (dialog.open || dialog.hasAttribute("open")))) return;
        const navApi = window.CleanTrackNavigation;
        if (navApi && navApi.canGoBack && navApi.canGoBack()) {
          event.preventDefault();
          navApi.goBack();
          updateBackButton();
        }
      }
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
      openWorkspaceDialog("Organization activity", content => {
        const wrap = appendText(content, "div", "", "ct-notification-feed");
        appendText(wrap, "p", "Recent organization activity", "ct-help-lead");
        appendText(wrap, "p", "Activities from the last 7 days only. Announcements and targeted alerts are managed separately.", "ct-help-note");
        const status = appendText(wrap, "p", "Loading recent activity…", "ct-notification-status");
        const list = document.createElement("div");
        list.className = "ct-notification-list";
        wrap.appendChild(list);
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const params = new URLSearchParams({
          from: cutoff.getFullYear()+"-"+String(cutoff.getMonth()+1).padStart(2,"0")+"-"+String(cutoff.getDate()).padStart(2,"0"),
          to: now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0"),
          limit: "100",
          offset: "0"
        });
        const api = window.CleanTrackApi;
        if (!api || typeof api.get !== "function") {
          status.textContent = "The activity service is unavailable. No sample notifications are shown.";
          return;
        }
        api.get("audit-trail?" + params.toString()).then(result => {
          const entries = Array.isArray(result && result.entries) ? result.entries : Array.isArray(result && result.records) ? result.records : [];
          const recent = entries.filter(entry => {
            const raw = entry.created_at || entry.timestamp || entry.occurred_at;
            const date = raw ? new Date(raw) : null;
            return date && !Number.isNaN(date.getTime()) && date >= cutoff && date <= now;
          }).sort((a,b) => new Date(b.created_at || b.timestamp || b.occurred_at) - new Date(a.created_at || a.timestamp || a.occurred_at));
          list.replaceChildren();
          if (!recent.length) {
            status.textContent = "No activity records were returned for the last 7 days.";
            return;
          }
          status.textContent = "Showing " + recent.length + " activity records from the last 7 days.";
          recent.forEach(entry => {
            const item = document.createElement("article");
            item.className = "ct-notification-item";
            const top = document.createElement("div");
            top.className = "ct-notification-item-top";
            const title = document.createElement("strong");
            title.textContent = String(entry.action_label || entry.action || entry.event_type || entry.event || "Organization activity").replace(/[._-]+/g," ").replace(/\b\w/g,letter=>letter.toUpperCase());
            const time = document.createElement("time");
            const dateValue = entry.created_at || entry.timestamp || entry.occurred_at;
            time.dateTime = dateValue;
            time.textContent = new Date(dateValue).toLocaleString();
            top.append(title,time);
            item.appendChild(top);
            const detail = document.createElement("p");
            const actor = entry.actor_name || entry.user_name || entry.actor || "An organization member";
            const record = entry.record_name || entry.target_name || entry.resource_name || entry.entity_name || "";
            const action = String(entry.action_label || entry.action || entry.event_type || entry.event || "performed an activity").replace(/[._-]+/g," ");
            detail.textContent = actor + " — " + action + (record ? ": " + record : "");
            item.appendChild(detail);
            if (entry.outcome) {
              const outcome = document.createElement("span");
              outcome.className = "ct-notification-outcome";
              outcome.textContent = String(entry.outcome).replace(/[._-]+/g," ");
              item.appendChild(outcome);
            }
            list.appendChild(item);
          });
        }).catch(error => {
          status.textContent = "Could not load organization activity. " + String(error && error.message || "Please try again later.");
        });
      });
    }

    function openAssistant() {
      const user = getUser();
      const menu = window.CleanTrackNavigation && window.CleanTrackNavigation.getMenu
        ? window.CleanTrackNavigation.getMenu(user && user.role)
        : [];
      const pageAliases = [
        { keys: ["dashboard", "overview", "home", "today", "summary"], page: "dashboard" },
        { keys: ["task", "tasks", "operation", "operations", "work order", "assignment", "checklist", "overdue"], page: "operations" },
        { keys: ["my work", "my desk", "my task", "assigned to me"], page: "my-desk" },
        { keys: ["staff", "employee", "employees", "people", "member", "personnel"], page: "staff" },
        { keys: ["team", "teams", "group"], page: "teams" },
        { keys: ["location", "locations", "site", "sites", "building", "facility"], page: "locations" },
        { keys: ["zone", "zones", "room", "area", "floor"], page: "zones" },
        { keys: ["review", "reviews", "approve", "approval", "reject", "evidence"], page: "reviews" },
        { keys: ["log", "logs", "audit", "history", "activity"], page: "audit" },
        { keys: ["report", "reports", "export", "csv", "pdf"], page: "reports" },
        { keys: ["analytics", "performance", "ranking", "trend", "metrics"], page: "analytics" },
        { keys: ["announcement", "announcements", "alert", "alerts", "notice"], page: "announcements" },
        { keys: ["message", "messages", "channel", "chat"], page: "team-channel" },
        { keys: ["setting", "settings", "preference"], page: "settings" },
        { keys: ["profile", "account", "avatar", "password", "email"], page: "profile" },
        { keys: ["invite", "invitation", "join request"], page: "invitations" },
        { keys: ["skill", "skills", "training", "qualification"], page: "skills" },
        { keys: ["coverage", "delegation", "handover", "shift"], page: "coverage" }
      ];

      function findPage(id) {
        return menu.find(item => item.id === id);
      }
      function matchPages(question) {
        const q = normalized(question);
        const matchedIds = [];
        pageAliases.forEach(entry => {
          if (entry.keys.some(key => q.includes(normalized(key))) && findPage(entry.page) && !matchedIds.includes(entry.page)) {
            matchedIds.push(entry.page);
          }
        });
        if (!matchedIds.length) {
          buildSearchResults(question).filter(item => item.kind === "page").slice(0, 3).forEach(item => {
            if (!matchedIds.includes(item.id)) matchedIds.push(item.id);
          });
        }
        return matchedIds.slice(0, 4).map(findPage).filter(Boolean);
      }

      function answerQuestion(question) {
        const q = normalized(question);
        const has = (...terms) => terms.some(term => q.includes(normalized(term)));
        if (/^(hi|hello|hey|good morning|good afternoon)\b/.test(q)) {
          return { text: "Hi! I can help you use CleanTrack, understand its workflows, and find the right workspace pages. What are you trying to do?", pages: [] };
        }
        if (has("what can you do", "help me", "help", "capabilities")) {
          return { text: "I can explain CleanTrack workflows, help you find tasks and operations, guide you through locations and zones, explain reviews and logs, and point you to reports, staff, teams, and settings. I only answer about CleanTrack and won't invent live figures or claim an action was completed.", pages: [] };
        }
        if (has("location", "locations", "site", "building", "facility", "zone", "zones", "floor plan", "map")) {
          return { text: "Locations represent the real-world sites or buildings your organisation works in. Zones are operational areas inside a location, such as a floor, lobby, room, or department. Start with Locations to add or review a site; then use Zones to manage the areas linked to that site. Zones should be based on the location's actual information, not randomly generated.", pages: matchPages(question) };
        }
        if (has("live data", "how many", "count", "status right now", "current number", "show me data")) {
          return { text: "I won't guess live counts or statuses. This version of the assistant doesn't yet query operational records for conversational answers. Open the relevant CleanTrack page to see its current data; live, permission-checked data answers can be added through the backend without introducing a paid AI API.", pages: matchPages(question) };
        }
        if (has("create operation", "create task", "assign task", "assign work", "schedule", "overdue", "task", "tasks", "operation", "operations", "checklist", "work order")) {
          return { text: "For operational work, open Operations to review or manage work items and assignments. Check the task's status, assignee, due date, and required checklist or evidence. A planned operation is not the same as a completion log: the work should be marked complete through the available work flow before it is treated as finished.", pages: matchPages(question) };
        }
        if (has("approve", "approval", "reject", "review", "reviews", "before photo", "after photo", "evidence")) {
          return { text: "Use Reviews to inspect submitted work and its evidence. Check the operation, completion details, and any before/after photos available. Approve only when the submission meets your organisation's requirements; reject it when it needs correction and provide a clear reason if the page supports one.", pages: matchPages(question) };
        }
        if (has("log", "logs", "audit", "history", "who changed", "activity")) {
          return { text: "Logs and audit history are for what actually happened: actions, status changes, and completed or reviewed work. Operations describe intended work; logs record events and outcomes. Open the relevant logs/history page to inspect the records your role is allowed to see.", pages: matchPages(question) };
        }
        if (has("report", "reports", "export", "download", "csv", "pdf", "excel", "xlsx")) {
          return { text: "Open Reports to prepare an export. A useful flow is select the data, apply filters, preview the result, generate it, then download or share it if those options are available. Use Analytics for comparisons and performance trends rather than as a replacement for a report export.", pages: matchPages(question) };
        }
        if (has("staff", "employee", "employees", "people", "member", "personnel", "team", "teams", "invite")) {
          return { text: "Use Staff or Personnel to manage people and Teams to organise members into working groups. Invitations and join requests may need Admin approval. The options shown depend on your CleanTrack role, so I will only suggest pages available in your current navigation.", pages: matchPages(question) };
        }
        if (has("announcement", "announcements", "alert", "alerts", "notification", "notifications")) {
          return { text: "Announcements and Alerts is the place to review or manage organisation notices. Before publishing, confirm the audience and message so the right people receive the update.", pages: matchPages(question) };
        }
        if (has("setting", "settings", "profile", "account", "avatar", "appearance", "theme")) {
          return { text: "Use Profile for account details and Settings for preferences that are available to your role. Organisation-wide settings may be restricted to Admins. If a setting is not visible, I won't assume your account has permission to change it.", pages: matchPages(question) };
        }
        const pages = matchPages(question);
        if (pages.length) {
          return { text: "I can help with that within CleanTrack. These are the closest pages available to your role. If you tell me the outcome you want—for example, create a task, review completed work, or export a report—I can give more specific guidance.", pages };
        }
        return { text: "I don't have a reliable CleanTrack-specific answer for that yet, and I won't make one up. Try asking how to manage operations, locations and zones, reviews, logs, reports, staff, teams, announcements, or settings.", pages: [] };
      }

      openWorkspaceDialog("CleanTrack Assistant", content => {
        const wrap = appendText(content, "div", "", "ct-help-dialog ct-assistant-chat");
        appendText(wrap, "p", "Your CleanTrack workspace helper", "ct-help-lead");
        appendText(wrap, "p", "Free built-in guidance. No paid AI API and no external web search.", "ct-help-note");

        const transcript = document.createElement("div");
        transcript.className = "ct-assistant-transcript";
        transcript.setAttribute("role", "log");
        transcript.setAttribute("aria-live", "polite");
        transcript.style.cssText = "display:flex;flex-direction:column;gap:10px;max-height:300px;overflow:auto;padding:12px;margin:10px 0;border:1px solid var(--border-color,rgba(255,255,255,.12));border-radius:12px;background:var(--surface-secondary,rgba(0,0,0,.12));";
        wrap.appendChild(transcript);

        const historyKey = "cleantrack_assistant_history_v1";
        let history = [];
        try { const saved = JSON.parse(window.localStorage.getItem(historyKey) || "[]"); if (Array.isArray(saved)) history = saved.filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.text === "string").slice(-80); } catch (_) { history = []; }
        function saveHistory() { try { window.localStorage.setItem(historyKey, JSON.stringify(history.slice(-80))); } catch (_) {} }
        function addMessage(role, text, persist = true) {
          const bubble = document.createElement("div");
          bubble.className = "ct-assistant-message ct-assistant-message-" + role;
          bubble.style.cssText = "align-self:" + (role === "user" ? "flex-end" : "flex-start") + ";max-width:92%;padding:10px 12px;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;" +
            (role === "user"
              ? "background:var(--accent-color,#6d63a8);color:#fff;"
              : "background:var(--surface-color,rgba(255,255,255,.06));border:1px solid var(--border-color,rgba(255,255,255,.10));");
          bubble.textContent = text;
          transcript.appendChild(bubble);
          transcript.scrollTop = transcript.scrollHeight;
          return bubble;
        }

        function addPageLinks(parent, pages) {
          if (!pages.length) return;
          const group = document.createElement("div");
          group.className = "ct-assistant-matches";
          group.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 8px;";
          pages.forEach(page => addDialogButton(group, "Open " + page.label, () => {
            const modal = document.getElementById("app-modal");
            if (modal && modal.open) modal.close();
            if (window.CleanTrackNavigation && window.CleanTrackNavigation.setActivePage) {
              window.CleanTrackNavigation.setActivePage(page.id);
            }
          }, "ct-help-secondary-button"));
          parent.appendChild(group);
        }

        const initial = document.createElement("div");
        initial.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:8px;";
        transcript.appendChild(initial);
        addMessage("assistant", "Hello! I'm CleanTrack Assistant. I can guide you through your workspace and explain how CleanTrack features fit together. Ask me about operations, locations and zones, reviews, logs, reports, staff, or settings.");
        const starterRow = document.createElement("div");
        starterRow.style.cssText = "display:flex;flex-wrap:wrap;gap:7px;margin:0 0 10px;";
        [
          "How do I manage operations?",
          "How are locations and zones linked?",
          "How do reviews and logs differ?",
          "How do I generate a report?"
        ].forEach(prompt => addDialogButton(starterRow, prompt, () => submitQuestion(prompt), "ct-help-secondary-button"));
        wrap.appendChild(starterRow);

        const form = document.createElement("form");
        form.className = "ct-assistant-form";
        form.style.cssText = "display:flex;gap:8px;align-items:stretch;";
        const input = document.createElement("input");
        input.type = "text";
        input.name = "question";
        input.autocomplete = "off";
        input.placeholder = "Ask about CleanTrack…";
        input.setAttribute("aria-label", "Ask CleanTrack Assistant");
        input.style.flex = "1";
        const go = document.createElement("button");
        go.type = "submit";
        go.className = "ct-help-action-button";
        go.textContent = "Send";
        form.append(input, go);
        form.addEventListener("submit", event => {
          event.preventDefault();
          submitQuestion(input.value);
        });
        wrap.appendChild(form);

        function submitQuestion(rawQuestion) {
          const question = String(rawQuestion || "").trim();
          if (!question) {
            input.focus();
            return;
          }
          addMessage("user", question);
          input.value = "";
          const answer = answerQuestion(question);
          addMessage("assistant", answer.text);
          if (answer.pages.length) {
            const linkRow = document.createElement("div");
            linkRow.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-left:4px;";
            addPageLinks(linkRow, answer.pages);
            transcript.appendChild(linkRow);
            transcript.scrollTop = transcript.scrollHeight;
          }
          input.focus();
        }
        input.focus();
      });
    }

    function openProfile() {
      const user = getUser();
      const menu = window.CleanTrackNavigation.getMenu(user && user.role);
      const modal = document.getElementById("app-modal");
      openWorkspaceDialog("Account", content => {
        const wrap = appendText(content, "div", "", "ct-help-dialog ct-profile-dialog ct-profile-dialog-v2");
        const summary = document.createElement("section");
        summary.className = "ct-profile-hero";
        const savedAvatar = user && user.id != null ? readAccountAvatar(user.id) : "";
        const avatar = appendText(summary, "div", savedAvatar ? "" : userInitials(user), "ct-profile-avatar ct-profile-avatar-large ct-profile-hero-avatar");
        if (savedAvatar) { avatar.style.backgroundImage = "url('" + savedAvatar + "')"; avatar.style.backgroundSize = "cover"; avatar.style.backgroundPosition = "center"; avatar.style.color = "transparent"; }
        avatar.setAttribute("role", "button");
        avatar.setAttribute("tabindex", "0");
        avatar.setAttribute("aria-label", "Change profile picture");
        avatar.title = "Change profile picture";
        avatar.setAttribute("aria-description", "Click the round avatar to choose a profile picture.");
        const identity = document.createElement("div");
        identity.className = "ct-profile-identity";
        appendText(identity, "p", "ACCOUNT", "ct-profile-eyebrow");
        appendText(identity, "h3", user && (user.name || "CleanTrack user") || "CleanTrack user", "ct-profile-name");
        appendText(identity, "p", user && user.email || "Email not available", "ct-profile-email");
        const roleLabel = user && user.role ? String(user.role).replace(/[_-]+/g," ").replace(/\b\w/g,letter=>letter.toUpperCase()) : "Member";
        appendText(identity, "span", roleLabel, "ct-profile-role-pill");
        summary.appendChild(identity);
        wrap.appendChild(summary);
        const avatarControls = document.createElement("div");
        avatarControls.className = "ct-profile-avatar-controls";
        const avatarInput = document.createElement("input");
        avatarInput.type = "file";
        avatarInput.accept = "image/png,image/jpeg,image/webp,image/gif";
        avatarInput.className = "ct-profile-avatar-file";
        avatarInput.id = "ct-account-avatar-file";
        const avatarLabel = document.createElement("label");
        avatarLabel.htmlFor = avatarInput.id;
        avatarLabel.className = "ct-profile-avatar-select";
        avatarLabel.textContent = "Choose profile picture";
        const avatarHint = appendText(avatarControls, "p", "", "ct-profile-avatar-hint");
        avatarInput.setAttribute("aria-label", "Choose profile picture");
        avatarInput.tabIndex = -1;
        avatarInput.style.display = "none";
        avatarLabel.style.display = "none";
        const openAvatarPicker = () => avatarInput.click();
        avatarControls.append(avatarLabel, avatarInput);
        avatar.addEventListener("click", openAvatarPicker);
        avatar.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openAvatarPicker(); } });
        avatarInput.addEventListener("change", () => {
          const file = avatarInput.files && avatarInput.files[0];
          if (!file || !user || user.id == null) return;
          if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type || "")) { avatarHint.textContent = "Choose a PNG, JPG, WEBP, or GIF image."; return; }
          if (file.size > 2 * 1024 * 1024) { avatarHint.textContent = "Choose an image smaller than 2 MB."; return; }
          const reader = new FileReader();
          reader.onload = () => {
            const data = String(reader.result || "");
            try { localStorage.setItem("cleantrack.avatar." + user.id, data); }
            catch (_) { avatarHint.textContent = "Unable to save the image in this browser. Try a smaller picture."; return; }
            avatar.textContent = "";
            avatar.style.backgroundImage = "url('" + data + "')";
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.style.color = "transparent";
            updateProfileTrigger();
            window.dispatchEvent(new CustomEvent("cleantrack:avatar-updated", { detail: { userId: user.id } }));
            avatarHint.textContent = "Profile picture updated.";
          };
          reader.onerror = () => { avatarHint.textContent = "Unable to read this image."; };
          reader.readAsDataURL(file);
        });
        wrap.appendChild(avatarControls);

        const section = document.createElement("section");
        section.className = "ct-profile-section";
        const sectionHeading = document.createElement("div");
        sectionHeading.className = "ct-profile-section-heading";
        appendText(sectionHeading, "h4", "Account details");
        appendText(sectionHeading, "p", "");
        section.appendChild(sectionHeading);
        const data = document.createElement("dl");
        data.className = "ct-profile-data ct-profile-data-v2";
        const organization = user && (user.organization_name || user.organisation_name || user.organization || user.org_name);
        const phone = user && (user.phone || user.phone_number || user.mobile);
        const createdAt = user && (user.created_at || user.createdAt || user.joined_at || user.member_since);
        const accountStatus = user && (user.account_status || user.status || user.membership_status);
        const emailVerified = user && (user.emailVerified === true || user.email_verified === true || user.is_email_verified === true);
        const fields = [
          ["Account ID", user && user.id != null ? String(user.id) : "Not available"],
          ["Email address", user && user.email || "Not provided"],
          ["Organization", organization && typeof organization === "string" ? organization : organization && (organization.name || organization.organization_name) || "Not assigned"],
          ["Account role", roleLabel],
          ["Account status", accountStatus ? String(accountStatus).replace(/[_-]+/g," ").replace(/\b\w/g,letter=>letter.toUpperCase()) : "Active session"],
          ["Email verification", emailVerified ? "Verified" : "Not confirmed"],
          ["Phone", phone || "Not provided"],
          ["Member since", createdAt && !Number.isNaN(new Date(createdAt).getTime()) ? new Date(createdAt).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "Not available"]
        ];
        fields.forEach(([label,value]) => {
          const item = document.createElement("div");
          item.className = "ct-profile-data-item";
          appendText(item,"dt",label);
          appendText(item,"dd",String(value));
          data.appendChild(item);
        });
        section.appendChild(data);
        wrap.appendChild(section);


        const actionsRow = document.createElement("div");
        actionsRow.className = "ct-help-dialog-actions ct-profile-actions ct-profile-actions-v2";
        const profilePage = menu.find(item => item.id === "profile");
        const settingsPage = menu.find(item => item.id === "settings");
        if (profilePage) {
          addDialogButton(actionsRow, "View profile", () => {
            if (modal && modal.open) modal.close();
            window.CleanTrackNavigation.setActivePage("profile");
          }, "ct-profile-settings-button");
        }
        if (settingsPage) {
          addDialogButton(actionsRow, "Settings", () => {
            if (modal && modal.open) modal.close();
            window.CleanTrackNavigation.setActivePage("settings");
          }, "ct-profile-settings-button");
        }
        addDialogButton(actionsRow, "Log out", async () => {
          const logoutButton = modal && modal.querySelector(".ct-profile-logout-button");
          if (logoutButton) {
            logoutButton.disabled = true;
            logoutButton.textContent = "Signing out…";
          }
          try {
            if (modal && modal.open) modal.close();
            if (window.CleanTrackAuth && typeof window.CleanTrackAuth.logout === "function") {
              await window.CleanTrackAuth.logout();
            }
          } catch (error) {
            console.error("CleanTrack logout request failed; clearing the local session anyway.", error);
          } finally {
            window.location.reload();
          }
        }, "ct-profile-logout-button");
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
