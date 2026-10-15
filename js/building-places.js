(function(){
"use strict";
const CATS=[["all","All named places"],["restaurants","Restaurants, cafés and food"],["shopping","Malls and shopping"],["shops","Shops and supermarkets"],["hotels","Hotels and accommodation"],["health","Hospitals, clinics and pharmacies"],["transport","Transport and parking"],["offices","Offices, banks and coworking"],["education","Schools and universities"],["leisure","Parks, gyms and recreation"],["services","Public services and amenities"]];
const RADII=[["250","Within 250 m"],["500","Within 500 m"],["1000","Within 1 km"],["2000","Within 2 km"],["5000","Within 5 km"]];
let lastSearchAt=0;
function el(t,c,x){const n=document.createElement(t);if(c)n.className=c;if(x!==undefined&&x!==null)n.textContent=String(x);return n;}
function button(x,c,fn){const n=el("button",c||"ct-place-button",x);n.type="button";n.addEventListener("click",fn);return n;}
function field(x,n,h){const l=el("label","ct-place-field");l.append(el("span","",x),n);if(h)l.append(el("small","ct-place-muted",h));return l;}
function input(t,v,ph){const n=el("input","ct-place-input");n.type=t;n.value=v||"";if(ph)n.placeholder=ph;return n;}
function select(opts,v){const n=el("select","ct-place-input");opts.forEach(([x,l])=>{const o=el("option","",l);o.value=x;n.appendChild(o)});n.value=v;return n;}
function status(n,msg,kind){n.textContent=msg||"";n.className="ct-place-status"+(kind?" "+kind:"");}
function safeUrl(v){if(!v)return "";try{const u=new URL(String(v).startsWith("www.")?"https://"+v:String(v));return ["http:","https:"].includes(u.protocol)?u.href:"";}catch(_){return "";}}
function addLink(parent,label,url){const href=safeUrl(url);if(!href)return;const a=el("a","ct-place-link",label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";parent.appendChild(a);}
function addressOf(t){if(t["addr:full"])return t["addr:full"];const a=[t["addr:housenumber"],t["addr:street"]].filter(Boolean).join(" "),b=[t["addr:unit"],t["addr:floor"]&&("Floor "+t["addr:floor"])].filter(Boolean).join(", "),c=[t["addr:suburb"],t["addr:neighbourhood"],t["addr:quarter"],t["addr:district"],t["addr:city"]||t["addr:town"]||t["addr:village"]].filter((v,i,a)=>v&&a.indexOf(v)===i).join(", "),d=[t["addr:state"],t["addr:postcode"],t["addr:country"]].filter(Boolean).join(" ");return [a,b,c,d].filter(Boolean).join(", ");}
function categoryOf(t){const a=[["amenity","restaurant","Restaurant"],["amenity","fast_food","Fast food"],["amenity","cafe","Café"],["amenity","bar","Bar"],["amenity","pub","Pub"],["amenity","food_court","Food court"],["shop","mall","Shopping mall"],["shop","supermarket","Supermarket"],["tourism","hotel","Hotel"],["tourism","hostel","Hostel"],["amenity","hospital","Hospital"],["amenity","clinic","Clinic"],["amenity","pharmacy","Pharmacy"],["amenity","school","School"],["amenity","university","University"],["leisure","park","Park"],["leisure","fitness_centre","Gym / fitness"],["amenity","bank","Bank"],["amenity","parking","Parking"]];for(const [k,v,l] of a)if(String(t[k]||"").toLowerCase()===v)return l;for(const k of ["amenity","shop","tourism","leisure","office","healthcare","public_transport","railway","building"])if(t[k]&&t[k]!=="yes")return String(t[k]).replace(/_/g," ").replace(/\b\w/g,ch=>ch.toUpperCase());return "Place";}
function distance(a,b,c,d){const r=v=>v*Math.PI/180,dy=r(c-a),dx=r(d-b),z=Math.sin(dy/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dx/2)**2;return 12742000*Math.atan2(Math.sqrt(z),Math.sqrt(Math.max(0,1-z)));}
function pretty(m){return m<1000?Math.round(m)+" m":(m/1000).toFixed(m<10000?1:0)+" km";}
function queryFor(target,cat,radius){
 const a="(around:"+Number(radius)+","+Number(target.lat)+","+Number(target.lon)+")";
 const q={
 all:['nwr'+a+'["name"];'],
 restaurants:['nwr'+a+'["amenity"~"^(restaurant|fast_food|cafe|bar|pub|food_court|ice_cream|biergarten)$"]["name"];'],
 shopping:['nwr'+a+'["shop"~"^(mall|department_store|variety_store)$"]["name"];','nwr'+a+'["amenity"="marketplace"]["name"];'],
 shops:['nwr'+a+'["shop"]["name"];'],
 hotels:['nwr'+a+'["tourism"~"^(hotel|motel|hostel|guest_house|apartment|resort)$"]["name"];'],
 health:['nwr'+a+'["amenity"~"^(hospital|clinic|doctors|dentist|pharmacy|veterinary)$"]["name"];','nwr'+a+'["healthcare"]["name"];'],
 transport:['nwr'+a+'["public_transport"]["name"];','nwr'+a+'["railway"~"^(station|halt|subway_entrance)$"]["name"];','nwr'+a+'["amenity"~"^(bus_station|taxi|parking|fuel)$"]["name"];'],
 offices:['nwr'+a+'["office"]["name"];','nwr'+a+'["amenity"~"^(bank|post_office|coworking_space)$"]["name"];'],
 education:['nwr'+a+'["amenity"~"^(school|university|college|kindergarten|training)$"]["name"];'],
 leisure:['nwr'+a+'["leisure"~"^(park|fitness_centre|sports_centre|playground|garden|swimming_pool)$"]["name"];','nwr'+a+'["amenity"~"^(cinema|theatre|library|arts_centre)$"]["name"];'],
 services:['nwr'+a+'["amenity"~"^(police|fire_station|post_office|community_centre|place_of_worship|toilets|drinking_water)$"]["name"];']
 };return "[out:json][timeout:25];("+(q[cat]||q.all).join(" ")+");out center tags;";
}
function renderResults(box,items,target,radius){
 box.replaceChildren();const unique=new Map();
 (Array.isArray(items)?items:[]).forEach(x=>{const t=x.tags||{},lat=Number(x.lat??x.center?.lat),lon=Number(x.lon??x.center?.lon);if(!t.name||!Number.isFinite(lat)||!Number.isFinite(lon))return;const k=x.type+":"+x.id;if(!unique.has(k))unique.set(k,{x,t,lat,lon,d:distance(target.lat,target.lon,lat,lon)});});
 const rows=Array.from(unique.values()).sort((a,b)=>a.d-b.d);
 if(!rows.length){box.append(el("div","ct-place-empty","No named places matched this building, category and radius in the available map data. Try a wider radius or another category. No sample listings are shown."));return;}
 const summary=el("div","ct-place-summary");summary.append(el("strong","",rows.length+" places found"),el("span","ct-place-muted","Within "+pretty(Number(radius))+" of "+target.name+" · nearest first · details depend on source coverage"));box.appendChild(summary);
 const fragment=document.createDocumentFragment();
 rows.forEach(p=>{
  const t=p.t,x=p.x,lat=p.lat,lon=p.lon,title=String(t.name),addr=addressOf(t),row=el("article","ct-place-card"),top=el("div","ct-place-card-top"),ident=el("div","ct-place-identity");
  ident.append(el("span","ct-place-category",categoryOf(t)),el("h3","",title),el("p","ct-place-address",addr||"Street address not listed in map data"));
  top.append(ident,el("span","ct-place-distance",pretty(p.d)));row.appendChild(top);
  const dl=el("dl","ct-place-details"),add=(label,value)=>{if(value!==undefined&&value!==null&&String(value).trim()!=="")dl.append(el("dt","",label),el("dd","",String(value).replace(/;/g," · ")));};
  add("Opening hours",t.opening_hours||t["opening_hours:covid19"]);add("Phone",t["contact:phone"]||t.phone||t["contact:mobile"]);add("Website",t["contact:website"]||t.website);add("Email",t["contact:email"]||t.email);add("Brand / operator",t.brand||t.operator);add("Cuisine / speciality",t.cuisine||t["healthcare:speciality"]);add("Accessibility",t.wheelchair?("Wheelchair: "+t.wheelchair):"");
  add("Building / floor",[t.building,t["building:levels"]&&(t["building:levels"]+" floors"),t.level&&("Level "+t.level),t["addr:unit"]&&("Unit "+t["addr:unit"]),t["addr:floor"]&&("Floor "+t["addr:floor"])].filter(Boolean).join(" · "));
  add("Other information",[t.capacity&&("Capacity: "+t.capacity),t.internet_access&&("Internet: "+t.internet_access),t.payment&&("Payment: "+t.payment),t.delivery&&("Delivery: "+t.delivery),t.takeaway&&("Takeaway: "+t.takeaway)].filter(Boolean).join(" · "));
  if(dl.childNodes.length)row.appendChild(dl);
  const links=el("div","ct-place-actions"),coords=lat.toFixed(6)+","+lon.toFixed(6);
  addLink(links,"Open map record","https://www.openstreetmap.org/"+encodeURIComponent(x.type||"node")+"/"+encodeURIComponent(x.id)+"#map=19/"+lat+"/"+lon);
  addLink(links,"Directions","https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(coords));addLink(links,"Website",t["contact:website"]||t.website);
  const phone=String(t["contact:phone"]||t.phone||"").replace(/[^\d+*#]/g,"");if(phone){const a=el("a","ct-place-link","Call");a.href="tel:"+phone;links.appendChild(a);}
  row.append(links,el("small","ct-place-source","OpenStreetMap · "+String(x.type||"place")+" #"+String(x.id||"")+" · "+coords));fragment.appendChild(row);
 });box.appendChild(fragment);
}
async function lookup(target,category,radius,statusNode,resultNode,searchButton){
 searchButton.disabled=true;status(statusNode,"Searching real place records around "+target.name+"…");resultNode.replaceChildren();
 try{
  const query=queryFor(target,category,radius),endpoints=["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];let payload=null,last=null;
  for(const endpoint of endpoints){const ctrl=new AbortController(),timer=window.setTimeout(()=>ctrl.abort(),30000);try{const res=await fetch(endpoint,{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query),signal:ctrl.signal});if(!res.ok)throw new Error("Nearby place service returned HTTP "+res.status+".");payload=await res.json();break;}catch(e){last=e;}finally{window.clearTimeout(timer);}}
  if(!payload)throw new Error(last&&last.name==="AbortError"?"Search timed out. Try a smaller radius or narrower category.":(last&&last.message)||"Nearby place data is unavailable.");
  const items=Array.isArray(payload.elements)?payload.elements:[];renderResults(resultNode,items,target,radius);
  status(statusNode,"Search complete for "+target.name+". "+items.length+" source records returned. Address, opening hours, phone and website are displayed only when provided by the source.","is-success");
 }catch(e){status(statusNode,(e.message||"Nearby places could not be loaded.")+" Try another radius or retry later.","is-error");}
 finally{searchButton.disabled=false;if(window.CleanTrackPreferences)window.CleanTrackPreferences.applyLanguage();}
}
function render(panel){
 panel.replaceChildren();let target=null;
 const intro=el("div","ct-place-intro");intro.append(el("h2","","Find a building and nearby places"),el("p","ct-place-muted","Search a specific building, mall, office complex, campus or street address. Then browse actual nearby restaurants, malls, shops, hotels, hospitals, transport, schools and facilities. This uses text search rather than a country map."));
 const form=el("form","ct-place-search-form"),q=input("search","","Building or exact address (e.g. Cyber Towers, HITEC City, Hyderabad)");q.required=true;q.autocomplete="off";const find=button("Find building","ct-place-button ct-place-primary",null);find.type="submit";form.append(field("Building name or full street address",q,"Include the building/complex name and street or neighbourhood for a precise match."),find);
 const findStatus=el("div","ct-place-status","Search for a building to see exact text matches.");findStatus.setAttribute("role","status");const matches=el("div","ct-place-matches");
 const chosen=el("section","ct-place-selected");chosen.hidden=true;const chosenName=el("h3",""),chosenAddress=el("p","ct-place-muted");
 const filters=el("div","ct-place-filter-row"),cat=select(CATS,"all"),radius=select(RADII,"1000");filters.append(field("Nearby place type",cat),field("Search radius",radius));
 const nearbyStatus=el("div","ct-place-status","After choosing the exact building, select a category and radius.");nearbyStatus.setAttribute("role","status");const results=el("div","ct-place-results");
 const nearby=button("Search nearby places","ct-place-button ct-place-primary",()=>{if(!target){status(nearbyStatus,"Choose an exact building/address match first.","is-error");return;}lookup(target,cat.value,radius.value,nearbyStatus,results,nearby);});
 chosen.append(chosenName,chosenAddress,filters,nearby,nearbyStatus,results);
 async function searchBuildings(value){
  find.disabled=true;find.textContent="Searching…";matches.replaceChildren();status(findStatus,"Looking up building names and full addresses…");
  try{
   const wait=Math.max(0,1100-(Date.now()-lastSearchAt));if(wait)await new Promise(r=>window.setTimeout(r,wait));lastSearchAt=Date.now();
   const url="https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&namedetails=1&limit=10&q="+encodeURIComponent(value);
   const response=await fetch(url,{headers:{"Accept":"application/json","Accept-Language":document.documentElement.lang||"en"}});
   if(!response.ok)throw new Error("Building search returned HTTP "+response.status+".");
   const data=await response.json();if(!Array.isArray(data)||!data.length){status(findStatus,"No building/address match found. Try the building's official name, street address, complex name or nearby landmark.","is-error");return;}
   status(findStatus,data.length+" matches found. Select the actual building/complex, not only a city or neighbourhood.","is-success");
   data.forEach(place=>{
    const name=place.name||String(place.display_name||"").split(",")[0]||"Place",addr=String(place.display_name||""),lat=Number(place.lat),lon=Number(place.lon);
    const row=el("article","ct-place-match"),copy=el("div","ct-place-match-copy");copy.append(el("strong","",name),el("span","ct-place-type",String(place.type||place.class||"place").replace(/_/g," ")),el("small","",addr));
    row.append(copy,button("Explore around this building","ct-place-button ct-place-primary",()=>{if(!Number.isFinite(lat)||!Number.isFinite(lon)){status(findStatus,"This result did not contain valid coordinates. Choose another match.","is-error");return;}target={lat,lon,name,address:addr};chosen.hidden=false;chosenName.textContent=name;chosenAddress.textContent=addr;results.replaceChildren();status(nearbyStatus,"Building selected. Choose a category and radius, then search nearby places.");chosen.scrollIntoView({behavior:"smooth",block:"start"});}));
    matches.appendChild(row);
   });
  }catch(e){status(findStatus,(e.message||"Building search failed.")+" Try again later.","is-error");}
  finally{find.disabled=false;find.textContent="Find building";if(window.CleanTrackPreferences)window.CleanTrackPreferences.applyLanguage();}
 }
 form.addEventListener("submit",e=>{e.preventDefault();const value=q.value.trim();if(value)searchBuildings(value);});
 panel.append(intro,form,findStatus,matches,chosen);
}
window.CleanTrackBuildingPlaces=Object.freeze({render});
})();