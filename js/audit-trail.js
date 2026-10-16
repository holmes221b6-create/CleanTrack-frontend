(function () {
  "use strict";
  const API = window.CleanTrackApi;
  const PAGE_SIZE = 50;
  const categories = [
    ["", "All actions"], ["organization", "Organization changes"], ["membership", "Membership"],
    ["team", "Teams"], ["location", "Locations"], ["zone", "Zones"], ["operation", "Operations"],
    ["security", "Security and account"], ["other", "Other"]
  ];
  const outcomes = [["", "All outcomes"], ["success", "Success"], ["approved", "Approved"], ["rejected", "Rejected"], ["failed", "Failed"]];
  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const button = (label, cls, action) => {
    const node = el("button", cls, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  };
  function localYmd(date) {
    const timeZone = window.CleanTrackPreferences?.get()?.timeZone;
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      return values.year + "-" + values.month + "-" + values.day;
    } catch (_) {
      const d = new Date(date);
      return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
    }
  }
  function addOptions(control, options, chosen) {
    options.forEach(([value, label]) => {
      const option = el("option", "", label); option.value = value; control.appendChild(option);
    });
    control.value = chosen || "";
  }
  function field(label, control) {
    const wrap = el("label", "ct-audit-field");
    wrap.append(el("span", "", label), control);
    return wrap;
  }
  function displayTime(value) {
    if (!value) return "—";
    const prefs = window.CleanTrackPreferences;
    try {
      if (prefs) return prefs.formatDate(value) + " " + prefs.formatTime(value);
      return new Date(value).toLocaleString();
    } catch (_) { return new Date(value).toLocaleString(); }
  }
  function decodeAuditText(value) {
    if (typeof value !== "string" || !value) return value;
    let decoded = value;
    for (let pass = 0; pass < 6; pass += 1) {
      if (!/&(?:#x?[0-9a-f]+|amp|quot|apos|lt|gt|nbsp);/i.test(decoded)) break;
      const textarea = document.createElement("textarea");
      textarea.innerHTML = decoded;
      const next = textarea.value
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
        .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
        .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
        .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
      if (next === decoded) break;
      decoded = next;
    }
    decoded = decoded.replace(/<br\s*\/?\s*>/gi, "\n");
    // Some legacy values are serialized as a JSON object surrounded by table separators.
    const firstBrace = decoded.indexOf("{");
    const lastBrace = decoded.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace && /^[\s|]*$/.test(decoded.slice(0, firstBrace)) && /^[\s|]*$/.test(decoded.slice(lastBrace + 1))) {
      decoded = decoded.slice(firstBrace, lastBrace + 1);
    }
    return decoded;
  }
  function normalizeAuditValue(value, depth = 0) {
    if (depth > 8 || value === null || value === undefined) return value;
    if (typeof value === "string") {
      const decoded = decodeAuditText(value);
      const trimmed = decoded.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try { return normalizeAuditValue(JSON.parse(trimmed), depth + 1); } catch (_) {}
      }
      return decoded;
    }
    if (Array.isArray(value)) return value.map(item => normalizeAuditValue(item, depth + 1));
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        decodeAuditText(key), normalizeAuditValue(item, depth + 1)
      ]));
    }
    return value;
  }
  function safeJson(value) {
    if (value === null || value === undefined || value === "") return "—";
    try {
      const normalized = normalizeAuditValue(value);
      return typeof normalized === "string" ? normalized : JSON.stringify(normalized, null, 2);
    } catch (_) { return String(value); }
  }

  async function render(container) {
    container.replaceChildren();
    const user = window.CleanTrackAuth && window.CleanTrackAuth.getCurrentUser();
    if (!user) { container.appendChild(el("p", "ct-audit-muted", "Sign in to view audit activity.")); return; }
    const role = String(user.role || "").toLowerCase();
    const page = el("section", "ct-audit-page");
    const header = el("header", "ct-audit-header");
    const title = role === "admin" ? "Audit Trail" : role === "supervisor" ? "Settings & Audit History" : "My Activity";
    header.append(el("p", "ct-audit-eyebrow", "SECURITY & ACCOUNTABILITY"), el("h1", "", title),
      el("p", "ct-audit-muted", role === "admin"
        ? "A record of who changed what in your organization. System and administrative changes belong here; completed work and review decisions are documented in Logs."
        : role === "supervisor"
          ? "Relevant activity for your assigned team scope. Organization-wide administration and membership approvals remain Admin-only."
          : "Your own account actions and the audit events for operations assigned to you."));
    page.appendChild(header);

    const retention = el("div", "ct-audit-retention");
    retention.append(el("span", "ct-audit-retention-icon", "◷"),
      el("div", "", "Seven-day retention"),
      el("p", "", "Audit records older than 7 days are permanently deleted and cannot be found by search or export."));
    page.appendChild(retention);

    const card = el("section", "ct-audit-card");
    const toolbar = el("form", "ct-audit-filters");
    const search = el("input", "ct-audit-input");
    search.type = "search"; search.name = "q"; search.placeholder = "Search actor, action, record, or details…"; search.maxLength = 120;
    search.setAttribute("aria-label", "Search audit records");
    const category = el("select", "ct-audit-input"); addOptions(category, categories, "");
    const outcome = el("select", "ct-audit-input"); addOptions(outcome, outcomes, "");
    const actor = el("select", "ct-audit-input"); addOptions(actor, [["","All actors"]], "");
    const from = el("input", "ct-audit-input"); from.type = "date"; from.name = "from";
    const to = el("input", "ct-audit-input"); to.type = "date"; to.name = "to";
    const now = new Date(), cutoffDate = new Date(now.getTime() - 7*24*60*60*1000);
    from.min = localYmd(cutoffDate); from.max = localYmd(now);
    to.min = localYmd(cutoffDate); to.max = localYmd(now);
    const filtersTop = el("div", "ct-audit-filter-grid");
    filtersTop.append(field("Search", search), field("Action category", category), field("Outcome", outcome), field("Actor", actor), field("From date", from), field("To date", to));
    const submit = el("button", "ct-audit-button ct-audit-button-primary", "Apply filters"); submit.type = "submit";
    const clear = button("Clear filters", "ct-audit-button", () => {
      toolbar.reset(); category.value = ""; outcome.value = ""; from.value = ""; to.value = ""; search.value = ""; state.offset = 0; load();
    });
    const exportFormat = el("select", "ct-audit-input");
    const preferredExport = window.CleanTrackPreferences?.get()?.reports?.exportFormat;
    addOptions(exportFormat, [["csv","Export CSV"],["json","Export JSON"]], preferredExport === "json" ? "json" : "csv");
    const exportButton = button("Export filtered records", "ct-audit-button ct-audit-button-primary", exportRecords);
    const filterActions = el("div", "ct-audit-filter-actions"); filterActions.append(submit, clear);
    const exportGroup = el("div", "ct-audit-export-group"); exportGroup.append(exportFormat, exportButton, el("small", "ct-audit-export-note", "Audit exports support CSV and JSON. If your preferred format is not supported here, CSV is used."));
    toolbar.append(filtersTop, filterActions);
    const topLine = el("div", "ct-audit-list-head");
    const counter = el("p", "ct-audit-muted", "Loading records…");
    const refresh = button("Refresh", "ct-audit-button", () => load());
    topLine.append(counter, refresh);
    const status = el("p", "ct-audit-status"); status.hidden = true; status.setAttribute("role", "status");
    const tableWrap = el("div", "ct-audit-table-wrap");
    const table = el("table", "ct-audit-table");
    const thead = el("thead"); const headingRow = el("tr");
    ["Timestamp","Actor","Action","Affected record","Outcome","Details"].forEach(label => headingRow.appendChild(el("th","",label)));
    thead.appendChild(headingRow); table.appendChild(thead);
    const tbody = el("tbody"); table.appendChild(tbody); tableWrap.appendChild(table);
    const paging = el("div", "ct-audit-pagination");
    const prev = button("← Previous", "ct-audit-button", () => {state.offset=Math.max(0,state.offset-PAGE_SIZE);load();});
    const pageLabel = el("span", "ct-audit-muted", "—");
    const next = button("Next →", "ct-audit-button", () => {state.offset+=PAGE_SIZE;load();});
    paging.append(prev, pageLabel, next);
    card.append(toolbar, exportGroup, topLine, status, tableWrap, paging);
    page.appendChild(card);
    container.appendChild(page);

    const state = {offset:0,total:0,entries:[],loading:false};
    function parameters(includePaging=true) {
      const params = new URLSearchParams();
      if (search.value.trim()) params.set("q",search.value.trim());
      if (category.value) params.set("category",category.value);
      if (outcome.value) params.set("outcome",outcome.value);
      if (actor.value) params.set("actor_id",actor.value);
      if (from.value) params.set("from",from.value);
      if (to.value) params.set("to",to.value);
      if (includePaging) {params.set("limit",String(PAGE_SIZE));params.set("offset",String(state.offset));}
      return params;
    }
    function statusMessage(message, error=false) {
      status.textContent=message; status.hidden=!message; status.className="ct-audit-status"+(error?" is-error":"");
    }
    function openAuditDetails(entry) {
      const overlay = el("div", "ct-audit-modal-backdrop");
      overlay.setAttribute("role", "presentation");
      const dialog = el("section", "ct-audit-modal");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-label", "Audit record details");
      const header = el("div", "ct-audit-modal-header");
      header.appendChild(el("h2", "", "Audit record details"));
      const close = button("Close", "ct-audit-button", () => overlay.remove());
      header.appendChild(close);
      dialog.appendChild(header);
      [["Before",entry.before],["After",entry.after],["Additional context",entry.details]].forEach(([label,value]) => {
        const group = el("section", "ct-audit-detail-block");
        group.appendChild(el("strong", "", label));
        group.appendChild(el("pre", "", safeJson(value)));
        dialog.appendChild(group);
      });
      overlay.appendChild(dialog);
      overlay.addEventListener("click", event => { if (event.target === overlay) overlay.remove(); });
      document.addEventListener("keydown", function onEscape(event) {
        if (event.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", onEscape); }
      });
      document.body.appendChild(overlay);
      close.focus();
    }

    function renderRows(entries) {
      tbody.replaceChildren();
      if (!entries.length) {
        const tr=el("tr","ct-audit-empty-row"); const td=el("td","", "No audit records match these filters in the available seven-day window.");
        td.colSpan=6;tr.appendChild(td);tbody.appendChild(tr);return;
      }
      entries.forEach(entry=>{
        const tr=el("tr");
        const time=el("time","ct-audit-time",displayTime(entry.created_at)); if(entry.created_at)time.dateTime=entry.created_at;
        tr.appendChild(Object.assign(el("td",""),{ }));
        tr.lastChild.appendChild(time);
        const actorCell=el("td","ct-audit-actor");actorCell.append(el("strong","",entry.actor_name||"Unknown account"));
        if(entry.actor_email) actorCell.appendChild(el("small","",entry.actor_email));
        if(entry.actor_role) actorCell.appendChild(el("small","",entry.actor_role));
        tr.appendChild(actorCell);
        const actionCell=el("td","");actionCell.appendChild(el("code","ct-audit-action",entry.action||"Unknown action"));tr.appendChild(actionCell);
        const resourceCell=el("td","");resourceCell.append(el("strong","",entry.affected_record||entry.resource_type||"Record"));
        if(entry.resource_type)resourceCell.appendChild(el("small","",entry.resource_type+(entry.resource_id?" · #"+entry.resource_id:"")));
        tr.appendChild(resourceCell);
        const outcomeCell=el("td","");const outcomeBadge=el("span","ct-audit-outcome",entry.outcome||"Recorded");
        outcomeBadge.classList.add("outcome-"+String(entry.outcome||"recorded").toLowerCase().replace(/[^a-z0-9]+/g,"-"));outcomeCell.appendChild(outcomeBadge);tr.appendChild(outcomeCell);
        const detailsCell=el("td","");
        const view=button("View details","ct-audit-button ct-audit-view-details",()=>openAuditDetails(entry));
        detailsCell.appendChild(view);tr.appendChild(detailsCell);tbody.appendChild(tr);
      });
    }
    async function load() {
      if(state.loading)return;
      state.loading=true; submit.disabled=true; refresh.disabled=true; exportButton.disabled=true; statusMessage("");
      counter.textContent="Loading audit records…";
      try {
        const data=await API.get("audit-trail?"+parameters(true).toString());
        state.entries=Array.isArray(data.entries)?data.entries:[];state.total=Number(data.total||0);
        const selectedActor=actor.value;
        const actorOptions=[["","All actors"],...(Array.isArray(data.actors)?data.actors.map(item=>[String(item.id),item.label+(item.role?" · "+item.role:"")]):[])];
        actor.replaceChildren(); addOptions(actor,actorOptions,actorOptions.some(item=>item[0]===selectedActor)?selectedActor:"");
        renderRows(state.entries);
        const prefs = window.CleanTrackPreferences;
        const translate = (value) => prefs ? prefs.translate(value) : value;
        counter.textContent=state.total+" "+translate(state.total===1?"record":"records")+" "+translate("in your permitted seven-day window");
        const start=state.total?state.offset+1:0;const end=Math.min(state.offset+state.entries.length,state.total);
        pageLabel.textContent=state.total?(translate("Showing")+" "+start+"–"+end+" "+translate("of")+" "+state.total):translate("No records");
        prev.disabled=state.offset===0;next.disabled=state.offset+PAGE_SIZE>=state.total;
        exportButton.disabled=state.total===0;
      } catch(error) {
        state.entries=[];state.total=0;renderRows([]);
        counter.textContent=window.CleanTrackPreferences?.translate("Could not load audit records")||"Could not load audit records";statusMessage(error.message||"Audit Trail could not be loaded.",true);
        prev.disabled=true;next.disabled=true;exportButton.disabled=true;pageLabel.textContent="—";
      } finally {state.loading=false;submit.disabled=false;refresh.disabled=false;}
    }
    async function exportRecords() {
      exportButton.disabled=true;statusMessage("Preparing export…");
      try {
        const params=parameters(false);params.set("format",exportFormat.value);
        const url=window.CleanTrackConfig.apiBaseUrl+"/audit-trail/export?"+params.toString();
        const response=await fetch(url,{method:"GET",credentials:"include",headers:{Accept:exportFormat.value==="json"?"application/json":"text/csv"}});
        if(!response.ok) {
          let message="Export failed.";try{const payload=await response.json();message=payload.error||message;}catch(_){}
          throw new Error(message);
        }
        const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);
        const a=el("a");a.href=objectUrl;a.download=exportFormat.value==="json"?"cleantrack-audit.json":"cleantrack-audit.csv";
        document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(objectUrl);
        statusMessage("Export downloaded. It includes only records matching the current filters and the seven-day retention limit.");
      } catch(error) {statusMessage(error.message||"Export failed.",true);}
      finally {exportButton.disabled=state.total===0;}
    }
    toolbar.addEventListener("submit",event=>{event.preventDefault();state.offset=0;load();});
    [category,outcome,actor,from,to].forEach(control=>control.addEventListener("change",()=>{state.offset=0;load();}));
    if(role!=="admin") {
      // Server-side scoping is authoritative. This text describes the expected
      // scope but never substitutes client checks for API permission controls.
    }
    load();
  }
  window.CleanTrackAuditTrail=Object.freeze({render});
})();