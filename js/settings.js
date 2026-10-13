(function () {
  "use strict";

  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, onClick) {
    const node = el("button", className || "ct-settings-button", label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function showStatus(node, message, isError) {
    node.textContent = message || "";
    node.className = "ct-settings-status" + (isError ? " is-error" : " is-success");
    node.hidden = !message;
  }

  function render(container) {
    container.replaceChildren();
    const user = AUTH && AUTH.getCurrentUser ? AUTH.getCurrentUser() : null;
    if (!user) {
      container.appendChild(el("p", "ct-settings-muted", "Sign in to view your personal settings."));
      return;
    }

    const role = String(user.role || "").toLowerCase();
    const page = el("section", "ct-settings-page");
    const header = el("header", "ct-settings-header");
    header.append(el("p", "ct-settings-eyebrow", "ACCOUNT"));
    header.append(el("h1", "", "Settings"));
    header.append(el("p", "ct-settings-muted", role === "admin"
      ? "Manage your personal details here. Organization-wide controls live in their own protected section."
      : role === "supervisor"
        ? "Manage your personal details and review the team scope assigned to you."
        : "Manage your personal details for your CleanTrack account."));
    page.appendChild(header);

    const profile = el("section", "ct-settings-card");
    const profileHeader = el("div", "ct-settings-card-header");
    profileHeader.append(el("span", "ct-settings-icon", "♙"));
    const profileHeading = el("div");
    profileHeading.append(el("h2", "", "Personal profile"));
    profileHeading.append(el("p", "ct-settings-muted", "Changes here apply only to your account."));
    profileHeader.appendChild(profileHeading);
    profile.appendChild(profileHeader);

    const form = el("form", "ct-settings-form");
    const nameLabel = el("label", "ct-settings-field");
    nameLabel.append(el("span", "", "Full name"));
    const name = el("input", "ct-settings-input");
    name.name = "full_name";
    name.minLength = 2;
    name.maxLength = 120;
    name.required = true;
    name.autocomplete = "name";
    name.value = user.name || "";
    nameLabel.appendChild(name);

    const phoneLabel = el("label", "ct-settings-field");
    phoneLabel.append(el("span", "", "Phone number"));
    const phone = el("input", "ct-settings-input");
    phone.name = "phone";
    phone.maxLength = 30;
    phone.autocomplete = "tel";
    phone.value = user.phone || "";
    phoneLabel.appendChild(phone);

    const accountGrid = el("dl", "ct-settings-account-data");
    [
      ["Email address", user.email || "Not available"],
      ["Role", role ? role.charAt(0).toUpperCase() + role.slice(1) : "Not available"],
      ["Organization", user.organization_name || user.organizationName || "Not available"],
      ["Account ID", user.id === null || user.id === undefined ? "Not available" : String(user.id)]
    ].forEach(([label, value]) => {
      accountGrid.append(el("dt", "", label));
      accountGrid.append(el("dd", "", value));
    });

    const actions = el("div", "ct-settings-actions");
    const save = el("button", "ct-settings-button ct-settings-button-primary", "Save personal settings");
    save.type = "submit";
    const status = el("p", "ct-settings-status");
    status.hidden = true;
    status.setAttribute("role", "status");
    form.append(nameLabel, phoneLabel, accountGrid, actions);
    actions.appendChild(save);
    form.appendChild(status);
    profile.appendChild(form);
    page.appendChild(profile);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!API || typeof API.patch !== "function") {
        showStatus(status, "The account API is unavailable.", true);
        return;
      }
      save.disabled = true;
      save.textContent = "Saving…";
      showStatus(status, "", false);
      try {
        const response = await API.patch("auth/me", {
          full_name: name.value.trim(),
          phone: phone.value.trim()
        });
        const saved = response && response.user;
        if (saved) {
          user.name = saved.full_name || saved.name || name.value.trim();
          user.phone = saved.phone || "";
          const headerName = document.querySelector(".ct-profile-trigger-name");
          if (headerName) headerName.textContent = user.name || user.email || "Account";
          const legacyHeaderName = document.getElementById("header-user-name");
          if (legacyHeaderName) legacyHeaderName.textContent = user.name || user.email || "Account";
        }
        showStatus(status, "Your personal settings have been saved.", false);
      } catch (error) {
        showStatus(status, error.message || "Unable to save your personal settings.", true);
      } finally {
        save.disabled = false;
        save.textContent = "Save personal settings";
      }
    });

    if (role === "admin") {
      const orgCard = el("section", "ct-settings-card ct-settings-org-card");
      const top = el("div", "ct-settings-card-header");
      top.append(el("span", "ct-settings-icon", "◇"));
      const copy = el("div");
      copy.append(el("h2", "", "Organization settings"));
      copy.append(el("p", "ct-settings-muted", "Organization profile, membership, policies, audit history, and archive controls are kept separate from your personal account."));
      top.appendChild(copy);
      orgCard.appendChild(top);
      orgCard.appendChild(button("Open Organization Settings", "ct-settings-button ct-settings-button-primary", () => {
        if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage("org-settings");
      }));
      page.appendChild(orgCard);
    }

    if (role === "supervisor") {
      const scopeCard = el("section", "ct-settings-card");
      const top = el("div", "ct-settings-card-header");
      top.append(el("span", "ct-settings-icon", "♧"));
      const copy = el("div");
      copy.append(el("h2", "", "Team scope"));
      copy.append(el("p", "ct-settings-muted", "This is the team, location, and zone scope currently assigned to your account. Assigned scope is read-only here; ask an Admin to change assignments. Organization-wide permissions remain Admin-only."));
      top.appendChild(copy);
      scopeCard.appendChild(top);
      const scopeStatus = el("p", "ct-settings-muted", "Loading assigned scope…");
      scopeCard.appendChild(scopeStatus);
      const scopeGroups = el("div", "ct-settings-scope-grid");
      scopeCard.appendChild(scopeGroups);
      page.appendChild(scopeCard);

      API.get("organizations/team-scope").then(data => {
        scopeStatus.textContent = "";
        scopeGroups.replaceChildren();
        const groups = [
          ["Teams", Array.isArray(data.teams) ? data.teams.map(item => item.name) : []],
          ["Locations", Array.isArray(data.locations) ? data.locations.map(item => item.name) : []],
          ["Zones", Array.isArray(data.zones) ? data.zones.map(item => item.name) : []]
        ];
        groups.forEach(([label, values]) => {
          const group = el("div", "ct-settings-scope-group");
          group.append(el("h3", "", label));
          if (!values.length) group.append(el("p", "ct-settings-muted", "No assignments recorded."));
          else {
            const list = el("ul", "ct-settings-chip-list");
            values.forEach(value => list.appendChild(el("li", "", value)));
            group.appendChild(list);
          }
          scopeGroups.appendChild(group);
        });
      }).catch(error => {
        scopeStatus.className = "ct-settings-status is-error";
        scopeStatus.textContent = error.message || "Unable to load your assigned team scope.";
      });
    }

    container.appendChild(page);
  }

  window.CleanTrackSettings = Object.freeze({ render });
})();
