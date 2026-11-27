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

async function renderSupervisorTeams(container){
 let user=AUTH?.getCurrentUser?.();
 try{const fresh=await API.get("auth/me");if(fresh?.user){user=Object.assign(user||{},fresh.user);}}catch(_){}
 const shell=el("section","ct-team-fullscreen-shell");
 shell.setAttribute("role","region");shell.setAttribute("aria-label","Teams workspace");
 const topbar=el("header","ct-team-fullscreen-topbar");
 const brand=el("div","ct-team-fullscreen-brand"),brandmark=el("span","ct-team-fullscreen-brandmark",user?.personnel_avatar_url?"":"M");
 if(user?.personnel_avatar_url){brandmark.style.backgroundImage="url('"+String(user.personnel_avatar_url).replace(/['()\\]/g,"")+"')";brandmark.classList.add("has-personnel-photo");brandmark.setAttribute("aria-label","Your Personnel profile picture");}
 brand.append(brandmark,el("strong","","MECHNAR"),el("span","ct-team-fullscreen-divider","/"),el("span","","Teams"));
 const syncPersonnelAvatar=event=>{if(String(event.detail?.userId)!==String(user?.id))return;const src=event.detail?.avatarUrl||"";brandmark.textContent=src?"":"M";brandmark.style.backgroundImage=src?"url('"+String(src).replace(/['()\\]/g,"")+"')":"";brandmark.classList.toggle("has-personnel-photo",Boolean(src));};
 document.addEventListener("cleantrack:personnel-profile-updated",syncPersonnelAvatar);

 const topActions=el("div","ct-team-fullscreen-topactions");
 const who=el("span","ct-team-fullscreen-user",user?.name||user?.email||"Supervisor");
 const closeWorkspace=button("×","ct-team-fullscreen-close",()=>{document.removeEventListener("cleantrack:personnel-profile-updated",syncPersonnelAvatar);shell.remove();document.documentElement.classList.remove("ct-team-workspace-open");document.body.classList.remove("ct-team-workspace-open");window.CleanTrackNavigation?.setActivePage("workspace")});
 closeWorkspace.type="button";closeWorkspace.setAttribute("aria-label","Close Teams workspace");closeWorkspace.title="Close Teams workspace";
 topActions.append(who,closeWorkspace);topbar.append(brand,topActions);
 const sidebar=el("aside","ct-team-fullscreen-sidebar");sidebar.append(el("p","ct-team-fullscreen-side-label","TEAM SPACE"));
 const pageHost=el("main","ct-team-fullscreen-main");
 const pageHeading=el("header","ct-team-fullscreen-pagehead");
 const pageTitle=el("h1","","Team overview"),pageSubtitle=el("p","ct-team-muted","Your team, its people and its operational performance.");
 pageHeading.append(pageTitle,pageSubtitle);pageHost.append(pageHeading);
 const pageBody=el("div","ct-team-fullscreen-pagebody");pageHost.append(pageBody);
 const pages=[
  ["overview","Overview","Your team at a glance."],
  ["members","Team members","The people assigned to your team."],
  ["operations","Operations","Your team's operational workload and progress."],
  ["locations","Locations & zones","The work areas assigned to your team."],
  ["performance","Performance","Your team's recorded performance."],
  ["activity","Activity","A history of recorded team changes."],
  ["team-policy","Team Policy","Published instructions, objectives and standards for your team."]
 ];
 const pageViews=new Map();
 pages.forEach(([id,label,description],index)=>{
  const nav=button(label,"ct-team-fullscreen-nav"+(index===0?" is-active":""),()=>{
   sidebar.querySelectorAll(".ct-team-fullscreen-nav").forEach(n=>{
    const active=n.dataset.page===id;
    n.classList.toggle("is-active",active);
    n.setAttribute("aria-current",active?"page":"false");
   });
   pageViews.forEach((node,key)=>{
    const active=key===id;
    node.hidden=!active;
    node.style.display=active?"block":"none";
   });
   pageBody.classList.toggle("is-performance-view",id==="performance");
   pageTitle.textContent=label;pageSubtitle.textContent=description;
  });
  nav.dataset.page=id;nav.setAttribute("aria-current",index===0?"page":"false");sidebar.append(nav);
  const view=el("section","ct-team-fullscreen-view");view.dataset.view=id;view.hidden=index!==0;view.style.display=index===0?"block":"none";
  pageViews.set(id,view);pageBody.append(view);
 });
 const workspace=el("div","ct-team-fullscreen-workspace");workspace.append(sidebar,pageHost);shell.append(topbar,workspace);
 // Mount the full-screen shell into the actual Teams route container before loading data.
 // Without this, every page view is built while detached and the user sees a blank route.
 // Mount directly under <body> so transformed/overflowing app containers cannot
 // constrain position:fixed; the Teams shell must cover the global sidebar and header.
 document.body.append(shell);
 document.documentElement.classList.add("ct-team-workspace-open");
 document.body.classList.add("ct-team-workspace-open");
 const wrap=el("section","ct-team-supervisor");
 const header=el("header","ct-team-supervisor-head");
 const intro=el("div","");
 intro.append(el("p","ct-team-eyebrow","TEAM OVERVIEW"),el("h1","","Teams"),el("p","ct-team-muted","Your team at a glance. Search the organisation when you need to look up another team."));
 header.append(intro);wrap.append(header);
 function metricSmall(label,value){
  const card=el("div","ct-team-supervisor-metric");
  card.append(el("span","ct-team-muted",label),el("strong","",value===null||value===undefined||value===""?"—":String(value)));
  return card;
 }
 function animateOverviewMetrics(grid,completionRate){
  const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const duration=850;
  grid.querySelectorAll(".ct-team-supervisor-metric").forEach(card=>{
   const value=card.querySelector("strong");if(!value)return;
   const raw=value.textContent.trim(),match=raw.match(/^(\d+(?:\.\d+)?)(%)?$/);
   if(!match)return;
   const target=Number(match[1]),suffix=match[2]||"";
   if(!Number.isFinite(target))return;
   if(reduceMotion){value.textContent=raw;return}
   value.textContent="0"+suffix;
   const start=performance.now();
   const tick=now=>{
    const progress=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-progress,3);
    const current=target*eased;
    value.textContent=(Number.isInteger(target)?Math.round(current):current.toFixed(1))+suffix;
    if(progress<1)requestAnimationFrame(tick);else value.textContent=raw;
   };
   requestAnimationFrame(tick);
  });
  const rate=Number(completionRate);
  if(Number.isFinite(rate)&&rate>=0&&rate<=100){
   const card=[...grid.querySelectorAll(".ct-team-supervisor-metric")].find(node=>node.querySelector("span")?.textContent==="Completion rate");
   if(card){
    const track=el("div","ct-team-supervisor-progress"),fill=el("span","ct-team-supervisor-progress-fill");
    track.setAttribute("role","progressbar");track.setAttribute("aria-label","Team completion rate");track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax","100");track.setAttribute("aria-valuenow",String(rate));
    fill.style.width=reduceMotion?rate+"%":"0%";track.append(fill);card.append(track);
    if(!reduceMotion)requestAnimationFrame(()=>requestAnimationFrame(()=>{fill.style.width=rate+"%"}));
   }
  }
 }
 function openSupervisorPanel(kind,data){
  const isActivity=kind==="activity",overlay=el("div","ct-team-history-overlay");
  const panel=el("section","ct-team-history-panel");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",isActivity?"Full team activity":"Full team performance");
  const head=el("header","ct-team-history-panel-head"),title=el("div","");
  title.append(el("p","ct-team-eyebrow",isActivity?"TEAM HISTORY":"TEAM INSIGHTS"),el("h2","",isActivity?"Team activity":"Team performance"));
  const close=button("×","ct-team-fullscreen-close",()=>{overlay.remove();document.removeEventListener("keydown",onKey)});close.setAttribute("aria-label","Close panel");head.append(title,close);panel.append(head);
  const body=el("div","ct-team-history-panel-body");
  if(isActivity){const events=data.activity||[];if(!events.length)body.append(el("p","ct-team-muted","No team activity has been recorded."));else{const list=el("div","ct-team-supervisor-activitylist");events.forEach(event=>{const row=el("article","ct-team-supervisor-activityrow"),copy=el("div","");copy.append(el("strong","",String(event.action||"Team activity").replaceAll("."," · ")));const message=event.message||event.details?.message||event.details?.task_title;if(message)copy.append(el("p","ct-team-muted",message));row.append(copy,el("small","ct-team-muted",(event.actor_name||"System")+" · "+dateTime(event.created_at)));list.append(row)});body.append(list)}}
  else{const trend=data.performance||[];if(!trend.length)body.append(el("p","ct-team-muted","No performance history is available."));else{const list=el("div","ct-team-supervisor-weeks");trend.forEach(x=>{const row=el("div","ct-team-supervisor-week");row.append(el("strong","",date(x.week_start)),el("span","",Number(x.tasks_created||0)+" created"),el("span","",Number(x.tasks_completed||0)+" completed"),el("span","",x.compliance_rate===null||x.compliance_rate===undefined?"Compliance —":"On time "+x.compliance_rate+"%"));list.append(row)});body.append(list)}}
  panel.append(body);overlay.append(panel);overlay.addEventListener("click",event=>{if(event.target===overlay){overlay.remove();document.removeEventListener("keydown",onKey)}});
  const onKey=event=>{if(event.key==="Escape"){overlay.remove();document.removeEventListener("keydown",onKey)}};
  document.addEventListener("keydown",onKey);document.body.append(overlay);close.focus();
 }
 async function renderOwn(data){
  const t=data.team||{};
  const policyView=pageViews.get("team-policy");
  if(policyView&&window.MechnarOrgTools?.renderTeamPolicy) await window.MechnarOrgTools.renderTeamPolicy(policyView,true);
  const overview=pageViews.get("overview"),membersPage=pageViews.get("members"),operationsPage=pageViews.get("operations"),locationsPage=pageViews.get("locations"),performancePage=pageViews.get("performance"),activityPage=pageViews.get("activity");
  [membersPage,operationsPage,locationsPage,performancePage,activityPage].forEach(node=>node.replaceChildren());
  own.replaceChildren();
  const teamHead=el("section","ct-team-supervisor-teamhead"),identity=el("div","");
  identity.append(el("p","ct-team-eyebrow","YOUR TEAM"),el("h2","",t.name||"Your team"),el("p","ct-team-muted",t.description||"Your assigned team."));
  teamHead.append(identity,el("span","ct-team-status",t.status||"Active"));own.append(teamHead);
  const summary=el("section","ct-team-supervisor-overview-summary");
  summary.append(el("h2","","Team overview"),el("p","ct-team-muted","Select any of the original overview measures. The central view updates with that measure and its current team data."));
  const overviewLayout=el("div","ct-team-overview-layout");
  const filterPane=el("aside","ct-team-overview-filter");
  filterPane.append(el("p","ct-team-overview-filter-heading","VIEW BY"));
  const metricOptions=[
   {key:"members",label:"Team members",value:()=>String(Number(t.member_count||0)),detail:()=>"Total people currently assigned to this team.",note:()=>"Includes all assigned team members."},
   {key:"staff",label:"Staff",value:()=>String(Number(t.staff_count||0)),detail:()=>"Staff members currently assigned to this team.",note:()=>"Based on the team's current membership records."},
   {key:"supervisors",label:"Supervisors",value:()=>String(Number(t.supervisor_count||0)),detail:()=>"Supervisors currently assigned to this team.",note:()=>"Based on the team's current membership records."},
   {key:"active",label:"Active operations",value:()=>String(Number(t.active_operation_count||0)),detail:()=>"Operations currently active for this team.",note:()=>"Uses the current operation status totals."},
   {key:"pending",label:"Pending review",value:()=>String(Number(t.pending_operation_count||0)),detail:()=>"Operations awaiting review.",note:()=>"Uses the current operation review status totals."},
   {key:"overdue",label:"Overdue operations",value:()=>String(Number(t.overdue_operation_count||0)),detail:()=>"Operations past their due date and not completed.",note:()=>"Overdue count is calculated from current operation records."},
   {key:"completed",label:"Completed operations",value:()=>String(Number(t.completed_operation_count||0)),detail:()=>"Operations recorded as completed.",note:()=>"Uses the current completed-operation total."},
   {key:"total",label:"Total operations",value:()=>String(Number(t.total_operation_count||0)),detail:()=>"All operations currently counted for this team.",note:()=>"Includes the statuses represented in the team's operation totals."},
   {key:"completion",label:"Completion rate",value:()=>t.completion_rate===null||t.completion_rate===undefined?"—":Number(t.completion_rate)+"%",detail:()=>"The team's recorded operation completion rate.",note:()=>"A percentage supplied by the team overview data; shown as unavailable when no rate is reported."},
   {key:"locations",label:"Assigned locations",value:()=>String(Number(t.location_count||0)),detail:()=>"Locations currently assigned to this team.",note:()=>"Based on current location assignments."},
   {key:"zones",label:"Assigned zones",value:()=>String(Number(t.zone_count||0)),detail:()=>"Zones currently assigned to this team.",note:()=>"Based on current zone assignments."},
   {key:"capacity",label:"Team capacity",value:()=>t.capacity===null||t.capacity===undefined?"Not set":String(Number(t.member_count||0))+" / "+String(t.capacity),detail:()=>"Current membership compared with the configured team capacity.",note:()=>t.capacity===null||t.capacity===undefined?"No capacity limit has been configured for this team.":Number(t.member_count||0)>Number(t.capacity)?"The team is above its configured capacity.":"Assigned membership is within the configured capacity."}
  ];
  const display=el("section","ct-team-overview-display");display.setAttribute("aria-live","polite");
  const renderSelected=(key)=>{
   const item=metricOptions.find(x=>x.key===key)||metricOptions[0];
   filterPane.querySelectorAll("[data-overview-metric]").forEach(node=>{const active=node.dataset.overviewMetric===item.key;node.classList.toggle("is-active",active);node.setAttribute("aria-pressed",String(active))});
   display.replaceChildren();
   const head=el("div","ct-team-overview-display-head");head.append(el("p","ct-team-eyebrow","SELECTED MEASURE"),el("h3","",item.label));
   const value=el("strong","ct-team-overview-primary-value",item.value());
   const detail=el("p","ct-team-overview-detail",item.detail());
   const note=el("p","ct-team-overview-note",item.note());
   display.append(head,value,detail,note);
   if(item.key==="overdue"&&Number(t.overdue_operation_count||0)>0)display.append(el("p","ct-team-overview-warning","There are overdue operations that may need follow-up."));
   if(item.key==="capacity"&&t.capacity!==null&&t.capacity!==undefined&&Number(t.member_count||0)>Number(t.capacity))display.append(el("p","ct-team-overview-warning","Assigned membership exceeds the configured team capacity."));
   if(item.key==="completion"&&(t.completion_rate===null||t.completion_rate===undefined))display.append(el("p","ct-team-overview-note","A completion rate cannot be displayed until the team data reports a valid value."));
  };
  metricOptions.forEach(item=>{
   const option=button(item.label,"ct-team-overview-filter-option",()=>renderSelected(item.key));
   option.dataset.overviewMetric=item.key;option.setAttribute("aria-pressed","false");filterPane.append(option);
  });
  overviewLayout.append(filterPane,display);summary.append(overviewLayout);renderSelected("members");own.append(summary);
  const controlsEntry=el("section","ct-team-supervisor-controls-entry");
  controlsEntry.append(el("p","ct-team-eyebrow","TEAM CONTROLS"),el("p","ct-team-muted","Team details and assignment coordination are available in a separate panel."));
  const openControls=button("Open permitted team controls","ct-team-btn ct-team-btn--primary",async()=>{
   const overlay=el("div","ct-team-history-overlay ct-team-controls-overlay");
   const panel=el("section","ct-team-history-panel ct-team-controls-panel");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Permitted team controls");
   const panelHead=el("header","ct-team-history-panel-head"),panelTitle=el("div","");
   panelTitle.append(el("p","ct-team-eyebrow","SUPERVISOR WORKSPACE"),el("h2","","Permitted team controls"));
   const closePanel=button("×","ct-team-fullscreen-close",closeControls);closePanel.setAttribute("aria-label","Close permitted team controls");closePanel.title="Close";
   panelHead.append(panelTitle,closePanel);panel.append(panelHead);
   const panelBody=el("div","ct-team-history-panel-body");panelBody.append(management);panel.append(panelBody);overlay.append(panel);leaderCurrent.textContent="Loading current Team Leader…";leaderNotice.hidden=true;try{leaderState=await API.get("quality/team-leader/"+encodeURIComponent(t.id));paintLeaderState()}catch(err){leaderCurrent.textContent=err.message||"Could not load Team Leader assignment.";removeLeaderBtn.disabled=true}
   overlay.addEventListener("click",event=>{if(event.target===overlay)closeControls()});
   function closeControls(){overlay.remove();document.removeEventListener("keydown",onControlsKey)}
   const onControlsKey=event=>{if(event.key==="Escape")closeControls()};
   document.addEventListener("keydown",onControlsKey);shell.append(overlay);closePanel.focus();
  });
  controlsEntry.append(openControls);own.append(controlsEntry);
  const management=el("section","ct-team-supervisor-page-section ct-team-supervisor-management");
  management.append(el("p","ct-team-eyebrow","PERMITTED TEAM CONTROLS"),el("h2","","Team management & assignment coordination"),el("p","ct-team-muted","Edit permitted team details and coordinate assignments. Admin retains team creation, deletion and final membership authority."));
  const descInput=el("textarea","ct-team-input");descInput.rows=3;descInput.maxLength=2000;descInput.value=t.description||"";
  const capInput=el("input","ct-team-input");capInput.type="number";capInput.min="1";capInput.placeholder="No capacity limit";capInput.value=t.capacity??"";
  const detailsGrid=el("div","ct-team-supervisor-management-grid");
  const descField=el("label","ct-team-supervisor-management-field");descField.append(el("span","","Team description"),descInput);
  const capField=el("label","ct-team-supervisor-management-field");capField.append(el("span","","Team capacity"),capInput);detailsGrid.append(descField,capField);
  const saveDetails=button("Save team details","ct-team-btn ct-team-btn--primary",async()=>{saveDetails.disabled=true;try{await API.patch("teams/supervisor/mine",{description:descInput.value,capacity:capInput.value===""?null:Number(capInput.value)});noticeNode.hidden=false;noticeNode.textContent="Team details saved.";t.description=descInput.value;t.capacity=capInput.value===""?null:Number(capInput.value);identity.querySelector("p:last-child").textContent=t.description||"Your assigned team.";}catch(e){noticeNode.hidden=false;noticeNode.textContent=e.message||"Could not save team details.";}finally{saveDetails.disabled=false;}});
  management.append(detailsGrid,saveDetails,el("h3","","Coordinate an operation assignment"));
  const opSelect=el("select","ct-team-input"),staffSelect=el("select","ct-team-input");
  const addChoice=(select,value,label)=>{const o=el("option","",label);o.value=value;select.append(o)};
  addChoice(opSelect,"","Select an open operation");(data.operations||[]).filter(op=>Number(op.team_id)===Number(t.id)&&!["completed","approved","cancelled","canceled"].includes(String(op.status||"").toLowerCase())).forEach(op=>addChoice(opSelect,String(op.id),op.title+" · "+(op.status||"")));
  addChoice(staffSelect,"","Select a Staff member");(data.members||[]).filter(m=>String(m.role).toLowerCase()==="staff"&&String(m.account_status).toLowerCase()==="active").forEach(m=>addChoice(staffSelect,String(m.id),m.name));
  const assignGrid=el("div","ct-team-supervisor-management-grid"),opField=el("label","ct-team-supervisor-management-field"),staffField=el("label","ct-team-supervisor-management-field");opField.append(el("span","","Operation"),opSelect);staffField.append(el("span","","Assign to Staff"),staffSelect);assignGrid.append(opField,staffField);
  const assignBtn=button("Assign / reassign","ct-team-btn ct-team-btn--primary",async()=>{if(!opSelect.value||!staffSelect.value){noticeNode.hidden=false;noticeNode.textContent="Choose an operation and a Staff member.";return}assignBtn.disabled=true;try{await API.patch("operations/"+encodeURIComponent(opSelect.value),{assigned_to_id:Number(staffSelect.value)});noticeNode.hidden=false;noticeNode.textContent="Assignment updated and recorded. Refreshing team data…";const refreshed=await API.get("teams/supervisor/mine");await renderOwn(refreshed);}catch(e){noticeNode.hidden=false;noticeNode.textContent=e.message||"Assignment could not be updated.";}finally{assignBtn.disabled=false;}});
  management.append(el("p","ct-team-muted","Only active Staff in this team are selectable. Assignment changes are recorded in operation history."),assignGrid,assignBtn);
  const leaderSection=el("section","ct-team-supervisor-teamleader-controls");
  leaderSection.append(el("h3","","Team Leader designation"),el("p","ct-team-muted","Assign one active Staff member as Team Leader for this team. This adds inspection access without changing their Staff role or existing data."));
  const leaderCurrent=el("p","ct-team-supervisor-teamleader-current","Loading current Team Leader…");
  const leaderSelect=el("select","ct-team-input");leaderSelect.setAttribute("aria-label","Select Staff member to designate as Team Leader");
  const leaderPlaceholder=el("option","","Select an active Staff member");leaderPlaceholder.value="";leaderSelect.append(leaderPlaceholder);
  const eligibleStaff=(data.members||[]).filter(m=>String(m.role||"").toLowerCase()==="staff"&&String(m.account_status||"").toLowerCase()==="active");
  eligibleStaff.forEach(m=>{const option=el("option","",m.name||m.full_name||("Staff #"+m.id));option.value=String(m.id);leaderSelect.append(option)});
  const leaderActions=el("div","ct-team-supervisor-teamleader-actions");
  const setLeaderBtn=button("Assign Team Leader","ct-team-btn ct-team-btn--primary",async()=>{
   if(!leaderSelect.value){leaderNotice.hidden=false;leaderNotice.textContent="Select an active Staff member first.";return}
   const chosen=eligibleStaff.find(m=>String(m.id)===String(leaderSelect.value));
   const currentName=leaderState?.team_leader?.name;
   const promptText=currentName?"Assign "+(chosen?.name||chosen?.full_name||"this Staff member")+" and replace "+currentName+" as Team Leader?":"Assign "+(chosen?.name||chosen?.full_name||"this Staff member")+" as Team Leader?";
   if(!confirm(promptText+" Their Staff role, team membership and existing data will remain unchanged."))return;
   setLeaderBtn.disabled=true;
   try{
    await API.request("quality/team-leader/"+encodeURIComponent(t.id),{method:"PUT",body:{staff_id:Number(leaderSelect.value)}});
    leaderState=await API.get("quality/team-leader/"+encodeURIComponent(t.id));
    paintLeaderState();
    leaderNotice.hidden=false;leaderNotice.textContent=(chosen?.name||chosen?.full_name||"Staff member")+" is now the Team Leader.";
   }catch(err){leaderNotice.hidden=false;leaderNotice.textContent=err.message||"Could not update Team Leader designation."}
   finally{setLeaderBtn.disabled=false}
  });
  const removeLeaderBtn=button("Remove Team Leader","ct-team-btn",async()=>{
   if(!leaderState?.team_leader){return}
   if(!confirm("Remove "+leaderState.team_leader.name+"'s Team Leader designation? Their Staff role and existing data will remain unchanged."))return;
   removeLeaderBtn.disabled=true;
   try{
    await API.request("quality/team-leader/"+encodeURIComponent(t.id),{method:"PUT",body:{staff_id:null}});
    leaderState=await API.get("quality/team-leader/"+encodeURIComponent(t.id));
    paintLeaderState();
    leaderNotice.hidden=false;leaderNotice.textContent="Team Leader designation removed.";
   }catch(err){leaderNotice.hidden=false;leaderNotice.textContent=err.message||"Could not remove Team Leader designation."}
   finally{removeLeaderBtn.disabled=false}
  });
  leaderActions.append(setLeaderBtn,removeLeaderBtn);
  const leaderNotice=el("p","ct-team-supervisor-teamleader-notice");leaderNotice.hidden=true;
  leaderSection.append(leaderCurrent,leaderSelect,leaderActions,leaderNotice);
  let leaderState=null;
  function paintLeaderState(){
   const current=leaderState?.team_leader;
   leaderCurrent.textContent=current?"Current Team Leader: "+current.name:"No Team Leader is currently assigned.";
   removeLeaderBtn.disabled=!current;
   setLeaderBtn.textContent=current?"Replace Team Leader":"Assign Team Leader";
   leaderSelect.value="";
  }
  leaderSection.dataset.teamLeaderControls="true";
  management.append(leaderSection);

  const status=el("section","ct-team-supervisor-overview-status");status.append(el("h3","","Team status"));
  const statusGrid=el("div","ct-team-supervisor-overview-statusgrid");
  const capacityLabel=t.capacity_status==="over_capacity"?"Over capacity":t.capacity_status==="within_capacity"?"Within capacity":"Capacity not configured";
  statusGrid.append(metricSmall("Capacity status",capacityLabel),metricSmall("Team status",t.status||"Unknown"),metricSmall("Tracked activity events",(data.activity||[]).length));
  status.append(statusGrid);own.append(status);

  const roster=el("section","ct-team-supervisor-roster");
  roster.append(el("p","ct-team-eyebrow","TEAM DIRECTORY"),el("h2","","Team members"),el("p","ct-team-muted",(data.members||[]).length+" people assigned to your team."));
  const members=data.members||[];
  const initials=name=>String(name||"M").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"M";
  const makeMemberAvatar=(member,large=false)=>{
   const avatar=el("span","ct-team-member-avatar"+(large?" is-large":""));
   if(member.personnel_avatar_url){const img=document.createElement("img");img.src=member.personnel_avatar_url;img.alt=(member.name||"Member")+"'s Personnel profile picture";img.loading="lazy";avatar.append(img)}
   else avatar.textContent=initials(member.name);
   return avatar;
  };
  const openPhoto=(member)=>{
   if(!member.personnel_avatar_url)return;
   const overlay=el("div","ct-team-member-photo-overlay");
   const image=document.createElement("img");image.src=member.personnel_avatar_url;image.alt=(member.name||"Team member")+"'s Personnel profile picture";
   const close=button("×","ct-team-member-photo-close",()=>overlay.remove());close.setAttribute("aria-label","Close profile picture");
   overlay.append(close,image);overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.remove()});
   const onKey=event=>{if(event.key==="Escape"){overlay.remove();document.removeEventListener("keydown",onKey)}};
   document.addEventListener("keydown",onKey);document.body.append(overlay);
  };
  const openMemberPanel=async(member)=>{
   const overlay=el("div","ct-team-member-detail-overlay");
   const panel=el("section","ct-team-member-detail-panel");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",member.name+" team profile");
   const head=el("header","ct-team-member-detail-head");
   const title=el("div","");title.append(el("p","ct-team-eyebrow","TEAM MEMBER PROFILE"),el("h2","",member.name||"Team member"));
   const close=button("×","ct-team-member-detail-close",dismiss);close.setAttribute("aria-label","Close member profile");
   head.append(title,close);
   const body=el("div","ct-team-member-detail-body");
   const identity=el("div","ct-team-member-detail-identity");
   const photo=makeMemberAvatar(member,true);
   if(member.personnel_avatar_url){photo.classList.add("is-clickable");photo.title="View profile picture";photo.setAttribute("role","button");photo.tabIndex=0;photo.addEventListener("click",()=>openPhoto(member));photo.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openPhoto(member)}})}
   const summary=el("div","");summary.append(el("strong","",member.name||"Team member"),el("p","ct-team-muted",String(member.role||"Staff")+(member.is_team_leader?" · Team Leader":"")));
   identity.append(photo,summary);body.append(identity);
   const details=el("div","ct-team-member-detail-sections");
   const addSection=(label,items,empty)=>{
    const section=el("section","ct-team-member-detail-section");section.append(el("h3","",label));
    if(!items?.length)section.append(el("p","ct-team-muted",empty));
    else{const chips=el("div","ct-team-member-detail-chips");items.forEach(item=>chips.append(el("span","ct-team-member-detail-chip",typeof item==="string"?item:item.title||item.name||"")));section.append(chips)}
    details.append(section);
   };
   addSection("Skills",member.skills||[],"No skills have been added to this Personnel profile.");
   addSection("Qualifications & certifications",member.qualifications||[],"No qualifications or certifications have been recorded.");
   const joined=el("section","ct-team-member-detail-section");joined.append(el("h3","","Team membership"),el("p","ct-team-muted",member.assigned_at?"Joined this team "+date(member.assigned_at):"Team assignment date unavailable"));details.append(joined);
   body.append(details);panel.append(head,body);overlay.append(panel);
   function dismiss(){overlay.remove();document.removeEventListener("keydown",onKey)}
   overlay.addEventListener("click",event=>{if(event.target===overlay)dismiss()});
   const onKey=event=>{if(event.key==="Escape")dismiss()};
   document.addEventListener("keydown",onKey);shell.append(overlay);close.focus();
  };
  if(!members.length)roster.append(el("p","ct-team-muted","No active team members are recorded."));
  else{
   const list=el("div","ct-team-supervisor-memberlist");
   members.forEach(member=>{
    const row=el("article","ct-team-supervisor-member");
    const identity=el("div","ct-team-supervisor-memberidentity");
    const avatar=makeMemberAvatar(member);
    if(member.personnel_avatar_url){avatar.classList.add("is-clickable");avatar.title="View profile picture";avatar.setAttribute("role","button");avatar.tabIndex=0;avatar.addEventListener("click",event=>{event.stopPropagation();openPhoto(member)});avatar.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();event.stopPropagation();openPhoto(member)}})}
    const copy=el("button","ct-team-supervisor-member-open");
    copy.type="button";copy.append(el("strong","",member.name||"Unnamed member"),el("small","ct-team-muted",String(member.role||"Staff")+" · "+(member.account_status||"Unknown status")));
    copy.addEventListener("click",()=>openMemberPanel(member));
    identity.append(avatar,copy);
    row.append(identity);
    if(member.is_team_leader)row.append(el("span","ct-team-supervisor-rankbadge","Team Leader"));
    else row.append(el("small","ct-team-muted",member.assigned_at?"Joined team "+date(member.assigned_at):"Team assignment date unavailable"));
    list.append(row);
   });
   roster.append(list);
  }
  membersPage.append(roster);
  const operations=data.operations||[];
  const opSection=el("section","ct-team-supervisor-page-section ct-team-supervisor-operations-summary");
  opSection.append(el("p","ct-team-eyebrow","TEAM WORKLOAD"),el("h2","","Operations"),el("p","ct-team-muted",operations.length+" recorded operations associated with your team."));
  const operationFilters=el("aside","ct-team-operations-filter");
  operationFilters.append(el("p","ct-team-overview-filter-heading","VIEW BY"));
  const operationDisplay=el("section","ct-team-overview-display ct-team-operations-display");operationDisplay.setAttribute("aria-live","polite");
  const operationMeasures=[
   {key:"active",label:"Active",match:op=>!op.completed&&["assigned","in progress","in_progress"].includes(String(op.status||"").trim().toLowerCase()),description:"Operations currently assigned or in progress.",note:"Matches the team's active-operation status rules."},
   {key:"pending",label:"Pending review",match:op=>!op.completed&&["created","pending","submitted","rejected"].includes(String(op.status||"").trim().toLowerCase()),description:"Operations awaiting review or action.",note:"Includes created, pending, submitted and rejected statuses."},
   {key:"overdue",label:"Overdue",match:op=>!op.completed&&Boolean(op.overdue_calculated),description:"Operations past their due date that are not completed.",note:"Uses the backend's calculated overdue flag."},
   {key:"completed",label:"Completed",match:op=>Boolean(op.completed),description:"Operations recorded as completed.",note:"Includes completed, complete, approved, done and closed statuses."}
  ];
  const renderOperationMeasure=key=>{
   const measure=operationMeasures.find(x=>x.key===key)||operationMeasures[0];
   operationFilters.querySelectorAll("[data-operation-filter]").forEach(node=>{const active=node.dataset.operationFilter===measure.key;node.classList.toggle("is-active",active);node.setAttribute("aria-pressed",String(active))});
   const selected=operations.filter(measure.match);
   operationDisplay.replaceChildren();
   const head=el("div","ct-team-overview-display-head");head.append(el("p","ct-team-eyebrow","SELECTED MEASURE"),el("h3","",measure.label+" operations"));
   operationDisplay.append(head,el("strong","ct-team-overview-primary-value",String(selected.length)),el("p","ct-team-overview-detail",measure.description),el("p","ct-team-overview-note",measure.note));
   if(!selected.length){operationDisplay.append(el("p","ct-team-muted","No operations match this category."));return}
   const list=el("div","ct-team-supervisor-operationlist ct-team-operations-result-list");
   selected.forEach(op=>{
    const row=el("article","ct-team-supervisor-operation"),copy=el("div","");
    copy.append(el("strong","",op.title||"Untitled operation"));
    if(op.description)copy.append(el("p","ct-team-muted",op.description));
    const meta=el("div","ct-team-supervisor-operationmeta");
    meta.append(el("span","ct-team-supervisor-chip",op.status||"Unknown status"));
    if(op.due_at)meta.append(el("span","ct-team-muted","Due "+dateTime(op.due_at)));
    if(op.overdue_calculated)meta.append(el("span","ct-team-error","Overdue"));
    row.append(copy,meta);list.append(row);
   });
   operationDisplay.append(list);
  };
  operationMeasures.forEach(measure=>{
   const option=button(measure.label,"ct-team-overview-filter-option",()=>renderOperationMeasure(measure.key));
   option.dataset.operationFilter=measure.key;option.setAttribute("aria-pressed","false");operationFilters.append(option);
  });
  const operationLayout=el("div","ct-team-overview-layout ct-team-operations-layout");
  operationLayout.append(operationFilters,operationDisplay);opSection.append(operationLayout);renderOperationMeasure("active");
  operationsPage.append(opSection);

  const areas=el("section","ct-team-supervisor-page-section ct-team-sites-workspace");
  const areaHeader=el("header","ct-team-sites-header");
  const areaIntro=el("div","");
  areaIntro.append(el("p","ct-team-eyebrow","OPERATIONAL FOOTPRINT"),el("h2","","Locations & zones"),el("p","ct-team-muted","Explore the sites assigned to your team, inspect their operational areas, and open live records. Your access remains limited to this team."));
  const areaCounts=el("div","ct-team-sites-counts");
  [[ "LOCATIONS", (data.locations||[]).length ],["ZONES",(data.zones||[]).length],["LINKED OPERATIONS",(data.operations||[]).filter(x=>x.location_id||x.zone_id).length]].forEach(([label,value])=>{const stat=el("div","ct-team-sites-count");stat.append(el("strong","",String(value)),el("span","",label));areaCounts.append(stat)});
  areaHeader.append(areaIntro,areaCounts);areas.append(areaHeader);
  const areaNotice=el("p","ct-team-sites-notice");areaNotice.hidden=true;areas.append(areaNotice);
  const siteLayout=el("div","ct-team-sites-layout");
  const createPanel=el("section","ct-team-sites-create-panel");
  const createHead=el("div","ct-team-sites-create-head");createHead.append(el("p","ct-team-eyebrow","ZONE CONFIGURATION"),el("h3","","Create an operational zone"),el("p","ct-team-muted","Define a floor, block, department or controlled area inside one of your team's assigned locations."));
  const createForm=el("form","ct-team-sites-create-form");
  const locationField=el("label","ct-team-sites-create-field");locationField.append(el("span","","Parent location"));
  const createLocation=el("select","ct-team-sites-create-input");createLocation.required=true;createLocation.setAttribute("aria-label","Choose parent location");locationField.append(createLocation);
  const nameField=el("label","ct-team-sites-create-field");nameField.append(el("span","","Zone name"));const createName=el("input","ct-team-sites-create-input");createName.type="text";createName.required=true;createName.maxLength=150;createName.placeholder="e.g. Ground Floor Reception";nameField.append(createName);
  const floorField=el("label","ct-team-sites-create-field");floorField.append(el("span","","Floor / block / area"));const createFloor=el("input","ct-team-sites-create-input");createFloor.type="text";createFloor.maxLength=120;createFloor.placeholder="e.g. Ground Floor";floorField.append(createFloor);
  const descriptionField=el("label","ct-team-sites-create-field ct-team-sites-create-wide");descriptionField.append(el("span","","Purpose and notes"));const createDescription=el("textarea","ct-team-sites-create-input");createDescription.rows=2;createDescription.maxLength=4000;createDescription.placeholder="Describe the area or any operational notes…";descriptionField.append(createDescription);
  const createFooter=el("div","ct-team-sites-create-footer");const createHint=el("span","ct-team-muted","Only locations assigned to your team are available.");const createSubmit=button("Create zone","ct-team-btn ct-team-btn--primary",null,"submit");createFooter.append(createHint,createSubmit);
  createForm.append(locationField,nameField,floorField,descriptionField,createFooter);createPanel.append(createHead,createForm);
  const siteDirectory=el("section","ct-team-sites-directory");
  const directoryHead=el("div","ct-team-sites-panel-head");directoryHead.append(el("h3","","Assigned locations"),el("span","ct-team-muted",(data.locations||[]).length+" sites"));siteDirectory.append(directoryHead);
  const siteSearch=el("input","ct-team-sites-search");siteSearch.type="search";siteSearch.placeholder="Search your locations…";siteSearch.setAttribute("aria-label","Search assigned locations");siteDirectory.append(siteSearch);
  const siteList=el("div","ct-team-sites-list");siteDirectory.append(siteList);
  const siteDetail=el("section","ct-team-sites-detail");
  siteLayout.append(createPanel,siteDirectory,siteDetail);areas.append(siteLayout);locationsPage.append(areas);
  const assignedLocations=(data.locations||[]).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  const assignedZones=(data.zones||[]).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  let activeLocationId=assignedLocations[0]?.id??null;
  assignedLocations.forEach(site=>{const option=el("option","",site.name||"Location");option.value=String(site.id);createLocation.append(option)});
  if(!assignedLocations.length){createLocation.disabled=true;createSubmit.disabled=true;createHint.textContent="An Admin must assign a location to your team before you can create zones."}
  createForm.addEventListener("submit",async event=>{
    event.preventDefault();
    if(!createLocation.value||!createName.value.trim())return;
    createSubmit.disabled=true;createSubmit.textContent="Creating…";
    try{
      const result=await API.post("zones",{name:createName.value.trim(),floor_label:createFloor.value.trim(),description:createDescription.value.trim(),location_id:Number(createLocation.value)});
      const fresh=await API.get("zones");const rows=Array.isArray(fresh.zones)?fresh.zones:[];
      const ownIds=new Set(assignedLocations.map(x=>String(x.id)));
      assignedZones.splice(0,assignedZones.length,...rows.filter(z=>ownIds.has(String(z.location_id))));
      createName.value="";createFloor.value="";createDescription.value="";
      activeLocationId=Number(createLocation.value);renderSiteDirectory();renderLocationDetail();
      showAreaNotice(result.message||"Zone created successfully.");
    }catch(error){showAreaNotice(error.message||"Zone could not be created.",true)}
    finally{createSubmit.disabled=false;createSubmit.textContent="Create zone"}
  });
  const teamOps=data.operations||[];
  const locationZones=id=>assignedZones.filter(z=>String(z.location_id)===String(id));
  const locationOperations=id=>{const ids=new Set(locationZones(id).map(z=>String(z.id)));return teamOps.filter(op=>String(op.location_id)===String(id)||ids.has(String(op.zone_id)))};
  const showAreaNotice=(message,isError=false)=>{areaNotice.textContent=message;areaNotice.hidden=!message;areaNotice.classList.toggle("is-error",Boolean(isError));};
  function renderSiteDirectory(){
    siteList.replaceChildren();
    const q=siteSearch.value.trim().toLowerCase();
    const visible=assignedLocations.filter(site=>!q||String(site.name||"").toLowerCase().includes(q)||String(site.address||"").toLowerCase().includes(q));
    if(!visible.length){siteList.append(el("p","ct-team-sites-empty",assignedLocations.length?"No assigned locations match your search.":"No locations are currently assigned to this team."));return}
    visible.forEach(site=>{
      const row=button("","ct-team-site-item",()=>selectAssignedLocation(site.id));
      row.classList.toggle("is-active",String(site.id)===String(activeLocationId));
      const copy=el("span","ct-team-site-copy");copy.append(el("strong","",site.name||"Unnamed location"),el("small","",site.address||"Address not recorded"));
      const meta=el("span","ct-team-site-meta");meta.append(el("b","",String(locationZones(site.id).length)),el("small","","Zones"));
      row.append(copy,meta);row.setAttribute("aria-pressed",String(String(site.id)===String(activeLocationId)));siteList.append(row);
    });
  }
  function showAreaModal(title,build){
    const overlay=el("div","ct-team-sites-overlay"),panel=el("section","ct-team-sites-modal");panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");
    const head=el("header","ct-team-sites-modal-head");head.append(el("h2","",title));
    const close=button("×","ct-team-sites-close",()=>dismiss());close.setAttribute("aria-label","Close panel");head.append(close);
    const body=el("div","ct-team-sites-modal-body");panel.append(head,body);overlay.append(panel);
    const dismiss=()=>{overlay.remove();document.removeEventListener("keydown",onKey)};
    const onKey=e=>{if(e.key==="Escape")dismiss()};
    overlay.addEventListener("click",e=>{if(e.target===overlay)dismiss()});document.addEventListener("keydown",onKey);document.body.append(overlay);
    build(body,dismiss);close.focus();return {body,close,dismiss};
  }
  function selectAssignedLocation(id){
    activeLocationId=id;renderSiteDirectory();renderLocationDetail();
  }
  function renderLocationDetail(){
    siteDetail.replaceChildren();
    const site=assignedLocations.find(x=>String(x.id)===String(activeLocationId));
    if(!site){const empty=el("div","ct-team-sites-empty-state");empty.append(el("span","","⌖"),el("strong","","Select a location"),el("p","","Choose a site from the directory to inspect its zones and operational activity."));siteDetail.append(empty);return}
    const zonesHere=locationZones(site.id),opsHere=locationOperations(site.id);
    const head=el("header","ct-team-sites-detail-head"),identity=el("div","");
    identity.append(el("p","ct-team-eyebrow","SELECTED LOCATION"),el("h3","",site.name||"Location"),el("p","ct-team-muted",site.address||"Address not recorded"));
    head.append(identity,el("span","ct-team-sites-status",site.status||"Active"));siteDetail.append(head);
    const description=site.description?el("p","ct-team-sites-description",site.description):null;if(description)siteDetail.append(description);
    const stats=el("div","ct-team-sites-detail-stats");
    [["Zones",zonesHere.length],["Operations",opsHere.length],["Open",opsHere.filter(x=>!["completed","complete","approved","done","closed","cancelled","canceled"].includes(String(x.status||"").toLowerCase())).length]].forEach(([label,value])=>{const item=el("div","ct-team-sites-detail-stat");item.append(el("strong","",String(value)),el("span","",label));stats.append(item)});
    siteDetail.append(stats);
    const actions=el("div","ct-team-sites-actions");
    const useThisSite=button("Use this location for zone creation","ct-team-btn ct-team-btn--quiet",()=>{createLocation.value=String(site.id);createName.focus();createPanel.scrollIntoView({behavior:"smooth",block:"center"});});actions.append(useThisSite);
    if(site.latitude!=null&&site.longitude!=null){const mapLink=el("a","ct-team-btn","Open map ↗");mapLink.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(site.latitude+","+site.longitude);mapLink.target="_blank";mapLink.rel="noopener noreferrer";actions.append(mapLink)}
    siteDetail.append(actions);
    const zoneHead=el("div","ct-team-sites-section-head");zoneHead.append(el("h4","","Zones at this location"),el("span","ct-team-muted",zonesHere.length+" areas"));siteDetail.append(zoneHead);
    if(!zonesHere.length)siteDetail.append(el("p","ct-team-sites-empty","No zones have been configured at this location yet. Create the floors, blocks or operational areas your team needs."));
    else{
      const zoneGrid=el("div","ct-team-sites-zone-list");
      zonesHere.forEach(zone=>{
        const card=el("article","ct-team-sites-zone");
        const top=el("div","ct-team-sites-zone-top");top.append(el("strong","",zone.name||"Unnamed zone"),el("span","ct-team-sites-status",zone.status||"Active"));card.append(top);
        card.append(el("p","ct-team-muted",[zone.floor_label,zone.description].filter(Boolean).join(" · ")||"No additional area details recorded."));
        const zoneOps=teamOps.filter(op=>String(op.zone_id)===String(zone.id));
        const info=el("div","ct-team-sites-zone-meta");info.append(el("span","",zoneOps.length+" linked operations"));card.append(info);
        card.append(button("Inspect zone →","ct-team-btn ct-team-btn--quiet",()=>inspectTeamZone(zone,site)));
        zoneGrid.append(card);
      });
      siteDetail.append(zoneGrid);
    }
    const opHead=el("div","ct-team-sites-section-head");opHead.append(el("h4","","Recent operations"),el("span","ct-team-muted","Live team records"));siteDetail.append(opHead);
    if(!opsHere.length)siteDetail.append(el("p","ct-team-sites-empty","No operations are linked to this location."));
    else{
      const list=el("div","ct-team-sites-operation-list");
      opsHere.slice(0,8).forEach(op=>{const row=el("article","ct-team-sites-operation");const copy=el("div","");copy.append(el("strong","",op.title||"Untitled operation"),el("small","",op.zone_id?(assignedZones.find(z=>String(z.id)===String(op.zone_id))?.name||"Zone"):"Location-wide"));row.append(copy,el("span","ct-team-sites-status",op.status||"Unknown"));list.append(row)});
      siteDetail.append(list);
    }
  }
  async function inspectTeamZone(zone,site){
    const dialog=showAreaModal("Zone intelligence · "+(zone.name||"Zone"),body=>{
      body.append(el("p","ct-team-muted","Loading current zone details, assignments and linked operations…"));
      API.get("zones/"+encodeURIComponent(zone.id)).then(result=>{
        const z=result.zone||zone;body.replaceChildren();
        const summary=el("div","ct-team-sites-zone-summary");
        [["Location",site.name],["Floor / area",z.floor_label],["Status",z.status],["Assigned team",z.effective_team_name||t.name],["Team members",z.member_count],["Open operations",z.active_operation_count],["Floor plan",z.has_floor_plan?"Available":"Not uploaded"]].forEach(([label,value])=>{const item=el("div","ct-team-sites-detail-stat");item.append(el("span","",label),el("strong","",value===null||value===undefined||value===""?"—":String(value)));summary.append(item)});
        body.append(summary);
        if(z.description)body.append(el("p","ct-team-sites-description",z.description));
        const people=z.assigned_people||[];body.append(el("h3","","Assigned personnel"));
        if(!people.length)body.append(el("p","ct-team-sites-empty","No active team members are currently assigned."));
        else{const list=el("div","ct-team-sites-people");people.forEach(person=>{const row=el("div","ct-team-sites-person");row.append(el("strong","",person.name||"Team member"),el("span","",person.role||"Member"));list.append(row)});body.append(list)}
        const ops=z.operations||[];body.append(el("h3","","Zone operations"));
        if(!ops.length)body.append(el("p","ct-team-sites-empty","No operations are linked to this zone."));
        else{const list=el("div","ct-team-sites-operation-list");ops.forEach(op=>{const row=el("article","ct-team-sites-operation");row.append(el("strong","",op.title||"Untitled operation"),el("span","ct-team-sites-status",op.status||"Unknown"));list.append(row)});body.append(list)}
        const footer=el("div","ct-team-sites-actions");
        footer.append(button("Activity history","ct-team-btn",async()=>{try{const history=await API.get("zones/"+zone.id+"/history");const events=history.history||[];const historyPanel=showAreaModal("Zone activity · "+zone.name,b=>{if(!events.length)b.append(el("p","ct-team-sites-empty","No activity has been recorded for this zone."));events.forEach(event=>{const row=el("article","ct-team-sites-event");row.append(el("strong","",String(event.action||"Zone activity").replaceAll("."," · ")),el("small","",dateTime(event.created_at)),el("p","",typeof event.details==="string"?event.details:JSON.stringify(event.details||{})));b.append(row)})})}catch(error){showAreaNotice(error.message||"Zone history could not be loaded.",true)}}));
        body.append(footer);
      }).catch(error=>body.replaceChildren(el("p","ct-team-sites-error",error.message||"Zone details could not be loaded.")));
    });
  }
  function createTeamZone(site){
    showAreaModal("Create operational zone", (body,dismiss)=>{
      const form=el("form","ct-team-sites-form");
      const makeField=(label,type,value,wide=false)=>{const wrap=el("label","ct-team-sites-field"+(wide?" is-wide":""));wrap.append(el("span","",label));const inputNode=type==="textarea"?el("textarea","ct-team-sites-input"):el("input","ct-team-sites-input");if(type==="textarea")inputNode.rows=4;else inputNode.type=type;inputNode.value=value||"";wrap.append(inputNode);form.append(wrap);return inputNode};
      const name=makeField("Zone name","text","");name.required=true;name.maxLength=150;
      const floor=makeField("Floor / block / area","text","");floor.maxLength=120;
      const description=makeField("Description","textarea","",true);description.maxLength=4000;
      const actions=el("div","ct-team-sites-form-actions");
      actions.append(button("Cancel","ct-team-btn",dismiss),button("Create zone","ct-team-btn ct-team-btn--primary",null,"submit"));form.append(actions);
      form.addEventListener("submit",async event=>{
        event.preventDefault();const submit=form.querySelector('button[type="submit"]');if(submit.disabled)return;
        if(!name.value.trim()){name.focus();return}
        submit.disabled=true;submit.textContent="Creating…";
        try{
          const result=await API.post("zones",{name:name.value.trim(),floor_label:floor.value.trim(),description:description.value.trim(),location_id:site.id});
          const created=result.zone||{};
          dismiss();showAreaNotice(result.message||"Zone created successfully.");
          const fresh=await API.get("zones");
          const rows=Array.isArray(fresh.zones)?fresh.zones:[];
          const ownIds=new Set(assignedLocations.map(x=>String(x.id)));
          assignedZones.splice(0,assignedZones.length,...rows.filter(z=>ownIds.has(String(z.location_id))));
          if(created.id)activeLocationId=site.id;
          renderSiteDirectory();renderLocationDetail();
        }catch(error){showAreaNotice(error.message||"Zone could not be created.",true);submit.disabled=false;submit.textContent="Create zone"}
      });
      body.append(form);
    });
  }
  siteSearch.addEventListener("input",renderSiteDirectory);
  renderSiteDirectory();renderLocationDetail();

  const perf=el("section","ct-team-supervisor-page-section ct-team-performance-overview");
  const perfHeader=el("div","ct-team-performance-header");
  const perfIntro=el("div","");
  perfIntro.append(el("p","ct-team-eyebrow","TEAM INTELLIGENCE"),el("h2","","Team Performance Overview"),el("p","ct-team-muted","A live view of operational delivery, workload, punctuality and individual contribution for your assigned team."));
  const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const dateControls=el("div","ct-team-performance-controls");
  const endInput=input(iso(new Date()),"end_date","date"),startDefault=new Date();startDefault.setDate(startDefault.getDate()-55);
  const startInput=input(iso(startDefault),"start_date","date");
  const refreshPerformance=button("Refresh","ct-team-btn ct-team-btn--primary");
  dateControls.append(field("From",startInput),field("To",endInput),refreshPerformance);
  perfHeader.append(perfIntro,dateControls);perf.append(perfHeader);
  const perfStatus=el("p","ct-team-muted ct-team-performance-status","Loading real team performance…");
  const perfContent=el("div","ct-team-performance-content");
  perf.append(perfStatus,perfContent);performancePage.append(perf);
  const pct=v=>v===null||v===undefined||!Number.isFinite(Number(v))?"—":Number(v).toFixed(1)+"%";
  const number=v=>Number(v||0).toLocaleString();
  function performanceMetric(label,value,note,warning){
   const item=el("article","ct-team-performance-kpi"+(warning?" is-warning":""));
   item.append(el("span","",label),el("strong","",value===null||value===undefined?"—":String(value)));
   if(note)item.append(el("small","",note));return item;
  }
  function renderPerformance(result){
   perfContent.replaceChildren();
   const overview=result.team_overview||{},members=(result.members||[]).slice();
   const ranked=members.filter(m=>m.score!==null&&m.score!==undefined).sort((a,b)=>Number(b.score)-Number(a.score));
   const summary=el("div","ct-team-performance-kpis");
   [
    ["Operations",number(overview.total_operations),"Recorded in selected period"],
    ["Completed",number(overview.completed),"Completed operations"],
    ["Pending",number(overview.pending),"Still in progress or awaiting action"],
    ["Overdue",number(overview.overdue),"Open and past due",Number(overview.overdue)>0],
    ["Completion rate",pct(overview.completion_rate),"Workload-weighted"],
    ["On-time rate",pct(overview.on_time_rate),"Of completed operations with due dates"],
    ["Team performance score",overview.score==null?"Insufficient data":Number(overview.score).toFixed(1)+"/100","Difficulty-weighted composite"]
   ].forEach(x=>summary.append(performanceMetric(...x)));
   perfContent.append(summary);
   const split=el("div","ct-team-performance-grid");
   const trendPanel=el("section","ct-team-performance-panel");
   trendPanel.append(el("h3","","Weekly delivery trend"),el("p","ct-team-muted","Actual operations created and completed each week."));
   const weekly=result.weekly_trend||[];
   if(!weekly.length)trendPanel.append(el("p","ct-team-performance-empty","No weekly operation history is available for this period."));
   else{
    const chart=el("div","ct-team-performance-weekly");
    const max=Math.max(1,...weekly.map(w=>Math.max(Number(w.created)||0,Number(w.completed)||0)));
    weekly.forEach(w=>{
     const row=el("div","ct-team-performance-week");
     row.append(el("span","ct-team-performance-week-date",date(w.week_start)));
     const bars=el("div","ct-team-performance-bars");
     [["Created",w.created,"created"],["Completed",w.completed,"completed"]].forEach(([label,val,kind])=>{
      const line=el("div","ct-team-performance-bar-row");line.append(el("small","",label));
      const track=el("div","ct-team-performance-bar-track"),fill=el("span","ct-team-performance-bar-fill "+kind);
      fill.style.width=Math.max(0,Math.min(100,(Number(val)||0)/max*100))+"%";track.append(fill);
      line.append(track,el("b","",number(val)));bars.append(line);
     });
     row.append(bars);chart.append(row);
    });
    trendPanel.append(chart);
    const legend=el("div","ct-team-performance-legend");legend.append(el("span","created","Created"),el("span","completed","Completed"));trendPanel.append(legend);
   }
   const breakdown=el("section","ct-team-performance-panel");
   breakdown.append(el("h3","","Operational health"),el("p","ct-team-muted","Selected-period distribution from recorded team operations."));
   const total=Number(overview.total_operations)||0;
   [["Completed",overview.completed,"completed"],["Pending",overview.pending,"pending"],["Overdue",overview.overdue,"overdue"],["Cancelled",overview.cancelled,"cancelled"]].forEach(([label,val,kind])=>{
    const row=el("div","ct-team-performance-status-row");row.append(el("div","ct-team-performance-status-label",label),el("strong","",number(val)));
    const track=el("div","ct-team-performance-status-track"),fill=el("span","ct-team-performance-status-fill "+kind);
    fill.style.width=(total?Math.max(0,Math.min(100,Number(val||0)/total*100)):0)+"%";track.append(fill);row.append(track);breakdown.append(row);
   });
   split.append(trendPanel,breakdown);perfContent.append(split);
   const people=el("section","ct-team-performance-panel ct-team-performance-people");
   people.append(el("h3","","Individual team contribution"),el("p","ct-team-muted","Ranked using workload-adjusted completion, punctuality and overdue avoidance. Staff identities are limited to your own team."));
   const tableWrap=el("div","ct-team-performance-table-wrap"),tbl=el("table","ct-team-performance-table"),thead=el("thead"),hr=el("tr");
   ["Rank","Staff member","Assigned","Completed","Completion","On time","Overdue","Score"].forEach(h=>hr.append(el("th","",h)));
   thead.append(hr);tbl.append(thead);const tbody=el("tbody");
   members.sort((a,b)=>{if(a.score==null&&b.score!=null)return 1;if(a.score!=null&&b.score==null)return -1;return Number(b.score||-1)-Number(a.score||-1)||String(a.name||"").localeCompare(String(b.name||""))});
   members.forEach(m=>{
    const rank=m.score==null?"—":"#"+(ranked.findIndex(x=>String(x.id)===String(m.id))+1);
    const tr=el("tr");[rank,m.name,number(m.assigned),number(m.completed),pct(m.completion_rate),pct(m.on_time_rate),pct(m.overdue_rate),m.score==null?"Insufficient data":Number(m.score).toFixed(1)].forEach(v=>tr.append(el("td","",v)));tbody.append(tr);
   });
   if(!members.length){const tr=el("tr"),td=el("td","ct-team-muted","No staff performance records for this reporting period.");td.colSpan=8;tr.append(td);tbody.append(tr)}
   tbl.append(tbody);tableWrap.append(tbl);people.append(tableWrap);perfContent.append(people);
   perfContent.append(el("p","ct-team-performance-methodology",result.methodology||"Metrics are calculated from recorded team operations. No attendance or unrecorded activity is inferred."));
   perfStatus.textContent="Live team data · "+(result.period?.start_date||startInput.value)+" to "+(result.period?.end_date||endInput.value)+" · "+members.length+" staff records";
  }
  let performanceLoading=false;
  async function loadTeamPerformance(){
   if(performanceLoading)return;
   if(!startInput.value||!endInput.value||startInput.value>endInput.value){perfStatus.textContent="Choose a valid reporting date range.";return}
   performanceLoading=true;refreshPerformance.disabled=true;perfStatus.textContent="Loading live team performance…";
   try{
    const result=await API.get("teams/supervisor/performance?start_date="+encodeURIComponent(startInput.value)+"&end_date="+encodeURIComponent(endInput.value));
    renderPerformance(result);
   }catch(error){perfContent.replaceChildren(el("p","ct-team-error",error.message||"Unable to load team performance."));perfStatus.textContent="Team performance could not be loaded."}
   finally{performanceLoading=false;refreshPerformance.disabled=false}
  }
  refreshPerformance.addEventListener("click",loadTeamPerformance);
  loadTeamPerformance();
  const activity=el("section","ct-team-supervisor-page-section"),activityHead=el("div","ct-team-supervisor-sectionhead"),activityTitle=el("div","");
  activityTitle.append(el("p","ct-team-eyebrow","TEAM HISTORY"),el("h2","","Recent team activity"));
  activityHead.append(activityTitle,button("View team activity →","ct-team-btn ct-team-btn--quiet",()=>openSupervisorPanel("activity",data)));
  activity.append(activityHead,el("p","ct-team-muted","The three most recent recorded team events."));
  const events=data.activity||[];
  if(!events.length)activity.append(el("p","ct-team-muted","No recent team activity recorded."));
  else{const list=el("div","ct-team-supervisor-activitylist");events.slice(0,3).forEach(event=>{const row=el("article","ct-team-supervisor-activityrow"),copy=el("div","");copy.append(el("strong","",String(event.action||"Team activity").replaceAll("."," · ")));const message=event.message||event.details?.message||event.details?.task_title;if(message)copy.append(el("p","ct-team-muted",message));row.append(copy,el("small","ct-team-muted",(event.actor_name||"System")+" · "+dateTime(event.created_at)));list.append(row)});activity.append(list)}
  activityPage.append(activity);
 }
 const noticeNode=el("div","ct-team-notice");noticeNode.hidden=true;wrap.append(noticeNode);
 const own=el("section","ct-team-supervisor-own");own.append(el("p","ct-team-muted","Loading your team…"));wrap.append(own);
 function renderOther(data,target,inputNode,suggestionNode){
  const t=data.team||{};target.hidden=false;target.replaceChildren();
  const head=el("div","ct-team-supervisor-other-head");
  const title=el("div","");title.append(el("p","ct-team-eyebrow","ORGANISATION DIRECTORY"),el("h2","",t.name||"Team"));
  head.append(title,button("Close","ct-team-btn ct-team-btn--quiet",()=>{
   target.hidden=true;target.replaceChildren();inputNode.value="";suggestionNode.hidden=true;inputNode.focus();
  }));target.append(head);
  if(t.description)target.append(el("p","ct-team-muted",t.description));
  target.append(el("p","ct-team-supervisor-readonly","View-only team information. Staff records, personal details, operations and operational controls are not available."));
  if(t.team_performance_score!==null&&t.team_performance_score!==undefined){
   const score=el("div","ct-team-supervisor-score");
   score.append(el("span","ct-team-muted","Team completion score"),el("strong","",t.team_performance_score+"%"));
   target.append(score);
  }
 }
 function buildTeamSearch(label){
  const section=el("section","ct-team-supervisor-search");
  section.append(el("h2","",label),el("p","ct-team-muted","Search by team name. Results are limited to your organisation and are view-only."));
  const box=el("div","ct-team-supervisor-searchbox"),inputNode=el("input","ct-team-input");
  inputNode.type="search";inputNode.placeholder="Type at least 2 letters…";inputNode.setAttribute("aria-label","Search other teams");
  const suggestionNode=el("div","ct-team-supervisor-suggestions");suggestionNode.hidden=true;suggestionNode.setAttribute("role","listbox");
  box.append(inputNode,suggestionNode);section.append(box);
  const detail=el("section","ct-team-supervisor-other");detail.hidden=true;section.append(detail);
  let timer=null,requestSeq=0;
  async function runSearch(){
   const q=inputNode.value.trim(),seq=++requestSeq;suggestionNode.replaceChildren();
   if(q.length<2){suggestionNode.hidden=true;return}
   suggestionNode.hidden=false;suggestionNode.append(el("div","ct-team-supervisor-suggestion","Searching…"));
   try{
    const result=await API.get("teams/supervisor/search?q="+encodeURIComponent(q));
    if(seq!==requestSeq)return;
    suggestionNode.replaceChildren();
    const matches=Array.isArray(result.teams)?result.teams:[];
    if(!matches.length){suggestionNode.append(el("div","ct-team-supervisor-suggestion ct-team-muted","No matching teams found."));return}
    matches.forEach(team=>{
     const item=button("","ct-team-supervisor-suggestion",async()=>{
      suggestionNode.hidden=true;detail.hidden=false;detail.replaceChildren(el("p","ct-team-muted","Loading team information…"));
      try{const info=await API.get("teams/supervisor/"+encodeURIComponent(team.id));renderOther(info,detail,inputNode,suggestionNode)}
      catch(e){detail.replaceChildren(el("p","ct-team-error",e.message||"Could not load this team."))}
     });
     item.setAttribute("role","option");item.append(el("strong","",team.name));
     if(team.description)item.append(el("small","ct-team-muted",team.description));
     suggestionNode.append(item);
    });
   }catch(e){if(seq!==requestSeq)return;suggestionNode.replaceChildren(el("div","ct-team-supervisor-suggestion ct-team-error",e.message||"Team search failed."));suggestionNode.hidden=false}
  }
  inputNode.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(runSearch,220)});
  inputNode.addEventListener("keydown",e=>{if(e.key==="Escape"){suggestionNode.hidden=true;detail.hidden=true;detail.replaceChildren()}});
  document.addEventListener("click",e=>{if(!section.contains(e.target))suggestionNode.hidden=true});
  return section;
 }
 const overviewSearch=buildTeamSearch("Find another team");
 const membersSearch=buildTeamSearch("Find another team");
 pageViews.get("overview").append(wrap);
 pageViews.get("overview").append(overviewSearch);
 pageViews.get("members").append(membersSearch);

 // Every workspace page gets an explicit state immediately. A failure while
 // loading/rendering Overview must never leave Performance or Activity blank.
 const pageError=(id,error,retry)=>{
  const view=pageViews.get(id);
  if(!view)return;
  view.replaceChildren();
  const box=el("section","ct-team-fullscreen-placeholder");
  box.append(el("h2","",id==="performance"?"Performance couldn't load":id==="activity"?"Activity couldn't load":"Team overview couldn't load"));
  box.append(el("p","ct-team-muted",error?.message||"The team data request failed."));
  box.append(button("Retry","ct-team-btn ct-team-btn--primary",retry));
  view.append(box);
 };
 const loadOwn=async()=>{
  own.replaceChildren(el("p","ct-team-muted","Loading your team…"));
  for(const id of ["performance","activity"]){
   const view=pageViews.get(id);
   if(!view.childElementCount)view.append(el("p","ct-team-muted","Loading "+id+"…"));
  }
  try{
   const data=await API.get("teams/supervisor/mine");
   await renderOwn(data);
  }catch(e){
   own.replaceChildren(el("p","ct-team-error",e.message||"Could not load your team."));
   pageError("overview",e,loadOwn);
   pageError("performance",e,loadOwn);
   pageError("activity",e,loadOwn);
   console.error("[Teams] Supervisor workspace load failed:",e);
  }
 };
 loadOwn();
}

async function render(container){
 const user=AUTH?.getCurrentUser?.();container.replaceChildren();
 if(String(user?.role||"").toLowerCase()==="supervisor"){await renderSupervisorTeams(container);return}
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