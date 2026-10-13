(function () {
  "use strict";

  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;
  const CREATE_ROLES = new Set(["admin", "supervisor"]);
  const TYPES = [["announcement","Announcement"],["alert","Operational alert"],["instruction","Instruction"]];
  const SEVERITIES = [["info","Informational"],["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]];

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function button(text, cls, fn) {
    const n = el("button", cls || "ct-ann-button", text);
    n.type = "button";
    n.addEventListener("click", fn);
    return n;
  }
  function optionSelect(rows, value, emptyLabel) {
    const s = el("select", "ct-ann-control");
    if (emptyLabel !== undefined) {
      const o = el("option", "", emptyLabel); o.value = ""; s.appendChild(o);
    }
    rows.forEach(row => {
      const o = el("option", "", row[1]); o.value = String(row[0]); s.appendChild(o);
    });
    s.value = value == null ? "" : String(value);
    return s;
  }
  function field(label, control, hint) {
    const wrap = el("label", "ct-ann-field");
    wrap.append(el("span", "ct-ann-field-label", label), control);
    if (hint) wrap.appendChild(el("small", "ct-ann-muted", hint));
    return wrap;
  }
  function check(label, checked) {
    const wrap = el("label", "ct-ann-check");
    const control = el("input"); control.type = "checkbox"; control.checked = Boolean(checked);
    wrap.append(control, el("span", "", label));
    return {wrap, input:control};
  }
  function textArea(value, rows) {
    const n = el("textarea", "ct-ann-control");
    n.rows = rows || 5; n.value = value || ""; n.maxLength = 12000; n.required = true;
    return n;
  }
  function localDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const z = n => String(n).padStart(2, "0");
    return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"T"+z(d.getHours())+":"+z(d.getMinutes());
  }
  function formatDate(value) {
    if (!value) return "Not set";
    try {
      if (window.CleanTrackPreferences) {
        const p = window.CleanTrackPreferences;
        const d = new Date(value);
        return p.formatDate(d) + " · " + p.formatTime(d);
      }
      return new Intl.DateTimeFormat(undefined, {dateStyle:"medium",timeStyle:"short"}).format(new Date(value));
    } catch (_) { return String(value); }
  }
  function pretty(value) {
    return String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  function apiError(error) { return error && error.message ? error.message : "Something went wrong. Please try again."; }
  function textInput(type, value, max, required) {
    const i = el("input", "ct-ann-control"); i.type = type; i.value = value || "";
    if (max) i.maxLength = max; if (required) i.required = true;
    return i;
  }
  function statusNode(message, isError) {
    const n = el("p", "ct-ann-status" + (isError ? " is-error" : " is-success"), message || "");
    n.setAttribute("role", "status"); return n;
  }
  function attachmentLink(item) {
    const a = el("a","ct-ann-attachment", "↧ " + item.filename + " (" + Math.max(1, Math.round((item.size||0)/1024)) + " KB)");
    const base = window.CleanTrackConfig && window.CleanTrackConfig.apiBaseUrl || "";
    a.href = base.replace(/\/+$/,"") + item.download_url;
    a.target = "_blank"; a.rel = "noopener";
    return a;
  }
  function announcementPayload(item, overrides) {
    return Object.assign({
      title:item.title, message:item.message, announcement_type:item.announcement_type,
      audience_scope:item.audience_scope, severity:item.severity,
      status:item.status === "archived" ? "draft" : item.status,
      team_id:item.team_id, target_location_id:item.target_location_id,
      target_zone_id:item.target_zone_id, is_pinned:Boolean(item.is_pinned),
      requires_acknowledgement:Boolean(item.requires_acknowledgement),
      escalate_to_admin:Boolean(item.escalate_to_admin),
      escalation_after_minutes:item.escalation_after_minutes,
      scheduled_at:item.scheduled_at, expires_at:item.expires_at
    }, overrides || {});
  }

  async function render(container, mode) {
    container.replaceChildren();
    const user = AUTH && AUTH.getCurrentUser ? AUTH.getCurrentUser() : null;
    if (!user) { container.appendChild(el("p","ct-ann-muted","Sign in to view announcements.")); return; }
    const role = String(user.role || "").toLowerCase();
    if (!["admin","supervisor","employee"].includes(role)) {
      container.appendChild(el("p","ct-ann-muted","Your account role cannot view announcements.")); return;
    }
    const isAdmin = role === "admin";
    const isSupervisor = role === "supervisor";
    const canCreate = CREATE_ROLES.has(role);
    const pageMode = mode || "announcements";
    const page = el("section","ct-ann-page");
    const header = el("header","ct-ann-header");
    const eyebrow = el("p","ct-ann-eyebrow", isAdmin ? "ORGANIZATION COMMUNICATIONS" : isSupervisor ? "TEAM COMMUNICATIONS" : "YOUR WORKSPACE");
    const heading = el("h1","", isAdmin ? "Announcements & Alerts" : isSupervisor ? "Supervisor Team Channel" : pageMode === "team-channel" ? "Team Channel" : "Announcements");
    const subtitle = el("p","ct-ann-muted",isAdmin
      ? "Publish organization updates, instructions and operational alerts. This is separate from automatic system notifications."
      : isSupervisor
        ? "Publish updates and instructions for your assigned team. Organization-wide announcements from Admins remain visible here."
        : "Read organization announcements, targeted team notices and operational alerts. You can acknowledge a notice when required.");
    header.append(eyebrow,heading,subtitle);
    page.appendChild(header);

    const state = { items:[], options:{teams:[],locations:[],zones:[]}, filterType:"all", filterStatus:"all", query:"", error:"" };
    const notice = el("div","ct-ann-global-status"); notice.hidden = true; notice.setAttribute("role","status"); page.appendChild(notice);
    const metrics = el("div","ct-ann-metrics");
    const metricNodes = [
      ["Published",el("strong","","0"),"ct-ann-metric"],
      ["Operational alerts",el("strong","","0"),"ct-ann-metric ct-ann-metric-alert"],
      ["Acknowledgements due",el("strong","","0"),"ct-ann-metric"]
    ];
    metricNodes.forEach(([label,value,cls])=>{const box=el("div",cls);box.append(value,el("span","",label));metrics.appendChild(box);});
    page.appendChild(metrics);

    const tools = el("div","ct-ann-toolbar");
    const search = textInput("search","",120,false); search.placeholder="Search by title, message or team";
    const typeFilter = optionSelect([["all","All types"],...TYPES], "all");
    const statusFilter = optionSelect(isAdmin ? [["all","All statuses"],["published","Published"],["scheduled","Scheduled"],["draft","Draft"]] : [["all","Published notices"]], "all");
    const refresh = button("↻ Refresh","ct-ann-button",()=>load());
    tools.append(search,typeFilter,statusFilter,refresh);
    page.appendChild(tools);

    const grid = el("div","ct-ann-main-grid");
    const content = el("div","ct-ann-list");
    const composerHost = el("div","ct-ann-composer-host");
    grid.appendChild(content);
    if (canCreate) grid.appendChild(composerHost);
    page.appendChild(grid);
    container.appendChild(page);

    async function load() {
      notice.hidden = true; refresh.disabled = true; refresh.textContent = "Loading…";
      try {
        const [list, opts] = await Promise.all([
          API.get("announcements" + (isAdmin && statusFilter.value !== "all" ? "?status="+encodeURIComponent(statusFilter.value) : "")),
          API.get("announcements/options")
        ]);
        state.items = Array.isArray(list.announcements) ? list.announcements : [];
        state.options = opts || {teams:[],locations:[],zones:[]};
        renderList();
        updateMetrics();
        refresh.textContent = "↻ Refresh"; refresh.disabled=false;
      } catch (error) {
        state.error = apiError(error);
        notice.textContent = state.error; notice.className = "ct-ann-global-status is-error"; notice.hidden=false;
        content.replaceChildren(el("div","ct-ann-empty","Announcements could not be loaded from the server. Your data has not been replaced with sample content."));
        refresh.textContent = "↻ Retry"; refresh.disabled=false;
      }
    }
    function updateMetrics() {
      const published = state.items.filter(a=>a.status==="published" && !a.archived_at).length;
      const alerts = state.items.filter(a=>a.announcement_type==="alert" && a.status==="published" && a.alert_status!=="resolved").length;
      const due = state.items.filter(a=>a.status==="published" && a.requires_acknowledgement && a.my_receipt?.state!=="acknowledged").length;
      metricNodes[0][1].textContent = String(published);
      metricNodes[1][1].textContent = String(alerts);
      metricNodes[2][1].textContent = String(due);
    }
    function filteredItems() {
      const q = state.query.toLowerCase();
      return state.items.filter(a=>{
        if (typeFilter.value!=="all" && a.announcement_type!==typeFilter.value) return false;
        if (isAdmin && statusFilter.value!=="all" && a.status!==statusFilter.value) return false;
        if (q && ![a.title,a.message,a.team_name,a.location_name,a.zone_name,a.created_by_name].some(v=>String(v||"").toLowerCase().includes(q))) return false;
        return true;
      });
    }
    function renderList() {
      content.replaceChildren();
      const items=filteredItems();
      if (!items.length) {
        const empty=el("div","ct-ann-empty");
        empty.append(el("span","ct-ann-empty-icon","♢"),el("h2","",state.items.length?"No matching announcements":"No announcements yet"),el("p","ct-ann-muted",state.items.length?"Try changing your filters.":"Published announcements and alerts will appear here once they have been created."));
        content.appendChild(empty); return;
      }
      items.forEach(item=>content.appendChild(renderCard(item)));
    }
    function renderCard(item) {
      const card=el("article","ct-ann-card"+(item.is_pinned?" is-pinned":"")+(item.announcement_type==="alert"?" is-alert":""));
      const top=el("div","ct-ann-card-top");
      const badges=el("div","ct-ann-badges");
      badges.appendChild(el("span","ct-ann-badge type-"+item.announcement_type,pretty(item.announcement_type)));
      if(item.announcement_type==="alert") badges.appendChild(el("span","ct-ann-badge severity-"+item.severity,pretty(item.severity)));
      badges.appendChild(el("span","ct-ann-badge status-"+item.status,pretty(item.status)));
      if(item.is_pinned) badges.appendChild(el("span","ct-ann-badge pin","Pinned"));
      if(item.announcement_type==="alert") badges.appendChild(el("span","ct-ann-badge "+(item.alert_status==="resolved"?"status-resolved":"severity-"+item.severity),item.alert_status==="resolved"?"Resolved":"Open alert"));
      top.appendChild(badges);
      if(item.created_by_id===user.id && item.my_receipt?.state==="issued") top.appendChild(el("span","ct-ann-issued","Issued by you"));
      card.appendChild(top);
      card.append(el("h2","ct-ann-card-title",item.title),el("p","ct-ann-message",item.message));

      const meta=el("div","ct-ann-meta");
      meta.append(el("span","","◷ "+formatDate(item.published_at||item.scheduled_at||item.created_at)));
      meta.append(el("span","","By "+(item.created_by_name||"Unknown")));
      meta.append(el("span","","Audience: "+audienceName(item)));
      const targets=[item.team_name,item.location_name,item.zone_name].filter(Boolean);
      if(targets.length) meta.append(el("span","","⌖ "+targets.join(" · ")));
      if(item.expires_at) meta.append(el("span","","Expires "+formatDate(item.expires_at)));
      card.appendChild(meta);

      const receipt=item.my_receipt||{state:"unread"};
      const myState=el("div","ct-ann-read-state state-"+(receipt.state||"unread"));
      myState.textContent=receipt.state==="acknowledged"?"✓ Acknowledged":receipt.state==="read"?"✓ Read":receipt.state==="issued"?"Published by you":"● Unread";
      card.appendChild(myState);

      if(item.attachments && item.attachments.length) {
        const attach=el("div","ct-ann-attachments");
        item.attachments.forEach(a=>{const link=attachmentLink(a);attach.appendChild(link);if(canManage(item))attach.appendChild(button("Remove","ct-ann-icon-button",async()=>{if(!confirm("Remove attachment "+a.filename+"?"))return;try{await API.delete("announcements/attachments/"+a.id);await load();}catch(e){showNotice(apiError(e),true);}}));});
        card.appendChild(attach);
      }
      const actions=el("div","ct-ann-card-actions");
      if(item.can_mark_read && receipt.state!=="read" && receipt.state!=="acknowledged" && item.status==="published") {
        actions.appendChild(button("Mark as read","ct-ann-button ct-ann-button-secondary",async()=>{try{await API.post("announcements/"+item.id+"/read",{});await load();}catch(e){showNotice(apiError(e),true);}}));
      }
      if(item.can_acknowledge && receipt.state!=="acknowledged" && item.status==="published") {
        actions.appendChild(button("Acknowledge","ct-ann-button ct-ann-button-primary",async()=>{if(!confirm("Confirm that you have read and understood this notice?"))return;try{await API.post("announcements/"+item.id+"/acknowledge",{});await load();}catch(e){showNotice(apiError(e),true);}}));
      }
      if(item.announcement_type==="alert" && item.alert_status!=="resolved" && (isAdmin || (isSupervisor && item.created_by_id===user.id))) {
        actions.appendChild(button("Mark resolved","ct-ann-button ct-ann-button-secondary",async()=>{if(!confirm("Mark this alert as resolved?"))return;try{await API.post("announcements/"+item.id+"/resolve",{});showNotice("Alert marked resolved.",false);await load();}catch(e){showNotice(apiError(e),true);}}));
      }
      if(canManage(item)) {
        actions.appendChild(button(item.is_pinned?"Unpin":"Pin","ct-ann-button ct-ann-button-secondary",async()=>{
          try{await API.patch("announcements/"+item.id,announcementPayload(item,{is_pinned:!item.is_pinned}));await load();}
          catch(e){showNotice(apiError(e),true);}
        }));
        actions.appendChild(button("Edit","ct-ann-button ct-ann-button-secondary",()=>renderComposer(item)));
        actions.appendChild(button("Receipts","ct-ann-button ct-ann-button-secondary",()=>showReceipts(item)));
        actions.appendChild(button("Remove","ct-ann-button ct-ann-button-danger",async()=>{if(!confirm("Remove this announcement from active views? It will be retained in audit history."))return;try{await API.delete("announcements/"+item.id);showNotice("Announcement removed from active views.",false);await load();}catch(e){showNotice(apiError(e),true);}}));
      } else if(isAdmin) {
        actions.appendChild(button("Read receipts","ct-ann-button ct-ann-button-secondary",()=>showReceipts(item)));
      }
      if(actions.childNodes.length) card.appendChild(actions);
      if(item.receipt_summary && isAdmin) {
        const summary=el("p","ct-ann-receipt-summary",item.receipt_summary.read_count+" / "+item.receipt_summary.recipient_count+" read · "+item.receipt_summary.acknowledged_count+" acknowledged");
        card.appendChild(summary);
      }
      return card;
    }
    function audienceName(item) {
      if(item.audience_scope==="organization")return "Entire organization";
      if(item.audience_scope==="supervisors")return "All supervisors";
      return item.team_name ? "Team: "+item.team_name : "Selected team";
    }
    function canManage(item) {
      if(isAdmin)return true;
      return isSupervisor && item.created_by_id===user.id && Boolean(item.team_id) && state.options.teams.some(t=>Number(t.id)===Number(item.team_id));
    }
    function showNotice(message,isError) {
      notice.textContent=message; notice.className="ct-ann-global-status "+(isError?"is-error":"is-success"); notice.hidden=false;
      notice.scrollIntoView({behavior:"smooth",block:"nearest"});
    }
    async function showReceipts(item) {
      try {
        const data=await API.get("announcements/"+item.id+"/receipts");
        const dlg=document.createElement("dialog"); dlg.className="ct-ann-dialog";
        const head=el("div","ct-ann-dialog-head"); head.append(el("h2","", "Read receipts · "+item.title));
        head.appendChild(button("Close","ct-ann-icon-button",()=>dlg.close()));
        const summary=el("p","ct-ann-muted",(data.receipts||[]).length+" recipients tracked"+(data.requires_acknowledgement?" · acknowledgement required":""));
        const table=el("div","ct-ann-receipts");
        (data.receipts||[]).forEach(row=>{
          const line=el("div","ct-ann-receipt-row");line.append(el("div","ct-ann-receipt-person",row.user_name||row.email||"Member"),el("small","ct-ann-muted",pretty(row.role||"member")));
          const state=el("div","ct-ann-receipt-timing");state.append(el("span","",row.acknowledged_at?"Acknowledged":row.read_at?"Read":"Unread"));
          state.append(el("small","ct-ann-muted",row.acknowledged_at?"At "+formatDate(row.acknowledged_at):row.read_at?"At "+formatDate(row.read_at):"Not yet read"));
          line.appendChild(state);table.appendChild(line);
        });
        if(!(data.receipts||[]).length)table.appendChild(el("p","ct-ann-muted","No recipient receipts exist yet."));
        dlg.append(head,summary,table); document.body.appendChild(dlg); dlg.addEventListener("close",()=>dlg.remove(),{once:true}); dlg.showModal();
      } catch(e) { showNotice(apiError(e),true); }
    }
    function renderComposer(item) {
      composerHost.replaceChildren();
      const editing=Boolean(item);
      const card=el("section","ct-ann-compose-card");
      const title=el("h2","",editing?"Edit announcement":"Create announcement or alert");
      const description=el("p","ct-ann-muted",isAdmin?"Choose organization-wide, supervisor-only or team-specific delivery. You can draft, pin, schedule, attach files and review receipts.":"Create a notice for a team you are assigned to. You can add an attachment or voice note, pin instructions, schedule delivery and require acknowledgements.");
      card.append(title,description);
      const form=el("form","ct-ann-form");
      const name=textInput("text",item?.title||"",200,true);name.placeholder="e.g. Water supply maintenance at North Wing";
      const message=textArea(item?.message||"",6);message.placeholder="Write the announcement, instruction or alert. Include what happened, where, what action is needed and by when.";
      const kind=optionSelect(TYPES,item?.announcement_type||"announcement");
      const sev=optionSelect(SEVERITIES,item?.severity||"medium");
      const audience=optionSelect(isAdmin?[["organization","Entire organization"],["supervisors","All supervisors"],["team","Specific team"]]:[["team","My assigned team"]],item?.audience_scope||(isAdmin?"organization":"team"));
      const team=optionSelect(state.options.teams.map(t=>[t.id,t.name]),item?.team_id,"Select team");
      const loc=optionSelect(state.options.locations.map(l=>[l.id,l.name]),item?.target_location_id,"No specific location");
      const zone=optionSelect(state.options.zones.map(z=>[z.id,z.name]),item?.target_zone_id,"No specific zone");
      team.required=!isAdmin || audience.value==="team";
      const status=optionSelect([["published","Publish now"],["draft","Save as draft"],["scheduled","Schedule for later"]],item?.status||"published");
      const scheduled=textInput("datetime-local",localDate(item?.scheduled_at),null,false);
      const expires=textInput("datetime-local",localDate(item?.expires_at),null,false);
      const pinned=check("Pin this announcement/instruction to the top of the relevant channel",item?.is_pinned);
      const requiresAck=check("Require a read acknowledgement from recipients",item?.requires_acknowledgement);
      const escalates=check("Escalate this alert to Admin if it is serious or remains unresolved",item?.escalate_to_admin);
      const escalationAfter=optionSelect([[5,"After 5 minutes"],[15,"After 15 minutes"],[30,"After 30 minutes"],[60,"After 1 hour"],[240,"After 4 hours"],[1440,"After 24 hours"]],item?.escalation_after_minutes||15);
      const files=el("input","ct-ann-control");files.type="file";files.multiple=true;files.accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.csv";
      const voice=el("input","ct-ann-control");voice.type="file";voice.accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm";
      const currentFiles=el("div","ct-ann-current-files");
      if(item?.attachments?.length){item.attachments.forEach(a=>currentFiles.appendChild(attachmentLink(a)));}
      const statusLine=statusNode("",false);statusLine.hidden=true;
      const submitRow=el("div","ct-ann-compose-actions");
      const save=el("button","ct-ann-button ct-ann-button-primary","Save");save.type="submit";
      const cancel=button("Cancel","ct-ann-button ct-ann-button-secondary",()=>composerHost.replaceChildren());
      submitRow.append(save,cancel);
      const grid=el("div","ct-ann-form-grid");
      grid.appendChild(field("Title",name));
      grid.appendChild(field("Message",message));
      grid.appendChild(field("Communication type",kind));
      const severityField=field("Severity",sev,"Use High/Critical for serious issues that need immediate escalation.");
      grid.appendChild(severityField);
      grid.appendChild(field("Target audience",audience));
      const teamField=field("Team",team,"Required when the target audience is a specific team.");
      grid.appendChild(teamField);
      grid.appendChild(field("Relevant location (optional)",loc));
      grid.appendChild(field("Relevant zone (optional)",zone));
      grid.appendChild(field("Publication",status));
      const scheduleField=field("Scheduled date and time",scheduled,"Required only when Schedule for later is selected. Uses your browser's local time.");
      grid.appendChild(scheduleField);
      grid.appendChild(field("Expiry (optional)",expires,"Recipients will no longer see an expired announcement."));
      const optionsBox=el("div","ct-ann-compose-options");optionsBox.append(pinned.wrap,requiresAck.wrap);
      const escalationBox=el("div","ct-ann-escalation-box");
      escalationBox.append(escalates.wrap,field("Escalation threshold",escalationAfter,"High/Critical alerts escalate immediately when enabled; lower severities escalate after this interval if still open."));
      const attachmentField=field("Attachments (optional)",files,"Images or documents; up to 10 MB each and 20 MB per upload.");
      const voiceField=field("Voice note (optional)",voice,isAdmin?"Text is the primary format. Voice is optional and intended mainly for supervisor broadcasts.":"Add a short audio note for your team if needed.");
      form.append(grid,optionsBox,escalationBox,attachmentField,voiceField,currentFiles,statusLine,submitRow);
      card.appendChild(form);composerHost.appendChild(card);

      function changeAudience() {
        const teamNeeded=audience.value==="team";
        team.disabled=!teamNeeded;team.required=teamNeeded;
        teamField.classList.toggle("is-disabled",!teamNeeded);
        if(!teamNeeded)team.value="";
        escalationBox.hidden=kind.value!=="alert" || isAdmin;
        severityField.hidden=kind.value!=="alert";
        escalates.input.disabled=kind.value!=="alert";
        if(kind.value!=="alert"){escalates.input.checked=false;}
        if(isAdmin){escalationBox.hidden=true;}
      }
      audience.addEventListener("change",changeAudience);
      kind.addEventListener("change",changeAudience);
      let zones=state.options.zones;
      function filterZones() {
        const locationId=loc.value;
        const selected=zone.value;
        const rows=zones.filter(z=>!locationId||String(z.location_id)===String(locationId));
        zone.replaceChildren();
        const empty=el("option","","No specific zone");empty.value="";zone.appendChild(empty);
        rows.forEach(z=>{const o=el("option","",z.name);o.value=String(z.id);zone.appendChild(o);});
        if(rows.some(z=>String(z.id)===String(selected)))zone.value=selected;
      }
      loc.addEventListener("change",filterZones);filterZones();changeAudience();
      form.addEventListener("submit",async event=>{
        event.preventDefault();
        statusLine.hidden=true;
        if(status.value==="scheduled"&&!scheduled.value){statusLine.textContent="Choose a future date and time before scheduling.";statusLine.className="ct-ann-status is-error";statusLine.hidden=false;return;}
        if(status.value==="scheduled" && new Date(scheduled.value).getTime()<=Date.now()){statusLine.textContent="The scheduled time must be in the future.";statusLine.className="ct-ann-status is-error";statusLine.hidden=false;return;}
        if(audience.value==="team"&&!team.value){statusLine.textContent="Choose a target team.";statusLine.className="ct-ann-status is-error";statusLine.hidden=false;return;}
        const payload={
          title:name.value.trim(),message:message.value.trim(),announcement_type:kind.value,
          audience_scope:audience.value,severity:kind.value==="alert"?sev.value:"info",
          team_id:audience.value==="team"?Number(team.value):null,
          target_location_id:loc.value?Number(loc.value):null,target_zone_id:zone.value?Number(zone.value):null,
          status:status.value,scheduled_at:status.value==="scheduled"?new Date(scheduled.value).toISOString():null,
          expires_at:expires.value?new Date(expires.value).toISOString():null,is_pinned:pinned.input.checked,
          requires_acknowledgement:requiresAck.input.checked,
          escalate_to_admin:!isAdmin&&kind.value==="alert"&&escalates.input.checked,
          escalation_after_minutes:!isAdmin&&kind.value==="alert"&&escalates.input.checked?Number(escalationAfter.value):null
        };
        save.disabled=true;save.textContent=editing?"Saving…":"Creating…";
        try {
          const result=editing?await API.patch("announcements/"+item.id,payload):await API.post("announcements",payload);
          const saved=result.announcement;
          const allFiles=[...files.files,...voice.files];
          if(allFiles.length) {
            const data=new FormData(); allFiles.forEach(file=>data.append("files",file));
            await API.post("announcements/"+saved.id+"/attachments",data);
          }
          showNotice(editing?"Announcement updated.":"Announcement saved.",false);
          composerHost.replaceChildren();
          await load();
        } catch(error) {
          statusLine.textContent=apiError(error)+(editing?" The existing announcement was not confirmed as updated.":"");
          statusLine.className="ct-ann-status is-error";statusLine.hidden=false;
          save.disabled=false;save.textContent=editing?"Save changes":"Save";
          // If the post saved but attachments failed, tell the user so they can retry
          // rather than claiming the whole operation completed.
          if(!editing) {
            try { const refreshed=await API.get("announcements"); state.items=refreshed.announcements||[];renderList();updateMetrics(); }
            catch(_) {}
          }
        }
      });
    }

    search.addEventListener("input",()=>{state.query=search.value;renderList();});
    typeFilter.addEventListener("change",renderList);
    statusFilter.addEventListener("change",load);
    await load();
    if(canCreate) renderComposer(null);
  }

  window.CleanTrackAnnouncements = Object.freeze({render});
})();
