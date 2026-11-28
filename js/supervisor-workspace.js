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
          (showWorkspaceGreeting?'<h1>'+esc(greeting)+', '+esc(name)+'.</h1>':'')+'<p>'+esc(data.team.name)+' <span class="mw-header-separator">/</span> Team overview</p></div>'+
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
    document.body.appendChild(overlay);
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
    const trigger=root.querySelector("[data-mw-calendar-trigger]");if(!trigger)return;
    let scheduled=operations.filter(o=>dateValue(o.due_at)).sort((a,b)=>dateValue(a.due_at)-dateValue(b.due_at));
    const overlay=document.createElement("div");overlay.className="mw-scheduled-overlay";overlay.hidden=true;
    overlay.innerHTML='<section class="mw-scheduled-dialog" role="dialog" aria-modal="true"><header class="mw-scheduled-head"><div><span class="mw-eyebrow">TEAM SCHEDULE</span><h2>Scheduled Operations</h2><p data-summary></p></div><button type="button" data-close aria-label="Close">×</button></header><div class="mw-scheduled-toolbar"><label class="mw-scheduled-search">Search operations<input type="search" data-search placeholder="Search title, location, staff…"></label><button type="button" class="mw-scheduled-create" data-create>+ Create operation</button></div><div class="mw-scheduled-list" data-list></div></section>';
    root.appendChild(overlay);
    const list=overlay.querySelector("[data-list]"),search=overlay.querySelector("[data-search]");
    function render(){
      const q=search.value.toLowerCase().trim(),rows=scheduled.filter(o=>!q||[o.title,o.location_name,o.zone_name,o.assigned_to_name,o.status,o.priority].join(" ").toLowerCase().includes(q));
      overlay.querySelector("[data-summary]").textContent=rows.length+" scheduled operation"+(rows.length===1?"":"s")+" · Team scope";list.replaceChildren();
      if(!rows.length){const empty=document.createElement("p");empty.className="mw-calendar-empty";empty.textContent=scheduled.length?"No matching scheduled operations.":"No operations have a scheduled date yet.";list.appendChild(empty);return;}
      rows.forEach(o=>{const item=document.createElement("article");item.className="mw-calendar-event";const title=document.createElement("strong");title.textContent=o.title||"Untitled operation";const meta=document.createElement("small"),dt=dateValue(o.due_at);const assigned=o.assigned_to_name?"Assigned to "+o.assigned_to_name:o.assigned_supervisor_name?"Supervisor: "+o.assigned_supervisor_name:"Unassigned";meta.textContent=[dt?dateLabel(dt,{dateStyle:"medium",timeStyle:"short"}):"Schedule not recorded",String(o.status||"Pending").replace(/_/g," "),o.priority||"Normal",assigned,o.location_name||"Location not assigned",o.zone_name||"Zone not assigned"].join(" · ");item.append(title,meta);list.appendChild(item);});
    }
    async function openCreate(){
      let options;const formOverlay=document.createElement("div");formOverlay.className="mw-scheduled-create-overlay";formOverlay.hidden=true;
      formOverlay.innerHTML='<section class="mw-scheduled-create-dialog" role="dialog" aria-modal="true"><header><div><span class="mw-eyebrow">NEW SCHEDULE</span><h2>Create operation</h2></div><button type="button" data-form-close aria-label="Close">×</button></header><form data-create-form><div class="mw-scheduled-form-grid"><label>Operation name<input name="title" required maxlength="200"></label><label>Operation type<select name="category"><option>Cleaning Operations</option><option>Maintenance & Repairs</option><option>Delivery & Logistics</option><option>Assignments & Documentation</option><option>Employee Operations</option><option>General Operations</option><option>Other Operations</option></select></label><label>Priority<select name="priority"><option>Low</option><option selected>Normal</option><option>High</option><option>Urgent</option></select></label><label>Team<select name="team_id"><option value="">No specific team</option></select></label><label>Location<select name="location_id"><option value="">No specific location</option></select></label><label>Zone<select name="zone_id"><option value="">No specific zone</option></select></label><label>Assigned staff<select name="assigned_to_id"><option value="">Unassigned</option></select></label><label class="mw-scheduled-date-field">When to schedule<input name="due_at" type="datetime-local" required><span class="mw-scheduled-date-icon" aria-hidden="true">▦</span></label><label>Schedule type<select name="schedule_type"><option value="one_time">One-time</option><option value="recurring">Recurring</option></select></label><label>Estimated minutes<input name="estimated_minutes" type="number" min="1" max="10080"></label><label class="mw-scheduled-wide">Description<textarea name="description" rows="2"></textarea></label><label class="mw-scheduled-wide">Instructions<textarea name="instructions" rows="3"></textarea></label><label class="mw-scheduled-wide">Checklist (one item per line)<textarea name="checklist" rows="3"></textarea></label><div class="mw-scheduled-wide mw-scheduled-recurrence" data-recurrence hidden><label>Frequency<select name="frequency"><option value="daily">Daily</option><option value="weekly" selected>Weekly</option><option value="monthly">Monthly</option></select></label><label>Every<input name="interval" type="number" min="1" max="365" value="1"></label></div></div><p data-form-notice hidden></p><footer><button type="button" data-form-cancel>Cancel</button><button type="submit" class="mw-scheduled-save">Create scheduled operation</button></footer></form></section>';
      overlay.appendChild(formOverlay);
      const form=formOverlay.querySelector("form"),notice=formOverlay.querySelector("[data-form-notice]"),team=form.elements.team_id,location=form.elements.location_id,zone=form.elements.zone_id,assignee=form.elements.assigned_to_id,recurrence=formOverlay.querySelector("[data-recurrence]");
      const closeForm=()=>formOverlay.remove();
      formOverlay.querySelector("[data-form-close]").onclick=closeForm;formOverlay.querySelector("[data-form-cancel]").onclick=closeForm;formOverlay.addEventListener("click",e=>{if(e.target===formOverlay)closeForm();});formOverlay.querySelector(".mw-scheduled-create-dialog").addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();closeForm();}});
      form.elements.schedule_type.addEventListener("change",()=>{recurrence.hidden=form.elements.schedule_type.value!=="recurring";});
      try{options=await window.CleanTrackApi.get("operations/options");}catch(error){notice.textContent=error.message||"Could not load operation options.";notice.hidden=false;return;}
      (options.teams||[]).forEach(x=>team.add(new Option(x.name,x.id)));
      (options.locations||[]).forEach(x=>location.add(new Option(x.name,x.id)));
      (options.zones||[]).forEach(x=>zone.add(new Option(x.name,x.id)));
      (options.members||[]).filter(x=>String(x.role||"").toLowerCase()==="staff").forEach(x=>assignee.add(new Option(x.name+" · "+x.role,x.id)));
      team.addEventListener("change",()=>{const t=team.value;location.replaceChildren(new Option("No specific location",""),...(options.locations||[]).filter(x=>!t||String(x.team_id)===t).map(x=>new Option(x.name,x.id)));zone.replaceChildren(new Option("No specific zone",""),...(options.zones||[]).filter(x=>!t||String(x.team_id)===t).map(x=>new Option(x.name,x.id)));});
      location.addEventListener("change",()=>{const l=location.value;zone.replaceChildren(new Option("No specific zone",""),...(options.zones||[]).filter(x=>!l||String(x.location_id)===l).map(x=>new Option(x.name,x.id)));});
      formOverlay.hidden=false;form.elements.title.focus();
      form.addEventListener("submit",async e=>{e.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent="Creating…";notice.hidden=true;
        const data={title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),category:form.elements.category.value,priority:form.elements.priority.value,instructions:form.elements.instructions.value.trim(),checklist:form.elements.checklist.value.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean),required_evidence:[],estimated_minutes:form.elements.estimated_minutes.value?Number(form.elements.estimated_minutes.value):null,requires_verification:false,team_id:team.value?Number(team.value):null,location_id:location.value?Number(location.value):null,zone_id:zone.value?Number(zone.value):null,assigned_to_id:assignee.value?Number(assignee.value):null,due_at:form.elements.due_at.value?new Date(form.elements.due_at.value).toISOString():null,schedule_type:form.elements.schedule_type.value,schedule_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC",reminder_before_minutes:60,escalate_after_minutes:120,escalate_to_admin:true,recurrence_rule:form.elements.schedule_type.value==="recurring"?{frequency:form.elements.frequency.value,interval:Number(form.elements.interval.value)||1,catch_up_policy:"latest_only",catch_up_window_days:7}:null};
        if(!data.title||!data.due_at){notice.textContent="Operation name and schedule date/time are required.";notice.hidden=false;submit.disabled=false;submit.textContent="Create scheduled operation";return;}
        try{const result=await window.CleanTrackApi.post("operations",data);notice.textContent=result.message||"Scheduled operation created successfully.";notice.hidden=false;await refreshScheduled();search.value="";render();closeForm();}catch(error){notice.textContent=error.message||"Could not create scheduled operation.";notice.hidden=false;submit.disabled=false;submit.textContent="Create scheduled operation";}
      });
    }
    async function refreshScheduled(){try{const fresh=await window.CleanTrackApi.get("operations");operations=fresh.operations||fresh;scheduled=operations.filter(o=>dateValue(o.due_at)).sort((a,b)=>dateValue(a.due_at)-dateValue(b.due_at));}catch(error){throw error;}}
    const close=function(){overlay.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();};
    trigger.addEventListener("click",function(){overlay.hidden=false;trigger.setAttribute("aria-expanded","true");render();overlay.querySelector("[data-close]").focus();});
    search.addEventListener("input",render);overlay.querySelector("[data-close]").addEventListener("click",close);overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    overlay.querySelector(".mw-scheduled-dialog").addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();close();}});
    overlay.querySelector("[data-create]").addEventListener("click",openCreate);render();
  }
  window.MechnarSupervisorWorkspace = Object.freeze({ render });
})();