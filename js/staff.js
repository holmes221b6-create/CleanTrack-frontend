(function () {
  "use strict";

  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;
  const WA_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.05 3.2A12.66 12.66 0 0 0 5.2 22.4l-1.7 6.2 6.35-1.66a12.8 12.8 0 1 0 6.2-23.74Zm0 23.1a10.44 10.44 0 0 1-5.32-1.46l-.38-.22-3.77.99 1.01-3.67-.25-.4a10.4 10.4 0 1 1 8.71 4.76Zm5.72-7.78c-.31-.16-1.83-.9-2.11-1-.28-.1-.49-.16-.69.16-.2.31-.8 1-1 1.2-.18.2-.36.23-.67.08-.31-.16-1.3-.48-2.47-1.52-.91-.81-1.53-1.81-1.71-2.12-.18-.31-.02-.48.14-.64.14-.14.31-.36.46-.54.15-.18.2-.31.3-.51.1-.2.05-.39-.02-.54-.08-.15-.69-1.66-.95-2.27-.25-.59-.5-.51-.69-.52l-.59-.01c-.21 0-.54.08-.82.39-.28.31-1.08 1.05-1.08 2.56 0 1.51 1.11 2.97 1.26 3.17.15.2 2.18 3.33 5.28 4.67.74.32 1.32.51 1.77.65.74.24 1.42.21 1.95.13.6-.09 1.83-.75 2.09-1.46.26-.72.26-1.33.18-1.46-.08-.13-.28-.2-.59-.36Z"/></svg>';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function button(label, cls, fn, aria) {
    const n = el("button", cls || "ct-staff-button", label);
    n.type = "button";
    if (aria) n.setAttribute("aria-label", aria);
    if (fn) n.addEventListener("click", fn);
    return n;
  }
  function date(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return window.CleanTrackPreferences && window.CleanTrackPreferences.formatDate
      ? window.CleanTrackPreferences.formatDate(d)
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
  }
  function dateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return window.CleanTrackPreferences && window.CleanTrackPreferences.formatDate
      ? window.CleanTrackPreferences.formatDate(d)
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
  }
  function statusKey(value) {
    return String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }
  function statusLabel(value) {
    return String(value || "unknown").replace(/_/g, " ");
  }
  function initial(value) {
    return String(value || "?").trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase() || "?";
  }
  function notice(root, message, type) {
    const n = root.querySelector("[data-staff-notice]");
    if (!n) return;
    n.textContent = message || "";
    n.className = "ct-staff-notice" + (type ? " is-" + type : "");
    n.hidden = !message;
  }
  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
    const n = el("textarea");
    n.value = value; n.style.position = "fixed"; n.style.opacity = "0";
    document.body.appendChild(n); n.select();
    const copied = document.execCommand("copy"); n.remove();
    if (!copied) return Promise.reject(new Error("Copy was blocked. Select and copy the link manually."));
    return Promise.resolve();
  }
  function supervisorJoinUrl(code) {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("join", code);
    url.searchParams.set("role", "supervisor");
    return url.href;
  }
  function nativeShare(url) {
    const data = {
      title: "CleanTrack — Invite a Supervisor",
      text: "Request to join our CleanTrack organization as a Supervisor. An Admin must approve the request.",
      url: url
    };
    if (navigator.share) {
      return navigator.share(data).then(function () { return true; }).catch(function (error) {
        if (error && error.name === "AbortError") return false;
        return false;
      });
    }
    return Promise.resolve(false);
  }
  function csvCell(value) {
    const v = value === null || value === undefined ? "" : String(value);
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function exportRows(rows) {
    return rows.map(function (m) {
      return {
        name: m.full_name || "",
        email: m.email || "",
        phone: m.phone || "",
        status: m.account_status || "",
        role: m.role || "",
        joined: m.created_at || "",
        teams: (m.team_names || []).join("; "),
        locations: (m.location_names || []).join("; "),
        zones: (m.zone_names || []).join("; "),
        team_size: employeesFor(m, allStaff).length,
        workload_30_days: m.current_workload || 0,
        tasks_30_days: m.total_tasks || 0,
        completed_30_days: m.completed_tasks || 0,
        missed_or_overdue_30_days: m.missed_tasks || 0,
        compliance_pct_30_days: m.compliance_pct === null || m.compliance_pct === undefined ? "" : m.compliance_pct
      };
    });
  }
  function exportCSV(rows) {
    const records = exportRows(rows);
    const headers = records.length ? Object.keys(records[0]) : [
      "name","email","phone","status","role","joined","teams","locations","zones",
      "team_size","workload_30_days","tasks_30_days","completed_30_days","missed_or_overdue_30_days","compliance_pct_30_days"
    ];
    const csv = [headers.join(","), ...records.map(function (r) { return headers.map(function (key) { return csvCell(r[key]); }).join(","); })].join("\r\n");
    download("\uFEFF" + csv, "text/csv;charset=utf-8", "cleantrack-supervisor-directory.csv");
  }
  function download(blobText, mime, filename) {
    const blob = new Blob([blobText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = el("a"); a.href = url; a.download = filename; a.style.display = "none";
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (window.__cleanTrackXlsxPromise) return window.__cleanTrackXlsxPromise;
    window.__cleanTrackXlsxPromise = new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.async = true;
      script.onload = function () {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error("Excel support did not initialize. Save the workbook as CSV and retry."));
      };
      script.onerror = function () { reject(new Error("Excel support could not be loaded. Save the workbook as CSV and retry.")); };
      document.head.appendChild(script);
    });
    return window.__cleanTrackXlsxPromise;
  }
  async function exportXLSX(rows) {
    const XLSX = await loadXlsx();
    const records = exportRows(rows);
    const sheet = XLSX.utils.json_to_sheet(records.length ? records : [{name:"",email:"",status:""}]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Supervisors");
    XLSX.writeFile(book, "cleantrack-supervisor-directory.xlsx");
  }
  function parseCSV(text) {
    const rows = [];
    let row = [], value = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
        else if (ch === '"') quoted = false;
        else value += ch;
      } else if (ch === '"' && value.length === 0) quoted = true;
      else if (ch === ",") { row.push(value); value = ""; }
      else if (ch === "\n") { row.push(value.replace(/\r$/, "")); if (row.some(function (v) { return v.trim(); })) rows.push(row); row = []; value = ""; }
      else value += ch;
    }
    if (value.length || row.length) { row.push(value.replace(/\r$/, "")); if (row.some(function (v) { return v.trim(); })) rows.push(row); }
    if (!rows.length) return [];
    const headers = rows.shift().map(function (h) { return String(h).trim().toLowerCase().replace(/[\s_-]+/g, ""); });
    return rows.map(function (r) {
      const item = {};
      headers.forEach(function (h, i) { item[h] = String(r[i] || "").trim(); });
      return item;
    });
  }
  function rowsFromXlsx(XLSX, data) {
    const book = XLSX.read(data, { type: "array" });
    const sheetName = book.SheetNames[0];
    if (!sheetName) throw new Error("The workbook does not contain a worksheet.");
    return XLSX.utils.sheet_to_json(book.Sheets[sheetName], { defval: "" }).map(function (r) {
      const item = {};
      Object.keys(r).forEach(function (k) {
        item[String(k).trim().toLowerCase().replace(/[\s_-]+/g, "")] = String(r[k] === null || r[k] === undefined ? "" : r[k]).trim();
      });
      return item;
    });
  }
  function normalizeEmailRow(row) {
    return String(row.email || row.emailaddress || row.workemail || "").trim().toLowerCase();
  }
  function employeesFor(supervisor, members) {
    const ids = new Set((supervisor.team_ids || []).map(String));
    const names = new Set((supervisor.team_names || []).map(String));
    if (!ids.size && !names.size) return [];
    return members.filter(function (member) {
      if (String(member.role || "").toLowerCase() !== "employee") return false;
      const memberIds = (member.team_ids || []).map(String);
      const memberNames = (member.team_names || []).map(String);
      return memberIds.some(function (id) { return ids.has(id); }) || memberNames.some(function (name) { return names.has(name); });
    });
  }
  function getAuditFor(member) {
    return auditEvents.filter(function (event) {
      const details = event.details || {};
      if (String(event.resource_id || "") === String(member.id) && String(event.resource_type || "").toLowerCase() === "user") return true;
      return String(details.member_id || "") === String(member.id) || String(details.user_id || "") === String(member.id);
    }).slice(0, 12);
  }
  function filterStatus(member, value) {
    const status = String(member.account_status || "").toLowerCase();
    if (value === "active") return status === "active";
    if (value === "inactive") return status === "suspended" || status === "terminated";
    if (value === "termination_pending") return status === "termination_pending";
    if (value === "terminated") return status === "terminated";
    if (value === "suspended") return status === "suspended";
    return true;
  }
  function makeStatus(member) {
    const status = String(member.account_status || "unknown").toLowerCase();
    const label = statusLabel(status);
    return el("span", "ct-staff-status ct-staff-status--" + statusKey(status), label);
  }
  let allStaff = [];
  let supervisors = [];
  let auditEvents = [];
  let teamOptions = [];
  let organization = {};
  let summary = {};
  let selectedId = null;
  let selectedIds = new Set();
  let sideFilter = "all";
  let searchControl, statusControl, teamControl, locationControl, zoneControl;
  let directoryList, sideList, profileHost, pageRoot, waButton;
  let orgJoinLink = "";
  let savedWhatsAppGroupLink = "";

  function printPDF(rows) {
    const records = exportRows(rows);
    const body = records.map(function (r) {
      return "<tr>" + Object.values(r).map(function (v) { return "<td>" + String(v === null || v === undefined ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</td>"; }).join("") + "</tr>";
    }).join("");
    const title = "CleanTrack Supervisor Directory";
    const win = window.open("", "_blank");
    if (!win) { notice(pageRoot, "Pop-up blocked. Use Export CSV or Export Excel instead.", "error"); return; }
    const headers = records.length ? Object.keys(records[0]) : ["name","email","status","teams"];
    win.document.write("<!doctype html><html><head><title>" + title + "</title><style>body{font:12px Arial,sans-serif;padding:20px;color:#111}h1{font-size:20px}p{color:#555}table{width:100%;border-collapse:collapse;font-size:9px}td,th{border:1px solid #ccc;padding:5px;text-align:left;overflow-wrap:anywhere}th{background:#eee} @media print{@page{size:landscape;margin:10mm}}</style></head><body><h1>" + title + "</h1><p>Generated " + new Date().toLocaleString() + ". Source: current CleanTrack supervisor directory.</p><table><thead><tr>" + headers.map(function (h) { return "<th>" + h.replace(/</g,"&lt;") + "</th>"; }).join("") + "</tr></thead><tbody>" + body + "</tbody></table><script>window.onload=function(){window.print();};<\/script></body></html>");
    win.document.close();
  }

  function filteredSupervisors() {
    const query = searchControl.value.trim().toLowerCase();
    return supervisors.filter(function (m) {
      const haystack = [m.full_name,m.email,m.phone,m.account_status,(m.team_names||[]).join(" "),(m.location_names||[]).join(" "),(m.zone_names||[]).join(" ")]
        .map(function (v) { return String(v || "").toLowerCase(); }).join(" ");
      if (query && !haystack.includes(query)) return false;
      if (!filterStatus(m, statusControl.value)) return false;
      if (teamControl.value && !(m.team_names || []).includes(teamControl.value)) return false;
      if (locationControl.value && !(m.location_names || []).includes(locationControl.value)) return false;
      if (zoneControl.value && !(m.zone_names || []).includes(zoneControl.value)) return false;
      return true;
    });
  }
  function renderStats() {
    const values = {
      total: summary.total_staff ?? allStaff.length,
      supervisors: summary.supervisors ?? supervisors.length,
      employees: summary.employees ?? allStaff.filter(function (m) { return String(m.role).toLowerCase() === "employee"; }).length,
      active: summary.active ?? allStaff.filter(function (m) { return m.account_status === "active"; }).length,
      inactive: summary.inactive ?? allStaff.filter(function (m) { return ["suspended","terminated"].includes(String(m.account_status).toLowerCase()); }).length,
      pending: summary.pending_invitations ?? 0,
      termination: summary.termination_pending ?? allStaff.filter(function (m) { return m.account_status === "termination_pending"; }).length
    };
    Object.keys(values).forEach(function (key) {
      const node = pageRoot.querySelector('[data-staff-stat="' + key + '"]');
      if (node) node.textContent = String(values[key]);
    });
  }
  function renderSidebar() {
    sideList.replaceChildren();
    const options = supervisors.filter(function (m) {
      if (sideFilter === "active") return m.account_status === "active";
      if (sideFilter === "inactive") return m.account_status === "suspended" || m.account_status === "terminated";
      if (sideFilter === "termination_pending") return m.account_status === "termination_pending";
      return true;
    });
    pageRoot.querySelectorAll("[data-side-filter]").forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.sideFilter === sideFilter);
      b.setAttribute("aria-pressed", b.dataset.sideFilter === sideFilter ? "true" : "false");
    });
    if (!options.length) {
      sideList.appendChild(el("p", "ct-staff-muted ct-staff-side-empty", "No supervisors in this status group."));
      return;
    }
    options.forEach(function (m) {
      const b = button("", "ct-staff-side-item" + (String(selectedId) === String(m.id) ? " is-selected" : ""), function () {
        selectedId = m.id; renderSidebar(); renderDirectory(); renderProfile();
      });
      b.append(el("span", "ct-staff-avatar", initial(m.full_name)),
        el("span", "ct-staff-side-copy", m.full_name || m.email || "Supervisor"),
        makeStatus(m));
      sideList.appendChild(b);
    });
  }
  function renderDirectory() {
    directoryList.replaceChildren();
    const rows = filteredSupervisors();
    pageRoot.querySelector("[data-staff-result-count]").textContent = rows.length + (rows.length === 1 ? " supervisor" : " supervisors");
    if (!rows.length) {
      directoryList.appendChild(el("div", "ct-staff-empty", supervisors.length ? "No supervisors match these search and filter options." : "No supervisors are recorded in this organization yet."));
      renderBulkActions();
      return;
    }
    rows.forEach(function (m) {
      const card = el("article", "ct-staff-directory-row" + (String(selectedId) === String(m.id) ? " is-selected" : ""));
      const select = el("input", "ct-staff-select");
      select.type = "checkbox"; select.checked = selectedIds.has(String(m.id));
      select.setAttribute("aria-label", "Select " + (m.full_name || "supervisor"));
      select.addEventListener("click", function (event) { event.stopPropagation(); });
      select.addEventListener("change", function () {
        if (select.checked) selectedIds.add(String(m.id)); else selectedIds.delete(String(m.id));
        renderBulkActions();
      });
      const avatar = el("span", "ct-staff-avatar", initial(m.full_name));
      const identity = el("button", "ct-staff-directory-identity", function () {});
      identity.type = "button";
      identity.replaceChildren(avatar, el("span", "ct-staff-directory-name", m.full_name || "Name unavailable"));
      identity.appendChild(el("span", "ct-staff-muted", m.email || "Email unavailable"));
      identity.addEventListener("click", function () { selectedId = m.id; renderSidebar(); renderDirectory(); renderProfile(); });
      const meta = el("div", "ct-staff-directory-meta");
      meta.append(makeStatus(m));
      meta.append(el("span", "ct-staff-mini-meta", (m.team_names || []).length + " teams"));
      meta.append(el("span", "ct-staff-mini-meta", employeesFor(m, allStaff).length + " employees"));
      meta.append(el("span", "ct-staff-mini-meta", (m.location_names || []).length + " locations"));
      card.append(select, identity, meta);
      card.addEventListener("click", function (event) {
        if (event.target.closest("input,button")) return;
        selectedId = m.id; renderSidebar(); renderDirectory(); renderProfile();
      });
      directoryList.appendChild(card);
    });
    renderBulkActions();
  }
  function renderBulkActions() {
    const host = pageRoot.querySelector("[data-staff-bulk]");
    host.replaceChildren();
    const selected = supervisors.filter(function (m) { return selectedIds.has(String(m.id)); });
    if (!selected.length) { host.hidden = true; return; }
    host.hidden = false;
    host.append(el("span", "ct-staff-bulk-count", selected.length + " selected"));
    host.appendChild(button("Assign teams", "ct-staff-button", function () { openAssignTeams(selected); }));
    host.appendChild(button("Schedule termination", "ct-staff-button ct-staff-button--danger", function () { scheduleTermination(selected); }));
    if (selected.some(function (m) { return m.account_status === "active" || m.account_status === "termination_pending"; })) host.appendChild(button("Suspend immediately", "ct-staff-button ct-staff-button--danger", function () { suspendMembers(selected); }));
    host.appendChild(button("Clear", "ct-staff-button ct-staff-button--quiet", function () { selectedIds.clear(); renderDirectory(); }));
  }
  function renderProfile() {
    profileHost.replaceChildren();
    const m = supervisors.find(function (row) { return String(row.id) === String(selectedId); });
    if (!m) {
      profileHost.appendChild(el("div", "ct-staff-empty", "Select a supervisor from the directory to inspect their profile."));
      return;
    }
    const employees = employeesFor(m, allStaff);
    const top = el("div", "ct-staff-profile-head");
    const avatar = el("span", "ct-staff-avatar ct-staff-avatar--large", initial(m.full_name));
    const name = el("div");
    name.append(el("p", "ct-staff-eyebrow", "SUPERVISOR PROFILE"), el("h2", "", m.full_name || "Name unavailable"), el("p", "ct-staff-muted", m.email || "Email unavailable"));
    const right = el("div", "ct-staff-profile-status"); right.append(makeStatus(m));
    top.append(avatar,name,right); profileHost.appendChild(top);

    const metrics = el("div", "ct-staff-profile-metrics");
    [
      ["Team size", employees.length],
      ["Current workload", m.current_workload ?? 0],
      ["Tasks (30 days)", m.total_tasks ?? 0],
      ["Completed", m.completed_tasks ?? 0],
      ["Missed / overdue", m.missed_tasks ?? 0],
      ["Compliance", m.compliance_pct === null || m.compliance_pct === undefined ? "No data" : m.compliance_pct + "%"]
    ].forEach(function (pair) {
      const item = el("div", "ct-staff-profile-metric"); item.append(el("span","",pair[0]),el("strong","",pair[1])); metrics.appendChild(item);
    });
    profileHost.appendChild(metrics);

    const info = el("div", "ct-staff-detail-grid");
    const infoData = [
      ["Email",m.email || "Not provided"],["Phone",m.phone || "Not provided"],
      ["Joined",date(m.created_at)],["Account status",statusLabel(m.account_status)],
      ["Assigned teams",(m.team_names||[]).join(", ") || "No team assignment"],
      ["Managed locations",(m.location_names||[]).join(", ") || "No assigned location"],
      ["Managed zones",(m.zone_names||[]).join(", ") || "No assigned zone"],
      ["Task metrics period","Last 30 days, based on assigned operations"]
    ];
    infoData.forEach(function (pair) {
      const item = el("div", "ct-staff-detail-item");
      item.append(el("span","",pair[0]),el("strong","",pair[1]));
      info.appendChild(item);
    });
    profileHost.appendChild(info);

    const employeeSection = el("section", "ct-staff-subsection");
    employeeSection.append(el("h3", "", "Employees working with this supervisor"),
      el("p", "ct-staff-muted", "Employees assigned to at least one of this supervisor’s teams. The Admin view does not provide a separate employee directory."));
    if (!employees.length) employeeSection.appendChild(el("div", "ct-staff-empty", "No employee/team overlap is recorded for this supervisor."));
    else employees.forEach(function (member) {
      const row = el("div", "ct-staff-employee-row");
      const who = el("div");
      who.append(el("strong","",member.full_name || "Name unavailable"),el("span","ct-staff-muted",member.email || "Email unavailable"));
      row.append(who,makeStatus(member));
      const assignedTeams = (member.team_names || []).filter(function (team) { return (m.team_names || []).includes(team); });
      row.append(el("span","ct-staff-mini-meta",assignedTeams.join(", ") || "Shared team"));
      if (member.account_status === "active") {
        row.appendChild(button("Terminate…", "ct-staff-button ct-staff-button--danger ct-staff-button--small", function () { scheduleTermination([member]); }));
        row.appendChild(button("Suspend", "ct-staff-button ct-staff-button--danger ct-staff-button--small", function () { suspendMembers([member]); }));
      } else if (member.account_status === "termination_pending") {
        row.appendChild(button("Cancel termination", "ct-staff-button ct-staff-button--small", function () { cancelTermination(member); }));
        row.appendChild(button("Suspend now", "ct-staff-button ct-staff-button--danger ct-staff-button--small", function () { suspendMembers([member]); }));
      } else if (member.account_status === "suspended") {
        row.appendChild(button("Restore access", "ct-staff-button ct-staff-button--small", function () { restoreSuspension(member); }));
      }
      employeeSection.appendChild(row);
    });
    profileHost.appendChild(employeeSection);

    const activity = el("section", "ct-staff-subsection");
    activity.append(el("h3", "", "Activity and history"), el("p", "ct-staff-muted", "Relevant entries from the organization audit trail, when available."));
    const events = getAuditFor(m);
    if (!events.length) activity.appendChild(el("div", "ct-staff-empty", "No matching staff audit events were returned for this person."));
    else {
      const list = el("div", "ct-staff-audit-list");
      events.forEach(function (event) {
        const row = el("div", "ct-staff-audit-event");
        const actionLabel = String(event.action || "audit event").replace(/[._]/g," ");
        row.append(el("strong","",actionLabel),el("span","ct-staff-muted",dateTime(event.created_at)));
        if (event.details && event.details.message) row.appendChild(el("p","ct-staff-muted",event.details.message));
        list.appendChild(row);
      });
      activity.appendChild(list);
    }
    profileHost.appendChild(activity);

    const actions = el("div", "ct-staff-profile-actions");
    if (m.account_status === "active") {
      actions.appendChild(button("Schedule termination (7 days)", "ct-staff-button ct-staff-button--danger", function () { scheduleTermination([m]); }));
      actions.appendChild(button("Suspend immediately", "ct-staff-button ct-staff-button--danger", function () { suspendMembers([m]); }));
    } else if (m.account_status === "termination_pending") {
      actions.appendChild(button("Cancel pending termination", "ct-staff-button", function () { cancelTermination(m); }));
      actions.appendChild(button("Suspend immediately", "ct-staff-button ct-staff-button--danger", function () { suspendMembers([m]); }));
      actions.appendChild(el("p","ct-staff-muted","Effective date: "+dateTime(m.termination_effective_at)+". Existing access remains until the deadline unless an Admin suspends it."));
    } else if (m.account_status === "suspended") {
      actions.appendChild(button("Restore access", "ct-staff-button ct-staff-button--primary", function () { restoreSuspension(m); }));
    }
    actions.appendChild(button("Open supervisor team assignments", "ct-staff-button", function () {
      if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage("teams");
    }));
    profileHost.appendChild(actions);
  }
  async function scheduleTermination(records) {
    const eligible = records.filter(function (m) { return m.account_status === "active"; });
    if (!eligible.length) { notice(pageRoot, "Only active members can be scheduled for termination.", "error"); return; }
    const names = eligible.map(function (m) { return m.full_name || m.email || ("Member #" + m.id); });
    if (!window.confirm("Schedule a seven-day termination for " + names.join(", ") + "?\nAccess remains unchanged during the grace period. At the deadline, the backend marks the account terminated; historical records are retained.")) return;
    let success = 0, failed = [];
    for (const member of eligible) {
      try { await API.post("organizations/members/" + member.id + "/termination", {}); success++; }
      catch (error) { failed.push((member.full_name || member.email || member.id) + ": " + (error.message || "failed")); }
    }
    notice(pageRoot, "Termination scheduled for " + success + " member(s)." + (failed.length ? " Failed: " + failed.join("; ") : ""), failed.length ? "error" : "success");
    await loadData(false);
  }
  async function suspendMembers(records) {
    const eligible = records.filter(function (m) { return m.account_status === "active" || m.account_status === "termination_pending"; });
    if (!eligible.length) { notice(pageRoot, "Only active or termination-pending members can be suspended.", "error"); return; }
    const reason = window.prompt("Document the urgent reason for immediate suspension (minimum 10 characters). This reason is recorded in the organization audit trail:");
    if (reason === null) return;
    if (reason.trim().length < 10) { notice(pageRoot, "Enter a documented suspension reason with at least 10 characters.", "error"); return; }
    if (!window.confirm("Immediately suspend access for " + eligible.map(function (m) { return m.full_name || m.email || ("Member #" + m.id); }).join(", ") + "?\nThis is intended for a credible security threat, suspected account compromise, abuse, or another documented urgent reason.")) return;
    let success=0, failed=[];
    for (const member of eligible) {
      try { await API.post("organizations/members/" + member.id + "/suspend", {reason:reason.trim()}); success++; }
      catch(error) { failed.push((member.full_name || member.email || member.id) + ": " + (error.message || "failed")); }
    }
    notice(pageRoot, "Immediately suspended " + success + " member(s)." + (failed.length ? " Failed: " + failed.join("; ") : ""), failed.length ? "error" : "success");
    await loadData(false);
  }
  async function restoreSuspension(member) {
    if (!window.confirm("Restore access for " + (member.full_name || member.email || "this member") + "? If a seven-day termination is still scheduled, that schedule remains in force.")) return;
    try {
      const result=await API.post("organizations/members/" + member.id + "/suspend/restore", {});
      notice(pageRoot, result.message || "Member access restored.", "success");
      await loadData(false);
    } catch(error) { notice(pageRoot, error.message || "Could not restore member access.", "error"); }
  }
  async function cancelTermination(member) {
    if (!window.confirm("Cancel the pending termination for " + (member.full_name || member.email) + "?")) return;
    try {
      const out = await API.post("organizations/members/" + member.id + "/termination/cancel", {});
      notice(pageRoot, out.message || "Pending termination cancelled.", "success");
      await loadData(false);
    } catch (error) { notice(pageRoot, error.message || "Could not cancel termination.", "error"); }
  }
  function openAssignTeams(records) {
    const eligible = records.filter(function (m) { return m.account_status === "active"; });
    if (!eligible.length) { notice(pageRoot, "Team assignments can only be updated for active members.", "error"); return; }
    const dialog = el("dialog","ct-staff-dialog");
    const form = el("form","ct-staff-dialog-form"); form.method = "dialog";
    form.append(el("p","ct-staff-eyebrow","BULK TEAM ASSIGNMENT"),el("h2","","Assign teams to selected supervisors"),
      el("p","ct-staff-muted","Select teams for " + eligible.length + " supervisor(s). Saving uses the organization team-assignment API and writes audit entries."));
    const group = el("div","ct-staff-dialog-options");
    const currentIds = new Set(eligible.length === 1 ? (eligible[0].team_ids || []).map(String) : []);
    teamOptions.forEach(function (team) {
      const label = el("label","ct-staff-check");
      const input = el("input"); input.type="checkbox"; input.value=String(team.id); input.checked=currentIds.has(String(team.id));
      label.append(input,el("span","",team.name)); group.appendChild(label);
    });
    if (!teamOptions.length) group.appendChild(el("p","ct-staff-muted","No active teams are available to assign."));
    form.appendChild(group);
    const actions = el("div","ct-staff-dialog-actions");
    const save = button("Save assignments","ct-staff-button ct-staff-button--primary",null);
    save.type="submit";
    const cancel = button("Cancel","ct-staff-button",function () { dialog.close(); });
    actions.append(save,cancel); form.appendChild(actions); dialog.appendChild(form); pageRoot.appendChild(dialog);
    dialog.addEventListener("close",function(){dialog.remove();});
    save.addEventListener("click",function(event){event.preventDefault();form.requestSubmit();});
    form.addEventListener("submit",async function(event){
      event.preventDefault(); save.disabled=true; save.textContent="Saving…";
      const ids=Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(function(n){return Number(n.value);});
      let success=0, failed=[];
      for(const member of eligible){
        try{await API.post("organizations/members/"+member.id+"/teams",{team_ids:ids});success++;}
        catch(error){failed.push((member.full_name||member.email)+": "+(error.message||"failed"));}
      }
      dialog.close();
      notice(pageRoot,"Team assignments saved for "+success+" supervisor(s)."+(failed.length?" Failed: "+failed.join("; "):""),failed.length?"error":"success");
      await loadData(false);
    });
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open","");
  }
  function openWhatsAppSetup(forceEdit) {
    if (savedWhatsAppGroupLink && !forceEdit) { window.open(savedWhatsAppGroupLink,"_blank","noopener,noreferrer"); return; }
    let win = null;
    if (!savedWhatsAppGroupLink) { win = window.open("https://web.whatsapp.com/","_blank"); if (win) win.opener = null; }
    const dialog = el("dialog","ct-staff-dialog");
    const form = el("form","ct-staff-dialog-form"); form.method="dialog";
    form.append(el("p","ct-staff-eyebrow","SUPERVISOR WHATSAPP GROUP"),el("h2","","Connect the supervisor group"),
      el("p","ct-staff-muted","WhatsApp requires an Admin to create the group and invite contacts. CleanTrack cannot create WhatsApp groups on your behalf. After creating the group, copy its invite link from WhatsApp and save it here. This link is shared for the organization and is only editable by an Admin."));
    const info=el("div","ct-staff-whatsapp-contacts");
    info.append(el("strong","",supervisors.length+" supervisor contact(s) in CleanTrack"));
    supervisors.forEach(function(m){
      const row=el("div","ct-staff-wa-contact");
      row.append(el("span","",m.full_name||m.email||"Supervisor"),el("span","ct-staff-muted",m.phone||"Phone not provided"));
      if(m.phone) row.appendChild(button("Open chat","ct-staff-icon-button",function(){
        const phone=String(m.phone).replace(/[^\d]/g,"");
        if(phone)window.open("https://wa.me/"+phone,"_blank","noopener,noreferrer");
      },"Open WhatsApp chat with "+(m.full_name||"supervisor")));
      info.appendChild(row);
    });
    const link=el("input","ct-staff-input");link.type="url";link.placeholder="https://chat.whatsapp.com/…";link.required=true;link.value=savedWhatsAppGroupLink||"";
    form.appendChild(info);
    const field=el("label","ct-staff-field");field.append(el("span","","WhatsApp group invite link"),link);form.appendChild(field);
    const actions=el("div","ct-staff-dialog-actions");
    const save=button("Save group link","ct-staff-button ct-staff-button--primary",null);save.type="submit";
    const open=button("Open WhatsApp","ct-staff-button",function(){window.open("https://web.whatsapp.com/","_blank","noopener,noreferrer");});
    const cancel=button("Cancel","ct-staff-button",function(){dialog.close();});
    actions.append(save,open,cancel);form.appendChild(actions);dialog.appendChild(form);pageRoot.appendChild(dialog);
    dialog.addEventListener("close",function(){dialog.remove();});
    save.addEventListener("click",function(event){event.preventDefault();form.requestSubmit();});
    form.addEventListener("submit",async function(event){
      event.preventDefault();
      const value=link.value.trim();
      let parsed;try{parsed=new URL(value);}catch(_){notice(pageRoot,"Enter a valid WhatsApp group invite URL.","error");return;}
      if(parsed.protocol!=="https:"||parsed.hostname.toLowerCase()!=="chat.whatsapp.com"||!parsed.pathname.replace(/\//g,"")){
        notice(pageRoot,"The link must start with https://chat.whatsapp.com/ and include an invite code.","error");return;
      }
      save.disabled=true;save.textContent="Saving…";
      try{
        const result=await API.patch("organizations/current",{whatsapp_supervisors_group_url:value});
        organization=result.organization||organization;savedWhatsAppGroupLink=organization.whatsapp_supervisors_group_url||value;
        if(waButton)waButton.title="Open supervisor WhatsApp group";
        notice(pageRoot,"Supervisor WhatsApp group link saved to the organization. The WhatsApp icon now opens this group.","success");
        dialog.close();
      }catch(error){notice(pageRoot,error.message||"Could not save the group link.","error");save.disabled=false;save.textContent="Save group link";}
    });
    if (typeof dialog.showModal==="function") dialog.showModal(); else dialog.setAttribute("open","");
    if(!savedWhatsAppGroupLink && !win) notice(pageRoot,"Your browser blocked the new tab. Use Open WhatsApp in the setup panel.","error");
  }
  async function importFile(file) {
    if (!file) return;
    const ext=(file.name.split(".").pop()||"").toLowerCase();
    if (!["csv","xlsx","xls"].includes(ext)) { notice(pageRoot,"Choose a CSV or Excel workbook (.xlsx).","error"); return; }
    let rows;
    try {
      if(ext==="csv") rows=parseCSV(await file.text());
      else {
        const XLSX=await loadXlsx();
        rows=rowsFromXlsx(XLSX,await file.arrayBuffer());
      }
    } catch(error) { notice(pageRoot,error.message||"The file could not be read.","error"); return; }
    const emails=Array.from(new Set(rows.map(normalizeEmailRow).filter(Boolean)));
    if(!emails.length){notice(pageRoot,"No email column found. Include a header named Email and one email address per row.","error");return;}
    const invalid=emails.filter(function(email){return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);});
    const valid=emails.filter(function(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);});
    if(!valid.length){notice(pageRoot,"No valid email addresses were found.","error");return;}
    if(!window.confirm("Import "+valid.length+" valid supervisor email(s) from "+file.name+"?\n\nThis creates invitation records only. It does not create accounts or overwrite existing member data; recipients must accept and membership remains subject to Admin approval.")) return;
    let created=0, failed=[];
    for(const email of valid){
      try{await API.post("invitations",{email:email,role:"Supervisor"});created++;}
      catch(error){failed.push(email+": "+(error.message||"could not create invitation"));}
    }
    const msg="Created "+created+" supervisor invitation(s). Invalid email rows: "+invalid.length+". Skipped/failed: "+failed.length+"."+(failed.length?" Details: "+failed.slice(0,5).join("; "):"");
    notice(pageRoot,msg,failed.length||invalid.length?"error":"success");
    await loadData(false);
  }
  function inviteSupervisors() {
    if(!orgJoinLink){notice(pageRoot,"The organization join link is not available yet. Refresh and try again.","error");return;}
    nativeShare(orgJoinLink).then(function(shared){
      if(shared){notice(pageRoot,"Supervisor invitation link shared. Membership still requires Admin approval.","success");return;}
      const tools=pageRoot.querySelector("[data-invite-fallback]");
      if(tools){tools.hidden=false;tools.scrollIntoView({behavior:"smooth",block:"nearest"});}
    });
  }
  async function loadData(initial) {
    if(initial) notice(pageRoot,"Loading supervisor directory from the organization database…");
    const result=await Promise.allSettled([
      API.get("organizations/staff"),
      API.get("organizations/current"),
      API.get("membership/requests?status=pending"),
      API.get("organizations/audit-log?limit=200"),
      API.get("organizations/directory-options")
    ]);
    if(result[0].status!=="fulfilled"){
      notice(pageRoot,result[0].reason?.message||"Could not load organization staff. Check your connection and permissions.","error");
      return;
    }
    const data=result[0].value||{};
    allStaff=Array.isArray(data.staff)?data.staff:[];
    supervisors=allStaff.filter(function(m){return String(m.role||"").toLowerCase()==="supervisor";});
    summary=data.summary||{};
    if(result[1].status==="fulfilled"){
      organization=result[1].value.organization||{};
      savedWhatsAppGroupLink=organization.whatsapp_supervisors_group_url||"";
      if(waButton)waButton.title=savedWhatsAppGroupLink?"Open supervisor WhatsApp group":"Create supervisor WhatsApp group";
      const code=organization.code||organization.organization_code||"";
      orgJoinLink=code?supervisorJoinUrl(code):"";
    }
    if(result[2].status==="fulfilled"){
      const payload=result[2].value||{};
      const requests=payload.membership_requests||payload.requests||[];
      summary.pending_requests=Array.isArray(requests)?requests.length:0;
    }
    if(result[3].status==="fulfilled"){
      auditEvents=Array.isArray(result[3].value.events)?result[3].value.events:[];
    } else auditEvents=[];
    if(result[4].status==="fulfilled"){
      teamOptions=Array.isArray(result[4].value.teams)?result[4].value.teams:[];
    }
    const available = function(prop){return Array.from(new Set(supervisors.flatMap(function(m){return Array.isArray(m[prop])?m[prop]:[];}))).filter(Boolean).sort(function(a,b){return String(a).localeCompare(String(b));});};
    function refreshOptions(selectNode, items, saved) {
      const current=selectNode.value;
      selectNode.replaceChildren();
      selectNode.appendChild(new Option("All "+saved,""));
      items.forEach(function(value){selectNode.appendChild(new Option(value,value));});
      selectNode.value=items.includes(current)?current:"";
    }
    refreshOptions(teamControl,available("team_names"),"teams");
    refreshOptions(locationControl,available("location_names"),"locations");
    refreshOptions(zoneControl,available("zone_names"),"zones");
    renderStats();renderSidebar();renderDirectory();
    if(!supervisors.some(function(m){return String(m.id)===String(selectedId);})) selectedId=(supervisors.find(function(m){return m.account_status==="active";})||supervisors[0]||{}).id||null;
    renderSidebar();renderDirectory();renderProfile();
    if(initial) notice(pageRoot,"Supervisor directory and summary counts loaded from CleanTrack records.","success");
  }

  function build(root) {
    root.replaceChildren();
    const user=AUTH&&AUTH.getCurrentUser?AUTH.getCurrentUser():null;
    if(!user||String(user.role||"").toLowerCase()!=="admin"){root.appendChild(el("p","ct-staff-muted","Supervisor administration is available to organization Admins only."));return;}
    allStaff=[];supervisors=[];auditEvents=[];teamOptions=[];organization={};summary={};selectedId=null;selectedIds=new Set();
    pageRoot=el("section","ct-staff-page");
    const header=el("header","ct-staff-header");
    const intro=el("div");
    intro.append(el("p","ct-staff-eyebrow","PEOPLE AND ACCESS"),el("h1","","Supervisor Directory"),
      el("p","ct-staff-muted","Search supervisors, review teams and shared employees, monitor workload, and manage termination status. The Admin Staff page does not expose a separate employee directory."));
    const toolbar=el("div","ct-staff-toolbar");
    const fileInput=el("input","ct-staff-file-input");fileInput.type="file";fileInput.accept=".csv,.xlsx,.xls";fileInput.hidden=true;
    const importButton=button("Import report","ct-staff-button",function(){fileInput.click();});
    const csvButton=button("Export CSV","ct-staff-button",function(){const rows=filteredSupervisors();exportCSV(rows);notice(pageRoot,"Exported "+rows.length+" supervisor record(s) to CSV.","success");});
    const xlsxButton=button("Export Excel","ct-staff-button",async function(){try{const rows=filteredSupervisors();await exportXLSX(rows);notice(pageRoot,"Exported "+rows.length+" supervisor record(s) to Excel.","success");}catch(error){notice(pageRoot,error.message||"Excel export failed.","error");}});
    const pdfButton=button("Print / Save PDF","ct-staff-button",function(){printPDF(filteredSupervisors());});
    waButton=button("", "ct-staff-icon-button ct-staff-whatsapp-icon",openWhatsAppSetup,"Supervisor WhatsApp group");
    waButton.innerHTML=WA_ICON;waButton.title="Create supervisor WhatsApp group";
    const waLabel=el("span","ct-staff-sr-only","Supervisor WhatsApp group");
    waButton.appendChild(waLabel);
    const waEditButton=button("✎","ct-staff-icon-button ct-staff-whatsapp-edit",function(){openWhatsAppSetup(true);},"Edit supervisor WhatsApp group link");
    waEditButton.title="Edit supervisor WhatsApp group link";
    toolbar.append(importButton,csvButton,xlsxButton,pdfButton,waButton,waEditButton,fileInput);
    fileInput.addEventListener("change",function(){const file=fileInput.files&&fileInput.files[0];if(file)importFile(file);fileInput.value="";});
    header.append(intro,toolbar);pageRoot.appendChild(header);
    const note=el("div","ct-staff-notice");note.dataset.staffNotice="true";note.hidden=true;note.setAttribute("role","status");pageRoot.appendChild(note);

    const stats=el("div","ct-staff-summary");
    [["Total staff","total"],["Supervisors","supervisors"],["Employees","employees"],["Active staff","active"],["Inactive staff","inactive"],["Pending invites","pending"],["Termination pending","termination"]].forEach(function(pair){
      const item=el("article","ct-staff-kpi");item.append(el("span","",pair[0]),el("strong","","—"));item.querySelector("strong").dataset.staffStat=pair[1];stats.appendChild(item);
    });
    pageRoot.appendChild(stats);

    const layout=el("div","ct-staff-layout");
    const sidebar=el("aside","ct-staff-sidebar");
    sidebar.append(el("h2","","Supervisors"),el("p","ct-staff-muted","Choose a supervisor to open their profile."));
    const sideFilters=el("div","ct-staff-side-filters");
    [["all","All"],["active","Active"],["inactive","Inactive"],["termination_pending","Pending termination"]].forEach(function(pair){
      const b=button(pair[1],"ct-staff-side-filter",function(){sideFilter=pair[0];renderSidebar();});
      b.dataset.sideFilter=pair[0];sideFilters.appendChild(b);
    });
    sidebar.appendChild(sideFilters);sideList=el("div","ct-staff-side-list");sidebar.appendChild(sideList);

    const main=el("div","ct-staff-main");
    const directory=el("section","ct-staff-card ct-staff-directory-card");
    const dhead=el("div","ct-staff-card-head");
    const dtitle=el("div");dtitle.append(el("h2","","Supervisor directory"),el("p","ct-staff-muted","Use the filters to narrow results. Select one or more records for bulk actions."));
    dhead.append(dtitle,button("Refresh","ct-staff-button",function(){loadData(false).catch(function(e){notice(pageRoot,e.message||"Could not refresh staff.","error");});}));
    directory.appendChild(dhead);
    searchControl=el("input","ct-staff-input");searchControl.type="search";searchControl.placeholder="Search supervisor name, email, team, location or zone";searchControl.setAttribute("aria-label","Search supervisor directory");
    directory.appendChild(searchControl);
    const filters=el("div","ct-staff-filters");
    statusControl=el("select","ct-staff-input");[["","All statuses"],["active","Active"],["inactive","Inactive"],["termination_pending","Termination pending"],["suspended","Suspended"],["terminated","Terminated"]].forEach(function(pair){statusControl.appendChild(new Option(pair[1],pair[0]));});
    teamControl=el("select","ct-staff-input");locationControl=el("select","ct-staff-input");zoneControl=el("select","ct-staff-input");
    filters.append(statusControl,teamControl,locationControl,zoneControl);directory.appendChild(filters);
    const resultCount=el("p","ct-staff-muted","Loading supervisors…");resultCount.dataset.staffResultCount="true";directory.appendChild(resultCount);
    directoryList=el("div","ct-staff-directory-list");directory.appendChild(directoryList);
    const bulk=el("div","ct-staff-bulk");bulk.dataset.staffBulk="true";bulk.hidden=true;directory.appendChild(bulk);
    main.appendChild(directory);
    const profileCard=el("section","ct-staff-card ct-staff-profile-card");
    profileCard.append(el("h2","","Supervisor details"),el("p","ct-staff-muted","Profile, team, workload, shared employees, and audit history."));
    profileHost=el("div","ct-staff-profile-host");profileCard.appendChild(profileHost);main.appendChild(profileCard);
    layout.append(sidebar,main);pageRoot.appendChild(layout);

    const invite=el("section","ct-staff-invite-card");
    const inviteCopy=el("div");inviteCopy.append(el("p","ct-staff-eyebrow","GROW YOUR TEAM"),el("h2","","Invite supervisors"),el("p","ct-staff-muted","Open your phone’s share sheet for SMS, WhatsApp, or other apps. The shared join link creates a request; it does not bypass approval."));
    invite.append(inviteCopy,button("Invite supervisors","ct-staff-button ct-staff-button--primary",inviteSupervisors));
    const fallback=el("div","ct-staff-share-fallback");fallback.dataset.inviteFallback="true";fallback.hidden=true;
    const quickWhatsApp=el("a","ct-staff-share-link","WhatsApp");quickWhatsApp.href="https://wa.me/?text=";quickWhatsApp.target="_blank";quickWhatsApp.rel="noopener noreferrer";
    const quickSMS=el("a","ct-staff-share-link","SMS / Messages");quickSMS.href="sms:";const copyInvite=button("Copy invite link","ct-staff-button",async function(){try{await copyText(orgJoinLink);notice(pageRoot,"Supervisor join link copied. Admin approval is still required.","success");}catch(e){notice(pageRoot,e.message||"Could not copy the invite link.","error");}});
    fallback.append(quickWhatsApp,quickSMS,copyInvite);invite.appendChild(fallback);pageRoot.appendChild(invite);
    quickWhatsApp.addEventListener("click",function(){quickWhatsApp.href="https://wa.me/?text="+encodeURIComponent("Request to join our CleanTrack organization as a Supervisor. An Admin must approve the request: "+orgJoinLink);});
    quickSMS.addEventListener("click",function(){quickSMS.href="sms:?body="+encodeURIComponent("Request to join our CleanTrack organization as a Supervisor. An Admin must approve the request: "+orgJoinLink);});

    searchControl.addEventListener("input",renderDirectory);
    [statusControl,teamControl,locationControl,zoneControl].forEach(function(node){node.addEventListener("change",renderDirectory);});
    root.appendChild(pageRoot);
    loadData(true).catch(function(error){notice(pageRoot,error.message||"Could not load supervisor data.","error");});
  }
  window.CleanTrackStaff=Object.freeze({render:build});
})();