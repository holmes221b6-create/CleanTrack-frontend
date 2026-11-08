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
      const results = await Promise.all([api.get("supervisor/workspace"), api.get("announcements").catch(() => ({ announcements: [], unavailable: true }))]);
      const data = results[0];
      const announcementResponse = results[1];
      if (!data || !data.team || !data.metrics) throw new Error("The workspace response was incomplete.");
      data.announcements = Array.isArray(announcementResponse.announcements) ? announcementResponse.announcements : [];
      data.announcementsUnavailable = Boolean(announcementResponse.unavailable);
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
    const announcements = (Array.isArray(data.announcements) ? data.announcements : []).filter(a => a.status === "published");
    const reviewItems = operations.filter(o => ["submitted", "pending_review", "awaiting_review"].includes(String(o.status || "").toLowerCase().replace(/\\s+/g, "_")));
    const attention = operations.filter(o => o.overdue || ["blocked", "rejected"].includes(String(o.status || "").toLowerCase()));
    const completion = metrics.completion_rate == null ? "—" : metrics.completion_rate + "%";
    const announcementContent = data.announcementsUnavailable
      ? empty("Announcements could not be loaded.")
      : announcements.length
        ? announcements.slice(0, 4).map(a => `
          <article class="mw-announcement">
            <div class="mw-announcement-top"><span class="mw-announcement-severity ${esc(a.severity || "info")}">${esc(a.severity || "info")}</span><small>${esc(a.audience_scope === "organization" ? "Organization" : a.audience_scope === "supervisors" ? "Supervisors" : "Team")}</small></div>
            <strong>${esc(a.title)}</strong><p>${esc(a.message)}</p>
            <small>${esc(dateLabel(a.created_at, {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}))}</small>
          </article>`).join("")
        : empty("No published announcements.");

    root.innerHTML = `
      <div class="mw-shell">
        <header class="mw-welcome">
          <div class="mw-welcome-copy">
            <div class="mw-eyebrow">MECHNAR · SUPERVISOR WORKSPACE</div>
            <h1>${esc(greeting)}, ${esc(name)}.</h1>
            <p>${esc(data.team.name)} <span class="mw-header-separator">/</span> Team operations overview</p>
          </div>
          <div class="mw-header-actions">
            <button type="button" class="mw-calendar-launch" data-mw-calendar-trigger aria-haspopup="dialog" aria-expanded="false">▦ <span>Operations calendar</span></button>
            <div class="mw-updated">Live records <span>Updated ${esc(dateLabel(metrics.data_as_of, {hour:"2-digit",minute:"2-digit"}))}</span></div>
          </div>
        </header>

        <section class="mw-stat-grid" aria-label="Team operations summary">
          <article class="mw-stat"><span>Total operations</span><strong>${metrics.total_operations}</strong></article>
          <article class="mw-stat"><span>In progress</span><strong>${metrics.in_progress}</strong></article>
          <article class="mw-stat"><span>Awaiting review</span><strong>${metrics.submitted}</strong></article>
          <article class="mw-stat mw-stat-alert"><span>Overdue</span><strong>${metrics.overdue}</strong></article>
        </section>

        <div class="mw-main-grid mw-primary-grid">
          ${card("Team Pulse", `
            <div class="mw-pulse-summary"><strong>${members.length}</strong><span>active staff in your assigned team</span></div>
            <div class="mw-member-list">${members.length ? members.map(m => `
              <div class="mw-member"><div class="mw-avatar">${esc((m.name || "?").trim().charAt(0).toUpperCase())}</div>
                <div class="mw-member-name"><strong>${esc(m.name)}</strong><small>${m.workload} open operation${m.workload === 1 ? "" : "s"}</small></div>
                <span class="mw-status muted">${m.availability === "not_recorded" ? "Not recorded" : esc(m.availability)}</span>
              </div>`).join("") : empty("No active staff members are assigned to this team.")}</div>
            <p class="mw-footnote">Staff availability is not yet recorded by MECHNAR.</p>
          `, "mw-pulse")}
          ${card("Workload", `
            <div class="mw-workload-rows">
              <div><span>Pending</span><strong>${metrics.pending}</strong></div>
              <div><span>In progress</span><strong>${metrics.in_progress}</strong></div>
              <div><span>Submitted</span><strong>${metrics.submitted}</strong></div>
              <div><span>Completed</span><strong>${metrics.completed}</strong></div>
              <div><span>Overdue</span><strong class="mw-danger-text">${metrics.overdue}</strong></div>
            </div>
            <div class="mw-completion-summary"><div><span>Completion rate</span><strong>${completion}</strong></div>
              <div class="mw-progress-track"><span style="width:${metrics.completion_rate == null ? 0 : Math.max(0, Math.min(100, metrics.completion_rate))}%"></span></div>
            </div>
          `, "mw-workload")}
        </div>

        <div class="mw-main-grid">
          ${card("Review Queue", reviewItems.length ? '<div class="mw-record-list">' + reviewItems.slice(0,4).map(o => recordRow(o, "Awaiting review")).join("") + '</div><button class="mw-link-button" data-mw-page="reviews">Open Review Queue →</button>' : empty("No submissions are awaiting review."), "mw-review")}
          ${card("Attention Required", attention.length ? '<div class="mw-record-list">' + attention.slice(0,4).map(o => recordRow(o, o.overdue ? "Overdue" : o.status)).join("") + '</div><button class="mw-link-button" data-mw-page="operations">View Operations →</button>' : empty("No overdue or blocked operations."), "mw-attention")}
        </div>

        <div class="mw-main-grid mw-secondary-grid">
          ${card("Recent Activity", activity.length ? '<div class="mw-activity-list">' + activity.slice(0,6).map(a => `
            <div class="mw-activity"><span class="mw-activity-dot"></span><div><strong>${esc(a.actor_name)}</strong> <span>${esc(activityVerb(a.action))}</span><b>${esc(a.operation_title)}</b><small>${esc(a.actor_role || "Member")} · ${esc(dateLabel(a.created_at, {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}))}</small></div></div>`).join("") + '</div>' : empty("No operation activity has been recorded."), "mw-activity-card")}
          ${card("Announcements & Alerts", announcementContent + (announcements.length ? '<button class="mw-link-button" data-mw-page="team-channel">Open Team Channel →</button>' : ""), "mw-announcements")}
        </div>

        <nav class="mw-quick-actions" aria-label="Supervisor shortcuts">
          <button class="button button-primary" data-mw-page="operations">Operations</button>
          <button class="button button-secondary" data-mw-page="reviews">Review Queue</button>
          <button class="button button-secondary" data-mw-page="personnel">Personnel</button>
          <button class="button button-secondary" data-mw-page="team-channel">Team Channel</button>
        </nav>
      </div>`;
    root.querySelectorAll("[data-mw-page]").forEach(btn => btn.addEventListener("click", () => nav?.setActivePage(btn.dataset.mwPage)));
    setupCalendar(root, operations);
  }

  function recordRow(o, label) {
    return `<div class="mw-record"><div><strong>${esc(o.title)}</strong><small>${esc(o.location_name || "Location not assigned")} · ${esc(o.zone_name || "Zone not assigned")} · ${esc(o.created_by_role === "Admin" ? "Assigned by Admin" : o.created_by_role === "Supervisor" ? "Created by Supervisor" : "Organization operation")}</small></div><span class="mw-status ${o.overdue ? "danger" : ""}">${esc(label)}</span><time>${esc(dateLabel(o.due_at))}</time></div>`;
  }
  function activityVerb(action) {
    return String(action || "updated").replace(/[._]/g, " ").replace(/\b\w/g, x => x.toUpperCase());
  }

  function setupCalendar(root, operations) {
    const trigger = root.querySelector("[data-mw-calendar-trigger]");
    if (!trigger) return;
    const today = startOfDay(new Date());
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    let selected = today;
    const panel = document.createElement("section");
    panel.className = "mw-calendar-popover";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Operations calendar");
    panel.innerHTML = `
      <header class="mw-calendar-popover-head">
        <strong data-mw-month></strong>
        <div class="mw-calendar-popover-actions">
          <button type="button" data-mw-today>Today</button>
          <button type="button" data-mw-prev aria-label="Previous month">‹</button>
          <button type="button" data-mw-next aria-label="Next month">›</button>
          <button type="button" data-mw-close aria-label="Close calendar">×</button>
        </div>
      </header>
      <div class="mw-calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
      <div class="mw-calendar-dates" data-mw-dates></div>
      <section class="mw-calendar-selected">
        <h3 data-mw-selected-title></h3>
        <div data-mw-selected-events></div>
      </section>`;
    root.appendChild(panel);

    const dayKey = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    const eventsOn = d => operations.filter(o => {
      const due = dateValue(o.due_at);
      return due && dayKey(due) === dayKey(d);
    }).sort((a,b) => dateValue(a.due_at) - dateValue(b.due_at));

    function position() {
      panel.hidden = false;
      panel.style.visibility = "hidden";
      const r = trigger.getBoundingClientRect();
      const w = Math.min(340, window.innerWidth - 20);
      panel.style.width = w + "px";
      const h = panel.offsetHeight || 390;
      let left = Math.min(window.innerWidth - w - 10, Math.max(10, r.right - w));
      let top = r.bottom + 9;
      if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 9);
      panel.style.left = left + "px";
      panel.style.top = top + "px";
      panel.style.visibility = "visible";
    }

    function render() {
      panel.querySelector("[data-mw-month]").textContent =
        new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(cursor);
      const first = new Date(cursor.getFullYear(),cursor.getMonth(),1);
      const offset = (first.getDay()+6)%7;
      const gridStart = addDays(first,-offset);
      const dates = panel.querySelector("[data-mw-dates]");
      dates.replaceChildren();
      for (let i=0;i<42;i++) {
        const d=addDays(gridStart,i), key=dayKey(d), count=eventsOn(d).length;
        const b=document.createElement("button");
        b.type="button";
        b.className="mw-calendar-date" + (d.getMonth()!==cursor.getMonth()?" outside":"") +
          (key===dayKey(today)?" today":"") + (key===dayKey(selected)?" selected":"");
        b.textContent=String(d.getDate());
        b.setAttribute("aria-label",new Intl.DateTimeFormat(undefined,{dateStyle:"full"}).format(d)+(count?", "+count+" scheduled operations":""));
        if(count){const dot=document.createElement("i");dot.className="mw-calendar-count";dot.setAttribute("aria-hidden","true");b.appendChild(dot);}
        b.addEventListener("click",()=>{selected=new Date(d.getFullYear(),d.getMonth(),d.getDate());if(d.getMonth()!==cursor.getMonth())cursor=new Date(d.getFullYear(),d.getMonth(),1);render();});
        dates.appendChild(b);
      }
      panel.querySelector("[data-mw-selected-title]").textContent =
        "Operations · " + new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(selected);
      const list=panel.querySelector("[data-mw-selected-events]");
      list.replaceChildren();
      const selectedEvents=eventsOn(selected);
      if(!selectedEvents.length){
        const p=document.createElement("p");p.className="mw-calendar-empty";p.textContent="No operations due on this date.";list.appendChild(p);
      } else {
        selectedEvents.slice(0,6).forEach(o=>{
          const item=document.createElement("article");item.className="mw-calendar-event";
          const title=document.createElement("strong");title.textContent=o.title||"Untitled operation";
          const meta=document.createElement("small");
          meta.textContent=[dateLabel(o.due_at,{hour:"2-digit",minute:"2-digit"}),o.overdue?"Overdue":String(o.status||"").replace(/_/g," ")].join(" · ");
          item.append(title,meta);list.appendChild(item);
        });
        if(selectedEvents.length>6){const more=document.createElement("p");more.className="mw-calendar-empty";more.textContent=(selectedEvents.length-6)+" more operations on this date.";list.appendChild(more);}
      }
    }

    trigger.addEventListener("click",()=>{
      const opening=panel.hidden;
      if(opening){render();position();trigger.setAttribute("aria-expanded","true");panel.querySelector("[data-mw-close]").focus();}
      else{panel.hidden=true;trigger.setAttribute("aria-expanded","false");}
    });
    panel.querySelector("[data-mw-prev]").addEventListener("click",()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);render();});
    panel.querySelector("[data-mw-next]").addEventListener("click",()=>{cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);render();});
    panel.querySelector("[data-mw-today]").addEventListener("click",()=>{cursor=new Date(today.getFullYear(),today.getMonth(),1);selected=new Date(today);render();});
    panel.querySelector("[data-mw-close]").addEventListener("click",()=>{panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();});
    root.addEventListener("pointerdown",event=>{
      if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target)){panel.hidden=true;trigger.setAttribute("aria-expanded","false");}
    });
    panel.addEventListener("keydown",event=>{if(event.key==="Escape"){panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();}});
    window.addEventListener("resize",()=>{if(!panel.hidden)position();});
    window.addEventListener("scroll",()=>{if(!panel.hidden)position();},true);
  }

  window.MechnarSupervisorWorkspace = Object.freeze({ render });
})();