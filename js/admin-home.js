(function () {
  "use strict";

  const API = window.CleanTrackApi;
  let currentOrganization = null;
  let members = [];
  let rootElement = null;
  let memberQuery = "";
  let memberLoadError = "";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, onClick, type) {
    const node = el("button", className || "ct-home-button", label);
    node.type = type || "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function normalized(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function initials(name) {
    const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "U").slice(0, 2)).toUpperCase();
  }

  function go(page) {
    if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage(page);
  }

  function showNotice(root, message, kind) {
    let notice = root.querySelector("[data-ct-home-notice]");
    if (!notice) {
      notice = el("div", "ct-home-notice");
      notice.dataset.ctHomeNotice = "true";
      root.prepend(notice);
    }
    notice.className = "ct-home-notice ct-home-notice--" + (kind || "info");
    notice.textContent = message;
    notice.hidden = !message;
  }

  function openMemberDetails(member) {
    const dialog = document.getElementById("app-modal");
    const title = document.getElementById("modal-title");
    const content = document.getElementById("modal-content");
    if (!dialog || !title || !content) return;

    title.textContent = "Organization member";
    content.replaceChildren();
    const wrap = el("div", "ct-home-member-detail");
    const top = el("div", "ct-home-member-detail-top");
    top.append(el("div", "ct-home-member-avatar ct-home-member-avatar-large", initials(member.name)));
    const info = el("div");
    info.append(el("h3", "", member.name || "Unnamed member"));
    info.append(el("p", "ct-home-member-email", member.email || "No email available"));
    info.append(el("span", "ct-home-role-pill", String(member.role || "member").replace(/[-_]/g, " ")));
    top.appendChild(info);
    wrap.appendChild(top);

    const details = el("dl", "ct-home-member-details");
    [
      ["Member ID", member.id || "Not available"],
      ["Role", String(member.role || "Not available")],
      ["Location", member.location_name || "Not assigned"],
      ["Phone", member.phone || "Not provided"],
      ["Account status", member.is_active ? "Active" : "Inactive"],
      ["Joined", member.created_at ? new Date(member.created_at).toLocaleDateString() : "Not available"]
    ].forEach(([label, value]) => {
      details.append(el("dt", "", label));
      details.append(el("dd", "", value));
    });
    wrap.appendChild(details);

    const actions = el("div", "ct-home-actions-row");
    actions.appendChild(button("Close", "ct-home-button ct-home-button--secondary", () => dialog.close()));
    wrap.appendChild(actions);
    content.appendChild(wrap);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else dialog.setAttribute("open", "");
  }

  function memberScore(member, query) {
    const q = normalized(query);
    const name = normalized(member.name);
    const email = normalized(member.email);
    const role = normalized(member.role);
    const location = normalized(member.location_name);
    if (!q) return 0;
    if (name.startsWith(q) || email.startsWith(q)) return 300;
    if (name.split(/\s+/).some(word => word.startsWith(q)) || role.startsWith(q) || location.startsWith(q)) return 200;
    if ([name, email, role, location].some(value => value.includes(q))) return 100;
    return -1;
  }

  function renderMemberResults(root, query) {
    const results = root.querySelector("[data-ct-member-results]");
    const count = root.querySelector("[data-ct-member-count]");
    if (!results) return;
    results.replaceChildren();
    memberQuery = query;
    const q = normalized(query);

    if (!q) {
      results.hidden = true;
      if (count) count.textContent = members.length + (members.length === 1 ? " member" : " members");
      return;
    }

    const matches = members
      .map(member => ({ member, score: memberScore(member, q) }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score || normalized(a.member.name).localeCompare(normalized(b.member.name)))
      .slice(0, 10);

    results.hidden = false;
    if (count) count.textContent = matches.length + (matches.length === 1 ? " match" : " matches");

    if (!matches.length) {
      results.appendChild(el("div", "ct-home-member-empty", "No organization members match “" + query + "”. Try a name, email, role, or location."));
      return;
    }

    const groups = [
      { score: 300, label: "Starts with your search" },
      { score: 200, label: "Starts with it in another word" },
      { score: 100, label: "Contains your search" }
    ];

    let rendered = 0;
    groups.forEach(group => {
      const subset = matches.filter(item => item.score === group.score);
      if (!subset.length) return;
      results.appendChild(el("div", "ct-home-member-group-label", group.label));
      subset.forEach(({ member }) => {
        const item = button("", "ct-home-member-result", () => openMemberDetails(member));
        const avatar = el("span", "ct-home-member-avatar", initials(member.name));
        const copy = el("span", "ct-home-member-copy");
        copy.append(el("strong", "", member.name || "Unnamed member"));
        copy.append(el("small", "", member.email || "No email available"));
        const badge = el("span", "ct-home-role-pill", String(member.role || "member").replace(/[-_]/g, " "));
        const arrow = el("span", "ct-home-member-arrow", "↗");
        item.append(avatar, copy, badge, arrow);
        results.appendChild(item);
        rendered += 1;
      });
    });

    if (!rendered) {
      results.appendChild(el("div", "ct-home-member-empty", "No matching members."));
    }
  }

  function createSetupForm(root) {
    const panel = el("section", "ct-home-panel ct-home-setup-panel");
    const heading = el("div", "ct-home-panel-heading");
    heading.append(el("p", "ct-home-kicker", "ORGANIZATION PROFILE"));
    heading.append(el("h2", "", "Set up your organization"));
    heading.append(el("p", "ct-home-muted", "Create the organization profile for this Admin account. CleanTrack will generate its unique organization code."));
    panel.appendChild(heading);

    const form = el("form", "ct-home-setup-form");
    const nameLabel = el("label", "", "Organization name");
    const name = el("input");
    name.name = "name";
    name.type = "text";
    name.minLength = 2;
    name.maxLength = 160;
    name.required = true;
    name.placeholder = "Your organization name";
    name.autocomplete = "organization";
    nameLabel.appendChild(name);

    const descLabel = el("label", "", "Description (optional)");
    const desc = el("textarea");
    desc.name = "description";
    desc.rows = 3;
    desc.maxLength = 1000;
    desc.placeholder = "A short description of your organization";
    descLabel.appendChild(desc);

    const submit = el("button", "ct-home-button ct-home-button--primary", "Create organization");
    submit.type = "submit";
    const status = el("p", "ct-home-form-status");
    status.setAttribute("role", "status");
    form.append(nameLabel, descLabel, submit, status);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      status.textContent = "";
      submit.disabled = true;
      submit.textContent = "Creating…";
      try {
        const result = await API.post("organizations/current", {
          name: name.value.trim(),
          description: desc.value.trim()
        });
        currentOrganization = result.organization || null;
        await render(root);
      } catch (error) {
        status.textContent = error.message || "Unable to create the organization. Please try again.";
        submit.disabled = false;
        submit.textContent = "Create organization";
      }
    });
    panel.appendChild(form);
    return panel;
  }

  function makeMetric(label, value, detail, icon, page) {
    const card = button("", "ct-home-metric-card", () => page && go(page));
    if (page) card.title = "Open " + label;
    const top = el("div", "ct-home-metric-top");
    top.append(el("span", "ct-home-metric-icon", icon));
    top.append(el("span", "ct-home-metric-label", label));
    card.appendChild(top);
    card.append(el("strong", "ct-home-metric-value", Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—"));
    card.append(el("span", "ct-home-metric-detail", detail));
    return card;
  }

  function makeSettingCard(icon, title, description, action, label) {
    const card = el("article", "ct-home-setting-card");
    card.append(el("span", "ct-home-setting-icon", icon));
    card.append(el("h3", "", title));
    card.append(el("p", "", description));
    card.appendChild(button(label || "Open", "ct-home-button ct-home-button--secondary", action));
    return card;
  }

  function renderCodePanel(root, organization) {
    const panel = el("section", "ct-home-panel ct-home-code-panel");
    const top = el("div", "ct-home-code-top");
    const copyBlock = el("div");
    copyBlock.append(el("p", "ct-home-kicker", "ORGANIZATION ACCESS"));
    copyBlock.append(el("h2", "", "Your organization code"));
    copyBlock.append(el("p", "ct-home-muted", "Share this code with people who need to request to join your organization."));
    top.appendChild(copyBlock);
    top.append(el("span", "ct-home-code-badge", "Admin only"));
    panel.appendChild(top);

    const codeRow = el("div", "ct-home-code-row");
    const code = el("code", "ct-home-code-value", organization.code || "Code unavailable");
    codeRow.appendChild(code);
    codeRow.appendChild(button("Copy code", "ct-home-button ct-home-button--primary", async () => {
      const value = String(organization.code || "");
      if (!value) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          const temp = el("textarea");
          temp.value = value;
          temp.style.position = "fixed";
          temp.style.opacity = "0";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          temp.remove();
        }
        showNotice(root, "Organization code copied. Share it only with people you want to invite to request access.", "success");
      } catch (error) {
        showNotice(root, "Copy failed. Select the code and copy it manually.", "error");
      }
    }));
    panel.appendChild(codeRow);

    const rules = el("div", "ct-home-code-rules");
    rules.append(el("h3", "", "How the code works"));
    const list = el("ul");
    [
      "The code belongs to this organization and is generated by CleanTrack.",
      "Supervisors and employees use the code when requesting to join.",
      "Knowing the code does not grant access automatically.",
      "New requests stay pending until an Admin reviews and approves them on the Invitations page."
    ].forEach(text => list.appendChild(el("li", "", text)));
    rules.appendChild(list);
    panel.appendChild(rules);
    return panel;
  }

  async function render(root) {
    if (!root) return;
    rootElement = root;
    root.replaceChildren();
    const user = window.CleanTrackAuth && window.CleanTrackAuth.getCurrentUser
      ? window.CleanTrackAuth.getCurrentUser()
      : null;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      root.appendChild(el("p", "ct-home-muted", "Organization Home is available to Admin accounts only."));
      return;
    }

    root.appendChild(el("div", "ct-home-loading", "Loading organization overview…"));
    let response;
    try {
      response = await API.get("organizations/current");
      currentOrganization = response.organization || null;
    } catch (error) {
      root.replaceChildren();
      root.appendChild(el("div", "ct-home-notice ct-home-notice--error",
        "Unable to load the organization overview: " + (error.message || "request failed") +
        ". Check the backend deployment and organization API."));
      return;
    }

    root.replaceChildren();
    const name = user.name || user.email || "Admin";
    const orgName = currentOrganization && currentOrganization.name ||
      user.organization_name || user.organizationName || "your organization";
    const role = "Administrator";

    const welcome = el("section", "ct-home-welcome");
    welcome.append(el("p", "ct-home-kicker", "ORGANIZATION CONTROL CENTER"));
    welcome.append(el("h1", "", "Welcome back, " + name));
    welcome.append(el("p", "ct-home-welcome-copy", "Here’s your organization at a glance, with the controls you need to keep your people and work organized."));
    const identity = el("div", "ct-home-identity");
    identity.append(el("span", "ct-home-identity-item", orgName));
    identity.append(el("span", "ct-home-identity-divider", "·"));
    identity.append(el("span", "ct-home-identity-item", role));
    welcome.appendChild(identity);
    root.appendChild(welcome);

    if (!currentOrganization) {
      root.appendChild(createSetupForm(root));
      root.appendChild(el("div", "ct-home-notice", "Your organization code will appear here immediately after the organization profile is created."));
      return;
    }

    const stats = response.stats || currentOrganization.stats || {};
    const metrics = el("section", "ct-home-metrics");
    metrics.setAttribute("aria-label", "Organization summary");
    metrics.append(
      makeMetric("Staff", stats.staff ?? 0, "Supervisors and employees", "♙", "staff"),
      makeMetric("Teams", stats.teams ?? 0, "Organization teams", "♧", "teams"),
      makeMetric("Managed locations", stats.locations ?? 0, "Sites in this organization", "⌖", "locations"),
      makeMetric("Operational zones", stats.zones ?? 0, "Zones across your sites", "▦", "zones")
    );
    root.appendChild(metrics);

    const settings = el("section", "ct-home-settings-section");
    const header = el("div", "ct-home-section-heading");
    header.append(el("p", "ct-home-kicker", "CONFIGURATION"));
    header.append(el("h2", "", "Organizational settings"));
    header.append(el("p", "ct-home-muted", "Manage your organization profile, people structure, and access."));
    settings.appendChild(header);
    const grid = el("div", "ct-home-settings-grid");
    grid.append(
      makeSettingCard("◇", "Organization profile", "Organization name, profile details, and unique access code.", () => go("settings"), "View profile settings"),
      makeSettingCard("♧", "Teams and roles", "Organize members into teams and review the roles available to your organization.", () => go("teams"), "Manage teams"),
      makeSettingCard("⚿", "Access and permissions", "Review account access and make sure people have the right responsibilities.", () => go("staff"), "Manage access")
    );
    settings.appendChild(grid);
    root.appendChild(settings);
    root.appendChild(renderCodePanel(root, currentOrganization));

    const directory = el("section", "ct-home-panel ct-home-directory");
    const directoryHeader = el("div", "ct-home-section-heading");
    directoryHeader.append(el("p", "ct-home-kicker", "ORGANIZATION DIRECTORY"));
    directoryHeader.append(el("h2", "", "Find a member"));
    directoryHeader.append(el("p", "ct-home-muted", "Search approved members of this organization by name, email, role, or location."));
    directory.appendChild(directoryHeader);

    const searchWrap = el("div", "ct-home-member-search-wrap");
    const searchIcon = el("span", "ct-home-member-search-icon", "⌕");
    const search = el("input", "ct-home-member-search");
    search.type = "search";
    search.placeholder = "Search staff, supervisors, email, location…";
    search.setAttribute("aria-label", "Search members of this organization");
    search.autocomplete = "off";
    search.setAttribute("aria-controls", "ct-home-member-results");
    searchWrap.append(searchIcon, search);
    directory.appendChild(searchWrap);
    const resultInfo = el("p", "ct-home-member-count", members.length + " members");
    resultInfo.dataset.ctMemberCount = "true";
    directory.appendChild(resultInfo);
    const results = el("div", "ct-home-member-results");
    results.dataset.ctMemberResults = "true";
    results.id = "ct-home-member-results";
    results.hidden = true;
    directory.appendChild(results);
    if (memberLoadError) {
      directory.appendChild(el("p", "ct-home-inline-error", memberLoadError));
    } else {
      directory.appendChild(el("p", "ct-home-muted ct-home-directory-hint", "Start typing to get ranked suggestions. Names and emails that start with your search appear first, followed by word matches and partial matches."));
    }
    search.addEventListener("input", () => renderMemberResults(root, search.value));
    search.addEventListener("focus", () => { if (search.value.trim()) renderMemberResults(root, search.value); });
    search.addEventListener("keydown", event => {
      const items = Array.from(results.querySelectorAll("button"));
      const active = items.findIndex(item => item.getAttribute("aria-selected") === "true");
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!items.length) return;
        event.preventDefault();
        const next = event.key === "ArrowDown" ? (active + 1) % items.length : (active <= 0 ? items.length - 1 : active - 1);
        items.forEach((item, index) => item.setAttribute("aria-selected", String(index === next)));
      } else if (event.key === "Enter") {
        const selected = items.find(item => item.getAttribute("aria-selected") === "true") || items[0];
        if (selected) { event.preventDefault(); selected.click(); }
      } else if (event.key === "Escape") {
        results.hidden = true;
      }
    });
    document.addEventListener("click", function closeMemberResults(event) {
      if (!directory.contains(event.target)) {
        results.hidden = true;
        document.removeEventListener("click", closeMemberResults);
      }
    });
    root.appendChild(directory);

    try {
      const responseMembers = await API.get("organizations/members");
      members = Array.isArray(responseMembers) ? responseMembers :
        (Array.isArray(responseMembers.members) ? responseMembers.members : []);
      memberLoadError = "";
      const count = root.querySelector("[data-ct-member-count]");
      if (count) count.textContent = members.length + (members.length === 1 ? " member" : " members");
      if (memberQuery) renderMemberResults(root, memberQuery);
    } catch (error) {
      members = [];
      memberLoadError = "Member search is unavailable: " + (error.message || "request failed");
      const hint = root.querySelector(".ct-home-directory-hint");
      if (hint) { hint.textContent = memberLoadError; hint.className = "ct-home-inline-error"; }
    }
  }

  window.CleanTrackAdminHome = Object.freeze({ render: render });
})();