(function () {
  "use strict";

  const api = window.CleanTrackApi;
  const nav = window.CleanTrackNavigation;
  if (!api) return;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  const dateValue = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const dateLabel = (value, options) => {
    const d = dateValue(value);
    return d ? new Intl.DateTimeFormat(undefined, options || { month: "short", day: "numeric", year: "numeric" }).format(d) : "No deadline";
  };
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  function card(title, content, cls) {
    return '<section class="mw-card ' + (cls || "") + '"><div class="mw-card-head"><h2>' + esc(title) + '</h2></div>' + content + '</section>';
  }
  function empty(text) { return '<div class="mw-empty">' + esc(text) + '</div>'; }

  async function render(root) {
    root.innerHTML = '<div class="mw-loading" role="status">Loading your workspace from MECHNAR…</div>';
    try {
      const data = await api.get("supervisor/workspace");
      if (!data || !data.team || !data.metrics) throw new Error("The workspace response was incomplete.");
      paint(root, data);
    } catch (error) {
      root.innerHTML = '<section class="mw-error"><h2>Workspace data unavailable</h2><p>' +
        esc(error.message || "The server could not load your team's records.") +
        '</p><button type="button" class="button button-secondary" data-mw-retry>Retry</button></section>';
      root.querySelector("[data-mw-retry]")?.addEventListener("click", () => render(root));
    }
  }

  function paint(root, data) {
    const user = window.CleanTrackAuth?.getCurrentUser?.() || {};
    const name = user.name || data.supervisor?.name || "there";
    const firstKey = "mechnar.first-login." + String(user.id || "").toLowerCase();
    let firstLogin = false;
    try { firstLogin = sessionStorage.getItem(firstKey) === "1"; sessionStorage.removeItem(firstKey); } catch (_) {}
    const greeting = firstLogin ? "Welcome" : "Welcome back";
    const metrics = data.metrics;
    const operations = Array.isArray(data.operations) ? data.operations : [];
    const members = Array.isArray(data.members) ? data.members : [];
    const activity = Array.isArray(data.activity) ? data.activity : [];
    const reviewItems = operations.filter(o => ["submitted", "pending_review", "awaiting_review"].includes(String(o.status || "").toLowerCase().replace(/\s+/g, "_")));
    const attention = operations.filter(o => o.overdue || ["blocked", "rejected"].includes(String(o.status || "").toLowerCase()));
    const completion = metrics.completion_rate == null ? "—" : metrics.completion_rate + "%";

    root.innerHTML = `
      <div class="mw-shell">
        <header class="mw-welcome">
          <div><div class="mw-eyebrow">MECHNAR · SUPERVISOR WORKSPACE</div>
          <h1>${esc(greeting)}, ${esc(name)}.</h1>
          <p>${esc(data.team.name)} · Your operational overview, team activity and assigned schedule.</p></div>
          <div class="mw-updated">Live records<br><span>As of ${esc(dateLabel(metrics.data_as_of, {hour:"2-digit",minute:"2-digit"}))}</span></div>
        </header>

        <section class="mw-stat-grid">
          <article class="mw-stat"><span>Operations</span><strong>${metrics.total_operations}</strong><small>Visible to your team</small></article>
          <article class="mw-stat"><span>In progress</span><strong>${metrics.in_progress}</strong><small>Currently underway</small></article>
          <article class="mw-stat"><span>Awaiting review</span><strong>${metrics.submitted}</strong><small>Submitted by staff</small></article>
          <article class="mw-stat mw-stat-alert"><span>Overdue</span><strong>${metrics.overdue}</strong><small>Calculated from deadlines</small></article>
          <article class="mw-stat"><span>Completion rate</span><strong>${completion}</strong><small>Completed / visible operations</small></article>
        </section>

        <div class="mw-main-grid">
          ${card("Team Pulse", `
            <div class="mw-pulse-summary"><strong>${members.length}</strong><span>active staff members in your assigned team</span></div>
            <div class="mw-member-list">${members.length ? members.map(m => `
              <div class="mw-member"><div class="mw-avatar">${esc((m.name || "?").trim().charAt(0).toUpperCase())}</div>
                <div class="mw-member-name"><strong>${esc(m.name)}</strong><small>${m.workload} open operation${m.workload === 1 ? "" : "s"}</small></div>
                <span class="mw-status muted">${m.availability === "not_recorded" ? "Availability not recorded" : esc(m.availability)}</span>
              </div>`).join("") : empty("No active staff members are currently assigned to this team.")}</div>
            <p class="mw-footnote">Availability is not yet captured by the system. MECHNAR will not infer online, on-shift or absent status.</p>
          `, "mw-pulse")}

          ${card("Workload snapshot", `
            <div class="mw-workload-rows">
              <div><span>Pending</span><strong>${metrics.pending}</strong></div>
              <div><span>In progress</span><strong>${metrics.in_progress}</strong></div>
              <div><span>Submitted</span><strong>${metrics.submitted}</strong></div>
              <div><span>Completed</span><strong>${metrics.completed}</strong></div>
              <div><span>Overdue</span><strong class="mw-danger-text">${metrics.overdue}</strong></div>
            </div>
          `, "mw-workload")}
        </div>

        ${card("Operations Calendar", `
          <div class="mw-calendar-toolbar">
            <div class="mw-calendar-nav"><button type="button" data-mw-prev aria-label="Previous period">‹</button><button type="button" data-mw-today>Today</button><button type="button" data-mw-next aria-label="Next period">›</button><strong data-mw-period></strong></div>
            <div class="mw-calendar-controls">
              <select data-mw-status aria-label="Filter by status"><option value="">All statuses</option><option>Pending</option><option>In Progress</option><option>Submitted</option><option>Completed</option></select>
              <select data-mw-priority aria-label="Filter by priority"><option value="">All priorities</option><option>Urgent</option><option>High</option><option>Normal</option><option>Low</option></select>
              <div class="mw-view-switch"><button type="button" data-mw-view="day">Day</button><button type="button" data-mw-view="week" class="active">Week</button><button type="button" data-mw-view="month">Month</button><button type="button" data-mw-view="agenda">Agenda</button></div>
            </div>
          </div>
          <div class="mw-calendar-body" data-mw-calendar></div>
          <div class="mw-calendar-legend"><span><i class="pending"></i> Pending</span><span><i class="progress"></i> In progress</span><span><i class="submitted"></i> Submitted</span><span><i class="done"></i> Completed</span><span><i class="overdue"></i> Overdue</span></div>
          <p class="mw-footnote">Schedule entries are taken from Admin-assigned and team operations. Original assignment and due-date history remain attached to each operation.</p>
        `, "mw-calendar-card")}

        <div class="mw-main-grid">
          ${card("Review Queue", reviewItems.length ? '<div class="mw-record-list">' + reviewItems.slice(0,5).map(o => recordRow(o, "Submitted for review")) .join("") + '</div><button class="mw-link-button" data-mw-page="reviews">Open Review Queue →</button>' : empty("No submissions are awaiting review."), "mw-review")}
          ${card("Attention Required", attention.length ? '<div class="mw-record-list">' + attention.slice(0,5).map(o => recordRow(o, o.overdue ? "Overdue" : o.status)).join("") + '</div>' : empty("No overdue or blocked operations in the current records."), "mw-attention")}
        </div>

        <div class="mw-main-grid">
          ${card("Recent Activity", activity.length ? '<div class="mw-activity-list">' + activity.map(a => `
            <div class="mw-activity"><span class="mw-activity-dot"></span><div><strong>${esc(a.actor_name)}</strong> <span>${esc(activityVerb(a.action))}</span><b>${esc(a.operation_title)}</b><small>${esc(a.actor_role || "Member")} · ${esc(dateLabel(a.created_at, {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}))}</small></div></div>`).join("") + '</div>' : empty("No operation activity has been recorded yet."), "mw-activity-card")}
          ${card("Team Snapshot", `
            <div class="mw-performance-value">${completion}</div><p>Recorded completion rate</p>
            <div class="mw-progress-track"><span style="width:${metrics.completion_rate == null ? 0 : Math.max(0, Math.min(100, metrics.completion_rate))}%"></span></div>
            <div class="mw-performance-meta"><span>${metrics.completed} completed</span><span>${metrics.total_operations} total</span></div>
            <p class="mw-footnote">This is a descriptive team metric, not a comparative ranking. Performance Arena handles organization-wide team comparisons.</p>
          `, "mw-performance")}
        </div>

        <div class="mw-quick-actions"><button class="button button-primary" data-mw-page="operations">Manage Operations</button><button class="button button-secondary" data-mw-page="reviews">Review Submissions</button><button class="button button-secondary" data-mw-page="personnel">View Personnel</button><button class="button button-secondary" data-mw-page="team-channel">Team Channel</button></div>
      </div>`;
    root.querySelectorAll("[data-mw-page]").forEach(btn => btn.addEventListener("click", () => nav?.setActivePage(btn.dataset.mwPage)));
    setupCalendar(root.querySelector("[data-mw-calendar]"), operations, root);
  }

  function recordRow(o, label) {
    return `<div class="mw-record"><div><strong>${esc(o.title)}</strong><small>${esc(o.location_name || "Location not assigned")} · ${esc(o.zone_name || "Zone not assigned")}</small></div><span class="mw-status ${o.overdue ? "danger" : ""}">${esc(label)}</span><time>${esc(dateLabel(o.due_at))}</time></div>`;
  }
  function activityVerb(action) {
    return String(action || "updated").replace(/[._]/g, " ").replace(/\b\w/g, x => x.toUpperCase());
  }

  function setupCalendar(container, operations, root) {
    if (!container) return;
    let anchor = startOfDay(new Date());
    let view = "week";
    const status = root.querySelector("[data-mw-status]");
    const priority = root.querySelector("[data-mw-priority]");
    const period = root.querySelector("[data-mw-period]");
    const controls = root.querySelector(".mw-calendar-nav");
    const buttons = root.querySelectorAll("[data-mw-view]");

    function visibleItems() {
      return operations.filter(o => {
        if (status.value && String(o.status).toLowerCase() !== status.value.toLowerCase()) return false;
        if (priority.value && String(o.priority).toLowerCase() !== priority.value.toLowerCase()) return false;
        return true;
      });
    }
    function render() {
      buttons.forEach(b => b.classList.toggle("active", b.dataset.mwView === view));
      const items = visibleItems();
      if (view === "agenda") {
        period.textContent = "Upcoming schedule";
        container.innerHTML = items.slice().sort((a,b) => (dateValue(a.due_at)?.getTime() || Infinity) - (dateValue(b.due_at)?.getTime() || Infinity)).map(o => recordRow(o, o.overdue ? "Overdue" : o.status)).join("") || empty("No operations match these filters.");
        return;
      }
      let from, to;
      if (view === "day") { from = anchor; to = addDays(anchor, 1); period.textContent = dateLabel(anchor); }
      else if (view === "month") {
        from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        to = new Date(anchor.getFullYear(), anchor.getMonth()+1, 1);
        period.textContent = new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(anchor);
      } else {
        const offset = (anchor.getDay()+6)%7;
        from = addDays(anchor, -offset); to = addDays(from, 7);
        period.textContent = dateLabel(from) + " — " + dateLabel(addDays(to,-1));
      }
      const days = [];
      for (let d = new Date(from); d < to; d = addDays(d,1)) days.push(new Date(d));
      if (view === "month") {
        const offset=(from.getDay()+6)%7;
        for(let i=0;i<offset;i++) days.unshift(addDays(from,-(offset-i)));
        while(days.length%7) days.push(addDays(days[days.length-1],1));
      }
      const events = items.filter(o => {
        const d = dateValue(o.due_at || o.created_at);
        return d && d >= from && d < to;
      });
      const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      const cells = days.map(d => {
        const todays = events.filter(o => { const dt=dateValue(o.due_at || o.created_at); return dt && sameDay(dt,d); });
        return '<div class="mw-day-cell ' + (d.getMonth() !== anchor.getMonth() && view === "month" ? "outside" : "") + (sameDay(d,new Date()) ? " today" : "") + '"><div class="mw-day-label">' + (view === "month" ? d.getDate() : weekdays[(d.getDay()+6)%7] + " · " + d.getDate()) + '</div>' +
          (todays.length ? todays.slice(0,4).map(o => '<div class="mw-event ' + (o.overdue ? "overdue" : String(o.status||"").toLowerCase().replace(/\s+/g,"-")) + '" title="' + esc(o.title) + '">' + esc(o.title) + '</div>').join("") + (todays.length>4?'<small>+'+(todays.length-4)+' more</small>':'') : '<span class="mw-no-event">—</span>') + '</div>';
      }).join("");
      container.innerHTML = '<div class="mw-calendar-grid ' + (view === "month" ? "month" : "") + '">' + (view === "month" ? weekdays.map(w=>'<div class="mw-weekday">'+w+'</div>').join("") : "") + cells + '</div>';
    }
    controls.querySelector("[data-mw-prev]").addEventListener("click",()=>{anchor=view==="month"?new Date(anchor.getFullYear(),anchor.getMonth()-1,1):addDays(anchor,view==="day"?-1:-7);render();});
    controls.querySelector("[data-mw-next]").addEventListener("click",()=>{anchor=view==="month"?new Date(anchor.getFullYear(),anchor.getMonth()+1,1):addDays(anchor,view==="day"?1:7);render();});
    controls.querySelector("[data-mw-today]").addEventListener("click",()=>{anchor=startOfDay(new Date());render();});
    buttons.forEach(b=>b.addEventListener("click",()=>{view=b.dataset.mwView;render();}));
    status.addEventListener("change",render); priority.addEventListener("change",render);
    render();
  }

  window.MechnarSupervisorWorkspace = Object.freeze({ render });
})();