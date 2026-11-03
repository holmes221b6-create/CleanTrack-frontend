(function(){
"use strict";
const API=window.CleanTrackApi,AUTH=window.CleanTrackAuth;
let root=null,teams=[],busy=false,archived=false,query="",selected=new Set(),teamInsights=new Map();
const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!==undefined&&x!==null)n.textContent=String(x);return n};
function button(x,c,fn,type){const n=el("button",c||"ct-team-btn",x);n.type=type||"button";if(fn)n.addEventListener("click",fn);return n}
function txt(x,otherwise){return x===null||x===undefined||x===""?(otherwise||"—"):String(x)}
function date(x){return x?(window.CleanTrackPreferences?.formatDate?window.CleanTrackPreferences.formatDate(x):new Date(x).toLocaleDateString()):"—"}
function dateTime(x){return x?new Date(x).toLocaleString():"—"}
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch(_){return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
function userKey(){return String(AUTH?.getCurrentUser?.()?.id??"user")}
function pins(){return read("ct.team.pins."+userKey(),[]).map(String)}
function recent(){return read("ct.team.recent."+userKey(),[]).map(String).slice(0,3)}
function getTeam(id){return teams.find(t=>String(t.id)===String(id))}
function notice(message,kind){let n=root.querySelector("[data-team-notice]");n.className="ct-team-notice "+(kind||"info");n.textContent=message||"";n.hidden=!message}
function field(label,input,hint){const n=el("label","ct-team-field");n.append(el("span","",label),input);if(hint)n.append(el("small","ct-team-muted",hint));return n}
function input(value,name,type){const n=el("input","ct-team-input");n.name=name;n.type=type||"text";n.value=value==null?"":String(value);return n}
function textarea(value,name){const n=el("textarea","ct-team-input");n.name=name;n.value=value||"";n.rows=3;return n}
function metric(label,value,note,warning){const n=el("div","ct-team-metric"+(warning?" is-warning":""));n.append(el("small","",label),el("strong","",value===undefined||value===null?"—":value));if(note)n.append(el("span","ct-team-muted",note));return n}
function createOpen(open){const f=root.querySelector("[data-team-create]");f.hidden=!open;if(open)f.querySelector("[name=name]").focus()}
function teamCompliance(teamId){
 const insight=teamInsights.get(String(teamId));const rows=(insight?.performance||[]).filter(x=>x.compliance_rate!==null&&x.compliance_rate!==undefined&&Number(x.due_dated_completions||0)>0);
 if(!rows.length)return null;
 const count=rows.reduce((n,x)=>n+Number(x.due_dated_completions||0),0);
 const onTime=rows.reduce((n,x)=>n+Math.round(Number(x.compliance_rate)*Number(x.due_dated_completions||0)/100),0);
 return count?Math.round(onTime/count*1000)/10:null;
}
function card(t){
 const c=el("article","ct-team-card"),top=el("div","ct-team-card__top"),ident=el("div");
 ident.append(el("h3","",t.name),el("p","ct-team-muted",t.description||"No description provided."));
 const pick=el("label","ct-team-select");const selectBox=el("input");selectBox.type="checkbox";selectBox.checked=selected.has(String(t.id));selectBox.setAttribute("aria-label","Select "+t.name);selectBox.addEventListener("change",()=>{if(selectBox.checked)selected.add(String(t.id));else selected.delete(String(t.id));renderList()});pick.append(selectBox,el("span","ct-team-sr-only","Select team"));top.append(pick,ident,el("span","ct-team-status"+(t.status==="archived"?" is-archived":""),t.status==="archived"?"Archived":"Active"));c.append(top);
 const meta=el("div","ct-team-card__summary");
 [txt(t.member_count,"0")+" people",txt(t.location_count,"0")+" locations",txt(t.zone_count,"0")+" zones"].forEach(x=>meta.append(el("span","",x)));c.append(meta);
 const load=el("div","ct-team-card__summary");
 const compliance=teamCompliance(t.id);
 ["Active tasks: "+txt(t.active_task_count,"0"),"Pending: "+txt(t.pending_task_count,"0"),"Overdue: "+txt(t.overdue_task_count,"0"),"Due-task compliance: "+(compliance===null?"—":compliance+"%")].forEach(x=>load.append(el("span","",x)));c.append(load);
 if(t.capacity!==null&&t.capacity!==undefined){const cap=el("div","ct-team-capacity");cap.append(el("span","","Capacity"),el("strong",Number(t.member_count)>Number(t.capacity)?"ct-team-warning":"",txt(t.member_count,"0")+" / "+t.capacity));const bar=el("div","ct-team-capacity__track"),fill=el("span","ct-team-capacity__fill"+(Number(t.member_count)>Number(t.capacity)?" over":""));fill.style.width=Math.min(Number(t.capacity)?Number(t.member_count||0)/Number(t.capacity)*100:0,100)+"%";bar.append(fill);cap.append(bar);c.append(cap)}
 const foot=el("div","ct-team-card__footer"),pin=pins().includes(String(t.id));
 foot.append(el("small","ct-team-muted",t.created_at?"Created "+date(t.created_at):"Team record"),button(pin?"★ Pinned":"☆ Pin team","ct-team-btn ct-team-btn--quiet",()=>{let p=pins().filter(x=>x!==String(t.id));if(!pin)p.push(String(t.id));write("ct.team.pins."+userKey(),p);renderList()}),button("Open team →","ct-team-btn ct-team-btn--primary",()=>openTeam(t.id)));c.append(foot);return c
}

function rollupTrend(){
 const weeks=new Map();
 for(const item of teamInsights.values())for(const row of (item.performance||[])){
  const key=String(row.week_start||"");if(!key)continue;
  if(!weeks.has(key))weeks.set(key,{week_start:key,tasks_created:0,tasks_completed:0,due_dated_completions:0,on_time:0});
  const aggregate=weeks.get(key);aggregate.tasks_created+=Number(row.tasks_created||0);aggregate.tasks_completed+=Number(row.tasks_completed||0);
  const due=Number(row.due_dated_completions||0);aggregate.due_dated_completions+=due;
  if(row.compliance_rate!==null&&row.compliance_rate!==undefined)aggregate.on_time+=Math.round(Number(row.compliance_rate)*due/100);
 }
 return [...weeks.values()].sort((a,b)=>a.week_start.localeCompare(b.week_start)).map(x=>({...x,compliance_rate:x.due_dated_completions?Math.round(x.on_time/x.due_dated_completions*1000)/10:null}));
}
function renderInsights(){
 const wrap=root.querySelector("[data-team-insights]");if(!wrap)return;wrap.replaceChildren();
 const activeTeams=teams.filter(t=>String(t.status||"active")!=="archived");
 const total=(key)=>activeTeams.reduce((n,t)=>n+Number(t[key]||0),0);
 const totalMembers=total("member_count"),locations=total("location_count"),zones=total("zone_count"),tasks=total("task_count"),activeTasks=total("active_task_count"),overdue=total("overdue_task_count");
 const dueRows=[];for(const item of teamInsights.values())for(const row of (item.performance||[]))if(Number(row.due_dated_completions||0)>0)dueRows.push(row);
 let dueN=0,onTime=0;dueRows.forEach(row=>{const n=Number(row.due_dated_completions||0);dueN+=n;if(row.compliance_rate!==null&&row.compliance_rate!==undefined)onTime+=Math.round(Number(row.compliance_rate)*n/100)});
 const overallCompliance=dueN?Math.round(onTime/dueN*1000)/10:null;
 const header=el("div","ct-team-section-heading");header.append(el("h2","","Team overview"),el("span","ct-team-muted","Calculated from current organization records"));wrap.append(header);
 const metrics=el("div","ct-team-insight-metrics");
 [
  ["Teams",activeTeams.length,"Active teams"],
  ["Team members",totalMembers,"Current assignments"],
  ["Locations / zones",locations+" / "+zones,"Assigned operational areas"],
  ["Open workload",activeTasks,overdue+" overdue · "+tasks+" linked tasks"],
  ["Due-task compliance",overallCompliance===null?"—":overallCompliance+"%",dueN?dueN+" due-dated completions in the trend window":"No comparable due-dated completions"]
 ].forEach(x=>metrics.append(metric(x[0],x[1],x[2],x[0]==="Open workload"&&overdue>0)));
 wrap.append(metrics);
 const grid=el("div","ct-team-insight-grid");
 const workload=el("section","ct-team-insight-panel");workload.append(el("h3","","Team workload"),el("p","ct-team-muted","Open and overdue tasks linked to each team, location, or zone."));
 const workloadRows=teams.filter(t=>String(t.status||"active")!=="archived").slice().sort((a,b)=>Number(b.active_task_count||0)-Number(a.active_task_count||0));
 if(!workloadRows.length)workload.append(el("p","ct-team-muted","No active teams to display."));
 workloadRows.forEach(t=>{const row=el("div","ct-team-workload-row"),top=el("div","ct-team-workload-top");const open=button(t.name,"ct-team-inline-link",()=>openTeam(t.id));top.append(open,el("span","",Number(t.active_task_count||0)+" open · "+Number(t.overdue_task_count||0)+" overdue"));row.append(top);const bar=el("div","ct-team-workload-track"),fill=el("span","ct-team-workload-fill");const max=Math.max(1,...workloadRows.map(x=>Number(x.active_task_count||0)));fill.style.width=(Number(t.active_task_count||0)/max*100)+"%";bar.append(fill);row.append(bar);workload.append(row)});
 grid.append(workload);
 const trend=el("section","ct-team-insight-panel");trend.append(el("h3","","Performance trend"),el("p","ct-team-muted","Eight-week totals from recorded task history. Compliance is unavailable without due-dated completions."));
 const weeks=rollupTrend();
 trend.append(table(["Week starting","Created","Completed","On-time compliance"],weeks.map(x=>[date(x.week_start),x.tasks_created,x.tasks_completed,x.compliance_rate===null?"—":x.compliance_rate+"%"])));
 grid.append(trend);wrap.append(grid);
 const timeline=el("section","ct-team-insight-panel ct-team-timeline-panel");timeline.append(el("h3","","Recent activity"),el("p","ct-team-muted","Latest available team changes and linked task history."));
 const allActivity=[];for(const [teamId,item] of teamInsights.entries()){const t=getTeam(teamId);for(const a of (item.activity||[]))allActivity.push({...a,team_name:t?.name||("Team #"+teamId)})}
 allActivity.sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")));
 if(!allActivity.length)timeline.append(el("p","ct-team-muted","No recorded team or task activity yet."));
 else {const list=el("div","ct-team-activity-list");allActivity.slice(0,10).forEach(a=>{const row=el("div","ct-team-activity-item"),dot=el("span","ct-team-activity-dot","");const body=el("div","ct-team-activity-copy"),when=el("small","ct-team-muted",dateTime(a.created_at));const detail=a.details||{};const description=detail.message||detail.task_title||detail.name||detail.after?.name||"";body.append(el("strong","",String(a.action||"Activity").replaceAll("."," · ")),el("p","",a.team_name+(a.actor_name?" · "+a.actor_name:"")+(description?" — "+description:"")),when);row.append(dot,body);list.append(row)});timeline.append(list)}
 wrap.append(timeline);
}
function renderBulkActions(visible){
 const panel=root.querySelector("[data-team-bulk]");if(!panel)return;panel.replaceChildren();
 const count=selected.size;const header=el("div","ct-team-bulk-head");header.append(el("strong","","Bulk actions"),el("span","ct-team-muted",count+" selected"));panel.append(header);
 const controls=el("div","ct-team-bulk-controls");
 controls.append(button("Select visible","ct-team-btn ct-team-btn--quiet",()=>{visible.forEach(t=>selected.add(String(t.id)));renderList()}));
 controls.append(button("Clear selection","ct-team-btn ct-team-btn--quiet",()=>{selected.clear();renderList()}));
 controls.append(button("Pin selected","ct-team-btn ct-team-btn--quiet",()=>{const values=new Set(pins());selected.forEach(id=>values.add(id));write("ct.team.pins."+userKey(),[...values]);renderList();notice("Selected teams pinned for this account.","success")}));
 const activeIds=[...selected].filter(id=>getTeam(id)&&String(getTeam(id).status||"active")!=="archived");
 const archivedIds=[...selected].filter(id=>getTeam(id)&&String(getTeam(id).status||"active")==="archived");
 controls.append(button("Archive selected active","ct-team-btn ct-team-btn--danger",()=>bulkLifecycle("archive",activeIds)));
 controls.append(button("Restore selected archived","ct-team-btn ct-team-btn--primary",()=>bulkLifecycle("restore",archivedIds)));
 panel.append(controls);
 if(!count)panel.classList.add("is-empty");else panel.classList.remove("is-empty");
}
async function bulkLifecycle(action,ids){
 if(busy)return;if(!ids.length){notice("Select one or more eligible teams first.","error");return}
 const verb=action==="archive"?"archive":"restore";
 if(!confirm(verb.charAt(0).toUpperCase()+verb.slice(1)+" "+ids.length+" selected team(s)?"))return;
 busy=true;notice("Updating selected teams…","info");
 const failed=[];
 try{
  for(const id of ids){try{await API.post("teams/"+encodeURIComponent(id)+"/"+action,{})}catch(e){failed.push({id,message:e.message||"Request failed"})}}
  selected=new Set([...selected].filter(id=>failed.some(x=>x.id===id)));
  archived=action==="archive";
  await load();
  if(failed.length)notice((ids.length-failed.length)+" team(s) updated; "+failed.length+" failed: "+failed.map(x=>getTeam(x.id)?.name||("Team #"+x.id)).join(", "),"error");
  else notice(ids.length+" team(s) "+(action==="archive"?"archived":"restored")+" successfully. History is retained.","success");
 }catch(e){notice(e.message||"Bulk action failed.","error")}
 finally{busy=false;renderList()}
}

function renderRecent(){const w=root.querySelector("[data-team-recent]");w.replaceChildren();const section=el("section","ct-team-recent-panel"),head=el("div","ct-team-section-heading");head.append(el("h2","","Recently opened teams"),el("small","ct-team-muted","Last 3"));section.append(head);const items=recent().map(getTeam).filter(Boolean);
 if(!items.length)section.append(el("p","ct-team-muted","Teams you open will appear here."));else{const list=el("div","ct-team-recent-list");items.forEach(t=>list.append(button(t.name+" · "+(t.status==="archived"?"Archived":"Active"),"ct-team-recent-item",()=>openTeam(t.id))));section.append(list)}w.append(section)}
function renderList(){const out=root.querySelector("[data-team-results]");if(!out)return;out.replaceChildren();const p=pins(),q=query.toLowerCase().trim();const visible=teams.filter(t=>(String(t.status||"active")==="archived")===archived&&(!q||(String(t.name||"")+" "+String(t.description||"")).toLowerCase().includes(q))).sort((a,b)=>Number(p.includes(String(b.id)))-Number(p.includes(String(a.id)))||String(a.name).localeCompare(String(b.name)));
 root.querySelector("[data-team-count]").textContent=visible.length+" teams";root.querySelector("[data-team-list-heading]").textContent=archived?"Archived teams":"All teams";
 root.querySelector('[data-filter="active"]').classList.toggle("is-active",!archived);root.querySelector('[data-filter="archived"]').classList.toggle("is-active",archived);
 if(!visible.length){const empty=el("div","ct-team-empty",archived?"No archived teams found.":q?"No teams match your search.":"No teams yet. Create your first team.");if(!archived&&!q)empty.append(button("+ Create team","ct-team-btn ct-team-btn--primary",()=>createOpen(true)));out.append(empty)}else visible.forEach(t=>out.append(card(t)));
 renderRecent();renderBulkActions(visible);renderInsights()}
async function load(){const response=await API.get("teams");teams=Array.isArray(response.teams)?response.teams:[];teamInsights=new Map((Array.isArray(response.insights)?response.insights:[]).map(x=>[String(x.team_id),x]));const valid=new Set(teams.map(t=>String(t.id)));selected=new Set([...selected].filter(id=>valid.has(id)));renderList()}
function table(headers,rows){const wrap=el("div","ct-team-table-wrap"),t=el("table","ct-team-table"),h=el("thead"),tr=el("tr");headers.forEach(x=>tr.append(el("th","",x)));h.append(tr);t.append(h);const b=el("tbody");if(!rows.length){const r=el("tr"),cell=el("td","ct-team-muted","No records available.");cell.colSpan=headers.length;r.append(cell);b.append(r)}rows.forEach(vals=>{const r=el("tr");vals.forEach(x=>{const cell=el("td");if(x instanceof Node)cell.append(x);else cell.textContent=txt(x);r.append(cell)});b.append(r)});t.append(b);wrap.append(t);return wrap}
function checkRow(name,desc,checked,disabled,id){const l=el("label","ct-team-check-row"+(disabled?" disabled":"")),input=el("input");input.type="checkbox";input.value=String(id);input.checked=checked;input.disabled=disabled;const words=el("span","");words.append(el("strong","",name),el("small","ct-team-muted",desc));l.append(input,words);return l}
async function act(label,fn){if(busy)return;busy=true;notice(label,"info");try{await fn()}catch(e){notice(e.message||"Unable to save the change.","error")}finally{busy=false}}
async function reloadTeam(id){await load();await openTeam(id)}
function actionPanel(d,mode){
 const p=root.querySelector("[data-team-action]");p.replaceChildren();p.hidden=false;
 const title={edit:"Edit Team",people:"Assign People",locations:"Assign Locations",zones:"Assign Zones","create-task":"Create & Assign Task",tasks:"Manage Tasks"}[mode]||"Team action";
 const top=el("div","ct-team-section-heading");top.append(el("h3","",title),button("Close","ct-team-btn ct-team-btn--quiet",()=>{p.hidden=true;p.replaceChildren()}));p.append(top);
 const t=d.team;
 if(mode==="edit"){
  const f=el("form","ct-team-form"),name=input(t.name,"name"),desc=textarea(t.description,"description"),capacity=input(t.capacity,"capacity","number"),whatsapp=input(t.whatsapp_group_url,"whatsapp_group_url","url");name.required=true;name.maxLength=120;capacity.min="1";whatsapp.maxLength=500;whatsapp.placeholder="https://chat.whatsapp.com/…";
  f.append(field("Team name",name),field("Team description",desc),field("Capacity (optional)",capacity,"The interface flags the team if assigned people exceed this limit."),field("WhatsApp team group invite link (optional)",whatsapp,"Use an invite URL beginning with https://chat.whatsapp.com/. Team members can open it from the Supervisor Team Channel."));
  f.append(button("Save Team","ct-team-btn ct-team-btn--primary",null,"submit"));
  f.addEventListener("submit",e=>{e.preventDefault();act("Saving team…",async()=>{const n=capacity.value.trim()?Number(capacity.value):null;if(n!==null&&(!Number.isInteger(n)||n<1))throw Error("Capacity must be a positive whole number or blank.");const group=whatsapp.value.trim();if(group && (!group.startsWith("https://chat.whatsapp.com/") || !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+\/?$/.test(group)))throw Error("Enter a valid WhatsApp invite URL beginning with https://chat.whatsapp.com/.");await API.patch("teams/"+t.id,{name:name.value.trim(),description:desc.value.trim(),capacity:n,whatsapp_group_url:group||null});await reloadTeam(t.id);notice("Team details saved and audited.","success")})});p.append(f)
 }else if(mode==="people"){
  const f=el("form","ct-team-form");f.append(el("p","ct-team-muted","Only active organization members are available. A Supervisor already assigned elsewhere cannot be assigned to a second team."));
  const set=new Set(d.members.map(x=>String(x.id))),list=el("div","ct-team-check-list");
  (d.available_members||[]).forEach(person=>{const other=(person.assigned_team_ids||[]).map(String).find(x=>x!==String(t.id)),locked=String(person.role).toLowerCase()==="supervisor"&&Boolean(other),ot=other?getTeam(other):null;list.append(checkRow(person.name,person.role+" · "+person.email+(locked?" · Assigned to "+(ot?.name||"another team"):""),set.has(String(person.id)),locked,person.id))});
  if(!d.available_members?.length)f.append(el("p","ct-team-muted","No active people are available."));f.append(list,button("Save People","ct-team-btn ct-team-btn--primary",null,"submit"));
  f.addEventListener("submit",e=>{e.preventDefault();const ids=[...list.querySelectorAll("input:checked")].map(x=>Number(x.value));act("Saving team membership…",async()=>{await API.put("teams/"+t.id+"/members",{member_ids:ids});await reloadTeam(t.id);notice("People assignments saved and audit entries recorded.","success")})});p.append(f)
 }else if(mode==="locations"){
  const f=el("form","ct-team-form");f.append(el("p","ct-team-muted","Assigning a location currently owned by another team moves it to this team."));
  const set=new Set(d.locations.map(x=>String(x.id))),list=el("div","ct-team-check-list");
  (d.available_locations||[]).forEach(loc=>{const other=loc.team_id&&String(loc.team_id)!==String(t.id)?getTeam(loc.team_id):null;list.append(checkRow(loc.name,(loc.address||"No address")+(other?" · Currently in "+other.name:""),set.has(String(loc.id)),false,loc.id))});
  f.append(list,button("Save Locations","ct-team-btn ct-team-btn--primary",null,"submit"));f.addEventListener("submit",e=>{e.preventDefault();const ids=[...list.querySelectorAll("input:checked")].map(x=>Number(x.value));act("Saving locations…",async()=>{await API.put("teams/"+t.id+"/locations",{location_ids:ids});await reloadTeam(t.id);notice("Location assignments saved and audited.","success")})});p.append(f)
 }else if(mode==="zones"){
  const f=el("form","ct-team-form");f.append(el("p","ct-team-muted","A zone cannot be assigned here while its location belongs to another team. Reassign that location first."));
  const locs=new Map((d.available_locations||[]).map(x=>[String(x.id),x])),set=new Set(d.zones.map(x=>String(x.id))),list=el("div","ct-team-check-list");
  (d.available_zones||[]).forEach(z=>{const loc=locs.get(String(z.location_id)),isSelected=set.has(String(z.id)),inactive=String(z.status||"active")!=="active",locked=(inactive&&!isSelected)||Boolean(loc?.team_id&&String(loc.team_id)!==String(t.id));const suffix=inactive?" · "+String(z.status||"inactive")+" — restore before assigning":locked?" · assigned to another team":"";list.append(checkRow(z.name,"Location: "+(loc?.name||("Location #"+z.location_id))+suffix,isSelected,locked,z.id))});
  f.append(list,button("Save Zones","ct-team-btn ct-team-btn--primary",null,"submit"));f.addEventListener("submit",e=>{e.preventDefault();const ids=[...list.querySelectorAll("input:checked")].map(x=>Number(x.value));act("Saving zones…",async()=>{await API.put("teams/"+t.id+"/zones",{zone_ids:ids});await reloadTeam(t.id);notice("Zone assignments saved and audited.","success")})});p.append(f)
 }else if(mode==="create-task"){
  const f=el("form","ct-team-form"),t=d.team;
  const title=input("","title"),description=textarea("","description"),type=el("select","ct-team-input");
  [["General","General"],["Cleaning","Cleaning"],["Inspection","Inspection"],["Maintenance","Maintenance"],["Safety","Safety"],["Other","Other"]].forEach(([v,l])=>{const o=el("option","",l);o.value=v;type.append(o)});
  const location=el("select","ct-team-input");location.append(Object.assign(el("option","","No location"),{value:""}));
  (d.locations||[]).forEach(x=>{const o=el("option","",x.name);o.value=String(x.id);location.append(o)});
  const zone=el("select","ct-team-input");zone.append(Object.assign(el("option","","No zone"),{value:""}));
  const refreshZones=()=>{zone.replaceChildren(Object.assign(el("option","","No zone"),{value:""}));(d.zones||[]).filter(x=>!location.value||String(x.location_id)===String(location.value)).forEach(x=>{const o=el("option","",x.name);o.value=String(x.id);zone.append(o)});if(zone.value&&!Array.from(zone.options).some(o=>o.value===zone.value))zone.value=""};
  location.addEventListener("change",refreshZones);refreshZones();
  const assignee=el("select","ct-team-input");assignee.append(Object.assign(el("option","","Leave unassigned"),{value:""}));
  (d.members||[]).forEach(x=>{const o=el("option","",x.name+" · "+x.role);o.value=String(x.id);assignee.append(o)});
  const due=input("","due_at","datetime-local");title.required=true;title.maxLength=200;
  f.append(field("Task title",title),field("Description",description),field("Task type",type),field("Team location",location),field("Zone",zone),field("Assign to team member",assignee),field("Due date and time",due));
  f.append(el("p","ct-team-muted","This creates a real Operations record for this team. Any location or zone must already be assigned to this team."));
  f.append(button("Create and assign task","ct-team-btn ct-team-btn--primary",null,"submit"));
  f.addEventListener("submit",e=>{e.preventDefault();act("Creating task…",async()=>{const locationId=location.value?Number(location.value):null;const zoneId=zone.value?Number(zone.value):null;const memberId=assignee.value?Number(assignee.value):null;if(zoneId&&!locationId)throw Error("Choose a location for the selected zone.");await API.post("operations",{title:title.value.trim(),description:description.value.trim(),task_type:type.value,team_id:Number(t.id),location_id:locationId,zone_id:zoneId,assigned_to_id:memberId,due_at:due.value?new Date(due.value).toISOString():null});await reloadTeam(t.id);notice("Task created and linked to this team.","success")})});p.append(f);
 }else{
  p.append(el("p","ct-team-muted","This list contains actual tasks linked to the team, its locations or its zones."),button("Open Tasks and Operations","ct-team-btn ct-team-btn--primary",()=>window.CleanTrackNavigation?.setActivePage("operations")),button("Create & Assign Task","ct-team-btn ct-team-btn--primary",()=>actionPanel(d,"create-task")),table(["Task","Status","Due","Overdue"],(d.operations||[]).map(x=>[x.title,x.status,date(x.due_at),x.overdue_calculated?"Yes":"No"])))
 }
}
function renderTabs(d,panel){
 const tabs=el("div","ct-team-tabs"),content=el("div","ct-team-tab-content"),defs=[["People","people"],["Locations","locations"],["Zones","zones"],["Activity History","activity"],["Team Performance","performance"]];
 function choose(key){tabs.querySelectorAll("button").forEach(b=>{const yes=b.dataset.tab===key;b.classList.toggle("is-active",yes);b.setAttribute("aria-selected",String(yes))});content.replaceChildren();
  if(key==="people")content.append(table(["Name","Role","Email","Assigned"],d.members.map(x=>[x.name,x.role,x.email,date(x.assigned_at)])));
  else if(key==="locations")content.append(table(["Location","Address","Status","Zones"],d.locations.map(x=>[x.name,x.address,x.status,d.zones.filter(z=>String(z.location_id)===String(x.id)).length])));
  else if(key==="zones"){const map=new Map((d.available_locations||[]).map(x=>[String(x.id),x.name]));content.append(table(["Zone","Location","Status"],d.zones.map(x=>{const open=button(x.name,"ct-team-inline-link",()=>{try{sessionStorage.setItem("cleantrack.zoneLocationFilter",String(x.location_id));history.replaceState(null,"",location.pathname+location.search+"#zones-"+x.id);}catch(_){}window.CleanTrackNavigation?.setActivePage("zones")});open.setAttribute("aria-label","Open zone "+x.name);return[open,map.get(String(x.location_id))||("Location #"+x.location_id),x.status]})))}
  else if(key==="activity"){content.append(table(["When","Actor","Event","Details"],d.activity.map(x=>[dateTime(x.created_at),x.actor_name,x.action,JSON.stringify(x.details||{})])),el("p","ct-team-muted","Up to 100 real team audit events are shown."))}
  else{
   content.append(el("h3","","8-week performance and compliance"),el("p","ct-team-muted","On-time compliance uses completed tasks with due dates. Weeks without comparable tasks are shown as unavailable."));
   content.append(table(["Week","Created","Completed","On-time compliance"],d.performance.map(x=>[date(x.week_start),x.tasks_created,x.tasks_completed,x.compliance_rate===null?"—":x.compliance_rate+"%"])));
   if(!(d.performance||[]).some(x=>x.tasks_created||x.tasks_completed))content.append(el("p","ct-team-muted","No task history is available yet; no sample statistics are shown."));
   content.append(el("h3","","Workload and tasks"),table(["Task","Type","Status","Due","Overdue"],d.operations.map(x=>[x.title,x.task_type,x.status,date(x.due_at),x.overdue_calculated?"Yes":"No"])),button("Manage Tasks","ct-team-btn ct-team-btn--primary",()=>actionPanel(d,"tasks")))
  }
 }
 defs.forEach(([label,key])=>{const b=button(label,"ct-team-tab",()=>choose(key));b.dataset.tab=key;b.setAttribute("role","tab");b.setAttribute("aria-selected","false");tabs.append(b)});panel.append(tabs,content);choose("people")
}
async function openTeam(id){
 const p=root.querySelector("[data-team-detail]");p.hidden=false;p.replaceChildren(el("p","ct-team-muted","Loading team records…"));
 try{const d=await API.get("teams/"+encodeURIComponent(id));const r=recent().filter(x=>x!==String(id));r.unshift(String(id));write("ct.team.recent."+userKey(),r.slice(0,3));renderDetail(d,p);renderRecent();p.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){p.replaceChildren(el("p","ct-team-error",e.message||"Unable to load team."));notice(e.message||"Unable to load team details.","error")}
}
function renderDetail(d,p){
 const t=d.team;p.replaceChildren();const head=el("header","ct-team-detail-header"),ident=el("div","ct-team-detail-identity");ident.append(el("p","ct-team-eyebrow","TEAM DETAILS"),el("h2","",t.name),el("p","ct-team-muted",t.description||"No description provided."),el("span","ct-team-status"+(t.status==="archived"?" is-archived":""),t.status==="archived"?"Archived":"Active"));head.append(ident,button("Close Team","ct-team-btn ct-team-btn--quiet",()=>{p.hidden=true;p.replaceChildren()}));p.append(head);
 const actions=el("div","ct-team-quick-actions"),isArchived=t.status==="archived";
 if(!isArchived)[["Edit Team","edit"],["Assign People","people"],["Assign Location","locations"],["Assign Zones","zones"],["Create & Assign Task","create-task"],["Manage Tasks","tasks"]].forEach(x=>actions.append(button(x[0],"ct-team-btn",()=>actionPanel(d,x[1]))));
 else actions.append(button("Restore Team","ct-team-btn ct-team-btn--primary",()=>{if(confirm("Restore this team? Historical records remain intact."))act("Restoring team…",async()=>{await API.post("teams/"+t.id+"/restore",{});archived=false;await load();await openTeam(t.id);notice("Team restored.","success")})}));
 const exportWrap=el("div","ct-team-export"),format=el("select","ct-team-input");[["csv","CSV"],["xlsx","Excel (.xlsx)"],["pdf","PDF"]].forEach(x=>{const o=el("option","",x[1]);o.value=x[0];format.append(o)});exportWrap.append(format,button("Export Team Data","ct-team-btn ct-team-btn--primary",()=>act("Preparing export…",async()=>{await download(t.id,format.value);notice("Team report downloaded.","success")})));actions.append(exportWrap);
 if(!isArchived)actions.append(button("Archive Team","ct-team-btn ct-team-btn--danger",()=>{if(confirm("Archive "+t.name+"? This retains task, assignment and activity history."))act("Archiving team…",async()=>{await API.post("teams/"+t.id+"/archive",{});archived=true;await load();await openTeam(t.id);notice("Team archived. Historical records were retained.","success")})}));
 p.append(actions);const action=el("section","ct-team-action-panel");action.dataset.teamAction="1";action.hidden=true;p.append(action);
 const over=el("section","ct-team-overview");over.append(el("h3","","Overview"));const metrics=el("div","ct-team-metrics");
 [
 ["Supervisors",t.supervisor_count],["Employees",t.employee_count],["Assigned locations",t.location_count],["Assigned zones",t.zone_count],
 ["Active tasks",t.active_task_count],["Pending / review",t.pending_task_count],["Overdue tasks",t.overdue_task_count,null,Number(t.overdue_task_count)>0],
 ["Completion rate",t.completion_rate===null?"—":t.completion_rate+"%",t.task_count+" linked tasks"],
 ["Configured capacity",t.capacity===null||t.capacity===undefined?"Not set":txt(t.member_count,"0")+" / "+t.capacity,t.capacity_status==="over_capacity"?"Over capacity":t.capacity_status==="within_capacity"?"Within capacity":"No capacity rule",t.capacity_status==="over_capacity"]
 ].forEach(x=>metrics.append(metric(x[0],x[1],x[2],x[3])));over.append(metrics);
 const status=el("div","ct-team-status-bar");status.append(el("strong","",isArchived?"Archived · Read-only historical view":"Team status: Active"),el("span","",isArchived?"Restore to make changes.":"Creation and restructuring are Admin-controlled."));over.append(status);p.append(over);renderTabs(d,p)
}
async function download(id,format){
 const cfg=window.CleanTrackConfig,token=AUTH?.getAuthToken?.()||"",headers=new Headers();if(token)headers.set("Authorization","Bearer "+token);
 const response=await fetch(cfg.apiBaseUrl.replace(/\/+$/,"")+"/teams/"+id+"/export?format="+encodeURIComponent(format),{credentials:"include",headers});
 if(!response.ok){let b={};try{b=await response.json()}catch(_){}throw Error(b.error||"Export failed.")}
 const blob=await response.blob(),url=URL.createObjectURL(blob),cd=response.headers.get("content-disposition")||"",m=cd.match(/filename="?([^";]+)"?/i),a=el("a");a.href=url;a.download=m?m[1]:"team-report."+format;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
async function render(container){
 const user=AUTH?.getCurrentUser?.();container.replaceChildren();
 if(String(user?.role||"").toLowerCase()!=="admin"){container.append(el("p","ct-team-error","Team management is available to Admin users only."));return}
 root=el("section","ct-team-manager");const header=el("header","ct-team-manager-header"),copy=el("div");copy.append(el("p","ct-team-eyebrow","ORGANIZATION MANAGEMENT"),el("h1","","Teams"),el("p","ct-team-muted","Create and manage teams, assignments, workload, reports, and historical records."));header.append(copy,button("+ Create Team","ct-team-btn ct-team-btn--primary",()=>{createOpen(true);root.querySelector("[data-team-create]")?.scrollIntoView({behavior:"smooth",block:"center"})}));root.append(header);
 const note=el("div","ct-team-notice");note.dataset.teamNotice="1";note.hidden=true;root.append(note);const recentNode=el("div");recentNode.dataset.teamRecent="1";root.append(recentNode);
 const insights=el("section","ct-team-insights");insights.dataset.teamInsights="1";root.append(insights);
 const bulk=el("section","ct-team-bulk-panel");bulk.dataset.teamBulk="1";root.append(bulk);
 const form=el("form","ct-team-create-form");form.dataset.teamCreate="1";form.hidden=true;form.append(el("h2","","Create a team"));
 const name=input("","name"),desc=textarea("","description"),capacity=input("","capacity","number");name.required=true;name.maxLength=120;name.placeholder="Team name";desc.placeholder="Team description";capacity.min="1";capacity.placeholder="Optional people capacity";
 const grid=el("div","ct-team-form-grid");grid.append(field("Team name",name),field("Team description",desc),field("Capacity (optional)",capacity,"Set a number to flag when membership exceeds capacity."));form.append(grid);
 const formActions=el("div","ct-team-form-actions"),cancelBtn=button("Cancel","ct-team-btn ct-team-btn--quiet",()=>{form.reset();createOpen(false)}),submitBtn=button("Create Team","ct-team-btn ct-team-btn--primary",null,"submit");submitBtn.dataset.createTeamSubmit="1";formActions.append(cancelBtn,submitBtn);form.append(formActions);
 const createStatus=el("p","ct-team-create-status","");createStatus.hidden=true;createStatus.setAttribute("role","status");form.append(createStatus);
 form.addEventListener("submit",async e=>{
 e.preventDefault();
 if(busy)return;
 busy=true;submitBtn.disabled=true;submitBtn.textContent="Creating team…";createStatus.hidden=true;
 try{
  const raw=capacity.value.trim(),cap=raw?Number(raw):null;
  if(!name.value.trim())throw Error("Team name is required.");
  if(cap!==null&&(!Number.isInteger(cap)||cap<1))throw Error("Capacity must be a positive whole number or blank.");
  const r=await API.post("teams",{name:name.value.trim(),description:desc.value.trim(),capacity:cap});
  if(!r||!r.team||r.team.id===undefined)throw Error("The server did not confirm a team was created. Check the team list before retrying.");
  const created=r.team;
  form.reset();createOpen(false);
  // The POST response is authoritative. Show the saved record immediately;
  // a later list/insights failure must not be misreported as a create failure.
  teams=[created,...teams.filter(t=>String(t.id)!==String(created.id))];
  renderList();
  createStatus.textContent=r.message||"Team created successfully.";
  createStatus.className="ct-team-create-status is-success";
  createStatus.hidden=false;
  notice(r.message||"Team created successfully.","success");
  try{
   await load();
  }catch(refreshError){
   teams=[created,...teams.filter(t=>String(t.id)!==String(created.id))];
   renderList();
   const detail=refreshError&&refreshError.message?": "+refreshError.message:"";
   notice("Team created and saved. The team list could not refresh"+detail,"success");
  }
 }catch(err){
  const message=err.message||"Could not create team.";
  createStatus.textContent=message;createStatus.className="ct-team-create-status is-error";createStatus.hidden=false;
  notice(message,"error");
 }finally{
  busy=false;submitBtn.disabled=false;submitBtn.textContent="Create Team";
 }
});root.append(form);
 const listPanel=el("section","ct-team-list-panel"),toolbar=el("div","ct-team-toolbar"),search=input("","search");search.type="search";search.placeholder="Search team names…";search.setAttribute("aria-label","Search teams");search.addEventListener("input",()=>{query=search.value.trim();renderList()});const sw=el("label","ct-team-search");sw.append(el("span","ct-team-sr-only","Search team names"),search);toolbar.append(sw);
 const filters=el("div","ct-team-filter-buttons"),active=button("Active Teams","ct-team-btn ct-team-filter is-active",()=>{archived=false;renderList()}),arch=button("Archived Teams","ct-team-btn ct-team-filter",()=>{archived=true;renderList()});active.dataset.filter="active";arch.dataset.filter="archived";filters.append(active,arch);toolbar.append(filters);const count=el("span","ct-team-muted","Loading…");count.dataset.teamCount="1";toolbar.append(count);
 const heading=el("h2","ct-team-section-heading","All teams");heading.dataset.teamListHeading="1";const results=el("div","ct-team-grid");results.dataset.teamResults="1";results.append(el("div","ct-team-empty","Loading teams…"));listPanel.append(toolbar,heading,results);root.append(listPanel);
 const detail=el("section","ct-team-detail");detail.dataset.teamDetail="1";detail.hidden=true;root.append(detail);container.append(root);
 try{await load()}catch(e){
  const authFailure = e.status === 401 || /authentication required|session expired|sign in again/i.test(e.message||"");
  const message = authFailure
   ? "Your session could not be renewed. Please sign in again, then reopen Teams."
   : (e.message||"Could not load teams.");
  notice(message,"error");
  const results=root.querySelector("[data-team-results]");
  if(results) results.replaceChildren(el("p","ct-team-error",message));
 }
}
window.CleanTrackTeams=Object.freeze({render});
})();