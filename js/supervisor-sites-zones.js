(function () {
"use strict";
const API=window.CleanTrackApi;
const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const button=(label,cls,fn)=>{const b=$("button",cls,label);b.type="button";b.addEventListener("click",fn);return b;};
const rows=(r,k)=>Array.isArray(r)?r:Array.isArray(r?.[k])?r[k]:[];
const val=(v,fallback="—")=>v===null||v===undefined||v===""?fallback:String(v);
const done=new Set(["completed","complete","approved","done","closed","cancelled","canceled"]);
let host,sites=[],zones=[],operations=[],selectedSite=null,selectedZone=null,map=null,mapLayer=null,mapSearchLayer=null,search="",status="all",busy=false;
const css=`
.msz{max-width:1480px;margin:0 auto;color:var(--text,var(--text-primary,#eee));}
.msz *{box-sizing:border-box}.msz-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:22px}
.msz-kicker{font-size:10px;letter-spacing:.17em;font-weight:700;color:var(--muted,#999);margin:0 0 7px}
.msz h1{font-size:clamp(26px,3vw,34px);margin:0 0 7px}.msz-intro{max-width:760px;color:var(--muted,#999);font-size:13px;line-height:1.6;margin:0}
.msz-tools,.msz-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.msz-btn{border:1px solid var(--border,#41414a);background:transparent;color:inherit;border-radius:8px;padding:9px 12px;font-size:12px;cursor:pointer}
.msz-btn:hover{border-color:#8b63d9}.msz-btn:disabled{opacity:.55;cursor:wait}.msz-primary{background:#7044b8;border-color:#7044b8;color:white}
.msz-input,.msz-select,.msz-textarea{background:var(--surface,#17171d);border:1px solid var(--border,#41414a);border-radius:8px;color:inherit;padding:10px 11px;font:inherit;font-size:12px;min-width:0}
.msz-toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:18px 0 14px}.msz-toolbar .msz-input{flex:1;min-width:220px}
.msz-notice{min-height:20px;font-size:12px;color:var(--muted,#999);margin:8px 0}.msz-notice.error{color:#e58b8b}.msz-notice.success{color:#6ac6a0}
.msz-metrics{display:flex;gap:30px;flex-wrap:wrap;border-top:1px solid var(--border,#383840);border-bottom:1px solid var(--border,#383840);padding:13px 4px;margin:14px 0 22px}
.msz-metric{min-width:120px}.msz-metric strong{display:block;font-size:23px;font-weight:650}.msz-metric span{font-size:11px;color:var(--muted,#999)}
.msz-map-panel{border:1px solid var(--border,#383840);border-radius:10px;margin:14px 0 22px;overflow:hidden;background:var(--surface,#17171d)}.msz-map-head{padding:14px 16px;display:flex;justify-content:space-between;gap:12px;align-items:center}.msz-map-head strong{font-size:15px}.msz-map-head p{margin:5px 0 0;font-size:12px;color:var(--muted,#999);line-height:1.5}.msz-map-chip{font-size:10px;color:var(--muted,#999);border:1px solid var(--border,#41414a);border-radius:20px;padding:5px 9px;white-space:nowrap}.msz-map-search{display:flex;gap:8px;padding:0 14px 10px}.msz-map-search input{flex:1}.msz-map{height:430px;background:var(--surface,#17171d)}.msz-map-notice{font-size:11px;color:var(--muted,#999);padding:0 14px 9px}.msz-map-notice.is-error{color:#e58b8b}.msz-map-results{display:grid;gap:7px;padding:0 14px 10px}.msz-map-result{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px;border:1px solid var(--border,#383840);border-radius:8px}.msz-map-result-copy{display:grid;gap:3px;min-width:0}.msz-map-result-copy strong{font-size:12px}.msz-map-result-copy span,.msz-map-result-copy small{font-size:10px;color:var(--muted,#999);overflow-wrap:anywhere}.msz-map-picked{font-size:11px;color:#6ac6a0;padding:0 14px 10px}.msz-map-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid var(--border,#383840)}.msz-map-footer p{margin:0;font-size:10px;color:var(--muted,#999)}
.msz-columns{display:grid;grid-template-columns:minmax(0,1fr);gap:26px;align-items:start}
.msz-section{border-top:1px solid var(--border,#383840);padding-top:13px;min-width:0;width:100%}.msz-section h2{font-size:16px;margin:0 0 11px}
.msz-directory{display:grid}.msz-site{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 8px;border-bottom:1px solid var(--border,#303039);cursor:pointer}
.msz-site:hover,.msz-site.active{background:rgba(130,91,204,.08)}.msz-site h3{font-size:14px;margin:0 0 5px}.msz-site p{font-size:11px;color:var(--muted,#999);margin:0;line-height:1.5}
.msz-site-meta{text-align:right;white-space:nowrap;font-size:11px;color:var(--muted,#999)}.msz-status{display:inline-block;border:1px solid var(--border,#45454d);border-radius:20px;padding:3px 8px;font-size:10px}
.msz-zone-row{padding:13px 2px;border-bottom:1px solid var(--border,#303039)}.msz-zone-title{display:flex;justify-content:space-between;align-items:center;gap:8px}.msz-zone-title strong{font-size:13px}.msz-zone-row p{font-size:11px;color:var(--muted,#999);line-height:1.5;margin:6px 0}
.msz-empty{font-size:12px;color:var(--muted,#999);line-height:1.6;padding:16px 2px}.msz-detail{min-height:170px}.msz-detail h3{font-size:14px;margin:17px 0 8px}.msz-kv{display:grid;grid-template-columns:125px 1fr;gap:10px;padding:9px 0;border-bottom:1px solid var(--border,#303039)}.msz-kv span:first-child{font-size:11px;color:var(--muted,#999)}.msz-kv span:last-child{font-size:12px;overflow-wrap:anywhere}
.msz-table-wrap{overflow:auto;margin-top:8px}.msz-table{width:100%;border-collapse:collapse;font-size:11px}.msz-table th,.msz-table td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--border,#34343d);vertical-align:top}.msz-table th{color:var(--muted,#999);font-weight:600}
.msz-modal-bg{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.68);display:grid;place-items:center;padding:18px}.msz-modal{width:min(760px,100%);max-height:88vh;overflow:auto;background:var(--surface,#17171d);border:1px solid var(--border,#45454d);border-radius:12px;box-shadow:0 22px 70px #0008}.msz-modal-head{position:sticky;top:0;background:var(--surface,#17171d);display:flex;justify-content:space-between;align-items:center;padding:15px 18px;border-bottom:1px solid var(--border,#383840);z-index:1}.msz-modal-head h2{font-size:16px;margin:0}.msz-modal-body{padding:18px}.msz-close{border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer}
.msz-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.msz-field{display:grid;gap:6px;font-size:11px;color:var(--muted,#999)}.msz-field.full{grid-column:1/-1}.msz-field input,.msz-field select,.msz-field textarea{width:100%}.msz-form-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}
.msz-qr{width:220px;height:220px;background:#fff;margin:12px auto;padding:10px;display:grid;place-items:center}.msz-qr canvas,.msz-qr img{max-width:100%;max-height:100%}
.msz-event{padding:10px 0;border-bottom:1px solid var(--border,#333)}.msz-event strong{font-size:12px}.msz-event small,.msz-event p{display:block;color:var(--muted,#999);font-size:11px;margin:5px 0;overflow-wrap:anywhere}
.msz-map-link{font-size:12px;color:inherit;display:inline-block;margin-top:9px}
@media(max-width:850px){.msz-columns{grid-template-columns:1fr}.msz-map{height:340px}}
@media(max-width:560px){.msz-form{grid-template-columns:1fr}.msz-field.full,.msz-form-actions{grid-column:auto}.msz-map-search{flex-wrap:wrap}.msz-map-search input{min-width:100%}.msz-map{height:290px}.msz-map-head{align-items:flex-start;flex-direction:column}.msz-map-footer{align-items:flex-start;flex-direction:column}.msz-site{align-items:flex-start}.msz-site-meta{white-space:normal}}
`;
function notify(message,type=""){const n=host?.querySelector("[data-notice]");if(n){n.textContent=message||"";n.className="msz-notice "+type;}}
function siteZones(site){return zones.filter(z=>String(z.location_id)===String(site.id));}
function siteOps(site){const ids=new Set(siteZones(site).map(z=>String(z.id)));return operations.filter(o=>String(o.location_id)===String(site.id)||ids.has(String(o.zone_id)));}
function authorized(site){return site?.supervisor_authorized===true;}
function modal(title,build){const bg=$("div","msz-modal-bg"),box=$("section","msz-modal"),head=$("header","msz-modal-head"),body=$("div","msz-modal-body");head.append($("h2","",title),button("×","msz-close",()=>bg.remove()));box.append(head,body);bg.append(box);bg.addEventListener("click",e=>{if(e.target===bg)bg.remove();});const esc=e=>{if(e.key==="Escape"){bg.remove();document.removeEventListener("keydown",esc);}};document.addEventListener("keydown",esc);document.body.append(bg);build(body,bg);return bg;}
async function load(){const [a,b,c]=await Promise.all([API.get("locations"),API.get("zones"),API.get("operations").catch(()=>({operations:[]}))]);sites=rows(a,"locations");zones=rows(b,"zones");operations=rows(c,"operations");if(selectedSite&&!sites.some(s=>String(s.id)===String(selectedSite)))selectedSite=null;}
function drawMetrics(){const n=host.querySelector("[data-metrics]");n.replaceChildren();const values=[[sites.length,"Organisation sites"],[sites.filter(s=>authorized(s)).length,"Sites in your team scope"],[zones.length,"Authorised zones"],[operations.filter(o=>!done.has(String(o.status||"").toLowerCase())).length,"Open operations"]];values.forEach(([v,l])=>{const d=$("div","msz-metric");d.append($("strong","",v),$("span","",l));n.append(d);});}
function drawDirectory(){const n=host.querySelector("[data-sites]");n.replaceChildren();const filtered=sites.filter(s=>(status==="all"||String(s.status||"active").toLowerCase()===status)&&(!search||[s.name,s.address,s.description,s.team_name].join(" ").toLowerCase().includes(search)));if(!filtered.length){n.append($("p","msz-empty",sites.length?"No sites match the selected filters.":"No organisation locations have been created by Admin yet."));return;}filtered.forEach(s=>{const zc=siteZones(s).length,row=$("div","msz-site"+(String(selectedSite)===String(s.id)?" active":""));row.tabIndex=0;row.setAttribute("role","button");const left=$("div");left.append($("h3","",s.name),$("p","",[val(s.address,"Address not recorded"),s.team_name?"Team: "+s.team_name:""].filter(Boolean).join(" · ")));const right=$("div","msz-site-meta");right.append($("span","msz-status",val(s.status,"active")), $("p","",authorized(s)?zc+" authorised zones":"Directory only · outside team scope"));right.append(button("Open site details","msz-btn",e=>{e?.stopPropagation?.();openSiteDetails(s);}));row.append(left,right);row.addEventListener("click",()=>selectSite(s.id));row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectSite(s.id);}});n.append(row);});}
function drawZones(){const n=host.querySelector("[data-zones]");n.replaceChildren();const site=sites.find(s=>String(s.id)===String(selectedSite));n.append($("h2","",site?site.name+" · Operational zones":"Authorised zones"));if(!site){n.append($("p","msz-empty","Select an organisation site to view zones in your authorised team scope."));return;}const own=siteZones(site);if(!authorized(site)){n.append($("p","msz-empty","This site is visible in the organisation directory, but its operational details and zone controls are outside your authorised team scope."));return;}const add=button("+ Create zone","msz-btn msz-primary",()=>zoneForm(null,site));n.append(add);if(!own.length){n.append($("p","msz-empty","No zones have been created for this site yet. Create the internal floors, blocks or work areas your team is authorised to manage."));return;}own.forEach(z=>{const item=$("article","msz-zone-row"),title=$("div","msz-zone-title");title.append($("strong","",z.name),$("span","msz-status",val(z.status)));item.append(title,$("p","",[(z.floor_label||"Area not specified"),z.description].filter(Boolean).join(" · ")));item.append($("p","",val(z.effective_team_name||z.team_name,"Team not recorded")+" · "+val(z.member_count,0)+" assigned members · "+val(z.operation_count,0)+" operations"));const actions=$("div","msz-actions");actions.append(button("View details","msz-btn",()=>selectZone(z.id)),button("Edit zone","msz-btn",()=>zoneForm(z,site)),button("QR code","msz-btn",()=>zoneQr(z)),button("Activity","msz-btn",()=>zoneHistory(z)));item.append(actions);n.append(item);});}
function draw(){drawMetrics();drawDirectory();drawZones();if(map&&mapLayer)drawMapPins();}
function focusSiteOnMap(site){if(!map){notify("The embedded map is not ready yet.","error");return;}if(site.latitude==null||site.longitude==null){notify("This site has no saved map coordinates. Open its location in Admin and use Browse map to select the exact place, then save it.","error");return;}const lat=Number(site.latitude),lon=Number(site.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180){notify("This site has invalid saved map coordinates. Correct them in Admin.","error");return;}const point=[lat,lon];map.invalidateSize();map.flyTo(point,18,{animate:true,duration:1.1});let marker=null;mapLayer?.eachLayer(layer=>{const ll=layer.getLatLng?.();if(ll&&Math.abs(ll.lat-lat)<0.000001&&Math.abs(ll.lng-lon)<0.000001)marker=layer;});if(marker)marker.openPopup();}
function selectSite(id){selectedSite=id;selectedZone=null;drawDirectory();drawZones();const site=sites.find(s=>String(s.id)===String(id));if(site)focusSiteOnMap(site);}
function openSiteDetails(site){modal("Site details · "+site.name,(body)=>{body.append($("p","msz-intro",authorized(site)?"Authorised site · operational information available":"Organisation directory entry · operational information restricted to your team"));kv(body,"Address",site.address);kv(body,"Description",site.description);kv(body,"Status",site.status);if(authorized(site)){kv(body,"Assigned team",site.team_name||site.team_id);kv(body,"Zones",siteZones(site).length);const ops=siteOps(site);kv(body,"Operations",ops.length);kv(body,"Open operations",ops.filter(o=>!done.has(String(o.status||"").toLowerCase())).length);if(site.latitude!=null&&site.longitude!=null){const a=$("a","msz-map-link","Open navigation ↗");a.href="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(site.latitude+","+site.longitude);a.target="_blank";a.rel="noopener noreferrer";body.append(a);}const actions=$("div","msz-actions");actions.append(button("Site activity","msz-btn",()=>siteHistory(site)),button("Report site problem","msz-btn",()=>reportIssue(site)),button("Site QR","msz-btn",()=>siteQr(site)));body.append(actions);renderSiteOperations(body,ops);renderSiteZones(body,site);}else{body.append($("p","msz-empty","This site is visible in the organisation directory, but its operational controls are restricted until Admin assigns it to your team."));const accessActions=$("div","msz-actions");accessActions.append(button("Request team access","msz-btn msz-primary",()=>requestSiteAccess(site)));body.append(accessActions);}});}
function kv(parent,label,value){const row=$("div","msz-kv");row.append($("span","",label),$("span","",val(value)));parent.append(row);}
function renderSiteOperations(parent,ops){const section=$("section");section.append($("h3","","Operational activity"));if(!ops.length)section.append($("p","msz-empty","No operations are linked to this site."));else{const wrap=$("div","msz-table-wrap"),table=$("table","msz-table"),head=$("tr");["Operation","Status","Priority","Assigned to","Due"].forEach(t=>head.append($("th","",t)));table.append(head);ops.slice(0,30).forEach(o=>{const tr=$("tr");[o.title||o.name,o.status,o.priority,o.assigned_to_name||o.assignee_name,o.due_at?new Date(o.due_at).toLocaleString():"—"].forEach(v=>tr.append($("td","",val(v))));table.append(tr);});wrap.append(table);section.append(wrap);}parent.append(section);}
function renderSiteZones(parent,site){const section=$("section");section.append($("h3","","Internal areas"));siteZones(site).forEach(z=>{const p=$("p","msz-muted");p.textContent=z.name+" · "+val(z.floor_label,"Area not specified")+" · "+val(z.status);section.append(p);});parent.append(section);}
async function selectZone(id){selectedZone=id;const z=zones.find(x=>String(x.id)===String(id));if(!z)return;const site=sites.find(s=>String(s.id)===String(z.location_id));const panel=modal("Zone details · "+z.name,body=>{body.append($("p","msz-muted","Loading zone assignments and operations…"));});const d=panel.querySelector(".msz-modal-body");try{const r=await API.get("zones/"+encodeURIComponent(z.id));const data=r.zone||z;d.replaceChildren($("p","msz-intro","Zone · "+val(data.location_name||site?.name)));kv(d,"Floor / area",data.floor_label);kv(d,"Description",data.description);kv(d,"Status",data.status);kv(d,"Assigned team",data.effective_team_name||data.team_name);kv(d,"Supervisor",data.supervisor_name);kv(d,"Floor plan",data.has_floor_plan?"Available":"Not uploaded");const people=rows(data,"assigned_people"),ops=rows(data,"operations");d.append($("h3","","Staff assigned to this zone"));if(!people.length)d.append($("p","msz-empty","No active team members are currently assigned."));else{const t=$("table","msz-table"),h=$("tr");["Name","Role","Assigned since"].forEach(x=>h.append($("th","",x)));t.append(h);people.forEach(p=>{const tr=$("tr");[p.name,p.role,p.assigned_at?new Date(p.assigned_at).toLocaleDateString():"—"].forEach(x=>tr.append($("td","",val(x))));t.append(tr);});d.append(t);}d.append($("h3","","Operations in this zone"));if(!ops.length)d.append($("p","msz-empty","No operations are linked to this zone."));else{const t=$("table","msz-table"),h=$("tr");["Operation","Status","Priority","Assigned staff","Due"].forEach(x=>h.append($("th","",x)));t.append(h);ops.forEach(o=>{const tr=$("tr");[o.title,o.status,o.priority,o.assigned_to_name,o.due_at?new Date(o.due_at).toLocaleString():"—"].forEach(x=>tr.append($("td","",val(x))));t.append(tr);});d.append(t);}const actions=$("div","msz-actions");actions.append(button("Edit zone","msz-btn",()=>zoneForm(data,site)),button("QR code","msz-btn",()=>zoneQr(data)),button("Activity history","msz-btn",()=>zoneHistory(data)));d.append(actions);}catch(e){d.replaceChildren($("p","msz-notice error",e.message||"Zone details could not be loaded."));}}
function zoneForm(existing,site){if(!authorized(site)){notify("Zone controls are unavailable outside your authorised team scope.","error");return;}modal(existing?"Edit operational zone":"Create operational zone",(body,bg)=>{const form=$("form","msz-form");const field=(label,type,value,wide=false)=>{const l=$("label","msz-field"+(wide?" full":""),label),i=$(type==="textarea"?"textarea":"input","msz-input");if(type==="textarea")i.rows=4;else i.type=type;i.value=value||"";l.append(i);form.append(l);return i;};const name=field("Zone name","text",existing?.name);name.maxLength=150;name.required=true;const floor=field("Floor / block / area","text",existing?.floor_label);floor.maxLength=120;const description=field("Description","textarea",existing?.description,true);const actions=$("div","msz-form-actions");const save=button(existing?"Save changes":"Create zone","msz-btn msz-primary",async()=>{if(busy||!name.value.trim())return;busy=true;save.disabled=true;try{const payload={name:name.value.trim(),floor_label:floor.value.trim(),description:description.value.trim()};if(existing)await API.patch("zones/"+existing.id,payload);else{payload.location_id=site.id;const response=await API.post("zones",payload);selectedZone=response.zone?.id||null;}bg.remove();await load();draw();notify(existing?"Zone updated and audit history recorded.":"Zone created and made available to your team.","success");if(selectedZone)await selectZone(selectedZone);else selectSite(site.id);}catch(e){notify(e.message||"Zone could not be saved.","error");save.disabled=false;}finally{busy=false;}});actions.append(button("Cancel","msz-btn",()=>bg.remove()),save);form.append(actions);body.append(form);if(existing){const archive=button("Archive zone","msz-btn",async()=>{if(!confirm("Archive this zone? Its records and history will be retained."))return;try{await API.patch("zones/"+existing.id,{status:"archived"});bg.remove();await load();draw();selectSite(site.id);notify("Zone archived. Historical records have been retained.","success");}catch(e){notify(e.message||"Zone could not be archived.","error");}});archive.classList.add("msz-danger");body.append(archive);}});}
async function siteHistory(site){modal("Site activity · "+site.name,async body=>{body.append($("p","msz-muted","Loading audit history…"));try{const r=await API.get("locations/"+site.id+"/history"),events=rows(r,"history");body.replaceChildren();if(!events.length)body.append($("p","msz-empty","No location activity has been recorded."));events.forEach(e=>eventRow(body,e));}catch(e){body.replaceChildren($("p","msz-notice error",e.message||"Site history is unavailable."));}});}
async function zoneHistory(zone){modal("Zone activity · "+zone.name,async body=>{body.append($("p","msz-muted","Loading audit history…"));try{const r=await API.get("zones/"+zone.id+"/history"),events=rows(r,"history");body.replaceChildren();if(!events.length)body.append($("p","msz-empty","No zone activity has been recorded."));events.forEach(e=>eventRow(body,e));}catch(e){body.replaceChildren($("p","msz-notice error",e.message||"Zone history is unavailable."));}});}
function eventRow(parent,e){const row=$("div","msz-event");row.append($("strong","",String(e.action||"Activity").replace(/[._]/g," ")), $("small","",e.created_at?new Date(e.created_at).toLocaleString():"Timestamp unavailable"),$("p","",typeof e.details==="string"?e.details:JSON.stringify(e.details||{})));parent.append(row);}
function requestSiteAccess(site){modal("Request team access · "+site.name,(body,bg)=>{body.append($("p","msz-intro","Send Admin a formal request to assign this site to your team. This does not change permissions until Admin approves the assignment."));const note=$("textarea","msz-textarea");note.rows=4;note.maxLength=2000;note.placeholder="Optional context for the access request";const label=$("label","msz-field full","Reason (optional)");label.append(note);const form=$("div","msz-form");form.append(label);const actions=$("div","msz-form-actions");actions.append(button("Cancel","msz-btn",()=>bg.remove()),button("Send request","msz-btn msz-primary",async()=>{try{const r=await API.post("locations/"+site.id+"/issues",{category:"Team access request",subject:"Request team access to "+site.name,description:note.value.trim()||"Please review this site and assign it to my team if appropriate."});bg.remove();notify(r.message||"Access request sent to Admin.","success");}catch(e){notify(e.message||"Access request could not be sent.","error");}}));form.append(actions);body.append(form);});}
function reportIssue(site){modal("Report a problem to Admin · "+site.name,body=>{const form=$("form","msz-form"),cat=$("select","msz-select");["Access issue","Incorrect map/address details","Damaged or non-functional QR code","Zone-related problem","Other"].forEach(x=>cat.append(new Option(x,x)));const subject=$("input","msz-input");subject.maxLength=160;subject.placeholder="Short issue summary";const detail=$("textarea","msz-textarea");detail.rows=5;detail.maxLength=5000;detail.placeholder="Explain what is wrong, where it occurs and what needs attention.";[[ "Problem type",cat,false],["Subject",subject,false],["Details",detail,true]].forEach(([label,input,wide])=>{const l=$("label","msz-field"+(wide?" full":""),label);l.append(input);form.append(l);});const actions=$("div","msz-form-actions");actions.append(button("Cancel","msz-btn",()=>body.closest(".msz-modal-bg").remove()),button("Send report","msz-btn msz-primary",async()=>{if(!subject.value.trim()||!detail.value.trim()){notify("Enter a subject and problem details.","error");return;}try{const r=await API.post("locations/"+site.id+"/issues",{category:cat.value,subject:subject.value.trim(),description:detail.value.trim()});body.closest(".msz-modal-bg").remove();notify(r.message||"Report delivered to Admin.","success");}catch(e){notify(e.message||"Report could not be sent.","error");}}));form.append(actions);body.append(form);});}
function qrModal(title,textValue,filename){modal(title,body=>{body.append($("p","msz-intro","This QR identifies a work area or opens its saved navigation destination. It does not grant access by itself."));const qr=$("div","msz-qr");body.append(qr);if(window.QRCode){new QRCode(qr,{text:textValue,width:200,height:200,correctLevel:QRCode.CorrectLevel.M});}else qr.textContent="QR library unavailable. Refresh the page and try again.";body.append(button("Download QR PNG","msz-btn msz-primary",()=>{const img=qr.querySelector("canvas")||qr.querySelector("img");if(!img)return;const a=$("a");a.href=img.tagName==="CANVAS"?img.toDataURL("image/png"):img.src;a.download=filename;a.click();}));});}
function siteQr(site){if(!site.qr_token||site.qr_enabled===false){notify("This site QR is unavailable or has been disabled by Admin.","error");return;}if(site.qr_expires_at&&Date.parse(site.qr_expires_at)<=Date.now()){notify("This site QR has expired. Ask Admin to issue a new code.","error");return;}const base=String(window.CleanTrackConfig?.apiBaseUrl||"").replace(/\/$/,"");qrModal("Site identity QR · "+site.name,base+"/locations/resolve/"+encodeURIComponent(site.qr_token),"mechnar-site-"+site.id+".png");}
function zoneQr(zone){if(!zone.qr_token||zone.qr_enabled===false){notify("This zone QR is unavailable or has been disabled by Admin.","error");return;}if(zone.qr_expires_at&&Date.parse(zone.qr_expires_at)<=Date.now()){notify("This zone QR has expired. Ask Admin to issue a new code.","error");return;}const base=String(window.CleanTrackConfig?.apiBaseUrl||"").replace(/\/$/,"");qrModal("Zone identity QR · "+zone.name,base+"/zones/resolve/"+encodeURIComponent(zone.qr_token),"mechnar-zone-"+zone.id+".png");}

let buildingLayer=null,landmarkLayer=null,buildingRefreshTimer=null,landmarkRefreshTimer=null,lastBuildingFetchAt=0,lastBuildingBounds="",lastLandmarkFetchAt=0,lastLandmarkBounds="",lastPlaceSearchAt=0,mapNoticeNode=null,searchResultsNode=null;
function mapMsg(message,error){if(!mapNoticeNode)return;mapNoticeNode.hidden=!message;mapNoticeNode.textContent=message||"";mapNoticeNode.classList.toggle("is-error",!!error);}
function drawMapPins(){
 if(!map||!mapLayer||!window.L)return;mapLayer.clearLayers();
 sites.filter(s=>s.latitude!==null&&s.latitude!==undefined&&s.longitude!==null&&s.longitude!==undefined&&Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude))).forEach(site=>{
  const state=String(site.status||"active").toLowerCase();
  const pin=L.circleMarker([Number(site.latitude),Number(site.longitude)],{radius:String(selectedSite)===String(site.id)?10:7,color:state==="archived"?"#93939d":state==="inactive"?"#dfa64f":"#42cfa4",fillColor:state==="archived"?"#73737d":state==="inactive"?"#dfa64f":"#42cfa4",fillOpacity:.9,weight:2}).addTo(mapLayer);
  pin.bindTooltip(String(site.name||"Site "+site.id),{permanent:true,direction:"top",offset:[0,-9],opacity:.98});
  pin.bindPopup("<strong>"+String(site.name||"Site").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+"</strong><br>"+String(site.address||"Address not recorded").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])));
  pin.on("click",()=>selectSite(site.id));
 });
}
  async function loadLandmarks(force){
    if(!map||!landmarkLayer||!map.hasLayer(landmarkLayer))return;
    const bounds=map.getBounds(),zoom=map.getZoom();
    if(zoom<11){
      mapMsg("Zoom in to level 11 or closer to load named villages, neighbourhoods and landmarks. This works outside city boundaries too.",false);
      landmarkLayer.clearLayers();lastLandmarkBounds="";
      return;
    }
    const south=bounds.getSouth(),west=bounds.getWest(),north=bounds.getNorth(),east=bounds.getEast();
    const spanLat=north-south,spanLon=east-west;
    if(spanLat>0.55||spanLon>0.65||spanLat*spanLon>0.22){
      mapMsg("Zoom in one level to search named places in this area. Smaller map queries include more useful local details and keep the map responsive.",false);
      return;
    }
    const boundsKey=[south,west,north,east].map(v=>v.toFixed(5)).join(",");
    if(!force&&boundsKey===lastLandmarkBounds)return;
    const elapsed=Date.now()-lastLandmarkFetchAt;
    if(!force&&elapsed<1400){
      if(landmarkRefreshTimer)window.clearTimeout(landmarkRefreshTimer);
      landmarkRefreshTimer=window.setTimeout(()=>loadLandmarks(false),1400-elapsed);
      return;
    }
    lastLandmarkFetchAt=Date.now();lastLandmarkBounds=boundsKey;
    mapMsg("Loading named places, villages and landmarks for the visible area…",false);
    const box="("+south+","+west+","+north+","+east+")";
    const query='[out:json][timeout:22];('+
      'nwr["name"]["place"~"^(city|town|village|hamlet|suburb|neighbourhood|quarter|locality|isolated_dwelling)$"]'+box+';'+
      'nwr["name"]["tourism"~"^(attraction|museum|viewpoint|artwork|zoo|theme_park|picnic_site|information)$"]'+box+';'+
      'nwr["name"]["historic"]'+box+';'+
      'nwr["name"]["landmark"]'+box+';'+
      'nwr["name"]["natural"~"^(peak|waterfall|spring|cave_entrance|beach|lake|hot_spring|wood|wetland)$"]'+box+';'+
      'nwr["name"]["amenity"~"^(place_of_worship|hospital|school|college|university|community_centre|bus_station|library|marketplace|monastery)$"]'+box+';'+
      'nwr["name"]["leisure"~"^(park|garden|nature_reserve|sports_centre|playground)$"]'+box+';'+
      ');out center tags;';
    const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
    let data=null,lastError=null;
    for(const endpoint of endpoints){
      const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),26000);
      try{
        const response=await fetch(endpoint,{
          method:"POST",
          headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8","Accept":"application/json"},
          body:new URLSearchParams({data:query}),
          signal:controller.signal
        });
        if(!response.ok)throw new Error("Landmark data service returned HTTP "+response.status+".");
        data=await response.json();break;
      }catch(error){lastError=error;}
      finally{window.clearTimeout(timeout);}
    }
    if(!data){
      lastLandmarkBounds="";
      mapMsg((lastError&&lastError.name==="AbortError"?"The landmark search timed out. Zoom closer or try again.":lastError&&lastError.message)||"Named place data is temporarily unavailable. The street map and saved locations are still available.",true);
      return;
    }
    if(!map||!landmarkLayer||!map.hasLayer(landmarkLayer))return;
    const now=map.getBounds();
    if(map.getZoom()!==zoom||now.getSouthWest().distanceTo(bounds.getSouthWest())>350){
      lastLandmarkBounds="";
      if(landmarkRefreshTimer)window.clearTimeout(landmarkRefreshTimer);
      landmarkRefreshTimer=window.setTimeout(()=>loadLandmarks(false),500);
      return;
    }
    landmarkLayer.clearLayers();
    const elements=Array.isArray(data.elements)?data.elements:[];
    const seen=new Set();let count=0;
    elements.slice(0,400).forEach(item=>{
      const tags=item.tags||{},name=String(tags.name||"").trim();
      if(!name)return;
      const lat=Number(item.lat??item.center?.lat),lon=Number(item.lon??item.center?.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180)return;
      const key=name.toLocaleLowerCase()+"|"+lat.toFixed(4)+"|"+lon.toFixed(4);
      if(seen.has(key))return;seen.add(key);
      const category=tags.place?"Locality · "+String(tags.place).replaceAll("_"," "):
        tags.tourism?"Tourism · "+String(tags.tourism).replaceAll("_"," "):
        tags.historic?"Historic place · "+String(tags.historic).replaceAll("_"," "):
        tags.landmark?"Landmark":
        tags.natural?"Natural feature · "+String(tags.natural).replaceAll("_"," "):
        tags.amenity?"Place · "+String(tags.amenity).replaceAll("_"," "):
        tags.leisure?"Leisure · "+String(tags.leisure).replaceAll("_"," "):"Named place";
      const isLocality=Boolean(tags.place);
      const marker=L.circleMarker([lat,lon],{
        radius:isLocality?6:5,
        color:isLocality?"#265bd7":"#9a4bc8",
        weight:2,
        fillColor:isLocality?"#8bb5ff":"#e0a4ff",
        fillOpacity:.95
      }).addTo(landmarkLayer);
      marker.bindTooltip(name,{permanent:true,direction:"top",offset:[0,-6],opacity:.98,className:"ct-loc-landmark-label"});
      const popup=el("div","ct-loc-building-popup");
      popup.append(el("strong","",name),el("span","",category));
      const locality=[tags["addr:suburb"],tags["addr:neighbourhood"],tags["addr:town"],tags["addr:village"],tags["addr:city"],tags["addr:county"],tags["addr:state"],tags["addr:country"]].filter(Boolean);
      if(locality.length)popup.append(el("span","",locality.filter((v,i,a)=>a.indexOf(v)===i).join(", ")));
      popup.append(el("small","","OpenStreetMap named feature · map coverage varies by area."));
      marker.bindPopup(popup);count++;
    });
    mapMsg(count
      ?count+" named localities and landmarks loaded for the visible area, including mapped places outside cities. Select a label for details."
      :"No named localities or landmarks are mapped in this view. Move slightly or zoom out/in and retry; OpenStreetMap coverage varies by area.",false);
  }
  function enableLandmarksForCurrentView(){
    if(!map||!landmarkLayer)return;
    if(!map.hasLayer(landmarkLayer))landmarkLayer.addTo(map);
    else loadLandmarks(true);
  }
  async function loadBuildingFootprints(force){
    if(!map||!buildingLayer||!map.hasLayer(buildingLayer))return;
    const bounds=map.getBounds(),zoom=map.getZoom();
    if(zoom<17){
      mapMsg("Building footprints are detailed data. Zoom in to level 17 or closer, then enable the building layer again.",false);
      buildingLayer.clearLayers();lastBuildingBounds="";
      return;
    }
    const south=bounds.getSouth(),west=bounds.getWest(),north=bounds.getNorth(),east=bounds.getEast();
    const spanLat=north-south,spanLon=east-west;
    if(spanLat>0.025||spanLon>0.035||spanLat*spanLon>0.00045){
      mapMsg("Zoom in one more level for building footprints. This keeps the map query small and responsive.",false);
      return;
    }
    const boundsKey=[south,west,north,east].map(v=>v.toFixed(5)).join(",");
    if(!force&&boundsKey===lastBuildingBounds)return;
    const elapsed=Date.now()-lastBuildingFetchAt;
    if(!force&&elapsed<1400){
      if(buildingRefreshTimer)window.clearTimeout(buildingRefreshTimer);
      buildingRefreshTimer=window.setTimeout(()=>loadBuildingFootprints(false),1400-elapsed);
      return;
    }
    lastBuildingFetchAt=Date.now();lastBuildingBounds=boundsKey;
    mapMsg("Loading real building footprints from OpenStreetMap…",false);
    const query='[out:json][timeout:18];way["building"]('+south+','+west+','+north+','+east+');out geom;';
    try{
      const response=await fetch("https://overpass-api.de/api/interpreter",{
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8","Accept":"application/json"},
        body:new URLSearchParams({data:query})
      });
      if(!response.ok)throw new Error("Building map data is temporarily unavailable (HTTP "+response.status+").");
      const data=await response.json();
      if(!map||!buildingLayer||!map.hasLayer(buildingLayer)||map.getBounds().getSouthWest().distanceTo(bounds.getSouthWest())>350)return;
      buildingLayer.clearLayers();
      const elements=Array.isArray(data.elements)?data.elements:[];
      let count=0;
      elements.forEach(item=>{
        const tags=item.tags||{},geometry=Array.isArray(item.geometry)?item.geometry.map(p=>[Number(p.lat),Number(p.lon)]):[];
        if(geometry.length<4||geometry.some(p=>!Number.isFinite(p[0])||!Number.isFinite(p[1])))return;
        const polygon=L.polygon(geometry,{color:"#e2a33b",weight:1.5,opacity:.95,fillColor:"#f6bf51",fillOpacity:.18});
        const popup=el("div","ct-loc-building-popup");
        popup.append(el("strong","",tags.name||tags["addr:housenumber"]||("Mapped building #"+item.id)));
        const metadata=[tags.building&&("Type: "+tags.building),tags["building:levels"]&&("Floors: "+tags["building:levels"]),tags["addr:street"],tags["addr:city"]].filter(Boolean);
        if(metadata.length)popup.append(el("div","",metadata.join(" · ")));
        popup.append(el("small","", "Building footprint from OpenStreetMap · map data may be incomplete."));
        polygon.bindPopup(popup);
        if(tags.name)polygon.bindTooltip(tags.name,{sticky:true});
        polygon.addTo(buildingLayer);count++;
      });
      if(count)mapMsg(count+" real building footprint"+(count===1?"":"s")+" loaded. Select an outline to view available map details.",false);
      else mapMsg("No building footprints are mapped in this small area. Try moving the map or check a place with more OpenStreetMap building data.",false);
    }catch(error){
      lastBuildingBounds="";
      mapMsg((error.message||"Building footprints could not be loaded.")+" The street map and saved locations are still available.",true);
    }
  }
