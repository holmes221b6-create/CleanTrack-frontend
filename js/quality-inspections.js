(function(){
"use strict";
const API=window.CleanTrackApi;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const el=(t,c,s)=>{const n=document.createElement(t);if(c)n.className=c;if(s!==undefined)n.textContent=s;return n;};
const fmt=v=>v?new Date(v).toLocaleString():"Not scheduled";
async function render(root,mode){
 if(!API){root.textContent="Quality module unavailable.";return;}
 const isStaff=mode==="staff",isAdmin=mode==="admin";
 root.innerHTML='<section class="sr-page"><header class="sr-head"><div><span class="sr-kicker">QUALITY CONTROL</span><h1>'+(isStaff?"Team Leader · Inspections":isAdmin?"Inspection Reports":"Inspections & Quality")+'</h1><p>'+(isStaff?"Conduct assigned inspections and submit your findings to your Supervisor.":isAdmin?"Review inspection reports forwarded by Supervisors.":"Plan inspections, manage templates and review submitted quality checks.")+'</p></div><button class="sr-refresh" type="button">Refresh</button></header><div class="sr-notice" hidden></div><div class="sr-body"></div></section>';
 const page=root.querySelector(".sr-page"),body=page.querySelector(".sr-body"),notice=page.querySelector(".sr-notice");
 const say=(s,bad=false)=>{notice.hidden=!s;notice.textContent=s||"";notice.classList.toggle("is-error",bad);};
 let items=[],templates=[],schedules=[],leader=null,options={operations:[],locations:[],zones:[]},view="home";
 const get=async()=>{const d=await API.get("quality/inspections");items=d.items||[];if(!isStaff&&!isAdmin){const t=await API.get("quality/templates");templates=t.templates||[];const sc=await API.get("quality/schedules");schedules=sc.schedules||[];try{leader=await API.get("quality/team-leader");}catch(_){leader=null;}try{options=await API.get("supervisor/records/options");}catch(_){options={operations:[],locations:[],zones:[]};}}};
 const button=(label,fn,cls="sr-secondary")=>{const b=el("button",cls,label);b.type="button";b.onclick=fn;return b;};
 const panel=(title,desc)=>{const p=el("section","sr-panel");p.append(el("div","sr-panel-heading"),);p.firstChild.append(el("div","",title),el("p","",desc||""));return p;};
 const field=(label,name,type="text",required=false)=>'<label class="sr-field"><span>'+label+'</span><input name="'+name+'" type="'+type+'" '+(required?"required":"")+'></label>';
 const select=(label,name,rows,placeholder="Not specified")=>'<label class="sr-field"><span>'+label+'</span><select name="'+name+'"><option value="">'+placeholder+'</option>'+rows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||x.title)+'</option>').join("")+'</select></label>';
 const back=()=>{view="home";draw();};
 function home(){
  const grid=el("div","sr-directory-grid");
  const cards=isStaff?[["assigned","Assigned inspections","Your scheduled checks and returned inspections"],["history","Submission history","Your submitted inspection records"]]:isAdmin?[["reports","Forwarded reports","Inspection reports sent by Supervisors"]]:[["schedule","Schedule inspection","Create a one-time or recurring inspection"],["templates","Inspection templates","Create and maintain reusable checklists"],["schedules","Inspection schedules","Review, pause or cancel recurring schedules"],["directory","Inspection directory","Track planned, active and completed inspections"],["review","Review queue","Review Team Leader submissions"],["history","Inspection history","Completed and reviewed inspections"],["failed","Failed inspections","Review quality failures"],["analytics","Quality overview","Analytics calculated from recorded inspections"]];
  cards.forEach(([key,title,desc])=>{const count=key==="review"?items.filter(x=>x.status==="submitted").length:key==="assigned"?items.filter(x=>["scheduled","in_progress","returned"].includes(x.status)).length:key==="reports"?items.filter(x=>x.status==="forwarded").length:key==="failed"?items.filter(x=>x.outcome==="fail").length:undefined;const b=el("button","sr-directory-card");b.type="button";b.append(el("span","sr-card-icon","◉"));const copy=el("span","sr-card-copy");copy.append(el("strong","",title),el("small","",desc));b.append(copy);if(count!==undefined)b.append(el("span","sr-card-count",String(count)));b.onclick=()=>{view=key;draw();};grid.append(b);});
  body.replaceChildren(grid);
  const stats=el("div","sr-metric-grid");
  const due=items.filter(x=>["scheduled","in_progress","returned"].includes(x.status)).length;
  [[isStaff?"Assigned":"Total inspections",items.length],["Awaiting review",items.filter(x=>x.status==="submitted").length],["Approved",items.filter(x=>["approved","forwarded","admin_acknowledged"].includes(x.status)).length],["Overdue",items.filter(x=>["scheduled","in_progress","returned"].includes(x.status)&&new Date(x.scheduled_at)<new Date()).length]].forEach(([k,v])=>{const m=el("div","sr-metric");m.append(el("span","",k),el("strong","",String(v)));stats.append(m);});
  body.append(stats);
 }
 function top(title,desc){const wrap=el("div","sr-workspace");const head=el("div","sr-workspace-top");head.append(button("← Back",back,"sr-back"),el("h2","",title),el("p","",desc));wrap.append(head);return wrap;}
 function list(key){
  let rows=[...items];
  if(key==="assigned")rows=rows.filter(x=>["scheduled","in_progress","returned"].includes(x.status));
  if(key==="history")rows=rows.filter(x=>isStaff?["submitted","approved","forwarded","admin_acknowledged","admin_returned"].includes(x.status):["approved","forwarded","admin_acknowledged","admin_returned","legacy_completed"].includes(x.status));
  if(key==="review")rows=rows.filter(x=>x.status==="submitted");
  if(key==="reports")rows=rows.filter(x=>x.status==="forwarded");
  if(key==="failed")rows=rows.filter(x=>x.outcome==="fail");
  if(key==="directory")rows=rows.filter(x=>x.status!=="admin_acknowledged");
  const wrap=top(({assigned:"Assigned inspections",history:"Inspection history",review:"Supervisor review queue",reports:"Forwarded inspection reports",failed:"Failed inspections",directory:"Inspection directory"}[key]||"Inspections"),"Select an inspection to view its checklist, schedule and review status.");
  const search=document.createElement("input");search.type="search";search.placeholder="Search by title, location or inspector";search.className="sr-control";wrap.append(search);
  const list=el("div","sr-records");wrap.append(list);
  const paint=()=>{const q=search.value.toLowerCase();list.replaceChildren();const shown=rows.filter(x=>[x.title,x.location_name,x.zone_name,x.assigned_to,x.status].join(" ").toLowerCase().includes(q));if(!shown.length){list.append(el("p","sr-empty","No inspections found."));return;}shown.forEach(x=>{const card=el("article","sr-record");const head=el("div","sr-record-top");head.append(el("h3","",x.title),el("span","sr-badge "+x.status,x.status.replaceAll("_"," ")));card.append(head,el("p","sr-meta",[x.location_name,x.zone_name,"Assigned to "+(x.assigned_to||"—"),fmt(x.scheduled_at)].filter(Boolean).join(" · ")),el("p","sr-meta","Outcome: "+(x.outcome||"Pending")+" · Score: "+(x.score==null?"—":x.score+"%")));card.append(button("Open inspection",()=>detail(x)));list.append(card);});};
  search.oninput=paint;paint();body.replaceChildren(wrap);
 }
 function detail(x){
  const currentUser=window.CleanTrackAuth?.getCurrentUser?.();
  const canConduct=isStaff||(!isAdmin&&String(x.assigned_to_id)===String(currentUser?.id));
  const wrap=top(x.title,"Scheduled "+fmt(x.scheduled_at)+" · "+(x.location_name||"No location")+(x.zone_name?" / "+x.zone_name:""));
  const p=panel("Inspection details","Checklist and recorded findings. No evidence attachments are required.");
  const meta=el("p","sr-meta","Assigned to: "+(x.assigned_to||"—")+" · Created by: "+(x.created_by||"—")+" · Status: "+x.status);p.append(meta);
  const form=el("form","sr-form");
  const checks=el("div","sr-checklist");
  (x.checklist||[]).forEach((v,i)=>{const label=el("label","sr-check");const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!v.checked;cb.dataset.i=i;cb.disabled=!canConduct||!["scheduled","in_progress","returned"].includes(x.status);label.append(cb,el("span","",v.label));checks.append(label);});
  p.append(checks);
  const findings=el("textarea","sr-control");findings.name="findings";findings.rows=4;findings.maxLength=4000;findings.placeholder="Inspection findings, observations or corrective action";findings.value=x.findings||"";
  const findingLabel=el("label","sr-field");findingLabel.append(el("span","","Findings / corrective action"),findings);p.append(findingLabel);
  if(canConduct && ["scheduled","in_progress","returned"].includes(x.status)){
   const submit=button("Submit inspection to Supervisor",async()=>{const checklist=(x.checklist||[]).map((v,i)=>({checked:!!checks.querySelector('[data-i="'+i+'"]').checked}));submit.disabled=true;try{await API.patch("quality/inspections/"+x.id+"/submit",{checklist,findings:findings.value});say("Inspection submitted to your Supervisor.");await reload("assigned");}catch(e){say(e.message,true);submit.disabled=false;} },"sr-primary");p.append(submit);
  }
  if(!isStaff&&!isAdmin&&x.status==="submitted"){
   const actions=el("div","sr-actions");actions.append(button("Return for correction",async()=>{const notes=prompt("Explain what needs correction:");if(!notes)return;try{await API.patch("quality/inspections/"+x.id+"/review",{action:"return",notes});say("Inspection returned to Team Leader.");await reload("review");}catch(e){say(e.message,true);}}),button("Approve inspection",async()=>{if(!confirm("Approve this inspection?"))return;try{await API.patch("quality/inspections/"+x.id+"/review",{action:"approve",notes:findings.value});say("Inspection approved.");await reload("review");}catch(e){say(e.message,true);}},"sr-primary"));p.append(actions);
  }
  if(!isStaff&&!isAdmin&&x.status==="approved")p.append(button("Forward approved report to Admin",async()=>{try{await API.request("quality/inspections/"+x.id+"/forward",{method:"POST",body:{}});say("Inspection report forwarded to Admin.");await reload("directory");}catch(e){say(e.message,true);}},"sr-primary"));
  if(!isStaff&&!isAdmin&&x.status==="admin_returned")p.append(button("Resubmit updated report to Admin",async()=>{const notes=prompt("Add an update for Admin:",x.admin_notes||"");if(notes===null)return;try{await API.post("quality/inspections/"+x.id+"/resend-admin",{notes});say("Updated report resubmitted to Admin.");await reload("directory");}catch(e){say(e.message,true);}},"sr-primary"));
  if(isAdmin&&x.status==="forwarded"){
   const note=el("textarea","sr-control");note.rows=3;note.placeholder="Admin note (required when returning)";p.append(note,button("Return to Supervisor",async()=>{if(!note.value.trim()){say("Add a reason before returning.",true);return;}try{await API.patch("quality/inspections/"+x.id+"/admin-review",{action:"return",notes:note.value});say("Report returned to Supervisor.");await reload("reports");}catch(e){say(e.message,true);}}),button("Acknowledge report",async()=>{try{await API.patch("quality/inspections/"+x.id+"/admin-review",{action:"acknowledge",notes:note.value});say("Report acknowledged.");await reload("reports");}catch(e){say(e.message,true);}},"sr-primary"));
  }
  wrap.append(p);body.replaceChildren(wrap);
 }
 async function schedule(){
  const wrap=top("Schedule an inspection","Choose a reusable template or build a concise checklist from scratch.");
  const p=panel("Inspection setup","Each scheduled occurrence becomes its own inspection record.");
  const form=el("form","sr-form");
  const templateRows=templates.filter(t=>!t.is_archived).map(t=>({id:t.id,name:t.name}));
  form.innerHTML='<div class="sr-two">'+select("Start from template (optional)","template_id",templateRows,"Create from scratch") +field("Inspection title","title","text",true)+'</div>'+
   '<div class="sr-two">'+select("Location","location_id",options.locations)+select("Zone","zone_id",options.zones)+'</div>'+
   select("Related operation","operation_id",options.operations)+
   '<div class="sr-two">'+field("Scheduled date and time","scheduled_at","datetime-local",true)+
   '<label class="sr-field"><span>Inspector</span><select name="assigned_to_id"><option value="">Supervisor (myself)</option>'+(leader?.team_leader?'<option value="'+leader.team_leader.id+'">'+esc(leader.team_leader.name)+' · Team Leader</option>':"")+'</select></label></div>'+
   '<div class="sr-two"><label class="sr-field"><span>Repeat</span><select name="recurrence"><option value="once">One time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label class="sr-field"><span>Time zone</span><select name="timezone"><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="UTC">UTC</option></select></label></div>'+
   '<div class="sr-recurrence-options" hidden><label class="sr-field"><span>Weekly days (Mon–Sun)</span><div class="sr-checklist">'+["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d,i)=>'<label class="sr-check"><input type="checkbox" name="recurrence_days" value="'+i+'">'+d+'</label>').join("")+'</div></label><label class="sr-field"><span>Monthly day (1–31)</span><input name="recurrence_day" type="number" min="1" max="31"></label></div>'+
   '<label class="sr-field sr-custom-checklist"><span>Checklist items (one per line)</span><textarea name="checklist" rows="5" placeholder="Check condition&#10;Verify required standard&#10;Confirm area is safe"></textarea></label><button class="sr-primary">Create inspection schedule</button>';
  const rec=form.elements.recurrence,recBox=form.querySelector(".sr-recurrence-options"),custom=form.querySelector(".sr-custom-checklist");
  rec.onchange=()=>{recBox.hidden=rec.value==="once";};
  const templateSelect=form.elements.template_id,titleInput=form.elements.title,checkInput=form.elements.checklist;
  templateSelect.onchange=()=>{const t=templates.find(v=>String(v.id)===templateSelect.value);if(t){titleInput.value=t.name;checkInput.value=(t.checklist||[]).map(v=>v.label).join("\n");custom.hidden=true;}else{custom.hidden=false;titleInput.value="";checkInput.value="";}};
  form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const data={template_id:fd.get("template_id")||null,title:fd.get("title"),location_id:fd.get("location_id")||null,zone_id:fd.get("zone_id")||null,operation_id:fd.get("operation_id")||null,scheduled_at:fd.get("scheduled_at"),assigned_to_id:fd.get("assigned_to_id")||null,recurrence:fd.get("recurrence"),timezone:fd.get("timezone"),recurrence_days:fd.getAll("recurrence_days").map(Number),recurrence_day:fd.get("recurrence_day")?Number(fd.get("recurrence_day")):null,checklist:String(fd.get("checklist")||"").split("\n").map(s=>s.trim()).filter(Boolean)};try{await API.post("quality/schedules",data);say("Inspection scheduled and the inspector has been notified.");await reload("directory");}catch(err){say(err.message,true);}};
  p.append(form);wrap.append(p);body.replaceChildren(wrap);
 }
 async function scheduleList(){
  const wrap=top("Inspection schedules","Manage one-time and recurring inspection schedules. Pausing a schedule prevents future occurrences; existing records remain in history.");
  const list=el("div","sr-records");
  if(!schedules.length)list.append(el("p","sr-empty","No inspection schedules have been created yet."));
  schedules.forEach(s=>{const card=el("article","sr-record");card.append(el("div","sr-record-top"),el("h3","",s.title),el("p","sr-meta",(s.recurrence==="once"?"One time":s.recurrence)+" · "+fmt(s.first_due_at)+" · Inspector: "+(s.assigned_to||"—")),el("span","sr-badge "+(s.active?"approved":"closed"),s.active?"Active":"Paused"));const actions=el("div","sr-actions");
   const dateInput=el("input","sr-control");dateInput.type="datetime-local";const parsed=new Date(s.first_due_at);if(!Number.isNaN(parsed.getTime()))dateInput.value=new Date(parsed.getTime()-parsed.getTimezoneOffset()*60000).toISOString().slice(0,16);
   actions.append(dateInput,button("Reschedule",async()=>{if(!dateInput.value){say("Choose a new date and time.",true);return;}try{await API.patch("quality/schedules/"+s.id,{scheduled_at:dateInput.value});await get();scheduleList();say("Inspection schedule rescheduled.");}catch(e){say(e.message,true);}}));
   actions.append(button(s.active?"Pause schedule":"Resume schedule",async()=>{try{await API.patch("quality/schedules/"+s.id,{active:!s.active});await get();scheduleList();say("Schedule updated.");}catch(e){say(e.message,true);}}));
   card.append(actions);list.append(card);});
  wrap.append(list);body.replaceChildren(wrap);
 }
 async function templatePage(){
  const wrap=top("Inspection templates","Keep reusable checklists organised by category. Editing a template does not change inspections already scheduled.");
  const p=panel("Create template","Use a short name, one category and a focused checklist.");
  const form=el("form","sr-form");form.innerHTML=field("Template name","name","text",true)+'<div class="sr-two"><label class="sr-field"><span>Category</span><select name="category"><option value="general">General</option><option value="cleaning">Cleaning</option><option value="safety">Safety</option><option value="maintenance">Maintenance</option></select></label>'+field("Description","description")+'</div><label class="sr-field"><span>Checklist items (one per line)</span><textarea name="checklist" rows="5" required></textarea></label><button class="sr-primary">Save template</button>';
  form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);try{await API.post("quality/templates",{name:fd.get("name"),category:fd.get("category"),description:fd.get("description"),checklist:String(fd.get("checklist")).split("\n").map(s=>s.trim()).filter(Boolean)});say("Template saved.");await get();templatePage();}catch(err){say(err.message,true);}};
  p.append(form);wrap.append(p);
  const list=el("div","sr-records");templates.forEach(t=>{const card=el("article","sr-record");card.append(el("div","sr-record-top"),el("h3","",t.name),el("p","sr-meta",t.category+" · "+(t.checklist||[]).length+" checklist items"),el("p","sr-record-copy",t.description));card.firstChild.append(el("strong","",t.is_archived?"Archived":"Active"));const actions=el("div","sr-actions");
   actions.append(button("Edit",async()=>{const name=prompt("Template name:",t.name);if(name===null)return;const raw=prompt("Checklist items, one per line:",(t.checklist||[]).map(v=>v.label).join("\\n"));if(raw===null)return;try{await API.patch("quality/templates/"+t.id,{name,checklist:raw.split("\\n").map(v=>v.trim()).filter(Boolean)});await get();templatePage();say("Template updated.");}catch(e){say(e.message,true);}}));
   actions.append(button("Duplicate",async()=>{const name=prompt("Name for the duplicate:",t.name+" copy");if(!name)return;try{await API.post("quality/templates",{name,category:t.category,description:t.description,checklist:(t.checklist||[]).map(v=>v.label)});await get();templatePage();say("Template duplicated.");}catch(e){say(e.message,true);}}));
   actions.append(button(t.is_archived?"Restore template":"Archive template",async()=>{try{await API.patch("quality/templates/"+t.id,{is_archived:!t.is_archived});await get();templatePage();}catch(e){say(e.message,true);}}));
   card.append(actions);list.append(card);});wrap.append(list);body.replaceChildren(wrap);
 }
 async function analytics(){
  const data=await API.get("quality/analytics");const wrap=top("Quality overview","All values below are calculated from saved inspection records.");
  const grid=el("div","sr-metric-grid");
  [["Total inspections",data.total],["Completed",data.completed],["Pending",data.pending],["Overdue",data.overdue],["Passed",data.passed],["Failed",data.failed],["Pass rate",data.pass_rate==null?"—":data.pass_rate+"%"],["Average score",data.average_score==null?"—":data.average_score+"%"]].forEach(([k,v])=>{const m=el("div","sr-metric");m.append(el("span","",k),el("strong","",String(v??0)));grid.append(m);});
  wrap.append(grid);const failures=panel("Repeated checklist failures","Checklist items that have failed at least twice in recorded inspections.");if(!(data.repeated_failures||[]).length)failures.append(el("p","sr-empty","No repeated checklist failures recorded yet."));else data.repeated_failures.forEach(f=>failures.append(el("p","sr-meta",f.checklist_item+" · "+f.failures+" failures")));wrap.append(failures);body.replaceChildren(wrap);
 }
 async function reload(next){await get();view=next;draw();}
 async function draw(){try{if(view==="home")return home();if(view==="schedule")return schedule();if(view==="templates")return templatePage();if(view==="schedules")return scheduleList();if(view==="analytics")return await analytics();if(view==="detail")return;return list(view);}catch(e){say(e.message||"Could not load inspection records.",true);}}
 page.querySelector(".sr-refresh").onclick=async()=>{try{await reload(view);}catch(e){say(e.message,true);}};
 await get();draw();
}
window.MechnarQualityInspections={render};
})();