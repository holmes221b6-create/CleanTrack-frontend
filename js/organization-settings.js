(function () {
  "use strict";

  const API = window.CleanTrackApi;
  let root;
  let organization = null;
  let members = [];
  let options = { teams: [], locations: [], zones: [] };
  let auditEvents = [];
  let pendingCount = null;
  let loadingError = "";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, onClick) {
    const node = el("button", className || "ct-org-button", label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function field(label, name, value, type, extra) {
    const wrapper = el("label", "ct-org-field");
    wrapper.append(el("span", "", label));
    let input;
    if (type === "textarea") {
      input = el("textarea", "ct-org-input");
      input.rows = extra && extra.rows || 4;
    } else {
      input = el("input", "ct-org-input");
      input.type = type || "text";
    }
    input.name = name;
    input.value = value || "";
    if (extra) Object.entries(extra).forEach(([key, val]) => {
      if (key === "rows" || val === undefined || val === null) return;
      if (key === "required") input.required = Boolean(val);
      else input.setAttribute(key, String(val));
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function status(node, message, error) {
    node.textContent = message || "";
    node.className = "ct-org-status" + (error ? " is-error" : " is-success");
    node.hidden = !message;
  }

  function go(page) {
    if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage(page);
  }

  function dateText(value) {
    if (!value) return "Date not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date not available" : date.toLocaleString();
  }

  function initials(value) {
    const parts = String(value || "O").trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] || "O").slice(0, 2)).toUpperCase();
  }

  function cardHeading(icon, title, description) {
    const heading = el("div", "ct-org-card-heading");
    heading.append(el("span", "ct-org-section-icon", icon));
    const copy = el("div");
    copy.append(el("h2", "", title));
    if (description) copy.append(el("p", "ct-org-muted", description));
    heading.appendChild(copy);
    return heading;
  }

  function showPageError(message) {
    root.replaceChildren();
    const block = el("section", "ct-org-error");
    block.append(el("h1", "", "Organization settings couldn't load"));
    block.append(el("p", "", message || "The organization service is unavailable."));
    block.append(button("Retry", "ct-org-button ct-org-button-primary", () => render(root)));
    root.appendChild(block);
  }

  function renderShell() {
    root.replaceChildren();
    const page = el("section", "ct-org-settings-page");
    const header = el("header", "ct-org-page-header");
    header.append(el("p", "ct-org-eyebrow", "ADMIN CONTROL"));
    header.append(el("h1", "", "Organization Settings"));
    header.append(el("p", "ct-org-muted", "Organization-wide profile, membership, policies, access state, and change history. These controls are available only to Admins."));
    const headerActions = el("div", "ct-org-header-actions");
    headerActions.append(button("Personal settings", "ct-org-button ct-org-button-secondary", () => go("settings")));
    header.appendChild(headerActions);
    page.appendChild(header);
    const content = el("div", "ct-org-settings-content");
    content.dataset.orgContent = "true";
    content.appendChild(el("p", "ct-org-muted", "Loading organization data…"));
    page.appendChild(content);
    root.appendChild(page);
    return content;
  }

  function makeProfileCard(content) {
    const card = el("section", "ct-org-card");
    card.appendChild(cardHeading("◇", "Organization profile", "Edit the organization identity shown across CleanTrack. Changes are saved to the database and added to the audit trail."));
    const form = el("form", "ct-org-form");
    const profileTop = el("div", "ct-org-profile-top");
    const avatarWrap = el("div", "ct-org-avatar-preview");
    const avatarUrl = String(organization.avatar_url || "").trim();
    if (avatarUrl) {
      const img = el("img", "ct-org-avatar-image");
      img.alt = "Organization avatar";
      img.src = avatarUrl;
      img.addEventListener("error", () => {
        img.remove();
        avatarWrap.append(el("span", "ct-org-avatar-fallback", initials(organization.name)));
        avatarWrap.append(el("small", "", "Image URL could not be loaded"));
      }, { once: true });
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.append(el("span", "ct-org-avatar-fallback", initials(organization.name)));
    }
    const avatarCopy = el("div", "ct-org-avatar-copy");
    avatarCopy.append(el("strong", "", organization.name || "Organization"));
    avatarCopy.append(el("p", "ct-org-muted", "Add an image URL to use your organization's logo. If none is set, initials are shown."));
    profileTop.append(avatarWrap, avatarCopy);
    form.appendChild(profileTop);
    form.append(
      field("Organization name", "name", organization.name, "text", { required: true, maxlength: 150, minlength: 2, autocomplete: "organization" }),
      field("Organization description", "description", organization.description, "textarea", { maxlength: 5000, rows: 4, placeholder: "Describe the organization and the work it coordinates." }),
      field("Organization avatar / logo URL", "avatar_url", organization.avatar_url, "url", { maxlength: 500, placeholder: "https://example.com/organization-logo.png" }),
      field("Organization contact email", "contact_email", organization.contact_email, "email", { maxlength: 254, placeholder: "operations@example.com" })
    );
    const actions = el("div", "ct-org-form-actions");
    const save = el("button", "ct-org-button ct-org-button-primary", "Save organization profile");
    save.type = "submit";
    const msg = el("p", "ct-org-status");
    msg.hidden = true;
    msg.setAttribute("role", "status");
    actions.appendChild(save);
    form.append(actions, msg);
    if (organization.status === "archived") {
      form.querySelectorAll("input,textarea,button").forEach(node => { node.disabled = true; });
      actions.appendChild(el("p", "ct-org-muted", "Restore the organization before editing its profile."));
    }
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (organization.status === "archived") return;
      if (!form.reportValidity()) return;
      save.disabled = true;
      save.textContent = "Saving…";
      status(msg, "", false);
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const result = await API.patch("organizations/current", data);
        organization = result.organization || organization;
        status(msg, result.message || "Organization profile saved.", false);
        render(root);
      } catch (error) {
        status(msg, error.message || "Organization profile could not be saved.", true);
        save.disabled = false;
        save.textContent = "Save organization profile";
      }
    });
    card.appendChild(form);
    content.appendChild(card);
  }

  function makeAccessCard(content) {
    const card = el("section", "ct-org-card");
    card.appendChild(cardHeading("⚿", "Membership and access", "Control who can request access and review the people already connected to this organization."));
    const grid = el("div", "ct-org-access-grid");
    const codeCard = el("div", "ct-org-code-card");
    codeCard.append(el("p", "ct-org-eyebrow", "ORGANIZATION JOIN CODE"));
    codeCard.append(el("p", "ct-org-muted", "Share this code with people who should request to join. The code itself does not grant access."));
    const codeRow = el("div", "ct-org-code-row");
    codeRow.append(el("code", "", organization.code || organization.organization_code || "Code unavailable"));
    codeRow.append(button("Copy code", "ct-org-button ct-org-button-secondary", async () => {
      const value = String(organization.code || organization.organization_code || "");
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        codeRow.append(el("small", "ct-org-copy-feedback", "Copied"));
      } catch (error) {
        const note = el("small", "ct-org-copy-feedback", "Copy was blocked. Select the code and copy it manually.");
        codeRow.append(note);
      }
    }));
    codeCard.appendChild(codeRow);
    grid.appendChild(codeCard);

    const approvalCard = el("div", "ct-org-policy-card");
    approvalCard.append(el("h3", "", "New membership requests"));
    approvalCard.append(el("p", "", "Admin approval is required before a Supervisor or Employee account can access the organization."));
    approvalCard.append(el("span", "ct-org-lock-pill", "Required by the access workflow"));
    if (pendingCount !== null) {
      approvalCard.append(el("p", "ct-org-muted", pendingCount + (pendingCount === 1 ? " request is" : " requests are") + " awaiting review."));
    } else if (organization.status !== "archived") {
      approvalCard.append(el("p", "ct-org-muted", "Pending request count is unavailable."));
    }
    approvalCard.appendChild(button("Review membership requests", "ct-org-button ct-org-button-secondary", () => go("invitations")));
    grid.appendChild(approvalCard);
    card.appendChild(grid);

    const roster = el("div", "ct-org-roster");
    const rosterHeader = el("div", "ct-org-roster-header");
    const rosterTitle = el("div");
    rosterTitle.append(el("h3", "", "People in this organization"));
    rosterTitle.append(el("p", "ct-org-muted", organization.status === "archived"
      ? "Restore the organization to load and manage its active roster."
      : "Active, approved members from the organization database. Assigning a team below updates real team membership."));
    rosterHeader.appendChild(rosterTitle);
    roster.appendChild(rosterHeader);

    if (organization.status === "archived") {
      roster.appendChild(el("p", "ct-org-muted", "Member and team APIs are suspended while the organization is archived."));
    } else if (!members.length) {
      roster.appendChild(el("p", "ct-org-empty", "No active, approved members were returned for this organization."));
    } else {
      const tableWrap = el("div", "ct-org-table-wrap");
      const table = el("table", "ct-org-table");
      const thead = el("thead");
      const headRow = el("tr");
      ["Member", "Role", "Assigned teams", "Manage teams"].forEach(label => headRow.appendChild(el("th", "", label)));
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = el("tbody");
      members.forEach(member => {
        const tr = el("tr");
        const nameCell = el("td");
        nameCell.append(el("strong", "", member.name || "Unnamed member"));
        nameCell.append(el("small", "", member.email || "No email available"));
        const roleCell = el("td");
        roleCell.appendChild(el("span", "ct-org-role-pill", member.role || "member"));
        const teamsCell = el("td");
        teamsCell.textContent = (member.team_names || []).join(", ") || "No team assigned";
        const manageCell = el("td");
        const disclosure = el("details", "ct-org-team-editor");
        const summary = el("summary", "", "Edit teams");
        disclosure.appendChild(summary);
        if (!options.teams.length) {
          disclosure.appendChild(el("p", "ct-org-muted", "Create a team before assigning this member."));
        } else {
          const select = el("select", "ct-org-team-multi");
          select.multiple = true;
          select.size = Math.min(4, options.teams.length);
          select.setAttribute("aria-label", "Teams for " + (member.name || member.email));
          options.teams.forEach(team => {
            const option = el("option", "", team.name);
            option.value = String(team.id);
            option.selected = (member.team_ids || []).map(String).includes(String(team.id));
            select.appendChild(option);
          });
          const saveTeams = button("Save assignments", "ct-org-button ct-org-button-primary", async () => {
            saveTeams.disabled = true;
            saveTeams.textContent = "Saving…";
            try {
              await API.post("organizations/members/" + encodeURIComponent(member.id) + "/teams", {
                team_ids: Array.from(select.selectedOptions).map(option => option.value)
              });
              await refresh();
            } catch (error) {
              let message = disclosure.querySelector(".ct-org-team-status");
              if (!message) {
                message = el("p", "ct-org-status is-error ct-org-team-status");
                disclosure.appendChild(message);
              }
              message.textContent = error.message || "Team assignments could not be saved.";
              saveTeams.disabled = false;
              saveTeams.textContent = "Save assignments";
            }
          });
          disclosure.append(select, saveTeams);
        }
        manageCell.appendChild(disclosure);
        tr.append(nameCell, roleCell, teamsCell, manageCell);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrap.appendChild(table);
      roster.appendChild(tableWrap);
    }
    card.appendChild(roster);
    content.appendChild(card);
  }

  function makePoliciesCard(content) {
    const card = el("section", "ct-org-card");
    card.appendChild(cardHeading("§", "Organization policy notes", "Record the operating policies that your organization wants staff to follow. These notes are stored and audited; they do not automatically change task enforcement rules."));
    const form = el("form", "ct-org-form");
    form.appendChild(field("Policies and operating guidance", "policy_text", organization.policy_text, "textarea", {
      rows: 7,
      maxlength: 12000,
      placeholder: "Document cleaning standards, evidence expectations, escalation paths, site rules, and other organization guidance."
    }));
    const msg = el("p", "ct-org-status");
    msg.hidden = true;
    msg.setAttribute("role", "status");
    const save = el("button", "ct-org-button ct-org-button-primary", "Save policy notes");
    save.type = "submit";
    if (organization.status === "archived") save.disabled = true;
    form.append(save, msg);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      save.disabled = true;
      save.textContent = "Saving…";
      status(msg, "", false);
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const result = await API.patch("organizations/current", data);
        organization = result.organization || organization;
        status(msg, result.message || "Organization policy notes saved.", false);
        render(root);
      } catch (error) {
        status(msg, error.message || "Policy notes could not be saved.", true);
        save.disabled = organization.status === "archived";
        save.textContent = "Save policy notes";
      }
    });
    card.appendChild(form);
    content.appendChild(card);
  }

  function makeAuditCard(content) {
    const card = el("section", "ct-org-card");
    card.appendChild(cardHeading("◷", "Organization audit trail", "A record of organization-profile changes, policy-note updates, archive/restore actions, and other supported administrative changes."));
    if (!auditEvents.length) {
      card.appendChild(el("p", "ct-org-empty", "No organization audit entries were returned yet."));
    } else {
      const list = el("div", "ct-org-audit-list");
      auditEvents.forEach(event => {
        const item = el("article", "ct-org-audit-event");
        const top = el("div", "ct-org-audit-event-top");
        top.append(el("strong", "", String(event.action || "organization change").replace(/[._]/g, " ")));
        top.append(el("time", "", dateText(event.created_at)));
        item.appendChild(top);
        item.append(el("p", "", "By " + (event.actor_name || "Unknown account")));
        const fields = event.details && event.details.changed_fields;
        if (Array.isArray(fields) && fields.length) {
          item.append(el("p", "ct-org-muted", "Changed: " + fields.join(", ")));
        } else if (event.details && event.details.message) {
          item.append(el("p", "ct-org-muted", event.details.message));
        }
        list.appendChild(item);
      });
      card.appendChild(list);
    }
    content.appendChild(card);
  }

  function makeDangerCard(content) {
    const card = el("section", "ct-org-card ct-org-danger-card");
    card.appendChild(cardHeading("!", "Organization lifecycle", "Archiving preserves historical records but suspends regular organization access. It is not the same as deleting the organization."));
    const stateRow = el("div", "ct-org-state-row");
    stateRow.append(el("span", "ct-org-muted", "Current status"));
    stateRow.append(el("span", organization.status === "archived" ? "ct-org-status-pill is-archived" : "ct-org-status-pill is-active", organization.status || "unknown"));
    card.appendChild(stateRow);
    if (organization.status === "archived") {
      card.append(el("p", "ct-org-muted", "The organization is archived. Operational APIs are locked, but an Admin can restore it here. Historical records are retained."));
      card.appendChild(button("Restore organization", "ct-org-button ct-org-button-primary", async () => {
        if (!window.confirm("Restore " + organization.name + " and re-enable regular organization access?")) return;
        try {
          const result = await API.post("organizations/current/restore", {});
          organization = result.organization || organization;
          await refresh();
        } catch (error) {
          window.alert(error.message || "The organization could not be restored.");
        }
      }));
    } else {
      card.append(el("p", "ct-org-muted", "Only archive the organization when operations should stop. Existing tasks, audit records, membership requests, and organization data will be retained."));
      card.appendChild(button("Archive organization…", "ct-org-button ct-org-button-danger", async () => {
        const typed = window.prompt("To confirm, type the organization name exactly:\n" + organization.name);
        if (typed === null) return;
        try {
          const result = await API.post("organizations/current/archive", { confirm_name: typed });
          organization = result.organization || organization;
          window.alert(result.message || "Organization archived.");
          await refresh();
        } catch (error) {
          window.alert(error.message || "The organization could not be archived.");
        }
      }));
    }
    content.appendChild(card);
  }

  async function refresh() {
    if (!root || !API) return render(root);
    const user = window.CleanTrackAuth && window.CleanTrackAuth.getCurrentUser
      ? window.CleanTrackAuth.getCurrentUser()
      : null;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      root.replaceChildren(el("p", "ct-org-muted", "Organization settings are available to Admin accounts only."));
      return;
    }
    const content = renderShell();
    try {
      const response = await API.get("organizations/current");
      organization = response.organization || null;
      if (!organization) {
        content.replaceChildren();
        content.appendChild(el("p", "ct-org-empty", "No organization profile is linked to this Admin account yet."));
        return;
      }
    } catch (error) {
      showPageError(error.message || "The organization profile could not be loaded.");
      return;
    }

    members = [];
    options = { teams: [], locations: [], zones: [] };
    pendingCount = null;
    auditEvents = [];

    const requests = [
      API.get("organizations/audit-log?limit=25").then(data => { auditEvents = Array.isArray(data.events) ? data.events : []; }).catch(() => {}),
    ];
    if (organization.status !== "archived") {
      requests.push(
        API.get("organizations/members?days=30").then(data => { members = Array.isArray(data.members) ? data.members : []; }).catch(() => {}),
        API.get("organizations/directory-options").then(data => {
          options = {
            teams: Array.isArray(data.teams) ? data.teams : [],
            locations: Array.isArray(data.locations) ? data.locations : [],
            zones: Array.isArray(data.zones) ? data.zones : []
          };
        }).catch(() => {}),
        API.get("membership/requests").then(data => {
          pendingCount = Array.isArray(data.membership_requests)
            ? data.membership_requests.filter(item => item.status === "pending").length
            : null;
        }).catch(() => {})
      );
    }
    await Promise.all(requests);

    content.replaceChildren();
    if (organization.status === "archived") {
      const banner = el("div", "ct-org-archived-banner");
      banner.append(el("strong", "", "This organization is archived"));
      banner.append(el("p", "", "Regular organization access is suspended. Restore the organization in the lifecycle section below to resume operations."));
      content.appendChild(banner);
    }
    const summary = el("section", "ct-org-summary-strip");
    const identity = el("div", "ct-org-summary-identity");
    if (organization.avatar_url) {
      const image = el("img", "ct-org-summary-avatar");
      image.src = organization.avatar_url;
      image.alt = "";
      image.addEventListener("error", () => image.remove(), { once: true });
      identity.appendChild(image);
    } else {
      identity.appendChild(el("span", "ct-org-summary-avatar-fallback", initials(organization.name)));
    }
    const orgTitle = el("div");
    orgTitle.append(el("h2", "", organization.name || "Organization"));
    orgTitle.append(el("p", "ct-org-muted", organization.contact_email || "No organization contact email is configured."));
    identity.appendChild(orgTitle);
    summary.appendChild(identity);
    const stats = organization.stats || {};
    [
      ["Members", members.length, organization.status === "archived" ? "Roster unavailable while archived" : "Active, approved accounts"],
      ["Teams", stats.teams ?? "—", "Stored organization teams"],
      ["Locations", stats.locations ?? "—", "Stored organization sites"],
      ["Zones", stats.zones ?? "—", "Stored operational zones"]
    ].forEach(([label, value, hint]) => {
      const metric = el("div", "ct-org-summary-metric");
      metric.append(el("span", "", label));
      metric.append(el("strong", "", value));
      metric.append(el("small", "", hint));
      summary.appendChild(metric);
    });
    content.appendChild(summary);

    makeProfileCard(content);
    makeAccessCard(content);
    makePoliciesCard(content);
    makeAuditCard(content);
    makeDangerCard(content);
  }

  function render(container) {
    root = container;
    return refresh();
  }

  window.CleanTrackOrganizationSettings = Object.freeze({ render });
})();