function fitAllSitePins(){
 if(!map||!window.L)return;
 const points=sites.filter(s=>s.latitude!==null&&s.latitude!==undefined&&s.longitude!==null&&s.longitude!==undefined&&Number.isFinite(Number(s.latitude))&&Number.isFinite(Number(s.longitude))).map(s=>[Number(s.latitude),Number(s.longitude)]);
 if(points.length===1)map.setView(points[0],16);else if(points.length>1)map.fitBounds(L.latLngBounds(points),{padding:[30,30],maxZoom:16});else map.setView([20,0],3);
}
function focusSiteOnMap(site){
 if(!map){notify("The interactive map is not ready yet.","error");return;}
 if(site.latitude===null||site.latitude===undefined||site.longitude===null||site.longitude===undefined){notify("This site has no saved map coordinates. Admin must pin its real location on the Locations map.","error");return;}
 const lat=Number(site.latitude),lon=Number(site.longitude);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180){notify("This site's saved map coordinates are invalid. Admin must correct them.","error");return;}
 map.invalidateSize();map.flyTo([lat,lon],17,{animate:true,duration:1.05});host.querySelector(".msz-map-panel")?.scrollIntoView({behavior:"smooth",block:"nearest"});
 let marker=null;mapLayer?.eachLayer(layer=>{const ll=layer.getLatLng?.();if(ll&&Math.abs(ll.lat-lat)<1e-6&&Math.abs(ll.lng-lon)<1e-6)marker=layer;});
 marker?.openPopup();
 if(landmarkLayer&&!map.hasLayer(landmarkLayer))landmarkLayer.addTo(map);else loadLandmarks(true);
}
function selectSite(id){selectedSite=id;selectedZone=null;drawDirectory();drawZones();const site=sites.find(s=>String(s.id)===String(id));if(site)focusSiteOnMap(site);}
function initMap(){
 const node=host.querySelector("[data-map]");
 if(!node)return;
 if(!window.L){node.textContent="The map library did not load. Refresh the page to retry.";return;}
 if(map){try{map.off();map.remove();}catch(_){}map=null;}
 map=L.map(node,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true,worldCopyJump:false,maxZoom:20}).setView([20,0],3);
 node.addEventListener("wheel",e=>{
  if(!e.ctrlKey||!map)return;e.preventDefault();if(!e.deltaY)return;
  const current=map.getZoom(),next=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),current+(e.deltaY<0?1:-1)));
  if(next!==current)map.setZoomAround(map.mouseEventToLatLng(e),next,{animate:false});
 },{passive:false});
 const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,maxNativeZoom:19,noWrap:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'});
 tiles.on("tileerror",()=>mapMsg("Map tiles could not load. Check your connection. The site directory remains available.",true));tiles.addTo(map);
 mapLayer=L.layerGroup().addTo(map);buildingLayer=L.layerGroup();landmarkLayer=L.layerGroup();
 L.control.layers({"Street map":tiles},{"Landmarks & localities (OpenStreetMap)":landmarkLayer,"Building footprints (OpenStreetMap)":buildingLayer},{collapsed:true,position:"topright"}).addTo(map);
 map.on("overlayadd",e=>{if(e.layer===buildingLayer)loadBuildingFootprints(true);if(e.layer===landmarkLayer)loadLandmarks(true);});
 map.on("moveend",()=>{
  if(buildingLayer&&map.hasLayer(buildingLayer)){if(buildingRefreshTimer)clearTimeout(buildingRefreshTimer);buildingRefreshTimer=setTimeout(()=>loadBuildingFootprints(false),900);}
  if(landmarkLayer&&map.hasLayer(landmarkLayer)){if(landmarkRefreshTimer)clearTimeout(landmarkRefreshTimer);landmarkRefreshTimer=setTimeout(()=>loadLandmarks(false),1000);}
 });
 drawMapPins();
 if(sites.some(s=>s.latitude!==null&&s.latitude!==undefined&&s.longitude!==null&&s.longitude!==undefined))fitAllSitePins();
 else mapMsg("No saved site coordinates are available yet. Admin can pin the real locations from the Locations page. No sample pins are shown.",false);
 setTimeout(()=>{if(map){map.invalidateSize();if(selectedSite!==null){const site=sites.find(x=>String(x.id)===String(selectedSite));if(site)focusSiteOnMap(site);}}},100);
}
async function searchPlaces(value){
 if(!value)return;
 const buttonNode=host.querySelector("[data-map-find]");if(buttonNode){buttonNode.disabled=true;buttonNode.textContent="Searching…";}
 searchResultsNode?.replaceChildren($("p","msz-muted","Searching OpenStreetMap place names…"));
 try{
  const wait=Math.max(0,1100-(Date.now()-lastPlaceSearchAt));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastPlaceSearchAt=Date.now();
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&namedetails=1&limit=10&q="+encodeURIComponent(value);
  const response=await fetch(url,{headers:{"Accept":"application/json","Accept-Language":document.documentElement.lang||"en"}});
  if(!response.ok)throw new Error("Place search is unavailable right now (HTTP "+response.status+").");
  const results=await response.json();searchResultsNode?.replaceChildren();
  if(!Array.isArray(results)||!results.length){searchResultsNode?.append($("p","msz-muted","No results found. Try a more specific address or place."));return;}
  results.forEach(place=>{
   const title=place.name||String(place.display_name||"").split(",")[0]||"Map result",country=place.address?.country||"Country not identified";
   const region=[place.address?.state,place.address?.region,place.address?.county].filter((v,i,a)=>v&&a.indexOf(v)===i&&v!==country).slice(0,2).join(", ");
   const row=$("div","msz-map-result"),copy=$("div","msz-map-result-copy");
   copy.append($("strong","",title),$("span","",country),$("small","",([region,place.display_name||""].filter(Boolean).join(" · "))),$("small","",String(place.type||place.class||"place").replaceAll("_"," ")));
   row.append(copy,button("View here","msz-btn",()=>{
    const lat=Number(place.lat),lon=Number(place.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon)){notify("The map provider returned invalid coordinates.","error");return;}
    const bounds=Array.isArray(place.boundingbox)?place.boundingbox.map(Number):[];
    if(bounds.length===4&&bounds.every(Number.isFinite)){const south=bounds[0],north=bounds[1],west=bounds[2],east=bounds[3];map.fitBounds([[south,west],[north,east]],{padding:[28,28],maxZoom:(Math.abs(north-south)>.02||Math.abs(east-west)>.02)?14:19});}
    else{const type=String(place.type||"").toLowerCase(),zoom=["country","state","region"].includes(type)?6:["city","administrative","municipality"].includes(type)?12:["suburb","neighbourhood","quarter","village"].includes(type)?14:["house","building","residential","address","road"].includes(type)?19:17;map.setView([lat,lon],zoom);}
    if(mapSearchLayer)map.removeLayer(mapSearchLayer);
    mapSearchLayer=L.marker([lat,lon]).addTo(map).bindPopup(String(place.display_name||title)).openPopup();
    if(landmarkLayer&&!map.hasLayer(landmarkLayer))landmarkLayer.addTo(map);else loadLandmarks(true);
    searchResultsNode.replaceChildren($("p","msz-map-picked","Map centred on "+title+" · "+country+". This is a map preview; it does not change the saved site record."));
   }));searchResultsNode?.append(row);
  });
 }catch(error){searchResultsNode?.replaceChildren($("p","msz-notice error",error.message||"Place search failed."));}
 finally{if(buttonNode){buttonNode.disabled=false;buttonNode.textContent="Search places";}}
}
function exportCsv(){const header=["Record","Site ID","Site","Address","Site status","Team","Zone ID","Zone","Floor / area","Zone status","Assigned members","Operations"];const quote=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const data=[header];sites.forEach(s=>{const allowed=authorized(s),zs=allowed?siteZones(s):[];if(!zs.length)data.push(["Site",s.id,s.name,s.address,s.status,allowed?(s.team_name||s.team_id):"Restricted","","","","","",""]);zs.forEach(z=>data.push(["Zone",s.id,s.name,s.address,s.status,z.effective_team_name||z.team_name,z.id,z.name,z.floor_label,z.status,z.member_count,z.operation_count]));});const blob=new Blob(["\ufeff"+data.map(r=>r.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=$("a");a.href=url;a.download="mechnar-supervisor-sites-zones.csv";a.click();URL.revokeObjectURL(url);notify("Exported organisation directory and authorised zone information.","success");}
function exportPdf(){const w=window.open("","_blank");if(!w){notify("Allow pop-ups to create the PDF report.","error");return;}const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));const content=sites.map(s=>{const zs=authorized(s)?siteZones(s):[];return "<section><h2>"+esc(s.name)+"</h2><p>"+esc(s.address)+" · "+esc(s.status)+"</p>"+(authorized(s)?"<p>Team: "+esc(s.team_name||s.team_id)+" · Operations: "+siteOps(s).length+"</p>":"<p>Operational details restricted to authorised team scope.</p>")+"<ul>"+zs.map(z=>"<li>"+esc(z.name)+" — "+esc(z.floor_label)+" — "+esc(z.status)+"</li>").join("")+"</ul></section>";}).join("");w.document.write("<!doctype html><html><head><title>MECHNAR Sites & Zones</title><style>body{font:13px Arial;margin:30px;color:#222}h1{font-size:23px}section{break-inside:avoid;margin:22px 0}li{margin:5px 0}</style></head><body><h1>MECHNAR · Supervisor Sites & Zones</h1><p>Generated "+esc(new Date().toLocaleString())+"</p>"+content+"<script>window.onload=()=>window.print()<\/script></body></html>");w.document.close();}
function render(container){host=container;host.replaceChildren();const page=$("main","msz"),style=$("style");style.textContent=css;page.append(style);const header=$("header","msz-head"),intro=$("div");intro.append($("p","msz-kicker","TEAM OPERATIONS  /  PLACE DIRECTORY"),$("h1","","Sites & Zones"),$("p","msz-intro","Browse organisation sites and manage the operational zones within your authorised team scope. Admin retains ownership of organisation-wide locations and team assignments."));const tools=$("div","msz-tools");tools.append(button("Export CSV","msz-btn",exportCsv),button("PDF report","msz-btn",exportPdf));header.append(intro,tools);page.append(header);const toolbar=$("div","msz-toolbar"),q=$("input","msz-input");q.placeholder="Search site name, address or team";q.addEventListener("input",()=>{search=q.value.trim().toLowerCase();drawDirectory();});const filter=$("select","msz-select");[["all","All statuses"],["active","Active"],["inactive","Inactive"],["archived","Archived"]].forEach(([v,l])=>filter.append(new Option(l,v)));filter.addEventListener("change",()=>{status=filter.value;drawDirectory();});toolbar.append(q,filter);page.append(toolbar);const noticeNode=$("p","msz-notice");noticeNode.dataset.notice="1";page.append(noticeNode);const metrics=$("div","msz-metrics");metrics.dataset.metrics="1";page.append(metrics);const mapPanel=$("section","msz-map-panel"),mapHead=$("div","msz-map-head"),mapTitle=$("div");mapTitle.append($("strong","","Browse map"),$("p","","Explore the real-world location, search countries, cities, roads, landmarks and addresses, and inspect nearby mapped places."));mapHead.append(mapTitle,$("span","msz-map-chip","OpenStreetMap · no API key"));const mapSearch=$("form","msz-map-search"),mapInput=$("input","msz-input");mapInput.placeholder="Search a real place, city, landmark or address";mapInput.autocomplete="off";mapInput.dataset.mapSearch="1";const find=button("Search places","msz-btn msz-primary",null);find.type="submit";find.dataset.mapFind="1";mapSearch.append(mapInput,find);mapSearch.addEventListener("submit",e=>{e.preventDefault();searchPlaces(mapInput.value.trim());});searchResultsNode=$("div","msz-map-results");mapNoticeNode=$("div","msz-map-notice");mapNoticeNode.hidden=true;const mapNode=$("div","msz-map");mapNode.dataset.map="1";const mapFooter=$("div","msz-map-footer");mapFooter.append($("p","","Geographic reference only · map coverage depends on OpenStreetMap data."),button("Show all organisation sites","msz-btn",fitAllSitePins));mapPanel.append(mapHead,mapSearch,searchResultsNode,mapNoticeNode,mapNode,mapFooter);page.append(mapPanel);const workspace=$("section","msz-section");workspace.append($("h2","","Organisation sites"));const directory=$("div","msz-directory");directory.dataset.sites="1";workspace.append(directory);const zonePanel=$("section","msz-section");zonePanel.dataset.zones="1";zonePanel.append($("h2","","Authorised zones"));workspace.append(zonePanel);page.append(workspace);host.append(page);(async()=>{try{await load();draw();initMap();}catch(e){notify(e.message||"Sites & Zones could not load. Check your connection and refresh.","error");}})();}
window.MechnarSupervisorSitesZones=Object.freeze({render});
})();