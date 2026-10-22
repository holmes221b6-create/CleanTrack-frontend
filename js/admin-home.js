(function () {
  "use strict";

  const API = window.CleanTrackApi;
  let currentOrganization = null;
  let members = [];
  let rootElement = null;
  let memberQuery = "";
  let memberLoadError = "";
  let directoryOptions = { locations: [], teams: [], zones: [] };
  let rankingPeriod = 30;
  let rankedMemberCount = 0;

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
      ["Teams", (member.team_names || []).join(", ") || "No team assigned"],
      ["Zones", (member.zone_names || []).join(", ") || "No assigned zones"],
      ["Performance rank", member.rank ? "#" + member.rank : "Not ranked yet"],
      ["Compliance", member.compliance_pct === null || member.compliance_pct === undefined ? "No task history" : Number(member.compliance_pct).toFixed(1) + "%"],
      ["Completed tasks / total", (member.completed_tasks || 0) + " / " + (member.total_tasks || 0)],
      ["Missed tasks", member.missed_tasks || 0],
      ["Phone", member.phone || "Not provided"],
      ["Account status", member.is_active ? "Active" : "Inactive"],
      ["Joined", member.created_at ? (window.CleanTrackPreferences?.formatDate ? window.CleanTrackPreferences.formatDate(member.created_at) : new Date(member.created_at).toLocaleDateString()) : "Not available"]
    ].forEach(([label, value]) => {
      details.append(el("dt", "", label));
      details.append(el("dd", "", value));
    });
    wrap.appendChild(details);

    const teamEditor = el("section", "ct-home-team-editor");
    teamEditor.append(el("h3", "", "Team assignments"));
    teamEditor.append(el("p", "ct-home-muted", "Assign this member to real organization teams. Team assignments are used by the directory filters."));
    if (!directoryOptions.teams.length) {
      teamEditor.append(el("p", "ct-home-muted", "There are no teams to assign yet. Create a team on the Teams page first."));
    } else {
      const teamSelect = el("select", "ct-home-filter-select");
      teamSelect.multiple = true;
      teamSelect.size = Math.min(5, directoryOptions.teams.length);
      teamSelect.setAttribute("aria-label", "Team assignments");
      directoryOptions.teams.forEach(team => {
        const option = el("option", "", team.name);
        option.value = team.id;
        option.selected = (member.team_ids || []).includes(team.id);
        teamSelect.appendChild(option);
      });
      const teamStatus = el("p", "ct-home-form-status");
      teamStatus.setAttribute("role", "status");
      const saveTeams = button("Save team assignments", "ct-home-button ct-home-button--secondary", async () => {
        saveTeams.disabled = true;
        saveTeams.textContent = "Saving…";
        teamStatus.textContent = "";
        try {
          await API.post("organizations/members/" + encodeURIComponent(member.id) + "/teams", {
            team_ids: Array.from(teamSelect.selectedOptions).map(option => option.value)
          });
          teamStatus.textContent = "Team assignments saved.";
          await loadDirectoryMembers(rootElement, false);
        } catch (error) {
          teamStatus.textContent = error.message || "Unable to save team assignments.";
        } finally {
          saveTeams.disabled = false;
          saveTeams.textContent = "Save team assignments";
        }
      });
      teamEditor.append(teamSelect, saveTeams, teamStatus);
    }
    wrap.appendChild(teamEditor);

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
    if (!q) return 0;
    const fields = [member.name, member.email, member.role, member.location_name]
      .concat(member.team_names || [], member.zone_names || []).map(normalized);
    if (normalized(member.name).startsWith(q) || normalized(member.email).startsWith(q)) return 300;
    if (fields.some(value => value.split(/\s+/).some(word => word.startsWith(q)))) return 200;
    if (fields.some(value => value.includes(q))) return 100;
    return -1;
  }

  function selectedFilter(root, name) {
    const control = root.querySelector('[data-ct-member-filter="' + name + '"]');
    return control ? control.value : "";
  }

  function populateDirectoryFilters(root) {
    const roles = Array.from(new Set(members.map(member => String(member.role || "").trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    const optionSets = {
      role: roles.map(value => ({ id: value, name: value.replace(/[-_]/g, " ") })),
      location: directoryOptions.locations,
      team: directoryOptions.teams,
      zone: directoryOptions.zones,
      ranking: [
        { id: "ranked", name: "Ranked members" },
        { id: "top", name: "Top performers (top 25%)" },
        { id: "attention", name: "Needs attention (<80% compliance)" },
        { id: "unranked", name: "Not ranked yet" }
      ],
      sort: [
        { id: "relevance", name: "Best match / rank" },
        { id: "name", name: "Name A–Z" },
        { id: "compliance", name: "Highest compliance" },
        { id: "completed", name: "Most tasks completed" },
        { id: "missed", name: "Most missed tasks" }
      ],
      period: [
        { id: "7", name: "Last 7 days" },
        { id: "30", name: "Last 30 days" },
        { id: "90", name: "Last 90 days" },
        { id: "365", name: "Last 12 months" }
      ]
    };
    Object.entries(optionSets).forEach(([key, choices]) => {
      const select = root.querySelector('[data-ct-member-filter="' + key + '"]');
      if (!select) return;
      const previous = select.value;
      const firstLabel = ({ role: "All roles", location: "All locations", team: "All teams", zone: "All zones", ranking: "All rankings" })[key];
      select.replaceChildren();
      choices.forEach(choice => {
        const option = el("option", "", choice.name);
        option.value = String(choice.id);
        if (key === "zone" && choice.location_name) option.textContent += " · " + choice.location_name;
        select.appendChild(option);
      });
      if (firstLabel) {
        const all = el("option", "", firstLabel);
        all.value = "";
        select.prepend(all);
      }
      if (choices.some(choice => String(choice.id) === previous)) select.value = previous;
      else if (key === "period") select.value = String(rankingPeriod);
      else if (key === "sort") select.value = "relevance";
    });
  }

  function renderMemberResults(root, query) {
    const results = root.querySelector("[data-ct-member-results]");
    const count = root.querySelector("[data-ct-member-count]");
    if (!results) return;
    results.replaceChildren();
    memberQuery = query;
    const q = normalized(query);
    const role = normalized(selectedFilter(root, "role"));
    const location = selectedFilter(root, "location");
    const team = selectedFilter(root, "team");
    const zone = selectedFilter(root, "zone");
    const ranking = selectedFilter(root, "ranking");
    const sort = selectedFilter(root, "sort");

    let matched = members.map(member => ({ member, score: memberScore(member, q) }))
      .filter(item => item.score >= 0)
      .filter(({ member }) => !role || normalized(member.role) === role)
      .filter(({ member }) => !location || (member.location_ids || [member.location_id]).map(String).includes(location))
      .filter(({ member }) => !team || (member.team_ids || []).includes(team))
      .filter(({ member }) => !zone || (member.zone_ids || []).includes(zone))
      .filter(({ member }) => {
        if (!ranking) return true;
        const hasRank = member.rank !== null && member.rank !== undefined && Number.isFinite(Number(member.rank));
        if (ranking === "ranked") return hasRank;
        if (ranking === "unranked") return !hasRank;
        if (ranking === "attention") return hasRank && Number(member.compliance_pct) < 80;
        if (ranking === "top") return hasRank && Number(member.rank) <= Math.max(1, Math.ceil(rankedMemberCount * 0.25));
        return true;
      });

    matched.sort((a, b) => {
      const x = a.member, y = b.member;
      if (sort === "name") return normalized(x.name).localeCompare(normalized(y.name));
      if (sort === "compliance") return Number(y.compliance_pct ?? -1) - Number(x.compliance_pct ?? -1);
      if (sort === "completed") return Number(y.completed_tasks || 0) - Number(x.completed_tasks || 0);
      if (sort === "missed") return Number(y.missed_tasks || 0) - Number(x.missed_tasks || 0);
      const xr = x.rank !== null && x.rank !== undefined;
      const yr = y.rank !== null && y.rank !== undefined;
      if (q && b.score !== a.score) return b.score - a.score;
      if (xr && !yr) return -1;
      if (yr && !xr) return 1;
      if (xr && yr && x.rank !== y.rank) return x.rank - y.rank;
      return b.score - a.score || normalized(x.name).localeCompare(normalized(y.name));
    });

    results.hidden = false;
    const limit = q ? 100 : 5;
    if (count) {
      count.textContent = q
        ? matched.length + " matching " + (matched.length === 1 ? "member" : "members") + (matched.length > limit ? " · showing first " + limit : "")
        : (matched.length ? "Recommended members · showing " + Math.min(matched.length, limit) + " of " + matched.length : "Recommended members");
    }
    if (!matched.length) {
      results.appendChild(el("div", "ct-home-member-empty",
        members.length ? "No members match these search terms and filters." : "No active approved members are available in this organization yet."));
      return;
    }
    matched.slice(0, limit).forEach(({ member }) => {
      const item = button("", "ct-home-member-result", () => openMemberDetails(member));
      const copy = el("span", "ct-home-member-copy");
      copy.append(el("strong", "", member.name || "Unnamed member"));
      copy.append(el("small", "", member.email || "No email available"));
      const context = [member.location_name || "No location", (member.team_names || []).join(", "), (member.zone_names || []).join(", ")]
        .filter(Boolean).join(" · ");
      copy.append(el("small", "ct-home-member-context", context));
      const badges = el("span", "ct-home-member-badges");
      badges.append(el("span", "ct-home-role-pill", String(member.role || "member").replace(/[-_]/g, " ")));
      if (member.rank) badges.append(el("span", "ct-home-rank-pill", "#" + member.rank + " · " + Number(member.compliance_pct).toFixed(1) + "%"));
      else if (["staff", "employee"].includes(normalized(member.role)) && Number(member.total_tasks || 0) === 0) {
        badges.append(el("span", "ct-home-rank-pill ct-home-rank-pill--muted", "Not ranked"));
      }
      item.append(el("span", "ct-home-member-avatar", initials(member.name)), copy, badges, el("span", "ct-home-member-arrow", "↗"));
      results.appendChild(item);
    });
  }

  async function loadDirectoryMembers(root, showLoading) {
    if (!root || !API) return;
    const periodControl = root.querySelector('[data-ct-member-filter="period"]');
    rankingPeriod = Number(periodControl && periodControl.value) || rankingPeriod || 30;
    if (showLoading) {
      const results = root.querySelector("[data-ct-member-results]");
      if (results) results.replaceChildren(el("div", "ct-home-loading", "Loading member performance…"));
    }
    try {
      const response = await API.get("organizations/members?days=" + encodeURIComponent(rankingPeriod));
      members = Array.isArray(response) ? response : (Array.isArray(response.members) ? response.members : []);
      rankedMemberCount = Number(response.ranked_count) || members.filter(member => member.rank).length;
      memberLoadError = "";
      populateDirectoryFilters(root);
      const message = root.querySelector("[data-ct-member-error]");
      if (message) message.hidden = true;
      renderMemberResults(root, root.querySelector("[data-ct-member-search]")?.value || "");
    } catch (error) {
      members = [];
      rankedMemberCount = 0;
      memberLoadError = "Member search is unavailable: " + (error.message || "request failed");
      const message = root.querySelector("[data-ct-member-error]");
      if (message) { message.hidden = false; message.textContent = memberLoadError; }
      renderMemberResults(root, root.querySelector("[data-ct-member-search]")?.value || "");
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
        if (currentOrganization && window.CleanTrackOrganizationContext) window.CleanTrackOrganizationContext.apply(currentOrganization);
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
      makeSettingCard("◇", "Organization settings", "Organization profile, membership, policies, audit trail, and lifecycle controls.", () => go("org-settings"), "Manage organization"),
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
    directoryHeader.append(el("p", "ct-home-muted", "Search approved members and combine location, team, zone, role, and work-performance filters. Performance ranks use actual task records for the selected period."));
    directory.appendChild(directoryHeader);

    const searchWrap = el("div", "ct-home-member-search-wrap");
    const searchIcon = el("span", "ct-home-member-search-icon", "⌕");
    const search = el("input", "ct-home-member-search");
    search.type = "search";
    search.placeholder = "Search names, emails, roles, teams, zones, locations…";
    search.setAttribute("aria-label", "Search members of this organization");
    search.autocomplete = "off";
    search.setAttribute("aria-controls", "ct-home-member-results");
    search.dataset.ctMemberSearch = "true";
    const searchButton = button("Search", "ct-home-button ct-home-button--primary ct-home-member-search-button", () => {
      renderMemberResults(root, search.value);
      search.focus();
    });
    searchButton.setAttribute("aria-label", "Search organization members");
    searchWrap.append(searchIcon, search, searchButton);
    directory.appendChild(searchWrap);

    const filterGrid = el("div", "ct-home-member-filters");
    [
      ["role", "Role"], ["location", "Location"], ["team", "Team"], ["zone", "Zone"],
      ["ranking", "Performance ranking"], ["period", "Rank period"], ["sort", "Sort results"]
    ].forEach(([key, label]) => {
      const field = el("label", "ct-home-member-filter");
      field.append(el("span", "", label));
      const select = el("select", "ct-home-filter-select");
      select.dataset.ctMemberFilter = key;
      select.setAttribute("aria-label", label);
      field.appendChild(select);
      filterGrid.appendChild(field);
    });
    directory.appendChild(filterGrid);

    const resultInfo = el("p", "ct-home-member-count", "Loading organization members…");
    resultInfo.dataset.ctMemberCount = "true";
    directory.appendChild(resultInfo);
    const results = el("div", "ct-home-member-results");
    results.dataset.ctMemberResults = "true";
    results.id = "ct-home-member-results";
    directory.appendChild(results);
    const errorMessage = el("p", "ct-home-inline-error", "");
    errorMessage.dataset.ctMemberError = "true";
    errorMessage.hidden = true;
    directory.appendChild(errorMessage);
    directory.appendChild(el("p", "ct-home-muted ct-home-directory-hint", "Members with task history are ranked by compliance. Members without eligible task records remain unranked; no score is invented."));
    search.addEventListener("input", () => renderMemberResults(root, search.value));
    filterGrid.querySelectorAll("select").forEach(select => {
      select.addEventListener("change", () => {
        if (select.dataset.ctMemberFilter === "period") loadDirectoryMembers(root, true);
        else renderMemberResults(root, search.value);
      });
    });
    search.addEventListener("keydown", event => {
      const items = Array.from(results.querySelectorAll("button"));
      const active = items.findIndex(item => item.getAttribute("aria-selected") === "true");
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!items.length) return;
        event.preventDefault();
        const next = event.key === "ArrowDown" ? (active + 1) % items.length : (active <= 0 ? items.length - 1 : active - 1);
        items.forEach((item, index) => item.setAttribute("aria-selected", String(index === next)));
      } else if (event.key === "Enter") {
        event.preventDefault();
        renderMemberResults(root, search.value);
        const selected = items.find(item => item.getAttribute("aria-selected") === "true") || items[0];
        if (selected) selected.click();
      } else if (event.key === "Escape") {
        results.hidden = true;
      }
    });
    root.appendChild(directory);

    try {
      const options = await API.get("organizations/directory-options");
      directoryOptions = {
        locations: Array.isArray(options.locations) ? options.locations : [],
        teams: Array.isArray(options.teams) ? options.teams : [],
        zones: Array.isArray(options.zones) ? options.zones : []
      };
    } catch (error) {
      directoryOptions = { locations: [], teams: [], zones: [] };
      const warning = root.querySelector("[data-ct-member-error]");
      if (warning) {
        warning.hidden = false;
        warning.textContent = "Filter options could not be loaded: " + (error.message || "request failed");
      }
    }
    await loadDirectoryMembers(root, true);
  }

  window.CleanTrackAdminHome = Object.freeze({ render: render });
})();