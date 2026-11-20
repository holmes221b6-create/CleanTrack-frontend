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
    const greetingIdentity = String(user?.id || user?.email || "current").toLowerCase();
    const pendingGreetingKey = "mechnar.workspace-greeting-pending." + greetingIdentity;
    const greetingKey = "mechnar.workspace-greeting-shown." + greetingIdentity;
    let showWorkspaceGreeting = false;
    try {
      showWorkspaceGreeting = sessionStorage.getItem(pendingGreetingKey) === "1" &&
        sessionStorage.getItem(greetingKey) !== "1";
      if (showWorkspaceGreeting) {
        sessionStorage.setItem(greetingKey, "1");
        sessionStorage.removeItem(pendingGreetingKey);
      }
    } catch (_) { showWorkspaceGreeting = false; }
    const greeting = "Welcome back";
    const metrics = data.metrics;
    const operations = Array.isArray(data.operations) ? data.operations : [];
    const members = Array.isArray(data.members) ? data.members : [];
    const activity = Array.isArray(data.activity) ? data.activity : [];
    const announcements = (Array.isArray(data.announcements) ? data.announcements : []).filter(a => a.status === "published");
    const norm = value => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const closed = new Set(["completed","approved","verified","cancelled","canceled"]);
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrow = addDays(todayStart, 1);
    const weekEnd = addDays(todayStart, 7);
    const due = op => dateValue(op.due_at);
    const isOverdue = op => Boolean(op.overdue) && !closed.has(norm(op.status));
    const isToday = op => { const d=due(op); return d && d>=todayStart && d<tomorrow; };
    const reviewItems = operations.filter(o => ["submitted","pending_review","awaiting_review"].includes(norm(o.status)));
    const attention = operations.filter(o => isOverdue(o) || ["blocked","rejected"].includes(norm(o.status)));
    const isBlocked = op => ["blocked","rejected"].includes(norm(op.status));
    const priorityRank = op => {
      if (isOverdue(op)) return 0;
      if (isBlocked(op)) return 1;
      const rank = {urgent:2,high:3,normal:4,low:5};
      return rank[norm(op.priority)] ?? 6;
    };
    // Include urgent/high work due within seven days, not only work due today.
    const priorities = operations.filter(o => {
      const d = due(o);
      return !closed.has(norm(o.status)) && (
        isOverdue(o) || isBlocked(o) ||
        (d && d >= todayStart && d < weekEnd && ["urgent","high"].includes(norm(o.priority)))
      );
    }).sort((a,b) => {
      const rankDiff = priorityRank(a) - priorityRank(b);
      return rankDiff || ((due(a)?.getTime() || Infinity) - (due(b)?.getTime() || Infinity));
    });
    const upcoming = operations.filter(o => {
      const d=due(o); return d && d>=tomorrow && d<weekEnd && !closed.has(norm(o.status));
    }).sort((a,b)=>due(a)-due(b));
    const assignedWork = operations.filter(o => o.assigned_to_id || o.assigned_to_name);
    const completion = metrics.completion_rate == null ? "—" : metrics.completion_rate + "%";
    const priorityLabel = value => {
      const p=String(value||"Normal").toLowerCase();
      return p.charAt(0).toUpperCase()+p.slice(1);
    };
    const shortRow = (o, badge) => {
      const d=due(o);
      return '<article class="mw-focus-row"><div class="mw-focus-main"><strong>'+esc(o.title||"Untitled operation")+'</strong><small>'+
        esc(o.assigned_to_name ? "Assigned to "+o.assigned_to_name : o.assigned_supervisor_name ? "With Supervisor "+o.assigned_supervisor_name : "Awaiting assignment")+' · '+
        esc(o.location_name||"Location not assigned")+' · '+esc(d?dateLabel(d,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"No deadline")+
        '</small></div><span class="mw-focus-badge '+esc(badge.toLowerCase().replace(/\s+/g,"-"))+'">'+esc(badge)+'</span></article>';
    };
    const announcementContent = data.announcementsUnavailable
      ? empty("Announcements could not be loaded.")
      : announcements.length
        ? announcements.slice(0, 4).map(a =>
          '<article class="mw-announcement"><div class="mw-announcement-top"><span class="mw-announcement-severity '+esc(a.severity||"info")+'">'+esc(a.severity||"info")+'</span><small>'+
          esc(a.audience_scope==="organization"?"Organization":a.audience_scope==="supervisors"?"Supervisors":"Team")+
          '</small></div><strong>'+esc(a.title)+'</strong><p>'+esc(a.message)+'</p><small>'+
          esc(dateLabel(a.created_at,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}))+'</small></article>').join("")
        : empty("No published announcements.");

    const memberRows = members.length ? members.map(m => {
      const load = Number(m.workload||0);
      const maxLoad = Math.max(1,...members.map(x=>Number(x.workload||0)));
      const width = Math.round((load/maxLoad)*100);
      return '<div class="mw-member"><div class="mw-avatar">'+esc((m.name||"?").trim().charAt(0).toUpperCase())+'</div>'+
        '<div class="mw-member-name"><strong>'+esc(m.name)+'</strong><small>'+load+' open operation'+(load===1?"":"s")+'</small>'+
        '<span class="mw-member-load"><i style="width:'+width+'%"></i></span></div>'+
        '<span class="mw-status muted">'+(m.availability==="not_recorded"?"Availability not recorded":esc(m.availability))+'</span></div>';
    }).join("") : empty("No active staff members are assigned to this team.");

    root.innerHTML =
      '<div class="mw-shell">'+
        '<header class="mw-welcome"><div class="mw-welcome-copy"><div class="mw-eyebrow">MECHNAR · SUPERVISOR WORKSPACE</div>'+
          (showWorkspaceGreeting?'<h1>'+esc(greeting)+', '+esc(name)+'.</h1>':'')+'<p>'+esc(data.team.name)+' <span class="mw-header-separator">/</span> Team operations overview</p></div>'+
          '<div class="mw-header-actions"><button type="button" class="mw-calendar-trigger" data-mw-calendar-trigger aria-expanded="false">▦ Scheduled Operations</button><div class="mw-updated">Live records <span>Updated '+esc(dateLabel(metrics.data_as_of,{hour:"2-digit",minute:"2-digit"}))+'</span></div></div></header>'+
        '<section class="mw-stat-grid" aria-label="Team operations summary">'+
          '<article class="mw-stat"><span>Total operations</span><strong>'+metrics.total_operations+'</strong></article>'+
          '<article class="mw-stat"><span>In progress</span><strong>'+metrics.in_progress+'</strong></article>'+
          '<article class="mw-stat"><span>Awaiting review</span><strong>'+metrics.submitted+'</strong></article>'+
          '<article class="mw-stat"><span>Due in 24 hours</span><strong>'+Number(metrics.due_soon||0)+'</strong></article>'+
          '<article class="mw-stat mw-stat-alert"><span>Overdue</span><strong>'+metrics.overdue+'</strong></article></section>'+
        '<div class="mw-main-grid mw-primary-grid">'+
          card("Team Pulse",'<div class="mw-pulse-summary"><strong>'+members.length+'</strong><span>active staff in your assigned team</span></div>'+
            '<div class="mw-member-list">'+memberRows+'</div><p class="mw-footnote">Workload is calculated from open operations assigned to each staff member. Attendance and shift availability are not recorded yet.</p>',"mw-pulse")+
          card("Workload",'<div class="mw-workload-rows"><div><span>Pending</span><strong>'+metrics.pending+'</strong></div>'+
            '<div><span>In progress</span><strong>'+metrics.in_progress+'</strong></div><div><span>Submitted</span><strong>'+metrics.submitted+'</strong></div>'+
            '<div><span>Completed</span><strong>'+metrics.completed+'</strong></div><div><span>Overdue</span><strong class="mw-danger-text">'+metrics.overdue+'</strong></div></div>'+
            '<div class="mw-completion-summary"><div><span>Completion rate</span><strong>'+completion+'</strong></div>'+
            '<div class="mw-progress-track"><span style="width:'+(metrics.completion_rate==null?0:Math.max(0,Math.min(100,metrics.completion_rate)))+'%"></span></div></div>',"mw-workload")+
        '</div>'+
        '<div class="mw-main-grid mw-focus-grid">'+
          card("Today's Priorities",priorities.length?'<div class="mw-focus-list">'+priorities.slice(0,5).map(o=>shortRow(o,isOverdue(o)?"Overdue":priorityLabel(o.priority))).join("")+'</div>'+
            '<button class="mw-link-button" data-mw-page="operations">Open Operations →</button>':empty("No overdue, blocked or high-priority operations are due within the next seven days."),"mw-priorities")+
          card("Upcoming Operations",upcoming.length?'<div class="mw-focus-list">'+upcoming.slice(0,5).map(o=>shortRow(o,priorityLabel(o.priority))).join("")+'</div>'+
            '<button class="mw-link-button" data-mw-page="operations">View all scheduled work →</button>':empty("No operations are scheduled for the next seven days."),"mw-upcoming")+
        '</div>'+
        '<div class="mw-main-grid">'+
          card("Review Queue",reviewItems.length?'<div class="mw-record-list">'+reviewItems.slice(0,4).map(o=>recordRow(o,"Awaiting review")).join("")+'</div>'+
            '<button class="mw-link-button" data-mw-page="reviews">Open Review Queue →</button>':empty("No submissions are awaiting review."),"mw-review")+
          card("Attention Required",attention.length?'<div class="mw-record-list">'+attention.slice(0,4).map(o=>recordRow(o,isOverdue(o)?"Overdue":o.status)).join("")+'</div>'+
            '<button class="mw-link-button" data-mw-page="operations">View Operations →</button>':empty("No overdue, blocked or rejected operations."),"mw-attention")+
        '</div>'+
        '<div class="mw-main-grid mw-secondary-grid">'+
          card("Recent Activity",(activity.length?'<div class="mw-activity-list">'+activity.slice(0,3).map(renderActivityItem).join("")+'</div>':
            empty("No operation activity has been recorded."))+
            '<button type="button" class="mw-link-button mw-activity-history-trigger" data-mw-activity-history>View activity history →</button>',"mw-activity-card")+
          card("Announcements & Alerts",announcementContent+(announcements.length?'<button class="mw-link-button" data-mw-page="team-channel">Open Team Channel →</button>':""),"mw-announcements")+
        '</div>'+
        '<nav class="mw-quick-actions" aria-label="Supervisor shortcuts"><button class="button button-primary" data-mw-page="operations">Operations</button>'+
          '<button class="button button-secondary" data-mw-page="reviews">Review Queue</button><button class="button button-secondary" data-mw-page="personnel">Personnel</button>'+
          '<button class="button button-secondary" data-mw-page="team-channel">Team Channel</button></nav></div>';
    root.querySelectorAll("[data-mw-page]").forEach(btn=>btn.addEventListener("click",()=>nav?.setActivePage(btn.dataset.mwPage)));
    setupScheduledOperations(root, operations);
    setupActivityHistory(root, activity);

  }
  function renderActivityItem(a) {
    return '<div class="mw-activity"><span class="mw-activity-dot"></span><div><strong>'+esc(a.actor_name||"Member")+'</strong> <span>'+esc(activityVerb(a.action))+'</span><b>'+esc(a.operation_title||"Operation")+'</b><small>'+
      esc(a.actor_role||"Member")+' · '+esc(dateLabel(a.created_at,{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}))+'</small>'+(a.message?'<p class="mw-activity-message">'+esc(a.message)+'</p>':'')+'</div></div>';
  }
  function setupActivityHistory(root, activity) {
    const trigger=root.querySelector("[data-mw-activity-history]");
    if(!trigger)return;
    const overlay=document.createElement("div");
    overlay.className="mw-activity-overlay";
    overlay.hidden=true;
    overlay.innerHTML='<section class="mw-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="mw-activity-dialog-title"><header class="mw-activity-dialog-head"><div><span class="mw-eyebrow">TEAM TIMELINE</span><h2 id="mw-activity-dialog-title">Activity History</h2><p>Recorded activity across your team operations.</p></div><button type="button" class="mw-activity-close" data-mw-activity-close aria-label="Close activity history">×</button></header><div class="mw-activity-dialog-body">'+(activity.length?'<div class="mw-activity-list">'+activity.map(renderActivityItem).join("")+'</div>':empty("No operation activity has been recorded."))+'</div></section>';
    root.appendChild(overlay);
    const close=()=>{overlay.hidden=true;trigger.focus();};
    trigger.addEventListener("click",()=>{overlay.hidden=false;overlay.querySelector("[data-mw-activity-close]")?.focus();});
    overlay.querySelector("[data-mw-activity-close]").addEventListener("click",close);
    overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
    overlay.querySelector(".mw-activity-dialog").addEventListener("keydown",event=>{if(event.key==="Escape"){event.stopPropagation();close();}});
  }
  function recordRow(o, label) {
    const lineage = o.original_assigned_to_name && o.assigned_to_name && o.original_assigned_to_name !== o.assigned_to_name
      ? "Original assignment: " + o.original_assigned_to_name + " · Current staff: " + o.assigned_to_name
      : o.assigned_to_name ? "Assigned to " + o.assigned_to_name
      : o.assigned_supervisor_name ? "Assigned supervisor: " + o.assigned_supervisor_name
      : "Awaiting staff assignment";
    const source = o.created_by_role === "Admin" ? "Admin-originated" : o.created_by_role === "Supervisor" ? "Supervisor-originated" : "Organization operation";
    return `<div class="mw-record"><div><strong>${esc(o.title)}</strong><small>${esc(source)} · ${esc(lineage)} · ${esc(o.location_name || "Location not assigned")} · ${esc(o.zone_name || "Zone not assigned")}</small></div><span class="mw-status ${o.overdue ? "danger" : ""}">${esc(label)}</span><time>${esc(dateLabel(o.due_at))}</time></div>`;
  }
  function activityVerb(action) {
    return String(action || "updated").replace(/[._]/g, " ").replace(/\b\w/g, x => x.toUpperCase());
  }

  function setupScheduledOperations(root, operations) {
    const trigger = root.querySelector("[data-mw-calendar-trigger]");
    if (!trigger) return;
    const scheduled = operations.filter(function(o){ return dateValue(o.due_at); }).sort(function(a,b){ return dateValue(a.due_at)-dateValue(b.due_at); });
    const overlay = document.createElement("div"); overlay.className = "mw-scheduled-overlay"; overlay.hidden = true;
    overlay.innerHTML = '<section class="mw-scheduled-dialog" role="dialog" aria-modal="true"><header class="mw-scheduled-head"><div><span class="mw-eyebrow">TEAM SCHEDULE</span><h2>Scheduled Operations</h2><p data-summary></p></div><button type="button" data-close aria-label="Close">×</button></header><label class="mw-scheduled-search">Search operations<input type="search" data-search placeholder="Search title, location, staff…"></label><div class="mw-scheduled-list" data-list></div></section>';
    root.appendChild(overlay);
    const list=overlay.querySelector("[data-list]"), search=overlay.querySelector("[data-search]");
    function render(){
      const q=search.value.toLowerCase().trim();
      const rows=scheduled.filter(function(o){return !q||[o.title,o.location_name,o.zone_name,o.assigned_to_name,o.status,o.priority].join(" ").toLowerCase().includes(q);});
      overlay.querySelector("[data-summary]").textContent=rows.length+" scheduled operation"+(rows.length===1?"":"s")+" · Team scope";
      list.replaceChildren();
      if(!rows.length){const empty=document.createElement("p");empty.className="mw-calendar-empty";empty.textContent=scheduled.length?"No matching scheduled operations.":"No operations have a scheduled date yet.";list.appendChild(empty);return;}
      rows.forEach(function(o){
        const item=document.createElement("article");item.className="mw-calendar-event";
        const title=document.createElement("strong");title.textContent=o.title||"Untitled operation";
        const meta=document.createElement("small"),dt=dateValue(o.due_at);
        const assigned=o.assigned_to_name?"Assigned to "+o.assigned_to_name:o.assigned_supervisor_name?"Supervisor: "+o.assigned_supervisor_name:"Unassigned";
        meta.textContent=[dt?dateLabel(dt,{dateStyle:"medium",timeStyle:"short"}):"Schedule not recorded",String(o.status||"Pending").replace(/_/g," "),o.priority||"Normal",assigned,o.location_name||"Location not assigned",o.zone_name||"Zone not assigned"].join(" · ");
        item.append(title,meta);list.appendChild(item);
      });
    }
    const close=function(){overlay.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();};
    trigger.addEventListener("click",function(){overlay.hidden=false;trigger.setAttribute("aria-expanded","true");render();overlay.querySelector("[data-close]").focus();});
    search.addEventListener("input",render);
    overlay.querySelector("[data-close]").addEventListener("click",close);
    overlay.addEventListener("click",function(e){if(e.target===overlay)close();});
    overlay.querySelector(".mw-scheduled-dialog").addEventListener("keydown",function(e){if(e.key==="Escape"){e.stopPropagation();close();}});
    render();
  }
  window.MechnarSupervisorWorkspace = Object.freeze({ render });
})();