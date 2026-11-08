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
          '<h1>'+esc(greeting)+', '+esc(name)+'.</h1><p>'+esc(data.team.name)+' <span class="mw-header-separator">/</span> Team operations overview</p></div>'+
          '<div class="mw-header-actions"><button type="button" class="mw-calendar-launch" data-mw-calendar-trigger aria-haspopup="dialog" aria-expanded="false">▦ <span>Operations calendar</span></button>'+
          '<div class="mw-updated">Live records <span>Updated '+esc(dateLabel(metrics.data_as_of,{hour:"2-digit",minute:"2-digit"}))+'</span></div></div></header>'+
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
          card("Recent Activity",activity.length?'<div class="mw-activity-list">'+activity.slice(0,6).map(a=>
            '<div class="mw-activity"><span class="mw-activity-dot"></span><div><strong>'+esc(a.actor_name)+'</strong> <span>'+esc(activityVerb(a.action))+'</span><b>'+esc(a.operation_title)+'</b><small>'+
            esc(a.actor_role||"Member")+' · '+esc(dateLabel(a.created_at,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}))+'</small>'+(a.message?'<p class="mw-activity-message">'+esc(a.message)+'</p>':'')+'</div></div>').join("")+'</div>':
            empty("No operation activity has been recorded."),"mw-activity-card")+
          card("Announcements & Alerts",announcementContent+(announcements.length?'<button class="mw-link-button" data-mw-page="team-channel">Open Team Channel →</button>':""),"mw-announcements")+
        '</div>'+
        '<nav class="mw-quick-actions" aria-label="Supervisor shortcuts"><button class="button button-primary" data-mw-page="operations">Operations</button>'+
          '<button class="button button-secondary" data-mw-page="reviews">Review Queue</button><button class="button button-secondary" data-mw-page="personnel">Personnel</button>'+
          '<button class="button button-secondary" data-mw-page="team-channel">Team Channel</button></nav></div>';
    root.querySelectorAll("[data-mw-page]").forEach(btn=>btn.addEventListener("click",()=>nav?.setActivePage(btn.dataset.mwPage)));
    setupCalendar(root,operations);
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

  function setupCalendar(root, operations) {
    const trigger=root.querySelector("[data-mw-calendar-trigger]");
    if(!trigger)return;
    const today=startOfDay(new Date());
    let cursor=new Date(today.getFullYear(),today.getMonth(),1);
    let selected=new Date(today);
    let view="month";
    const filters={status:"",priority:"",location:"",zone:""};
    const panel=document.createElement("section");
    panel.className="mw-calendar-popover";
    panel.hidden=true;
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-label","Operations calendar");
    panel.innerHTML='<header class="mw-calendar-popover-head"><div><strong data-mw-heading></strong><small data-mw-subheading></small></div>'+
      '<div class="mw-calendar-popover-actions"><button type="button" data-mw-today>Today</button><button type="button" data-mw-prev aria-label="Previous period">‹</button>'+
      '<button type="button" data-mw-next aria-label="Next period">›</button><button type="button" data-mw-close aria-label="Close calendar">×</button></div></header>'+
      '<nav class="mw-calendar-views" aria-label="Calendar view"><button data-view="day">Day</button><button data-view="week">Week</button>'+
      '<button data-view="month" class="active">Month</button><button data-view="agenda">Agenda</button></nav>'+
      '<div class="mw-calendar-filters"><label>Status<select data-filter="status"><option value="">All statuses</option></select></label>'+
      '<label>Priority<select data-filter="priority"><option value="">All priorities</option></select></label>'+
      '<label>Location<select data-filter="location"><option value="">All locations</option></select></label>'+
      '<label>Zone<select data-filter="zone"><option value="">All zones</option></select></label></div>'+
      '<div class="mw-calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>'+
      '<div class="mw-calendar-dates" data-mw-dates></div><section class="mw-calendar-selected" data-mw-selected><h3 data-mw-selected-title></h3><div data-mw-selected-events></div></section>';
    root.appendChild(panel);
    const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    const dayEvents=d=>filtered().filter(o=>{const dt=dateValue(o.due_at);return dt&&key(dt)===key(d);}).sort((a,b)=>dateValue(a.due_at)-dateValue(b.due_at));
    const filtered=()=>operations.filter(o=>{
      const status=String(o.status||"").trim().toLowerCase().replace(/[\s-]+/g,"_");
      if(filters.status&&status!==filters.status)return false;
      if(filters.priority&&String(o.priority||"Normal").toLowerCase()!==filters.priority)return false;
      if(filters.location&&String(o.location_id||"")!==filters.location)return false;
      if(filters.zone&&String(o.zone_id||"")!==filters.zone)return false;
      return Boolean(dateValue(o.due_at));
    });
    const addOption=(select,value,label)=>{const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);};
    const populate=(field,values)=>{const select=panel.querySelector('[data-filter="'+field+'"]');values.forEach(v=>addOption(select,v.value,v.label));};
    const unique=(field,labelField)=>{const map=new Map();operations.forEach(o=>{const id=o[field];if(id!=null&&id!==""&&!map.has(String(id)))map.set(String(id),o[labelField]||("ID "+id));});return Array.from(map,([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label));};
    populate("status",Array.from(new Set(operations.map(o=>String(o.status||"Pending").trim().toLowerCase().replace(/[\s-]+/g,"_")))).sort().map(v=>({value:v,label:v.replace(/_/g," ").replace(/\b\w/g,x=>x.toUpperCase())})));
    populate("priority",Array.from(new Set(operations.map(o=>String(o.priority||"Normal").toLowerCase()))).sort().map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)})));
    populate("location",unique("location_id","location_name"));
    populate("zone",unique("zone_id","zone_name"));
    panel.querySelectorAll("[data-filter]").forEach(select=>select.addEventListener("change",()=>{filters[select.dataset.filter]=select.value;render();}));
    function periodLabel(){
      if(view==="day")return new Intl.DateTimeFormat(undefined,{dateStyle:"full"}).format(selected);
      if(view==="week"){const start=weekStart(cursor),end=addDays(start,6);return dateLabel(start,{month:"short",day:"numeric"})+" – "+dateLabel(end,{month:"short",day:"numeric",year:"numeric"});}
      return new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(cursor);
    }
    function weekStart(d){const x=startOfDay(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;}
    function addEvent(parent,o){
      const item=document.createElement("article");item.className="mw-calendar-event";
      const title=document.createElement("strong");title.textContent=o.title||"Untitled operation";
      const meta=document.createElement("small");
      const dt=dateValue(o.due_at);
      const assignment=o.original_assigned_to_name&&o.assigned_to_name&&o.original_assigned_to_name!==o.assigned_to_name
        ?"Admin origin: "+o.original_assigned_to_name+" → Current: "+o.assigned_to_name
        :o.assigned_to_name?"Assigned to "+o.assigned_to_name:o.assigned_supervisor_name?"Supervisor: "+o.assigned_supervisor_name:"Unassigned";
      meta.textContent=[dt?dateLabel(dt,{hour:"2-digit",minute:"2-digit"}):"No deadline",o.overdue?"Overdue":String(o.status||"").replace(/_/g," "),o.priority||"Normal",assignment,o.location_name||"Location not assigned",o.zone_name||"Zone not assigned"].join(" · ");
      item.append(title,meta);parent.appendChild(item);
    }
    function renderEventsForDate(d){
      const list=panel.querySelector("[data-mw-selected-events]");list.replaceChildren();
      const events=dayEvents(d);
      if(!events.length){const p=document.createElement("p");p.className="mw-calendar-empty";p.textContent="No operations due on this date.";list.appendChild(p);return;}
      events.forEach(o=>addEvent(list,o));
    }
    function render(){
      panel.querySelector("[data-mw-heading]").textContent=view==="agenda"?"Operations agenda":periodLabel();
      panel.querySelector("[data-mw-subheading]").textContent=filtered().length+" scheduled operation"+(filtered().length===1?"":"s")+" · team scope";
      panel.querySelectorAll("[data-view]").forEach(b=>{b.classList.toggle("active",b.dataset.view===view);b.setAttribute("aria-pressed",String(b.dataset.view===view));});
      const weekdays=panel.querySelector(".mw-calendar-weekdays"),dates=panel.querySelector("[data-mw-dates]");
      weekdays.hidden=view!=="month";
      dates.className="mw-calendar-dates "+(view==="week"?"is-week":view==="day"?"is-day":view==="agenda"?"is-agenda":"");
      dates.replaceChildren();
      if(view==="month"){
        const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),offset=(first.getDay()+6)%7,start=addDays(first,-offset);
        for(let i=0;i<42;i++){const d=addDays(start,i),count=dayEvents(d).length,b=document.createElement("button");b.type="button";
          b.className="mw-calendar-date"+(d.getMonth()!==cursor.getMonth()?" outside":"")+(key(d)===key(today)?" today":"")+(key(d)===key(selected)?" selected":"");
          b.textContent=String(d.getDate());b.setAttribute("aria-label",new Intl.DateTimeFormat(undefined,{dateStyle:"full"}).format(d)+(count?", "+count+" scheduled operations":""));
          if(count){const dot=document.createElement("i");dot.className="mw-calendar-count";dot.setAttribute("aria-hidden","true");b.appendChild(dot);}
          b.addEventListener("click",()=>{selected=startOfDay(d);if(d.getMonth()!==cursor.getMonth())cursor=new Date(d.getFullYear(),d.getMonth(),1);render();});dates.appendChild(b);}
        panel.querySelector("[data-mw-selected-title]").textContent="Operations · "+dateLabel(selected,{month:"short",day:"numeric",year:"numeric"});
        renderEventsForDate(selected);
      } else if(view==="day"){
        panel.querySelector("[data-mw-selected-title]").textContent="Operations · "+dateLabel(selected,{month:"short",day:"numeric",year:"numeric"});
        renderEventsForDate(selected);
      } else if(view==="week"){
        const start=weekStart(cursor);
        for(let i=0;i<7;i++){const d=addDays(start,i),column=document.createElement("section");column.className="mw-calendar-week-column";
          const head=document.createElement("button");head.type="button";head.className="mw-calendar-week-day";head.textContent=new Intl.DateTimeFormat(undefined,{weekday:"short",day:"numeric"}).format(d);
          head.addEventListener("click",()=>{selected=startOfDay(d);view="day";render();});column.appendChild(head);
          const events=dayEvents(d);if(!events.length)column.appendChild(document.createTextNode("—"));
          events.forEach(o=>{const chip=document.createElement("button");chip.type="button";chip.className="mw-calendar-week-event";chip.textContent=o.title||"Operation";chip.title=(o.status||"")+" · "+(o.priority||"Normal");chip.addEventListener("click",()=>{selected=startOfDay(d);view="day";render();});column.appendChild(chip);});
          dates.appendChild(column);}
        panel.querySelector("[data-mw-selected-title]").textContent="Selected day · "+dateLabel(selected,{month:"short",day:"numeric",year:"numeric"});
        renderEventsForDate(selected);
      } else {
        panel.querySelector("[data-mw-selected-title]").textContent="Scheduled work by deadline";
        const events=filtered().sort((a,b)=>dateValue(a.due_at)-dateValue(b.due_at));
        if(!events.length){dates.appendChild(document.createTextNode("No scheduled operations match these filters."));}
        events.forEach(o=>addEvent(dates,o));
        panel.querySelector("[data-mw-selected-events]").replaceChildren();
      }
      if(view==="agenda")panel.querySelector("[data-mw-selected]").hidden=true;
      else panel.querySelector("[data-mw-selected]").hidden=false;
    }
    function position(){
      panel.hidden=false;panel.style.visibility="hidden";const r=trigger.getBoundingClientRect();
      const w=Math.min(440,window.innerWidth-20);panel.style.width=w+"px";
      panel.style.maxHeight=Math.max(300,window.innerHeight-20)+"px";
      const h=Math.min(panel.scrollHeight,window.innerHeight-20);
      let left=Math.min(window.innerWidth-w-10,Math.max(10,r.right-w)),top=r.bottom+9;
      if(top+h>window.innerHeight-10)top=Math.max(10,r.top-h-9);
      panel.style.left=left+"px";panel.style.top=top+"px";panel.style.visibility="visible";
    }
    trigger.addEventListener("click",()=>{if(panel.hidden){render();position();trigger.setAttribute("aria-expanded","true");panel.querySelector("[data-mw-close]").focus();}
      else{panel.hidden=true;trigger.setAttribute("aria-expanded","false");}});
    panel.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{view=b.dataset.view;if(view==="week")cursor=new Date(selected);if(view==="day")cursor=new Date(selected);render();}));
    panel.querySelector("[data-mw-prev]").addEventListener("click",()=>{if(view==="day")selected=addDays(selected,-1);else if(view==="week")cursor=addDays(cursor,-7);else cursor=new Date(cursor.getFullYear(),cursor.getMonth()-1,1);render();});
    panel.querySelector("[data-mw-next]").addEventListener("click",()=>{if(view==="day")selected=addDays(selected,1);else if(view==="week")cursor=addDays(cursor,7);else cursor=new Date(cursor.getFullYear(),cursor.getMonth()+1,1);render();});
    panel.querySelector("[data-mw-today]").addEventListener("click",()=>{selected=new Date(today);cursor=new Date(today.getFullYear(),today.getMonth(),1);render();});
    panel.querySelector("[data-mw-close]").addEventListener("click",()=>{panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();});
    root.addEventListener("pointerdown",event=>{if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target)){panel.hidden=true;trigger.setAttribute("aria-expanded","false");}});
    panel.addEventListener("keydown",event=>{if(event.key==="Escape"){panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();}});
    window.addEventListener("resize",()=>{if(!panel.hidden)position();});
    window.addEventListener("scroll",()=>{if(!panel.hidden)position();},true);
  }
  window.MechnarSupervisorWorkspace = Object.freeze({ render });
})();