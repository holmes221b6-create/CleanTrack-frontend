(function(){
"use strict";
const API=window.CleanTrackApi;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const btn=(label,cls,fn)=>{const n=el("button",cls,label);n.type="button";n.addEventListener("click",fn);return n;};
const list=(v,k)=>Array.isArray(v)?v:Array.isArray(v?.[k])?v[k]:[];
const esc=v=>String(v??"").trim()||"Not recorded";
const active=v=>String(v||"active").toLowerCase();
let root,locations=[],zones=[],operations=[],selected=null,query="";
const style=`
.msz-page{color:var(--text,var(--text-primary,#eee));max-width:1500px;margin:0 auto}
.msz-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:22px;flex-wrap:wrap}
.msz-eyebrow{font-size:11px;letter-spacing:.16em;color:var(--muted,#999);font-weight:700}
.msz-head h1{margin:5px 0;font-size:clamp(25px,3vw,34px)}
.msz-sub{color:var(--muted,#9b9ba5);max-width:760px;line-height:1.55;margin:0}
.msz-tools{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
.msz-search{background:var(--surface,#17171d);border:1px solid var(--border,#34343d);color:inherit;border-radius:9px;padding:10px 12px;min-width:230px}
.msz-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 24px}
.msz-stat{border-bottom:1px solid var(--border,#34343d);padding:13px 4px}
.msz-stat strong{display:block;font-size:25px;font-weight:650}
.msz-stat span{font-size:12px;color:var(--muted,#999)}
.msz-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:20px;align-items:start}
.msz-section{border-top:1px solid var(--border,#34343d);padding-top:14px}
.msz-section h2{font-size:17px;margin:0 0 12px}
.msz-sites{display:grid;gap:0}
.msz-site{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:16px 8px;border-bottom:1px solid var(--border,#34343d);cursor:pointer}
.msz-site:hover,.msz-site.is-selected{background:var(--surface-hover,rgba(140,100,220,.08))}
.msz-site h3{font-size:15px;margin:0 0 5px}
.msz-site p{font-size:12px;color:var(--muted,#999);margin:0;line-height:1.5}
.msz-site-count{text-align:right;white-space:nowrap;color:var(--muted,#aaa);font-size:12px}
.msz-pill{display:inline-block;border:1px solid var(--border,#444);border-radius:20px;padding:4px 9px;font-size:11px}
.msz-zone{padding:13px 0;border-bottom:1px solid var(--border,#34343d)}
.msz-zone-top{display:flex;justify-content:space-between;gap:10px;align-items:center}
.msz-zone h3{margin:0;font-size:14px}
.msz-zone p{font-size:12px;color:var(--muted,#999);margin:6px 0;line-height:1.45}
.msz-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.msz-btn{border:1px solid var(--border,#444);background:transparent;color:inherit;border-radius:8px;padding:8px 11px;cursor:pointer;font-size:12px}
.msz-btn:hover{border-color:#8b63d9}
.msz-primary{background:#7044b8;border-color:#7044b8;color:#fff}
.msz-muted{color:var(--muted,#999);font-size:12px;line-height:1.55}
.msz-detail{border:1px solid var(--border,#383840);border-radius:12px;padding:16px;background:var(--surface,#15151b);position:sticky;top:18px;min-height:180px}
.msz-detail h2{font-size:18px;margin:0 0 8px}
.msz-kv{display:grid;grid-template-columns:110px 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#333)}
.msz-kv span:first-child{font-size:11px;color:var(--muted,#999)}
.msz-kv span:last-child{font-size:12px;overflow-wrap:anywhere}
.msz-empty{padding:18px 0;color:var(--muted,#999);font-size:13px;line-height:1.6}
.msz-form{display:grid;gap:10px;margin-top:12px}
.msz-form label{display:grid;gap:5px;font-size:12px;color:var(--muted,#aaa)}
.msz-form input,.msz-form select,.msz-form textarea{width:100%;box-sizing:border-box;background:var(--surface,#17171d);color:inherit;border:1px solid var(--border,#444);border-radius:8px;padding:9px}
.msz-qr{display:block;width:180px;height:180px;object-fit:contain;background:white;padding:8px;border-radius:8px;margin:12px 0}
.msz-map{display:inline-block;margin-top:8px;color:var(--text,#eee);font-size:12px}
@media(max-width:850px){.msz-layout{grid-template-columns:1fr}.msz-detail{position:static}.msz-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:520px){.msz-stats{gap:8px}.msz-stat strong{font-size:20px}.msz-search{min-width:0;width:100%}.msz-tools{width:100%}}
`;
function notice(msg){const n=root.querySelector("[data-msz-notice]");if(n)n.textContent=msg||"";}
async function load(){
 const [l,z,o]=await Promise.all([API.get("locations"),API.get("zones"),API.get("operations").catch(()=>[])]);
 locations=list(l,"locations");zones=list(z,"zones");operations=list(o,"operations");
}
function siteAddress(l){return [l.address,l.city,l.country].filter(Boolean).join(", ")||"Address not recorded";}
function draw(){
 const sites=root.querySelector("[data-msz-sites]"),zoneBox=root.querySelector("[data-msz-zones]");sites.replaceChildren();zoneBox.replaceChildren();
 const filtered=locations.filter(l=>!query||[l.name,l.address,l.city,l.country,l.description].join(" ").toLowerCase().includes(query));
 if(!filtered.length)sites.append(el("p","msz-empty",locations.length?"No sites match your search.":"No organisation sites have been configured yet."));
 filtered.forEach(l=>{
  const count=zones.filter(z=>String(z.location_id)===String(l.id)).length;
  const row=el("div","msz-site"+(String(selected)===String(l.id)?" is-selected":""));row.tabIndex=0;row.setAttribute("role","button");row.setAttribute("aria-label","View "+l.name);
  const left=el("div");left.append(el("h3","",l.name),el("p","",siteAddress(l)));
  const right=el("div","msz-site-count");right.append(el("span","msz-pill",esc(l.status)),el("p","",count+" authorised zone"+(count===1?"":"s")));
  row.append(left,right);row.addEventListener("click",()=>select(l.id));row.addEventListener("keydown",ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();select(l.id);}});sites.append(row);
 });
 const selectedSite=locations.find(l=>String(l.id)===String(selected));
 zoneBox.append(el("h2","",selectedSite?selectedSite.name+" · Zones":"Authorised zones"));
 const scoped=zones.filter(z=>selectedSite&&String(z.location_id)===String(selectedSite.id));
 if(!selectedSite)zoneBox.append(el("p","msz-empty","Select a site to inspect its internal zones. Zones are the operational areas inside a site—not separate sites."));
 else if(!scoped.length)zoneBox.append(el("p","msz-empty","No zones are assigned to your supervisor access for this site."));
 scoped.forEach(z=>{
  const item=el("article","msz-zone"),top=el("div","msz-zone-top");top.append(el("h3","",z.name),el("span","msz-pill",esc(z.status)));
  item.append(top,el("p","",[(z.floor_label||z.floor),z.description].filter(Boolean).join(" · ")||"No additional zone description."));
  const assigned=Array.isArray(z.assigned_people)?z.assigned_people.length:Number(z.employee_count??z.member_count??0);
  const opCount=Number(z.operation_count??operations.filter(o=>String(o.zone_id)===String(z.id)).length);
  item.append(el("p","",assigned+" assigned staff · "+opCount+" operations"));
  const actions=el("div","msz-actions");actions.append(btn("Details","msz-btn",()=>zoneDetails(z)));
  if(z.qr_enabled!==false)actions.append(btn("View QR","msz-btn",()=>showQr(z)));
  if(String(z.location_id)===String(window.CleanTrackAuth?.getCurrentUser?.()?.location_id||""))actions.append(btn("Edit","msz-btn",()=>zoneForm(z)));
  item.append(actions);zoneBox.append(item);
 });
 const m=root.querySelector("[data-msz-stats]");m.replaceChildren();
 const activeSites=locations.filter(x=>active(x.status)==="active").length;
 const activeZones=zones.filter(x=>active(x.status)==="active").length;
 [[locations.length,"Organisation sites"],[activeSites,"Active sites"],[zones.length,"Zones in your authorised scope"]].forEach(([v,t])=>{const s=el("div","msz-stat");s.append(el("strong","",v),el("span","",t));m.append(s);});
}
function select(id){selected=id;draw();const l=locations.find(x=>String(x.id)===String(id));const d=root.querySelector("[data-msz-detail]");d.replaceChildren(el("h2","",l.name));[[ "Address",siteAddress(l)],["Description",esc(l.description)],["Status",esc(l.status)],["Assigned team",esc(l.team_name||l.team_id)],["Map coordinates",l.latitude!=null&&l.longitude!=null?l.latitude+", "+l.longitude:"Not recorded"]].forEach(([k,v])=>{const r=el("div","msz-kv");r.append(el("span","",k),el("span","",v));d.append(r);});
 if(l.latitude!=null&&l.longitude!=null){const a=el("a","msz-map","Open directions ↗");a.href="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(l.latitude+","+l.longitude);a.target="_blank";a.rel="noopener noreferrer";d.append(a);}
 const hist=btn("View site activity","msz-btn",()=>history(l));d.append(el("div","msz-actions")).lastChild.append(hist);
}
async function history(l){const d=root.querySelector("[data-msz-detail]");let box=d.querySelector("[data-msz-history]");if(box)box.remove();box=el("div");box.dataset.mszHistory="1";box.append(el("h3","","Site activity"));d.append(box);try{const r=await API.get("locations/"+l.id+"/history");const events=list(r,"history");if(!events.length)box.append(el("p","msz-muted","No site activity is recorded."));events.forEach(x=>box.append(el("p","msz-muted",new Date(x.created_at).toLocaleString()+" · "+esc(x.action)+" · "+esc(typeof x.details==="string"?x.details:JSON.stringify(x.details)))));}catch(err){box.append(el("p","msz-muted",err.message||"Site activity is unavailable."));}}
async function zoneDetails(z){const d=root.querySelector("[data-msz-detail]");d.replaceChildren(el("h2","",z.name),el("p","msz-muted","Zone inside "+esc(z.location_name||locations.find(l=>String(l.id)===String(z.location_id))?.name)));
 try{const [people,ops]=await Promise.all([API.get("zones/"+z.id+"/staff"),API.get("operations")]);d.append(el("h3","","Assigned staff"));const staff=list(people,"staff");if(!staff.length)d.append(el("p","msz-muted","No staff assignment details are available."));staff.forEach(p=>d.append(el("p","msz-muted",esc(p.full_name||p.name||p.email))));d.append(el("h3","","Operations"));const tasks=list(ops,"operations").filter(o=>String(o.zone_id)===String(z.id));if(!tasks.length)d.append(el("p","msz-muted","No operations are linked to this zone."));tasks.slice(0,20).forEach(o=>d.append(el("p","msz-muted",esc(o.title||o.name)+" · "+esc(o.status))));}catch(err){d.append(el("p","msz-muted",err.message||"Zone assignments could not be loaded."));}
 d.append(btn("View QR","msz-btn",()=>showQr(z)));
}
async function showQr(z){const d=root.querySelector("[data-msz-detail]");let data;try{data=await API.get("zones/"+z.id+"/qr");}catch(err){notice(err.message||"QR code could not be loaded.");return;}d.replaceChildren(el("h2","",z.name+" · QR identity"));const raw=String(data.qr_code||"");if(!raw){d.append(el("p","msz-muted","No QR image is stored for this zone."));return;}const img=el("img","msz-qr");img.alt="QR code for "+z.name;img.src=raw.startsWith("data:")?raw:"data:image/png;base64,"+raw;d.append(img,el("p","msz-muted","This QR identifies the zone; it does not grant access by itself."),btn("Download QR PNG","msz-btn",()=>{const a=el("a");a.href=img.src;a.download="mechnar-zone-"+z.id+".png";a.click();}));}
function zoneForm(existing){const siteId=existing?.location_id||window.CleanTrackAuth?.getCurrentUser?.()?.location_id; if(!siteId){notice("Zone editing is available only within your assigned location.");return;}const d=root.querySelector("[data-msz-detail]");d.replaceChildren(el("h2","",existing?"Edit zone":"Create zone"));const form=el("form","msz-form");const field=(label,type,value)=>{const l=el("label","",label),i=el("input");i.type=type;i.value=value||"";l.append(i);form.append(l);return i;};const name=field("Zone name","text",existing?.name);name.required=true;const floor=field("Floor / internal area","text",existing?.floor_label||existing?.floor);const desc=el("textarea");desc.rows=3;desc.value=existing?.description||"";const dl=el("label","","Description");dl.append(desc);form.append(dl);const save=btn(existing?"Save changes":"Create zone","msz-btn msz-primary",async()=>{if(!name.value.trim())return;save.disabled=true;try{const payload={name:name.value.trim(),floor_label:floor.value.trim(),description:desc.value.trim()};if(existing)await API.put("zones/"+existing.id,payload);else{payload.location_id=siteId;await API.post("zones",payload);}await load();draw();notice("Zone saved.");if(selected)select(selected);}catch(err){notice(err.message||"Zone could not be saved.");save.disabled=false;}});form.append(save);if(existing)form.append(btn("Archive zone","msz-btn",async()=>{if(!confirm("Archive this zone? Existing records and assignments should remain traceable."))return;try{await API.put("zones/"+existing.id,{status:"archived"});await load();draw();select(selected);notice("Zone archived.");}catch(err){notice(err.message||"Zone could not be archived.");}}));d.append(form);}
async function render(container){root=container;root.replaceChildren();const page=el("section","msz-page");const s=el("style");s.textContent=style;page.append(s);const head=el("header","msz-head"),title=el("div");title.append(el("p","msz-eyebrow","ORGANISATION DIRECTORY  /  OPERATIONAL AREAS"),el("h1","","Sites & Zones"),el("p","msz-sub","Sites are the organisation's physical locations. Zones are the internal blocks, floors and work areas within each site. You can view the organisation's site directory; zone details and controls are limited to your authorised area."));const tools=el("div","msz-tools"),search=el("input","msz-search");search.placeholder="Search sites, addresses…";search.setAttribute("aria-label","Search organisation sites");search.addEventListener("input",()=>{query=search.value.toLowerCase();draw();});tools.append(search);head.append(title,tools);page.append(head);const n=el("p","msz-muted");n.dataset.mszNotice="1";page.append(n);const stats=el("div","msz-stats");stats.dataset.mszStats="1";page.append(stats);const layout=el("div","msz-layout"),left=el("section","msz-section"),right=el("aside","msz-section");left.append(el("h2","","Organisation sites"),el("div","msz-sites"));left.lastChild.dataset.mszSites="1";const zonesPanel=el("section","msz-section");zonesPanel.dataset.mszZones="1";zonesPanel.append(el("h2","","Authorised zones"));left.append(zonesPanel);right.append(el("div","msz-detail"));right.lastChild.dataset.mszDetail="1";right.lastChild.append(el("p","msz-empty","Select a site or zone to view its details."));layout.append(left,right);page.append(layout);root.append(page);try{await load();draw();}catch(err){notice(err.message||"Sites & Zones could not be loaded. Refresh and try again.");}}
window.MechnarSupervisorSitesZones=Object.freeze({render});
})();