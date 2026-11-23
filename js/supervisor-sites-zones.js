(function(){
"use strict";
const API=window.CleanTrackApi;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const btn=(label,cls,fn)=>{const n=el("button",cls,label);n.type="button";n.addEventListener("click",fn);return n;};
const list=(v,k)=>Array.isArray(v)?v:Array.isArray(v?.[k])?v[k]:[];
const esc=v=>String(v??"").trim()||"Not recorded";
const active=v=>String(v||"active").toLowerCase();
let root,locations=[],zones=[],operations=[],selected=null,query="",map=null;
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

function canManageZone(z){return zones.some(row=>String(row.id)===String(z.id));}
function openModal(title,build){
 const back=el("div","msz-modal-backdrop"),box=el("section","msz-modal"),head=el("header","msz-modal-head"),body=el("div","msz-modal-body");
 head.append(el("h2","",title),btn("×","msz-close",()=>back.remove()));
 box.append(head,body);back.append(box);
 back.addEventListener("click",e=>{if(e.target===back)back.remove();});
 document.addEventListener("keydown",function closeOnEscape(e){if(e.key==="Escape"){back.remove();document.removeEventListener("keydown",closeOnEscape);}});
 document.body.append(back);build(body);return back;
}
function showSiteQr(location){const address=siteAddress(location);const destination=location.latitude!=null&&location.longitude!=null?"https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(location.latitude+","+location.longitude):"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([location.name,address].join(", "));openModal(location.name+" · Location QR",d=>{d.append(el("p","msz-muted","Scan to open this organisation location in Maps. This QR is a navigation shortcut, not an access credential."));const holder=el("div","msz-qr");d.append(holder);if(window.QRCode)new QRCode(holder,{text:destination,width:180,height:180,correctLevel:QRCode.CorrectLevel.M});else holder.textContent="QR generator unavailable. Reload while connected to the internet.";d.append(btn("Download QR PNG","msz-btn msz-primary",()=>{const image=holder.querySelector("canvas")||holder.querySelector("img");if(!image)return;const a=el("a");a.href=image.tagName==="CANVAS"?image.toDataURL("image/png"):image.src;a.download="mechnar-location-"+location.id+".png";a.click();}));});}
async function showZoneHistory(z){openModal("Zone activity · "+z.name,async d=>{d.append(el("p","msz-muted","Loading activity history…"));try{const result=await API.get("zones/"+z.id+"/history");const events=list(result,"history");d.replaceChildren();if(!events.length)d.append(el("p","msz-muted","No zone activity has been recorded."));events.forEach(event=>{const row=el("div","msz-history-row");row.append(el("strong","",String(event.action||"Activity").replace(/[._]/g," ")),el("p","",new Date(event.created_at).toLocaleString()),el("p","",typeof event.details==="string"?event.details:JSON.stringify(event.details||{})));d.append(row);});}catch(error){d.replaceChildren(el("p","msz-muted",error.message||"Zone history is unavailable."));}});}
function showQr(z){
 if(!z.qr_token){notice("This zone does not have a QR identity token.");return;}
 openModal(z.name+" · QR code",d=>{
  d.append(el("p","msz-muted","This QR identifies the zone. It does not grant access by itself."));
  const holder=el("div","msz-qr");d.append(holder);
  if(window.QRCode){new QRCode(holder,{text:(window.CleanTrackConfig?.apiBaseUrl||"").replace(/\/$/,"")+"/zones/resolve/"+encodeURIComponent(z.qr_token),width:180,height:180,correctLevel:QRCode.CorrectLevel.M});}
  else holder.append(el("p","msz-muted","QR generator is unavailable. Reload while connected to the internet."));
  d.append(btn("Download QR PNG","msz-btn msz-primary",()=>{
   const image=holder.querySelector("canvas")||holder.querySelector("img");if(!image)return;
   const a=el("a");a.href=image.tagName==="CANVAS"?image.toDataURL("image/png"):image.src;a.download="mechnar-zone-"+z.id+".png";a.click();
  }));
 });
}
async function reportSiteProblem(location){
 openModal("Report a site problem",d=>{
  const form=el("form","msz-form");
  const categoryLabel=el("label","msz-field"),category=el("select","msz-select");
  categoryLabel.append(el("span","","Problem type"));
  ["Access issue","Incorrect address or map details","Damaged / non-functional QR code","Zone problem","Other site problem"].forEach(v=>category.append(new Option(v,v)));
  category.insertBefore(new Option("Choose a problem type…","",true,true),category.firstChild);categoryLabel.append(category);form.append(categoryLabel);
  const subjectLabel=el("label","msz-field"),subject=el("input","msz-input");subject.placeholder="Short summary";subjectLabel.append(el("span","","Subject"),subject);form.append(subjectLabel);
  const detailLabel=el("label","msz-field full"),details=el("textarea","msz-textarea");details.rows=4;details.placeholder="Describe the problem and where it occurs.";detailLabel.append(el("span","","Details"),details);form.append(detailLabel);
  const actions=el("div","msz-form-actions");
  actions.append(btn("Cancel","msz-btn",()=>document.querySelector(".msz-modal-backdrop")?.remove()));
  actions.append(btn("Send to Admin","msz-btn msz-primary",async()=>{
   if(!category.value||!subject.value.trim()||!details.value.trim()){notice("Complete the problem type, subject and details.");return;}
   try{const result=await API.post("locations/"+location.id+"/issues",{category:category.value,subject:subject.value.trim(),description:details.value.trim()});document.querySelector(".msz-modal-backdrop")?.remove();notice(result.message||"Problem report sent to Admin.");}
   catch(e){notice(e.message||"Problem report could not be sent.");}
  }));
  form.append(actions);d.append(form);
 });
}
function initMap(){
 const node=root.querySelector("[data-msz-map]");if(!node||!window.L)return;
 try{map=L.map(node,{scrollWheelZoom:false}).setView([20.5937,78.9629],4);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(map);
 const points=[];
 locations.forEach(location=>{if(location.latitude==null||location.longitude==null)return;const marker=L.marker([Number(location.latitude),Number(location.longitude)]).addTo(map).bindPopup(String(location.name));marker.on("click",()=>select(location.id));points.push([Number(location.latitude),Number(location.longitude)]);});
 if(points.length===1)map.setView(points[0],14);else if(points.length>1)map.fitBounds(points,{padding:[25,25],maxZoom:13});
 }catch(e){node.textContent="Map unavailable. Saved location details remain accessible.";}
}
async function searchMapAddress(){
 const input=root.querySelector("[data-msz-map-search]"),term=input?.value.trim();if(!term)return;
 const button=root.querySelector("[data-msz-map-find]");button.disabled=true;
 try{const response=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q="+encodeURIComponent(term),{headers:{Accept:"application/json"}});
 if(!response.ok)throw Error("Address search is unavailable.");const results=await response.json();if(!results.length)throw Error("No matching address was found.");
 const point=results[0];notice("Address located: "+point.display_name+". This preview does not change saved location records.");
 if(map){map.setView([Number(point.lat),Number(point.lon)],15);L.marker([Number(point.lat),Number(point.lon)]).addTo(map).bindPopup(String(point.display_name)).openPopup();}
 }catch(e){notice(e.message||"Address search failed.");}finally{button.disabled=false;}
}
function exportPdf(){
 const popup=window.open("","_blank");if(!popup){notice("Allow pop-ups to generate the PDF report.");return;}
 const escHtml=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const body=locations.map(location=>{
  const related=zones.filter(z=>String(z.location_id)===String(location.id));
  const zoneRows=related.map(z=>"<tr><td>"+escHtml(z.name)+"</td><td>"+escHtml(z.floor_label||"—")+"</td><td>"+escHtml(z.status)+"</td></tr>").join("");
  return "<section><h2>"+escHtml(location.name)+"</h2><p>"+escHtml(location.address||"Address not recorded")+" · "+escHtml(location.status)+"</p><table><tr><th>Zone</th><th>Floor / area</th><th>Status</th></tr>"+(zoneRows||"<tr><td colspan='3'>No visible zones</td></tr>")+"</table></section>";
 }).join("");
 popup.document.write("<!doctype html><html><head><title>MECHNAR Sites & Zones Report</title><style>body{font:13px Arial;color:#222;margin:32px}h1{font-size:24px}section{margin:24px 0;break-inside:avoid}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:7px;text-align:left}th{background:#eee}</style></head><body><h1>MECHNAR · Sites & Zones</h1><p>Generated "+escHtml(new Date().toLocaleString())+" · "+locations.length+" locations · "+zones.length+" visible zones</p>"+body+"<script>window.onload=function(){window.print()}<\/script></body></html>");
 popup.document.close();
}

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
 else if(!scoped.length)zoneBox.append(el("p","msz-empty",selectedSite.supervisor_authorized?"No zones have been created inside this authorised site yet.":"No zones are assigned to your supervisor access for this site."));
 if(selectedSite?.supervisor_authorized){const createActions=el("div","msz-actions");createActions.append(btn("+ Create zone","msz-btn msz-primary",()=>zoneForm(null,selectedSite)));zoneBox.append(createActions);}
 scoped.forEach(z=>{
  const item=el("article","msz-zone"),top=el("div","msz-zone-top");top.append(el("h3","",z.name),el("span","msz-pill",esc(z.status)));
  item.append(top,el("p","",[(z.floor_label||z.floor),z.description].filter(Boolean).join(" · ")||"No additional zone description."));
  const assigned=Array.isArray(z.assigned_people)?z.assigned_people.length:Number(z.employee_count??z.member_count??0);
  const opCount=Number(z.operation_count??operations.filter(o=>String(o.zone_id)===String(z.id)).length);
  item.append(el("p","",assigned+" assigned staff · "+opCount+" operations"));
  const actions=el("div","msz-actions");actions.append(btn("Details","msz-btn",()=>zoneDetails(z)));
  if(z.qr_enabled!==false)actions.append(btn("View QR","msz-btn",()=>showQr(z)));
  if(canManageZone(z))actions.append(btn("Edit","msz-btn",()=>zoneForm(z)));
  item.append(actions);zoneBox.append(item);
 });
 const m=root.querySelector("[data-msz-stats]");m.replaceChildren();
 const activeSites=locations.filter(x=>active(x.status)==="active").length;
 const activeZones=zones.filter(x=>active(x.status)==="active").length;
 [[locations.length,"Organisation sites"],[activeSites,"Active sites"],[zones.length,"Zones in your authorised scope"]].forEach(([v,t])=>{const s=el("div","msz-stat");s.append(el("strong","",v),el("span","",t));m.append(s);});
}
function select(id){selected=id;draw();const l=locations.find(x=>String(x.id)===String(id));const d=root.querySelector("[data-msz-detail]");d.replaceChildren(el("h2","",l.name));[[ "Address",siteAddress(l)],["Description",esc(l.description)],["Status",esc(l.status)],["Assigned team",esc(l.team_name||l.team_id)],["Map coordinates",l.latitude!=null&&l.longitude!=null?l.latitude+", "+l.longitude:"Not recorded"]].forEach(([k,v])=>{const r=el("div","msz-kv");r.append(el("span","",k),el("span","",v));d.append(r);});
 if(l.latitude!=null&&l.longitude!=null){const a=el("a","msz-map","Open directions ↗");a.href="https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(l.latitude+","+l.longitude);a.target="_blank";a.rel="noopener noreferrer";d.append(a);}
 const hist=btn("View site activity","msz-btn",()=>history(l));const report=btn("Report a problem","msz-btn",()=>reportSiteProblem(l));const siteQr=btn("Generate site QR","msz-btn",()=>showSiteQr(l));const actions=el("div","msz-actions");actions.append(hist,siteQr,report);d.append(actions);
}
async function history(l){const d=root.querySelector("[data-msz-detail]");let box=d.querySelector("[data-msz-history]");if(box)box.remove();box=el("div");box.dataset.mszHistory="1";box.append(el("h3","","Site activity"));d.append(box);try{const r=await API.get("locations/"+l.id+"/history");const events=list(r,"history");if(!events.length)box.append(el("p","msz-muted","No site activity is recorded."));events.forEach(x=>box.append(el("p","msz-muted",new Date(x.created_at).toLocaleString()+" · "+esc(x.action)+" · "+esc(typeof x.details==="string"?x.details:JSON.stringify(x.details)))));}catch(err){box.append(el("p","msz-muted",err.message||"Site activity is unavailable."));}}
async function zoneDetails(z){const d=root.querySelector("[data-msz-detail]");d.replaceChildren(el("h2","",z.name),el("p","msz-muted","Zone inside "+esc(z.location_name||locations.find(l=>String(l.id)===String(z.location_id))?.name)));
 try{const [detail,ops]=await Promise.all([API.get("zones/"+z.id),API.get("operations")]);const zone=detail.zone||z;d.append(el("h3","","Assigned staff"));const staff=list(zone,"assigned_people");if(!staff.length)d.append(el("p","msz-muted","No staff are currently assigned through this zone's team."));staff.forEach(p=>d.append(el("p","msz-muted",esc(p.full_name||p.name||p.email)+" · "+esc(p.role))));d.append(el("h3","","Operations"));const tasks=list(ops,"operations").filter(o=>String(o.zone_id)===String(z.id));if(!tasks.length)d.append(el("p","msz-muted","No operations are linked to this zone."));tasks.slice(0,20).forEach(o=>d.append(el("p","msz-muted",esc(o.title||o.name)+" · "+esc(o.status))));}catch(err){d.append(el("p","msz-muted",err.message||"Zone assignments could not be loaded."));}
 const actions=el("div","msz-actions");actions.append(btn("Activity history","msz-btn",()=>showZoneHistory(z)),btn("View QR","msz-btn",()=>showQr(z)));d.append(actions);
}
function showQr(z){if(!z.qr_token){notice("This zone does not have a QR identity token.");return;}openModal(z.name+" · QR code",d=>{d.append(el("p","msz-muted","This QR identifies the zone; it does not grant access by itself."));const holder=el("div","msz-qr");d.append(holder);if(window.QRCode)new QRCode(holder,{text:(window.CleanTrackConfig?.apiBaseUrl||"").replace(/\/$/,"")+"/zones/resolve/"+encodeURIComponent(z.qr_token),width:180,height:180});else holder.textContent="QR generator unavailable. Reload while connected to the internet.";d.append(btn("Download QR PNG","msz-btn msz-primary",()=>{const img=holder.querySelector("canvas")||holder.querySelector("img");if(!img)return;const a=el("a");a.href=img.tagName==="CANVAS"?img.toDataURL("image/png"):img.src;a.download="mechnar-zone-"+z.id+".png";a.click();}));});}
function zoneForm(existing,chosenSite){const assignedSite=chosenSite||locations.find(l=>l.supervisor_authorized);const siteId=existing?.location_id||assignedSite?.id;if(!siteId||(!existing&&!locations.find(l=>String(l.id)===String(siteId))?.supervisor_authorized)||(existing&&!canManageZone(existing))){notice("Zone management is available only within your authorised scope.");return;}const d=root.querySelector("[data-msz-detail]");d.replaceChildren(el("h2","",existing?"Edit zone":"Create zone"));const form=el("form","msz-form");const field=(label,type,value)=>{const l=el("label","",label),i=el("input");i.type=type;i.value=value||"";l.append(i);form.append(l);return i;};const name=field("Zone name","text",existing?.name);name.required=true;const floor=field("Floor / internal area","text",existing?.floor_label||existing?.floor);const desc=el("textarea");desc.rows=3;desc.value=existing?.description||"";const dl=el("label","","Description");dl.append(desc);form.append(dl);const save=btn(existing?"Save changes":"Create zone","msz-btn msz-primary",async()=>{if(!name.value.trim())return;save.disabled=true;try{const payload={name:name.value.trim(),floor_label:floor.value.trim(),description:desc.value.trim()};if(existing)await API.patch("zones/"+existing.id,payload);else{payload.location_id=siteId;await API.post("zones",payload);}await load();draw();notice("Zone saved.");if(selected)select(selected);}catch(err){notice(err.message||"Zone could not be saved.");save.disabled=false;}});form.append(save);if(existing)form.append(btn("Archive zone","msz-btn",async()=>{if(!confirm("Archive this zone? Existing records and assignments should remain traceable."))return;try{await API.patch("zones/"+existing.id,{status:"archived"});await load();draw();select(selected);notice("Zone archived.");}catch(err){notice(err.message||"Zone could not be archived.");}}));d.append(form);}
function exportData(){const headers=["record_type","site_id","site_name","address","city","country","site_status","zone_id","zone_name","floor","zone_status","description"];const quote=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const data=[headers];locations.forEach(l=>{const zs=zones.filter(z=>String(z.location_id)===String(l.id));if(!zs.length)data.push(["site",l.id,l.name,l.address,l.city,l.country,l.status,"","","","",""]);zs.forEach(z=>data.push(["zone",l.id,l.name,l.address,l.city,l.country,l.status,z.id,z.name,z.floor_label||z.floor,z.status,z.description]));});const blob=new Blob(["\\ufeff"+data.map(r=>r.map(quote).join(",")).join("\\r\\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="mechnar-sites-zones.csv";a.click();URL.revokeObjectURL(url);notice("Exported "+locations.length+" organisation sites and "+zones.length+" authorised zones.");}
async function render(container){root=container;root.replaceChildren();const page=el("section","msz-page");const s=el("style");s.textContent=style+`.msz-map-wrap{margin:0 0 20px;border:1px solid var(--border,#383840);border-radius:11px;overflow:hidden}.msz-map{height:310px;background:#24242a}.msz-map-tools{display:flex;gap:8px;padding:10px}.msz-map-tools input{flex:1;min-width:0}.msz-modal-backdrop{position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.68);display:grid;place-items:center;padding:20px}.msz-modal{width:min(660px,100%);max-height:85vh;overflow:auto;background:var(--surface,#17171d);color:inherit;border:1px solid var(--border,#444);border-radius:13px;box-shadow:0 24px 80px rgba(0,0,0,.45)}.msz-modal-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--border,#383840)}.msz-modal-head h2{font-size:17px;margin:0}.msz-modal-body{padding:18px}.msz-close{background:transparent;border:0;color:inherit;font-size:22px;cursor:pointer}.msz-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.msz-field{display:grid;gap:5px;font-size:12px;color:var(--muted,#999)}.msz-field.full,.msz-form-actions{grid-column:1/-1}.msz-field input,.msz-field select,.msz-field textarea{box-sizing:border-box;width:100%;background:var(--surface,#17171d);color:inherit;border:1px solid var(--border,#444);border-radius:8px;padding:9px}.msz-form-actions{display:flex;justify-content:flex-end;gap:8px}.msz-qr{width:210px;height:210px;background:white;padding:10px;margin:12px auto;display:grid;place-items:center}.msz-qr canvas,.msz-qr img{max-width:100%;max-height:100%}@media(max-width:560px){.msz-form{grid-template-columns:1fr}.msz-field.full,.msz-form-actions{grid-column:auto}}`;page.append(s);const head=el("header","msz-head"),title=el("div");title.append(el("p","msz-eyebrow","ORGANISATION DIRECTORY  /  OPERATIONAL AREAS"),el("h1","","Sites & Zones"),el("p","msz-sub","Sites are the organisation's physical locations. Zones are the internal blocks, floors and work areas within each site. You can view the organisation's site directory; zone details and controls are limited to your authorised area."));const tools=el("div","msz-tools"),search=el("input","msz-search");search.placeholder="Search sites, addresses…";search.setAttribute("aria-label","Search organisation sites");search.addEventListener("input",()=>{query=search.value.toLowerCase();draw();});tools.append(search,btn("Export CSV","msz-btn",exportData),btn("PDF report","msz-btn",exportPdf));head.append(title,tools);page.append(head);const mapWrap=el("section","msz-map-wrap"),mapHead=el("div","msz-map-head");mapHead.append(el("strong","","Organisation location map"),el("span","msz-muted","Saved location pins"));const mapNode=el("div","msz-map");mapNode.dataset.mszMap="1";const mapTools=el("div","msz-map-tools"),mapSearch=el("input","msz-search");mapSearch.placeholder="Search an address on the map…";mapSearch.dataset.mszMapSearch="1";const mapFind=btn("Find address","msz-btn",searchMapAddress);mapFind.dataset.mszMapFind="1";mapTools.append(mapSearch,mapFind);mapWrap.append(mapHead,mapNode,mapTools);page.append(mapWrap);const n=el("p","msz-muted");n.dataset.mszNotice="1";page.append(n);const stats=el("div","msz-stats");stats.dataset.mszStats="1";page.append(stats);const layout=el("div","msz-layout"),left=el("section","msz-section"),right=el("aside","msz-section");left.append(el("h2","","Organisation sites"),el("div","msz-sites"));left.lastChild.dataset.mszSites="1";const zonesPanel=el("section","msz-section");zonesPanel.dataset.mszZones="1";zonesPanel.append(el("h2","","Authorised zones"));left.append(zonesPanel);right.append(el("div","msz-detail"));right.lastChild.dataset.mszDetail="1";right.lastChild.append(el("p","msz-empty","Select a site or zone to view its details."));layout.append(left,right);page.append(layout);root.append(page);try{await load();draw();initMap();}catch(err){notice(err.message||"Sites & Zones could not be loaded. Refresh and try again.");}}
window.MechnarSupervisorSitesZones=Object.freeze({render});
})();