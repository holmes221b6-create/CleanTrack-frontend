(function(){
"use strict";
const API=window.CleanTrackApi, AUTH=window.CleanTrackAuth;
const role=()=>String(AUTH?.getCurrentUser?.()?.role||"").toLowerCase();
const $=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!==undefined)n.textContent=String(txt);return n};
const btn=(label,fn,primary)=>{const b=$("button","mt-btn"+(primary?" mt-btn-primary":""),label);b.type="button";b.addEventListener("click",fn);return b};
const field=(label,control)=>{const l=$("label","mt-field");l.append($("span","",label),control);return l};
const input=(name,value,type)=>{const n=$("input","mt-input");n.name=name;n.type=type||"text";n.value=value??"";return n};
const area=(name,value)=>{const n=$("textarea","mt-input");n.name=name;n.value=value||"";n.rows=3;return n};
const select=(name,opts,value)=>{const n=$("select","mt-input");n.name=name;opts.forEach(([v,l])=>{const o=$("option","",l);o.value=v;n.append(o)});n.value=value??opts[0]?.[0]??"";return n};
function notice(root,msg,error){let n=root.querySelector(".mt-notice");if(!n){n=$("p","mt-notice");root.prepend(n)}n.textContent=msg;n.classList.toggle("is-error",!!error);n.hidden=!msg}
function panel(title,subtitle,content){
 const overlay=$("div","mt-overlay"),dialog=$("section","mt-panel");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");
 const head=$("header","mt-panel-head"),copy=$("div","");copy.append($("p","mt-eyebrow","MECHNAR WORKSPACE"),$("h2","",title),$("p","mt-muted",subtitle));
 const close=btn("×",()=>overlay.remove());close.className="mt-close";close.setAttribute("aria-label","Close panel");head.append(copy,close);dialog.append(head,content);overlay.append(dialog);
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});document.addEventListener("keydown",function esc(e){if(e.key==="Escape"&&overlay.isConnected){overlay.remove();document.removeEventListener("keydown",esc)}});
 const teamWorkspace=document.querySelector(".ct-team-fullscreen-shell");
 (teamWorkspace||document.body).append(overlay);return {overlay,dialog};
}
function shell(container,eyebrow,title,desc){container.replaceChildren();const root=$("section","mt-page");const head=$("header","mt-page-head"),copy=$("div","");copy.append($("p","mt-eyebrow",eyebrow),$("h1","",title),$("p","mt-muted",desc));head.append(copy);root.append(head);container.append(root);return root}
function table(headers,rows){const wrap=$("div","mt-table-wrap"),t=$("table","mt-table"),thead=$("thead"),tr=$("tr");headers.forEach(x=>tr.append($("th","",x)));thead.append(tr);const body=$("tbody");rows.forEach(row=>{const r=$("tr");row.forEach(cell=>{const td=$("td");if(cell instanceof Node)td.append(cell);else td.textContent=cell??"—";r.append(td)});body.append(r)});t.append(thead,body);wrap.append(t);return wrap}
function stats(items){const n=$("div","mt-stats");items.forEach(([k,v])=>{const x=$("div","mt-stat");x.append($("span","mt-muted",k),$("strong","",v));n.append(x)});return n}
async function renderInventory(container){
 const root=shell(container,"ORGANISATION ASSETS","Inventory","A controlled register of equipment, supplies, storage and assigned assets.");
 const toolbar=$("div","mt-toolbar"),search=input("search","","search");search.placeholder="Search inventory";toolbar.append(search);
 const canManage=role()==="admin";if(canManage)toolbar.append(btn("+ Add inventory item",()=>openInventoryForm(root,null),true));root.append(toolbar);
 const summary=$("div","mt-stats");root.append(summary);const content=$("div","mt-content");root.append(content);
 let items=[];
 async function load(){content.replaceChildren($("p","mt-muted","Loading inventory…"));try{const r=await API.get("org-tools/inventory");items=r.items||[];summary.replaceChildren();summary.append(stats([["Items",items.length],["Low stock",items.filter(x=>x.low_stock).length],["Maintenance due",items.filter(x=>x.maintenance_due_at&&new Date(x.maintenance_due_at)<=new Date()).length],["Unavailable",items.filter(x=>x.status!=="available").length]]));draw()}catch(e){content.replaceChildren($("p","mt-error",e.message||"Inventory could not be loaded."),btn("Retry",load))}}
 function draw(){const q=search.value.trim().toLowerCase();const rows=items.filter(x=>(x.name+" "+x.category+" "+x.asset_tag+" "+x.storage_location).toLowerCase().includes(q));content.replaceChildren();if(!rows.length){content.append($("p","mt-empty","No inventory records match this view."));return}content.append(table(["Item","Category","Quantity","Condition","Status","Storage / Team","Maintenance",""],rows.map(x=>[x.name,x.category,String(x.quantity)+" "+x.unit,x.condition,x.low_stock?"Low stock":x.status,x.storage_location||"—",x.maintenance_due_at?new Date(x.maintenance_due_at).toLocaleDateString():"—",canManage?btn("Manage",()=>openInventoryForm(root,x)): ""])))}
 search.addEventListener("input",draw);
 function openInventoryForm(parent,item){
  const form=$("form","mt-form");const names=["name","category","description","sku","asset_tag","serial_number","quantity","minimum_quantity","unit","condition","status","storage_location","purchase_date","warranty_until","maintenance_due_at","last_maintenance_at","notes"];
  const controls={};names.forEach(k=>{controls[k]=k==="description"||k==="notes"?area(k,item?.[k]):input(k,["purchase_date","warranty_until","maintenance_due_at","last_maintenance_at"].includes(k)?String(item?.[k]||"").slice(0,10):(item?.[k]??(k==="quantity"?1:k==="minimum_quantity"?0:k==="category"?"General":k==="unit"?"units":k==="condition"?"good":k==="status"?"available":"")),k==="quantity"||k==="minimum_quantity"?"number":["purchase_date","warranty_until","maintenance_due_at","last_maintenance_at"].includes(k)?"date":"text")});
  const grid=$("div","mt-form-grid");["name","category","sku","asset_tag","serial_number","quantity","minimum_quantity","unit","condition","status","storage_location","description","notes"].forEach(k=>grid.append(field(k.replaceAll("_"," ").replace(/^./,s=>s.toUpperCase()),controls[k])));
  const actions=$("div","mt-actions"),save=btn(item?"Save changes":"Create item",null,true);save.type="submit";actions.append(save,btn("Cancel",()=>p.overlay.remove()));form.append(grid,actions);
  const p=panel(item?"Update inventory item":"Add inventory item","Record accurate stock and asset information.",form);
  form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;const payload={};names.forEach(k=>payload[k]=controls[k].value);payload.quantity=Number(payload.quantity);payload.minimum_quantity=Number(payload.minimum_quantity);try{if(!payload.name.trim())throw Error("Item name is required.");if(item)await API.patch("org-tools/inventory/"+item.id,payload);else await API.post("org-tools/inventory",payload);p.overlay.remove();await load()}catch(err){notice(form,err.message||"Could not save item.",true)}finally{save.disabled=false}});
 }
 await load();
}
async function renderWorkforce(container){
 const root=shell(container,"WORKFORCE INTELLIGENCE","Capacity & Coverage","Understand operational demand, team capacity and workload using recorded assignments and estimates.");
 const content=$("div","mt-content");root.append(content);content.append($("p","mt-muted","Calculating current workload…"));
 try{const r=await API.get("org-tools/workforce");content.replaceChildren();const teams=r.teams||[];content.append(stats([["Teams",teams.length],["Open operations",teams.reduce((n,x)=>n+Number(x.open_operations||0),0)],["Estimated workload",teams.reduce((n,x)=>n+Number(x.estimated_workload_minutes||0),0)+" min"],["Capacity flags",teams.filter(x=>x.capacity_flag==="over_capacity").length]]));teams.forEach(t=>{const section=$("section","mt-section");section.append($("h2","",t.team_name),$("p","mt-muted",t.staff_count===null?"Your assigned workload":"Active members: "+t.staff_count+" · Capacity: "+(t.configured_capacity??"Not configured")),table(["Workload","Open operations","Estimated effort","Capacity"],[[t.staff_count===null?"My assignments":t.staff_count,t.open_operations,t.estimated_workload_minutes+" min",t.capacity_flag.replace("_"," ")]]));if(t.people?.length)section.append(table(["Person","Open operations","Estimated effort"],t.people.map(p=>[p.name,p.open_operations,p.estimated_minutes+" min"])));if((t.recommendations||[]).length){const rec=$("div","mt-recommendations");rec.append($("h3","","Recommended attention"));t.recommendations.forEach(x=>rec.append($("p","",x)));section.append(rec)}content.append(section)});if(!teams.length)content.append($("p","mt-empty","No active team data is available."));content.append($("p","mt-footnote",r.method||"Workload uses recorded operation estimates. Missing estimates are not guessed; availability and skills are not yet modelled."));
 }catch(e){content.replaceChildren($("p","mt-error",e.message||"Workforce data could not be loaded."),btn("Retry",()=>renderWorkforce(container)))}
}
async function renderEscalations(container){
 const root=shell(container,"OPERATIONAL OVERSIGHT","Intelligent Escalations","A traceable record of rule-triggered operational risks, acknowledgements and resolutions.");
 const toolbar=$("div","mt-toolbar");if(role()==="admin")toolbar.append(btn("+ Create rule",()=>openRule(root),true));root.append(toolbar);
 const content=$("div","mt-content");root.append(content);
 async function load(){content.replaceChildren($("p","mt-muted","Checking configured escalation conditions…"));try{const r=await API.get("org-tools/escalations");content.replaceChildren();const events=r.events||[];content.append(stats([["Open",events.filter(x=>x.status==="open").length],["Acknowledged",events.filter(x=>x.status==="acknowledged").length],["Resolved",events.filter(x=>x.status==="resolved").length],["Rules",r.rules?.length??"—"]]));if(role()==="admin"){const rules=$("section","mt-section");rules.append($("h2","","Configured rules"));rules.append(rulesTable(r.rules||[]));content.append(rules)}const section=$("section","mt-section");section.append($("h2","","Escalation register"));if(!events.length)section.append($("p","mt-empty","No escalation events have been triggered."));else section.append(table(["Risk","Severity","Status","Detected","Action"],events.map(x=>[x.title,x.severity,x.status,new Date(x.created_at).toLocaleString(),x.status==="resolved"?"Resolved":!x.can_update?"Awaiting authorised review":btn(x.status==="open"?"Acknowledge":"Resolve",async()=>{try{await API.patch("org-tools/escalations/"+x.id,{action:x.status==="open"?"acknowledge":"resolve"});await load()}catch(e){notice(root,e.message,true)}})])));content.append(section)}catch(e){content.replaceChildren($("p","mt-error",e.message||"Escalations could not be loaded."),btn("Retry",load))}}
 function rulesTable(rules){if(!rules.length)return $("p","mt-muted","No rules configured yet.");return table(["Rule","Trigger","Threshold","Severity","Scope","Enabled"],rules.map(x=>[x.name,x.trigger_type.replaceAll("_"," "),x.threshold_minutes+" min",x.severity,x.team_id?"Team #"+x.team_id:"Organisation",x.enabled?"Yes":"No"]))}
 function openRule(){const form=$("form","mt-form"),name=input("name",""),trigger=select("trigger_type",[["operation_overdue","Operation overdue"],["high_priority_overdue","High-priority operation overdue"]]),minutes=input("threshold_minutes",60,"number"),severity=select("severity",[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]),notify=input("notify_admin","on","checkbox");const teams=API.get("teams").then(r=>r.teams||[]).catch(()=>[]);const team=select("team_id",[["","All organisation teams"]]);teams.then(list=>list.forEach(t=>{const o=$("option","",t.name);o.value=t.id;team.append(o)}));const grid=$("div","mt-form-grid");grid.append(field("Rule name",name),field("Trigger",trigger),field("Threshold (minutes)",minutes),field("Severity",severity),field("Team scope",team),field("Notify Admin",notify));const actions=$("div","mt-actions"),save=btn("Save escalation rule",null,true);save.type="submit";actions.append(save,btn("Cancel",()=>p.overlay.remove()));form.append(grid,actions);const p=panel("Create escalation rule","Set an organisation policy for overdue operational work.",form);form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;try{await API.post("org-tools/escalations/rules",{name:name.value,trigger_type:trigger.value,threshold_minutes:Number(minutes.value),severity:severity.value,team_id:team.value?Number(team.value):null,notify_admin:notify.checked});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}finally{save.disabled=false}})}
 await load();
}
async function renderTeamPolicy(container,embedded){
 const root=embedded?container:shell(container,"TEAM GOVERNANCE","Team Policy","The current instructions and standards your team is expected to follow.");
 root.replaceChildren();if(!embedded)container.append(root);
 const canEdit=role()==="supervisor";
 const head=$("div","mt-policy-toolbar"),teamSelect=select("team_id",[]);
 const teamField=field("Team",teamSelect);
 const writeButton=canEdit?btn("Write your first policy",openEditor,true):null;
 head.append(teamField);if(writeButton)head.append(writeButton);
 root.append(head);
 const content=$("div","mt-policy-content");root.append(content);
 let teamRows=[];
 function selectedTeam(){return teamRows.find(x=>String(x.team.id)===teamSelect.value)||teamRows[0]||null}
 function openEditor(){
  if(!selectedTeam()){notice(root,"No team is available for policy creation.",true);return}
  try{editPolicy(null)}catch(error){console.error("MECHNAR team policy editor:",error);notice(root,error.message||"The policy editor could not be opened.",true)}
 }
 async function load(){
  content.replaceChildren($("p","mt-muted","Loading team policy…"));
  try{
   const r=await API.get("org-tools/team-policy");teamRows=r.teams||[];
   teamSelect.replaceChildren();
   teamRows.forEach(x=>{const o=$("option","",x.team.name);o.value=x.team.id;teamSelect.append(o)});
   teamField.hidden=teamRows.length<2;
   if(writeButton){writeButton.hidden=!teamRows.length;writeButton.textContent=selectedTeam()?.policy?"Write policy":"Write your first policy"}
   if(!teamRows.length){content.replaceChildren($("div","mt-policy-empty","No team policy is available for your membership yet."));return}
   draw();
  }catch(e){content.replaceChildren($("p","mt-error",e.message||"Team policy could not be loaded."))}
 }
 function draw(){
  const selected=selectedTeam();content.replaceChildren();if(!selected)return;
  const policy=selected.policy;
  const teamHead=$("div","mt-policy-teamhead");
  teamHead.append($("div","mt-eyebrow","TEAM STANDARD"),$("h2","",selected.team.name));
  if(policy)teamHead.append($("span","mt-policy-version","CURRENT VERSION · "+policy.version));
  content.append(teamHead);
  if(!policy){
   const empty=$("div","mt-policy-empty");
   empty.append($("strong","","No published policy yet"),$("p","","Your supervisor has not published the team's instructions. Once published, the current policy will appear here for everyone in the team."));
   content.append(empty);return;
  }
  const intro=$("div","mt-policy-intro");
  intro.append($("span","mt-policy-live","● PUBLISHED"),$("span","mt-footnote","Effective version "+policy.version));
  content.append(intro);
  const body=$("article","mt-policy-document");body.append($("h2","mt-policy-document-title",policy.title));
  if(policy.policy_type==="custom"){body.append($("div","mt-policy-custom-copy",policy.instructions||""))}
  else{
   const sections=[["Purpose & objectives",policy.objectives],["Roles & responsibilities",policy.responsibilities],["Instructions to follow",policy.instructions],["Standards & expectations",policy.standards],["Safety guidance",policy.safety_guidance]];
   sections.forEach(([label,value])=>{if(!String(value||"").trim())return;const section=$("section","mt-policy-block");section.append($("h3","",label),$("p","mt-policy-copy",value));body.append(section)});
  }
  const meta=$("footer","mt-policy-meta");meta.append($("span","","Published "+(policy.published_at?new Date(policy.published_at).toLocaleString():"date unavailable")));body.append(meta);content.append(body);
  if(canEdit){
   content.append(btn("Publish new version",()=>editPolicy(policy),true));
   if((selected.drafts||[]).length){
    const drafts=$("section","mt-policy-drafts"),title=$("div","mt-policy-drafts-head");
    title.append($("h3","","Unpublished drafts"),$("span","mt-footnote",String(selected.drafts.length)+" saved"));drafts.append(title);
    selected.drafts.forEach(d=>{const row=$("div","mt-policy-draft-row"),copy=$("div","mt-policy-draft-copy");copy.append($("strong","",d.title),$("small","","Draft · Version "+d.version));row.append(copy,btn("Edit draft",()=>editPolicy(d)));drafts.append(row)});
    content.append(drafts);
   }
  }
 }
 teamSelect.addEventListener("change",()=>{if(writeButton)writeButton.textContent=selectedTeam()?.policy?"Write policy":"Write your first policy";draw()});
 function editPolicy(existing){
  const form=$("form","mt-form mt-policy-form"),fields={};
  const currentType=existing?.policy_type||"structured";
  const typeSelect=$("select","mt-input");typeSelect.name="policy_type";
  [["structured","Structured policy"],["custom","Custom policy — free writing"]].forEach(([value,label])=>{const option=$("option","",label);option.value=value;typeSelect.append(option)});
  typeSelect.value=currentType;
  const typeField=field("Policy format",typeSelect);
  const defs=[["title","Policy title","Single, clear title for this team's policy."],["objectives","Purpose & objectives","What the team is responsible for achieving."],["responsibilities","Roles & responsibilities","Who is responsible for each part of the work."],["instructions","Instructions to follow","Write the actual steps and procedures team members must follow."],["standards","Standards & expectations","Define expected quality, conduct and completion standards."],["safety_guidance","Safety guidance","Required precautions, reporting steps and safety rules."]];
  defs.forEach(([key])=>{fields[key]=key==="title"?input(key,existing?.[key]||""):area(key,existing?.[key]||"")});
  const customContent=area("custom_content",currentType==="custom"?(existing?.instructions||""):"");
  const customField=field("Write your policy",customContent);
  const grid=$("div","mt-policy-form-grid");grid.append(typeField);
  defs.forEach(([key,label,hint])=>{const group=$("div","mt-policy-field-group");group.append(field(label,fields[key]),$("small","mt-policy-field-hint",hint));grid.append(group)});
  grid.append(customField);
  function updateMode(){
   const custom=typeSelect.value==="custom";
   defs.forEach(([key])=>{const group=fields[key].closest(".mt-policy-field-group");if(group)group.hidden=custom});
   customField.hidden=!custom;
  }
  updateMode();typeSelect.addEventListener("change",updateMode);
  const actions=$("div","mt-policy-form-actions"),save=btn("Save draft",null,false),publish=btn("Publish to team",null,true);
  actions.append(save,publish);
  const p=panel(existing?.status==="draft"?"Edit policy draft":existing?"Prepare new policy version":"Write team policy","Choose structured sections or write freely. Publishing makes the policy visible to every member of the selected team.",form);
  actions.append(btn("Cancel",()=>p.overlay.remove()));
  form.append(grid,actions);
  async function savePolicy(publishNow){
   const isCustom=typeSelect.value==="custom";
   const title=isCustom?(fields.title.value.trim()||"Custom policy"):fields.title.value.trim();
   if(!isCustom&&!title){notice(form,"Enter a policy title before saving.",true);fields.title.focus();return}
   if(isCustom&&!customContent.value.trim()){notice(form,"Write the policy before saving or publishing.",true);customContent.focus();return}
   const selected=selectedTeam();if(!selected){notice(form,"Select a team before saving.",true);return}
   const payload={team_id:Number(selected.team.id),publish:publishNow,policy_type:typeSelect.value,custom_content:customContent.value.trim(),title};
   if(existing?.status==="draft")payload.policy_id=existing.id;
   defs.forEach(([key])=>payload[key]=isCustom?"":fields[key].value.trim());
   save.disabled=publish.disabled=true;
   try{
    const result=await API.post("org-tools/team-policy",payload);
    p.overlay.remove();await load();
    if(publishNow)notice(root,result.message||"The policy is now published for the team.");
   }catch(e){notice(form,e.message||"Could not save policy.",true)}
   finally{save.disabled=publish.disabled=false}
  }
  save.addEventListener("click",()=>savePolicy(false));
  publish.addEventListener("click",()=>savePolicy(true));
 }
 await load();
}
window.MechnarOrgTools=Object.freeze({renderInventory,renderWorkforce,renderEscalations,renderTeamPolicy});
})();