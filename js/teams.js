(function () {
  "use strict";

  const API = window.CleanTrackApi;
  const ENDPOINT = "teams";
  let teams = [];
  let filterText = "";
  let busy = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, onClick, type) {
    const node = el("button", className || "ct-button", label);
    node.type = type || "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function showNotice(root, message, kind) {
    let notice = root.querySelector("[data-ct-notice]");
    if (!notice) {
      notice = el("div", "ct-notice");
      notice.dataset.ctNotice = "true";
      root.prepend(notice);
    }
    notice.className = "ct-notice ct-notice--" + (kind || "info");
    notice.textContent = message;
    notice.hidden = !message;
  }

  function makeTeamCard(team, root, onOpen) {
    const card = el("article", "ct-team-card");
    const top = el("div", "ct-team-card__top");
    const title = el("h3", "ct-team-card__title", team.name || "Unnamed team");
    const status = el("span", "ct-status", team.status || (team.archived ? "Archived" : "Active"));
    top.append(title, status);
    card.append(top);
    card.append(el("p", "ct-team-card__description", team.description || "No description provided."));
    const meta = el("div", "ct-team-card__meta", "Created team record");
    if (team.created_at) meta.textContent = "Created " + (window.CleanTrackPreferences?.formatDate ? window.CleanTrackPreferences.formatDate(team.created_at) : new Date(team.created_at).toLocaleDateString());
    card.append(meta);
    card.append(button("View details", "ct-button ct-button--secondary", () => onOpen(team)));
    return card;
  }

  function renderList(root) {
    const results = root.querySelector("[data-ct-team-results]");
    if (!results) return;
    results.replaceChildren();
    const query = String(filterText || "").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
    const visible = teams
      .map(team => {
        const name = String(team.name || "").normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
        const words = name.split(/\\s+/);
        const description = String(team.description || "").toLowerCase();
        let score = 0;
        if (!query) score = 0;
        else if (name.startsWith(query)) score = 300;
        else if (words.some(word => word.startsWith(query))) score = 200;
        else if (name.includes(query) || description.includes(query)) score = 100;
        else score = -1;
        return { team, score };
      })
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score || String(a.team.name || "").localeCompare(String(b.team.name || "")))
      .map(item => item.team);
    const count = root.querySelector("[data-ct-team-count]");
    if (count) count.textContent = visible.length + (visible.length === 1 ? " team" : " teams");
    if (!visible.length) {
      results.append(el("div", "ct-empty", filterText ? "No teams match your search." : "No teams yet. Create your first team to get started."));
      return;
    }
    visible.forEach(team => results.append(makeTeamCard(team, root, selected => renderDetails(root, selected))));
  }

  function renderDetails(root, team) {
    const panel = root.querySelector("[data-ct-team-details]");
    if (!panel) return;
    panel.hidden = false;
    panel.replaceChildren();
    const header = el("div", "ct-details-header");
    const headingWrap = el("div");
    headingWrap.append(el("h2", "ct-section-title", team.name || "Team details"));
    headingWrap.append(el("p", "ct-muted", team.description || "No description provided."));
    header.append(headingWrap, button("Close", "ct-button ct-button--secondary", () => { panel.hidden = true; }));
    panel.append(header);

    const overview = el("div", "ct-overview-grid");
    [
      ["Supervisors", team.supervisor_count],
      ["Employees", team.employee_count],
      ["Locations", team.location_count],
      ["Zones", team.zone_count]
    ].forEach(([label, value]) => {
      const item = el("div", "ct-overview-item");
      item.append(el("span", "ct-overview-item__label", label));
      item.append(el("strong", "ct-overview-item__value", value === undefined || value === null ? "—" : value));
      overview.append(item);
    });
    panel.append(overview);

    const note = el("p", "ct-muted ct-details-note", "This team detail view will show assignments, locations, zones, activity history, and performance when the corresponding backend endpoints and relationships are implemented.");
    panel.append(note);
  }

  function renderCreateForm(root) {
    const form = root.querySelector("[data-ct-create-form]");
    const openButton = root.querySelector("[data-ct-open-create]");
    if (!form || !openButton) return;
    openButton.addEventListener("click", () => {
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector("[name=name]")?.focus();
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (busy) return;
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const description = String(data.get("description") || "").trim();
      if (!name) {
        showNotice(root, "Enter a team name.", "error");
        form.querySelector("[name=name]")?.focus();
        return;
      }
      busy = true;
      const submit = form.querySelector("[type=submit]");
      if (submit) { submit.disabled = true; submit.textContent = "Creating…"; }
      try {
        if (!API || typeof API.post !== "function") throw new Error("CleanTrack API client is not loaded.");
        const response = await API.post(ENDPOINT, { name, description });
        const created = response && (response.team || response.data?.team);
        if (created) teams.unshift(created);
        else await loadTeams(root, false);
        form.reset();
        form.hidden = true;
        showNotice(root, (response && response.message) || "Team created successfully.", "success");
        renderList(root);
      } catch (error) {
        showNotice(root, error && error.message ? error.message : "Could not create the team.", "error");
      } finally {
        busy = false;
        if (submit) { submit.disabled = false; submit.textContent = "Create team"; }
      }
    });
  }

  async function loadTeams(root, showLoading) {
    const results = root.querySelector("[data-ct-team-results]");
    if (showLoading && results) results.replaceChildren(el("div", "ct-empty", "Loading teams…"));
    try {
      if (!API || typeof API.get !== "function") throw new Error("CleanTrack API client is not loaded.");
      const response = await API.get(ENDPOINT);
      teams = Array.isArray(response) ? response : (response && Array.isArray(response.teams) ? response.teams : []);
      renderList(root);
      if (!teams.length) showNotice(root, "Teams loaded. Create a team to get started.", "info");
      else showNotice(root, "Teams loaded successfully.", "success");
    } catch (error) {
      teams = [];
      renderList(root);
      showNotice(root, error && error.message ? error.message : "Could not load teams. Check your sign-in and backend connection.", "error");
    }
  }

  function render(container) {
    if (!container) return;
    container.replaceChildren();
    const page = el("section", "ct-teams-page");
    const header = el("div", "ct-page-header");
    const titleGroup = el("div");
    titleGroup.append(el("p", "ct-eyebrow", "ADMINISTRATION"));
    titleGroup.append(el("h1", "ct-page-title", "Teams"));
    titleGroup.append(el("p", "ct-muted", "Create and manage the teams that organize CleanTrack operations."));
    header.append(titleGroup, button("+ Create team", "ct-button ct-button--primary", () => {
      const form = page.querySelector("[data-ct-create-form]");
      if (form) { form.hidden = !form.hidden; if (!form.hidden) form.querySelector("[name=name]")?.focus(); }
    }));
    page.append(header);

    const notice = el("div", "ct-notice");
    notice.dataset.ctNotice = "true";
    notice.hidden = true;
    page.append(notice);

    const createForm = el("form", "ct-create-form");
    createForm.dataset.ctCreateForm = "true";
    createForm.hidden = true;
    const formTitle = el("h2", "ct-section-title", "Create a team");
    const nameLabel = el("label", "ct-field");
    nameLabel.append(el("span", "ct-field__label", "Team name"));
    const nameInput = el("input", "ct-input");
    nameInput.name = "name"; nameInput.required = true; nameInput.maxLength = 120; nameInput.placeholder = "e.g. North Region Cleaning";
    nameLabel.append(nameInput);
    const descLabel = el("label", "ct-field");
    descLabel.append(el("span", "ct-field__label", "Team description"));
    const descInput = el("textarea", "ct-input ct-textarea");
    descInput.name = "description"; descInput.rows = 3; descInput.maxLength = 2000; descInput.placeholder = "Describe this team's responsibilities (optional)";
    descLabel.append(descInput);
    const formActions = el("div", "ct-form-actions");
    formActions.append(button("Cancel", "ct-button ct-button--secondary", () => { createForm.hidden = true; createForm.reset(); }));
    const submit = el("button", "ct-button ct-button--primary", "Create team");
    submit.type = "submit";
    formActions.append(submit);
    createForm.append(formTitle, nameLabel, descLabel, formActions);
    page.append(createForm);

    const toolbar = el("div", "ct-teams-toolbar");
    const searchLabel = el("label", "ct-search");
    searchLabel.append(el("span", "ct-sr-only", "Search teams"));
    const search = el("input", "ct-input");
    search.type = "search"; search.placeholder = "Search teams by name…"; search.setAttribute("aria-label", "Search teams by name");
    search.addEventListener("input", () => { filterText = search.value.trim(); renderList(page); });
    searchLabel.append(search);
    toolbar.append(searchLabel);
    const count = el("span", "ct-muted", "Loading teams…");
    count.dataset.ctTeamCount = "true";
    toolbar.append(count);
    page.append(toolbar);

    const results = el("div", "ct-team-grid");
    results.dataset.ctTeamResults = "true";
    results.append(el("div", "ct-empty", "Loading teams…"));
    page.append(results);

    const details = el("section", "ct-details-panel");
    details.dataset.ctTeamDetails = "true";
    details.hidden = true;
    page.append(details);

    container.append(page);
    renderCreateForm(page);
    loadTeams(page, true);
  }

  window.CleanTrackTeams = Object.freeze({ render });
})();
