(function(){
"use strict";
const API=window.CleanTrackApi,AUTH=window.CleanTrackAuth,PREF=window.CleanTrackPreferences;
const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n;};
const BTN=(text,cls,fn)=>{const b=$("button","ct-reports-btn "+(cls||""),text);b.type="button";b.addEventListener("click",fn);return b;};
const FIELD=(label,control)=>{const w=$("label","ct-reports-field");w.append($("span","",label),control);return w;};
const INPUT=(type,value)=>{const n=$("input","ct-reports-input");n.type=type;if(value!==undefined)n.value=value;return n;};
const SELECT=(items)=>{const n=$("select","ct-reports-input");items.forEach(([v,l])=>{const o=$("option","",l);o.value=v;n.appendChild(o);});return n;};
const TYPES=[["operations","Operations / tasks"],["logs","Operation logs"],["staff","Staff directory"],["teams","Teams"],["locations","Locations"],["zones","Zones"],["performance","Performance"],["approvals","Approvals and rejections"]];
const TYPE_HINTS={operations:"Tasks, assignments, priorities, due dates and completion state.",logs:"Recorded changes to operations, including status transitions and review notes.",staff:"Organization staff directory, account status and team memberships.",teams:"Team status, membership counts and linked locations.",locations:"Locations, assigned teams and available site details.",zones:"Zones, parent locations, assigned teams and supervisors.",performance:"Task-level performance records for the selected period; use Analytics for comparisons and rankings.",approvals:"Operations with recorded review outcomes and submission/review timestamps."};
const escText=v=>v===null||v===undefined||v===""?"—":String(v);
function dateStr(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function defaultDates(days){const e=new Date(),s=new Date(e);s.setDate(s.getDate()-(Math.max(1,Number(days)||30)-1));return[dateStr(s),dateStr(e)];}
function render(container){
 container.replaceChildren();
 const user=AUTH?.getCurrentUser?.();
 if(String(user?.role||"").toLowerCase()==="supervisor"){renderSupervisor(container);return;}
 if(!user||String(user.role||"").toLowerCase()!=="admin"){container.appendChild($("p","ct-reports-muted","Custom Reports are available to organization Admins only."));return;}
 const root=$("section","ct-reports");
 const hero=$("header","ct-reports-hero"),heroText=$("div","");
 heroText.append($("p","ct-reports-eyebrow","OPERATIONAL DATA · CUSTOM EXPORTS"),$("h2","","Reports"),$("p","","Build a report from the organization records you’re permitted to access. Choose the data, refine the filters, inspect the preview, then generate a file you can download or share through an approved workflow."));
 hero.append(heroText,$("div","ct-reports-hero-mark","▤"));root.appendChild(hero);
 const steps=$("div","ct-reports-steps");["Select data","Filter","Preview","Generate","History"].forEach((label,i)=>{const s=$("div","ct-reports-step"+(i===0?" is-current":""));s.dataset.step=String(i);s.append($("b","",String(i+1)),$("span","",label));steps.appendChild(s);});root.appendChild(steps);
 const message=$("div","ct-reports-alert ct-reports-hidden");message.setAttribute("role","status");message.setAttribute("aria-live","polite");root.appendChild(message);
 const builder=$("section","ct-reports-panel"),head=$("div","ct-reports-panel-head");head.append($("div","",null));head.firstChild.append($("h3","","Build a custom report"),$("p","ct-reports-muted","Filters update the preview. Data is loaded from CleanTrack, not sample records."));builder.appendChild(head);
 const reportPrefs=PREF?.get?.().reports||{};const dateFormat=reportPrefs.dateFormat||"iso";const dates=defaultDates(reportPrefs.dateRange||30),name=INPUT("text","");name.maxLength=180;name.placeholder="e.g. September 2026 — Team Performance Report";
 const type=SELECT(TYPES);const format=SELECT([["pdf","PDF · ready to share"],["csv","CSV · raw data"],["xlsx","XLSX · Excel workbook"]]);if(["pdf","csv","xlsx"].includes(reportPrefs.exportFormat))format.value=reportPrefs.exportFormat;
 const from=INPUT("date",dates[0]),to=INPUT("date",dates[1]);
 const team=SELECT([["","All teams"]]),supervisor=SELECT([["","All supervisors"]]),employee=SELECT([["","All employees"]]),location=SELECT([["","All locations"]]),zone=SELECT([["","All zones"]]),status=SELECT([["","All statuses"]]),opType=SELECT([["","All operation types"]]);
 const hint=$("p","ct-reports-muted",TYPE_HINTS[type.value]);hint.style.marginTop="14px";
 const grid=$("div","ct-reports-grid");
 grid.append(FIELD("Report name",name),FIELD("Data to include",type),FIELD("Export format",format),FIELD("From date",from),FIELD("To date",to),FIELD("Team",team),FIELD("Supervisor",supervisor),FIELD("Employee",employee),FIELD("Location",location),FIELD("Zone",zone),FIELD("Status",status),FIELD("Operation type",opType));
 builder.append(grid,hint);
 const actions=$("div","ct-reports-actions"),previewBtn=BTN("Preview report","primary",()=>preview()),generateBtn=BTN("Generate report","",()=>generate());generateBtn.disabled=true;actions.append(previewBtn,generateBtn);builder.appendChild(actions);root.appendChild(builder);
 const previewPanel=$("section","ct-reports-panel ct-reports-hidden"),previewHead=$("div","ct-reports-panel-head");previewHead.append($("div","",null));previewHead.firstChild.append($("h3","","Report preview"),$("p","ct-reports-muted","Review the returned rows before generating the file."));previewPanel.appendChild(previewHead);
 const kpis=$("div","ct-reports-kpis");previewPanel.appendChild(kpis);const tableWrap=$("div","ct-reports-table-wrap");previewPanel.appendChild(tableWrap);root.appendChild(previewPanel);
 const historyPanel=$("section","ct-reports-panel"),historyHead=$("div","ct-reports-panel-head");historyHead.append($("div","",null));historyHead.firstChild.append($("h3","","Report history"),$("p","ct-reports-muted","Previously generated files are private to your organization and expire after 30 days."));const refreshHistory=BTN("Refresh history","quiet",()=>loadHistory());historyHead.appendChild(refreshHistory);historyPanel.appendChild(historyHead);
 const storageLabel=$("p","ct-reports-muted","Checking organization storage…"),storageBar=$("div","ct-reports-storage"),storageFill=$("span","");storageBar.appendChild(storageFill);historyPanel.append(storageLabel,storageBar);
 const historyList=$("div","");historyPanel.appendChild(historyList);root.appendChild(historyPanel);container.appendChild(root);
 let latestPreview=null,options=null;
 function say(text,typeName){message.textContent=text;message.className="ct-reports-alert"+(typeName?" "+typeName:"");}
 function setStep(n){steps.querySelectorAll(".ct-reports-step").forEach((x,i)=>x.classList.toggle("is-current",i===n));}
 function opts(sel,items,label){const prev=sel.value;sel.replaceChildren();sel.appendChild(new Option(label,""));items.forEach(x=>sel.appendChild(new Option(x.name,String(x.id))));if(items.some(x=>String(x.id)===prev))sel.value=prev;}
 function syncConditional(){
 const kind=type.value;
 const enabled={team:["operations","logs","staff","teams","locations","zones","performance","approvals"].includes(kind),
 supervisor:["operations","performance","approvals"].includes(kind),
 employee:["operations","logs","staff","performance","approvals"].includes(kind),
 location:["operations","logs","locations","zones","performance","approvals"].includes(kind),
 zone:["operations","logs","zones","performance","approvals"].includes(kind),
 status:["operations","logs","staff","teams","locations","zones","performance","approvals"].includes(kind),
 opType:["operations","performance","approvals"].includes(kind)};
 [[team,enabled.team],[supervisor,enabled.supervisor],[employee,enabled.employee],[location,enabled.location],[zone,enabled.zone],[status,enabled.status],[opType,enabled.opType]].forEach(([el,on])=>el.disabled=!on);
 const statuses=kind==="staff"?[["active","Active"],["pending","Pending"],["suspended","Suspended"],["inactive","Inactive"]]:
 kind==="teams"||kind==="locations"||kind==="zones"?[["active","Active"],["inactive","Inactive"],["archived","Archived"]]:
 [["pending","Pending"],["in progress","In progress"],["submitted","Submitted"],["completed","Completed"],["approved","Approved"],["rejected","Rejected"],["cancelled","Cancelled"],["overdue","Overdue"]];
 const current=status.value;status.replaceChildren(new Option("All statuses",""));statuses.forEach(([v,l])=>status.appendChild(new Option(l,v)));status.value=statuses.some(([v])=>v===current)?current:"";
 hint.textContent=TYPE_HINTS[kind];latestPreview=null;generateBtn.disabled=true;previewPanel.classList.add("ct-reports-hidden");
}
 async function loadOptions(){options=await API.get("reports/options");opts(team,options.teams,"All teams");opts(supervisor,options.staff.filter(x=>String(x.role).toLowerCase()==="supervisor"),"All supervisors");opts(employee,options.staff.filter(x=>String(x.role).toLowerCase()!=="admin"),"All employees");opts(location,options.locations,"All locations");opts(zone,options.zones,"All zones");opts(opType,options.operation_types||[],"All operation types");}
 function payload(){return {name:name.value.trim(),report_type:type.value,format:format.value,start_date:from.value,end_date:to.value,team_id:team.value||null,supervisor_id:supervisor.value||null,employee_id:employee.value||null,location_id:location.value||null,zone_id:zone.value||null,status:status.value||null,operation_type:opType.value||null,date_format:dateFormat};}
 function renderTable(data){tableWrap.replaceChildren();if(!data.headers?.length){tableWrap.appendChild($("p","ct-reports-empty","No columns are available for this report."));return;}const table=$("table","ct-reports-table"),thead=$("thead",""),hr=$("tr","");data.headers.forEach(h=>hr.appendChild($("th","",h)));thead.appendChild(hr);table.appendChild(thead);const body=$("tbody","");(data.rows||[]).forEach(row=>{const tr=$("tr","");row.forEach(v=>tr.appendChild($("td","",escText(v))));body.appendChild(tr);});table.appendChild(body);tableWrap.appendChild(table);if(!data.rows?.length)tableWrap.appendChild($("p","ct-reports-empty","No records match the selected filters."));}
 async function preview(){try{if(!from.value||!to.value)throw Error("Choose both dates.");if(!name.value.trim())throw Error("Enter a report name before previewing.");if(from.value>to.value)throw Error("The start date must be before the end date.");previewBtn.disabled=true;previewBtn.textContent="Loading preview…";const data=await API.post("reports/preview",payload());latestPreview=payload();generateBtn.disabled=false;previewPanel.classList.remove("ct-reports-hidden");kpis.replaceChildren();[[ "Matching records",data.row_count],[ "Date range",data.start_date+" → "+data.end_date],["Preview rows",Math.min(100,data.row_count)+(data.preview_truncated?"+":"")]].forEach(([l,v])=>{const k=$("div","ct-reports-kpi");k.append($("span","",l),$("strong","",v));kpis.appendChild(k);});renderTable(data);setStep(2);say("Preview ready. Check the rows and generate the report when you’re satisfied.","success");}catch(e){say(e.message||"Could not preview the report.","error");}finally{previewBtn.disabled=false;previewBtn.textContent="Preview report";}}
 async function generate(){try{if(!latestPreview||JSON.stringify(latestPreview)!==JSON.stringify(payload())){throw Error("Filters changed. Preview the report again before generating it.");}generateBtn.disabled=true;generateBtn.textContent="Generating…";const result=await API.post("reports/generate",payload());setStep(3);say("Report generated and saved to your private history ("+result.row_count+" records).","success");await loadHistory();const entry=historyList.querySelector('[data-report-id="'+result.report.id+'"]');if(entry)entry.scrollIntoView({block:"nearest",behavior:"smooth"});setStep(4);}catch(e){say(e.message||"Report generation failed.","error");}finally{generateBtn.disabled=!latestPreview;generateBtn.textContent="Generate report";}}
 async function download(id){try{const cfg=window.CleanTrackConfig;const token=AUTH?.getAuthToken?.()||sessionStorage.getItem("cleantrack_token");const response=await fetch(cfg.apiBaseUrl.replace(/\/$/,"")+"/reports/"+encodeURIComponent(id)+"/download",{headers:token?{Authorization:"Bearer "+token}:{},credentials:"include",cache:"no-store"});if(!response.ok){let m="Download failed.";try{m=(await response.json()).error||m;}catch(_){}throw Error(m);}const blob=await response.blob(),url=URL.createObjectURL(blob),a=$("a","");a.href=url;a.download="cleantrack-report";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);say("Download started.","success");await loadHistory();}catch(e){say(e.message||"Download failed.","error");}}
 async function share(id,method,reportName){
  const title=String(reportName||"CleanTrack report").trim()||"CleanTrack report";
  const body="Please find the report titled \""+title+"\". For privacy, download it from CleanTrack and attach the file before sending.";
  try{
   if(method==="email"){
    window.location.href="mailto:?subject="+encodeURIComponent("CleanTrack report: "+title)+"&body="+encodeURIComponent(body);
    say("Email draft opened. Download the report and attach the downloaded file before sending.","success");
    return;
   }
   if(method==="whatsapp"){
    const url="https://wa.me/?text="+encodeURIComponent(body+" Download the report from CleanTrack and attach the file here.");
    const opened=window.open(url,"_blank","noopener,noreferrer");
    if(!opened) window.location.href=url;
    say("WhatsApp opened with a message draft. Download the report and attach the file in WhatsApp.","success");
    return;
   }
   throw Error("Unsupported sharing method.");
  }catch(e){say(e.message||"Could not open the sharing app.","error");}
 }
 async function loadHistory(){try{const data=await API.get("reports/history");historyList.replaceChildren();const used=Number(data.storage_used_bytes||0),quota=Number(data.storage_quota_bytes||1),pct=Math.min(100,Math.round(used/quota*100));storageLabel.textContent="Private report storage · "+(used/1048576).toFixed(2)+" MB of "+(quota/1048576).toFixed(0)+" MB used · "+data.retention_days+"-day retention";storageFill.style.width=pct+"%";if(!data.reports?.length){historyList.appendChild($("p","ct-reports-empty","No reports generated yet. Your generated reports will appear here."));return;}data.reports.forEach(r=>{const item=$("article","ct-reports-history-item");item.dataset.reportId=String(r.id);const details=$("div","");details.append($("strong","",r.name));const meta=$("div","ct-reports-history-meta");meta.append($("span","ct-reports-badge",r.file_format),document.createTextNode("  "+r.report_type+" · "+(r.file_size/1024).toFixed(1)+" KB"),$("br",""),document.createTextNode("Generated "+new Date(r.created_at).toLocaleString()+" · Expires "+new Date(r.expires_at).toLocaleDateString()),$("br",""),document.createTextNode("Filters: "+[r.filters?.start_date,r.filters?.end_date,r.filters?.team_id?"team "+r.filters.team_id:"",r.filters?.location_id?"location "+r.filters.location_id:"",r.filters?.zone_id?"zone "+r.filters.zone_id:""].filter(Boolean).join(" · ")));details.appendChild(meta);const btns=$("div","ct-reports-history-actions");btns.append(BTN("Download","primary",()=>download(r.id)),BTN("Email","",()=>share(r.id,"email",r.name)),BTN("WhatsApp","",()=>share(r.id,"whatsapp",r.name)));item.append(details,btns);historyList.appendChild(item);});}catch(e){historyList.replaceChildren($("p","ct-reports-empty","Could not load report history: "+(e.message||"try again")));}}
 [type,team,supervisor,employee,location,zone,status,opType,from,to,name,format].forEach(x=>x.addEventListener("change",syncConditional));name.addEventListener("input",()=>{latestPreview=null;generateBtn.disabled=true;});format.addEventListener("change",()=>{latestPreview=null;generateBtn.disabled=true;});[team,supervisor,employee,location,zone,status,opType,from,to].forEach(x=>x.addEventListener("change",()=>{latestPreview=null;generateBtn.disabled=true;}));type.addEventListener("change",()=>{syncConditional();if(options){opts(opType,options.operation_types||[], "All operation types");}});syncConditional();loadOptions().catch(e=>say(e.message||"Could not load report filters.","error"));loadHistory(); 
}


async function renderSupervisor(container){
 const root=$("section","ct-reports ct-sup-reports");
 const header=$("header","ct-sup-reports-head");
 const intro=$("div","ct-sup-reports-intro");
 intro.append($("p","ct-reports-eyebrow","TEAM OPERATIONS · REPORTING"),$("h1","","Reports"),
  $("p","ct-reports-muted","Create accurate, team-scoped reports from your operational records."));
 const teamBadge=$("div","ct-sup-team-badge");teamBadge.append($("span","","TEAM"),$("strong","","Loading team…"));
 header.append(intro,teamBadge);root.append(header);
 const alert=$("div","ct-reports-alert ct-reports-hidden");alert.setAttribute("role","status");alert.setAttribute("aria-live","polite");root.append(alert);
 const steps=$("nav","ct-sup-report-steps");
 [["1","Select"],["2","Filter"],["3","Preview"],["4","Generate"]].forEach(([n,label],i)=>{const item=$("div","ct-sup-step"+(i===0?" active":""));item.dataset.step=String(i);item.append($("b","",n),$("span","",label));steps.append(item);});root.append(steps);
 const builder=$("section","ct-reports-panel ct-sup-builder");
 const builderHead=$("div","ct-sup-section-head");builderHead.append($("div","",null));builderHead.firstChild.append($("h2","","Create a report"),$("p","ct-reports-muted","Choose the records and reporting period. Only your active team’s data is available."));
 const grid=$("div","ct-sup-report-grid");
 const name=INPUT("text","");name.placeholder="e.g. Weekly operations review";name.maxLength=180;
 const type=SELECT([["operations","Operations"],["reviews","Completion & reviews"],["personnel","Personnel"],["performance","Team performance"],["locations","Locations"],["zones","Zones"]]);
 const format=SELECT([["pdf","PDF"],["xlsx","Excel workbook"],["csv","CSV"]]);
 const dates=defaultDates(30),from=INPUT("date",dates[0]),to=INPUT("date",dates[1]);
 const employee=SELECT([["","All personnel"]]),location=SELECT([["","All locations"]]),zone=SELECT([["","All zones"]]),status=SELECT([["","All statuses"]]),opType=SELECT([["","All operation types"]]);
 const filterFields={employee:FIELD("Personnel",employee),location:FIELD("Location",location),zone:FIELD("Zone",zone),status:FIELD("Status",status),opType:FIELD("Operation type",opType)};
 grid.append(FIELD("Report name",name),FIELD("Report type",type),FIELD("File format",format),FIELD("From",from),FIELD("To",to),
  filterFields.employee,filterFields.location,filterFields.zone,filterFields.status,filterFields.opType);
 builder.append(builderHead,grid);
 const filterHint=$("p","ct-reports-muted ct-sup-report-hint","Select a report type to see the relevant filters.");builder.append(filterHint);
 const actions=$("div","ct-reports-actions"),previewBtn=BTN("Preview report","primary",preview),generateBtn=BTN("Generate report","",generate);generateBtn.disabled=true;actions.append(previewBtn,generateBtn);builder.append(actions);root.append(builder);
 const previewPanel=$("section","ct-reports-panel ct-sup-preview ct-reports-hidden");
 const previewHead=$("div","ct-sup-section-head");previewHead.append($("div","",null));previewHead.firstChild.append($("h2","","Preview"),$("p","ct-reports-muted","Review the returned records before generating the file."));previewPanel.append(previewHead);
 const previewSummary=$("div","ct-sup-preview-summary"),tableWrap=$("div","ct-reports-table-wrap");previewPanel.append(previewSummary,tableWrap);root.append(previewPanel);
 const history=$("section","ct-reports-panel ct-sup-history"),historyHead=$("div","ct-sup-section-head");historyHead.append($("div","",null));historyHead.firstChild.append($("h2","","Report history"),$("p","ct-reports-muted","Reports generated by your account, with secure downloads and team sharing."));
 const refresh=BTN("↻ Refresh","quiet",loadHistory);historyHead.append(refresh);const historyList=$("div","ct-sup-history-list");history.append(historyHead,historyList);root.append(history);
 container.append(root);
 let options=null,latest=null,latestPayload=null;
 const reportLabels={operations:"Operations",reviews:"Completion & reviews",personnel:"Personnel",performance:"Team performance",locations:"Locations",zones:"Zones"};
 function notify(message,bad=false){alert.textContent=message;alert.className="ct-reports-alert "+(bad?"error":"success");}
 function step(n){steps.querySelectorAll(".ct-sup-step").forEach((x,i)=>x.classList.toggle("active",i===n));}
 function setOptions(sel,items,label){const old=sel.value;sel.replaceChildren(new Option(label,""));(items||[]).forEach(x=>sel.append(new Option(x.name,String(x.id))));if((items||[]).some(x=>String(x.id)===old))sel.value=old;}
 function setStatusOptions(){const rows=type.value==="operations"?[["pending","Pending"],["in progress","In progress"],["submitted","Submitted"],["completed","Completed"],["approved","Approved"],["rejected","Rejected"],["cancelled","Cancelled"],["overdue","Overdue"]]:
  type.value==="reviews"?[["submitted","Submitted"],["approved","Approved"],["rejected","Rejected"]]:
  ["locations","zones"].includes(type.value)?[["active","Active"],["inactive","Inactive"],["archived","Archived"]]:[];
  const old=status.value;status.replaceChildren(new Option("All statuses",""));rows.forEach(([v,l])=>status.append(new Option(l,v)));status.value=rows.some(x=>x[0]===old)?old:"";
 }
 function syncFields(){
  const kind=type.value;
  const visible={employee:["operations","reviews","personnel","performance"].includes(kind),location:["operations","reviews","locations","zones"].includes(kind),zone:["operations","reviews","zones"].includes(kind),status:["operations","reviews","locations","zones"].includes(kind),opType:["operations","reviews"].includes(kind)};
  Object.entries(filterFields).forEach(([key,node])=>{node.hidden=!visible[key];});
  filterHint.textContent=({operations:"Operations created during the selected period, including assignment, status, priority and due dates.",reviews:"Submitted work, review outcomes, feedback, attempts and resubmissions.",personnel:"Your active team’s staff directory, recorded skills, qualifications and current workload.",performance:"Workload-adjusted completion, punctuality and approval measures for your team.",locations:"Locations assigned to your team and their operational activity.",zones:"Zones within your team’s assigned locations and their operational activity."})[kind];
  setStatusOptions();invalidate();
 }
 function payload(){return {name:name.value.trim(),report_type:type.value,format:format.value,start_date:from.value,end_date:to.value,
  employee_id:employee.value||null,location_id:location.value||null,zone_id:zone.value||null,status:status.value||null,operation_type:opType.value||null};}
 function invalidate(){latest=null;latestPayload=null;generateBtn.disabled=true;previewPanel.classList.add("ct-reports-hidden");}
 function renderPreview(data){
  previewSummary.replaceChildren();
  [["Matching records",data.row_count],["Reporting period",data.start_date+" – "+data.end_date],["Preview",Math.min(100,data.row_count)+(data.preview_truncated?"+":"")+" rows"]].forEach(([label,value])=>{const cell=$("div","ct-sup-summary-item");cell.append($("span","",label),$("strong","",value));previewSummary.append(cell);});
  tableWrap.replaceChildren();
  if(!data.headers?.length){tableWrap.append($("p","ct-reports-empty","No report fields are available."));return;}
  const table=$("table","ct-reports-table"),thead=$("thead",""),tr=$("tr","");data.headers.forEach(h=>tr.append($("th","",h)));thead.append(tr);table.append(thead);
  const tbody=$("tbody","");(data.rows||[]).forEach(row=>{const line=$("tr","");row.forEach(v=>line.append($("td","",escText(v))));tbody.append(line);});table.append(tbody);tableWrap.append(table);
  if(!data.rows?.length)tableWrap.append($("p","ct-reports-empty","No records match these filters."));
 }
 async function preview(){
  try{
   if(!name.value.trim())throw Error("Enter a report name.");
   if(!from.value||!to.value)throw Error("Choose both dates.");
   if(from.value>to.value)throw Error("The start date must be on or before the end date.");
   previewBtn.disabled=true;previewBtn.textContent="Preparing preview…";
   const p=payload(),data=await API.post("reports/supervisor/preview",p);
   latestPayload=JSON.stringify(p);latest=p;renderPreview(data);previewPanel.classList.remove("ct-reports-hidden");
   generateBtn.disabled=false;step(2);notify("Preview ready. Check the records before generating the report.");
  }catch(e){notify(e.message||"The preview could not be created.",true);}
  finally{previewBtn.disabled=false;previewBtn.textContent="Preview report";}
 }
 async function generate(){
  try{
   if(!latest||latestPayload!==JSON.stringify(payload()))throw Error("Your selections changed. Preview the report again.");
   generateBtn.disabled=true;generateBtn.textContent="Generating…";
   const result=await API.post("reports/supervisor/generate",payload());
   step(3);notify("Report generated. "+result.row_count+" records included.");
   await loadHistory();const row=historyList.querySelector('[data-report-id="'+result.report.id+'"]');row?.scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(e){notify(e.message||"The report could not be generated.",true);}
  finally{generateBtn.disabled=false;generateBtn.textContent="Generate report";}
 }
 async function download(id){
  try{
   const cfg=window.CleanTrackConfig,token=AUTH?.getAuthToken?.()||sessionStorage.getItem("cleantrack_token");
   const response=await fetch(cfg.apiBaseUrl.replace(/\/$/,"")+"/reports/supervisor/"+encodeURIComponent(id)+"/download",{headers:token?{Authorization:"Bearer "+token}:{},credentials:"include",cache:"no-store"});
   if(!response.ok){let m="Download failed.";try{m=(await response.json()).error||m;}catch(_){}throw Error(m);}
   const blob=await response.blob(),url=URL.createObjectURL(blob),a=$("a","");a.href=url;a.download="mechnar-report";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify("Download started.");
  }catch(e){notify(e.message||"Download failed.",true);}
 }
 function openShare(report){
  const overlay=$("div","ct-sup-share-overlay"),dialog=$("section","ct-sup-share-dialog");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");dialog.setAttribute("aria-labelledby","ct-sup-share-title");
  const top=$("header","ct-sup-share-head"),copy=$("div","");copy.append($("h2","","Share report"),$("p","ct-reports-muted",report.name));const close=BTN("×","quiet",()=>overlay.remove());close.setAttribute("aria-label","Close");top.append(copy,close);
  const body=$("div","ct-sup-share-body"),search=INPUT("search","");search.placeholder="Find personnel";const list=$("div","ct-sup-share-list"),caption=$("textarea","ct-reports-input");caption.rows=3;caption.maxLength=1000;caption.placeholder="Add a message (optional)";
  body.append($("p","ct-reports-muted","Select one or more people from your team. The report will be delivered as a file in each person’s Personnel chat."),search,list,FIELD("Message",caption));
  const footer=$("footer","ct-sup-share-actions"),cancel=BTN("Cancel","quiet",()=>overlay.remove()),send=BTN("Share report","primary",sendSelected);footer.append(cancel,send);dialog.append(top,body,footer);overlay.append(dialog);root.append(overlay);
  const selected=new Set();
  function paint(){
   const q=search.value.trim().toLowerCase();list.replaceChildren();
   const people=(options?.staff||[]).filter(m=>(m.name+" "+m.email).toLowerCase().includes(q));
   if(!people.length){list.append($("p","ct-reports-empty","No personnel match your search."));return;}
   people.forEach(person=>{const label=$("label","ct-sup-share-person"),check=$("input","");check.type="checkbox";check.checked=selected.has(String(person.id));check.addEventListener("change",()=>{if(check.checked)selected.add(String(person.id));else selected.delete(String(person.id));});const details=$("span","");details.append($("strong","",person.name),$("small","",person.email||"Staff"));label.append(check,details);list.append(label);});
  }
  async function sendSelected(){
   if(!selected.size){notify("Select at least one person to share the report.",true);return;}
   send.disabled=true;send.textContent="Sharing…";let sent=0,failed=[];
   for(const id of selected){try{await API.post("reports/supervisor/"+report.id+"/share",{staff_id:Number(id),message:caption.value.trim()});sent++;}catch(e){const person=options.staff.find(x=>String(x.id)===id);failed.push((person?.name||"A recipient")+": "+e.message);}}
   overlay.remove();
   if(failed.length)notify(sent+" shared. "+failed.join(" · "),true);else notify("Report shared with "+sent+" "+(sent===1?"person":"people")+" in Personnel chat.");
   await loadHistory();
  }
  search.addEventListener("input",paint);paint();search.focus();
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove();});
  const esc=e=>{if(e.key==="Escape"){overlay.remove();document.removeEventListener("keydown",esc);}};document.addEventListener("keydown",esc);
 }
 async function loadHistory(){
  historyList.replaceChildren($("p","ct-reports-muted","Loading reports…"));
  try{
   const data=await API.get("reports/supervisor/history");historyList.replaceChildren();
   if(!data.reports?.length){historyList.append($("div","ct-sup-history-empty","No reports generated yet."));return;}
   data.reports.forEach(report=>{
    const item=$("article","ct-sup-history-row");item.dataset.reportId=String(report.id);
    const details=$("div","ct-sup-history-copy");details.append($("strong","",report.name));
    const meta=$("p","ct-reports-muted",(reportLabels[report.report_type]||report.report_type)+" · "+String(report.file_format||"").toUpperCase()+" · "+new Date(report.created_at).toLocaleString()+" · "+(Number(report.file_size||0)/1024).toFixed(1)+" KB");
    const filterText=report.filters||{};const scope=$("small","",["From "+(filterText.start_date||"—"),"To "+(filterText.end_date||"—")].join(" · "));
    details.append(meta,scope);
    const actions=$("div","ct-sup-history-actions");actions.append(BTN("Download","",()=>download(report.id)),BTN("Share","primary",()=>openShare(report)));
    item.append(details,actions);historyList.append(item);
   });
  }catch(e){historyList.replaceChildren($("p","ct-reports-muted","Could not load report history: "+e.message));}
 }
 [type,employee,location,zone,status,opType,from,to,format].forEach(node=>node.addEventListener("change",()=>{if(node===type)syncFields();else invalidate();}));
 name.addEventListener("input",invalidate);
 try{
  options=await API.get("reports/supervisor/options");teamBadge.querySelector("strong").textContent=options.team?.name||"Your team";
  setOptions(employee,options.staff,"All personnel");setOptions(location,options.locations,"All locations");setOptions(zone,options.zones,"All zones");setOptions(opType,options.operation_types,"All operation types");
  syncFields();await loadHistory();
 }catch(e){notify(e.message||"Supervisor report data could not be loaded.",true);historyList.replaceChildren($("p","ct-reports-muted","Report history is unavailable until your team data loads."));}
}

window.CleanTrackReports=Object.freeze({render});
})();