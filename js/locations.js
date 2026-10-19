(function () {
  "use strict";
  const API=window.CleanTrackApi, AUTH=window.CleanTrackAuth;
  let root=null,map=null,layer=null,buildingLayer=null,landmarkLayer=null,buildingRefreshTimer=null,landmarkRefreshTimer=null,lastBuildingFetchAt=0,lastBuildingBounds="",lastLandmarkFetchAt=0,lastLandmarkBounds="",locations=[],teams=[],zones=[],operations=[],selectedId=null,editingId=null,candidate=null,mapCardNode=null,mapToggleButton=null,searchBoxNode=null;
  let query="",statusFilter="all",dataStatus={teams:true,zones:true,operations:true},lastPlaceSearchAt=0,noticeNode=null,mapNotice=null,formNode=null,detailNode=null,searchResultsNode=null,busy=false,importBusy=false,locationFloorPlanUrl=null;
  const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!==undefined&&x!==null)n.textContent=String(x);return n;};
  const btn=(x,c,fn,type)=>{const n=el("button",c||"ct-loc-btn",x);n.type=type||"button";if(fn)n.addEventListener("click",fn);return n;};
  const inp=(type,value,name,placeholder)=>{const n=el("input","ct-loc-input");n.type=type;n.name=name;n.value=value==null?"":String(value);if(placeholder)n.placeholder=placeholder;return n;};
  const txt=(value,fallback)=>value===null||value===undefined||value===""?(fallback||"—"):String(value);
  const coords=x=>{if(!x)return false;const lat=x.latitude,lon=x.longitude;if(lat===null||lat===undefined||lon===null||lon===undefined||String(lat).trim()===""||String(lon).trim()==="")return false;const a=Number(lat),b=Number(lon);return Number.isFinite(a)&&a>=-90&&a<=90&&Number.isFinite(b)&&b>=-180&&b<=180;};
  const teamName=id=>id===null||id===undefined||id===""?"Unassigned":(teams.find(t=>String(t.id)===String(id))?.name||(dataStatus.teams?"Team #"+id+" (not found)":"Team #"+id+" (team list unavailable)"));
  const zonesAt=x=>zones.filter(z=>String(z.location_id)===String(x.id));
  const opsAt=x=>{const ids=new Set(zonesAt(x).map(z=>String(z.id)));return operations.filter(o=>String(o.location_id)===String(x.id)||ids.has(String(o.zone_id)));};
  const dt=x=>!x?"—":(window.CleanTrackPreferences?.formatDate?window.CleanTrackPreferences.formatDate(x)+" "+window.CleanTrackPreferences.formatTime(x):new Date(x).toLocaleString());
  const d=x=>!x?"—":(window.CleanTrackPreferences?.formatDate?window.CleanTrackPreferences.formatDate(x):new Date(x).toLocaleDateString());
  const rows=(data,key)=>Array.isArray(data?.[key])?data[key]:[];
  function notice(message,kind){if(!noticeNode)return;noticeNode.hidden=!message;noticeNode.className="ct-loc-notice "+(kind||"info");noticeNode.textContent=message||"";}
  function mapMsg(message,error){if(!mapNotice)return;mapNotice.hidden=!message;mapNotice.textContent=message||"";mapNotice.classList.toggle("is-error",!!error);}
  async function load(){const r=await Promise.allSettled([API.get("locations"),API.get("teams"),API.get("zones"),API.get("operations")]);if(r[0].status==="rejected")throw r[0].reason;locations=rows(r[0].value,"locations");dataStatus={teams:r[1].status==="fulfilled",zones:r[2].status==="fulfilled",operations:r[3].status==="fulfilled"};teams=dataStatus.teams?rows(r[1].value,"teams"):[];zones=dataStatus.zones?rows(r[2].value,"zones"):[];operations=dataStatus.operations?rows(r[3].value,"operations"):[];}
  function renderMapPins(){
    if(!map||!layer||!window.L)return;layer.clearLayers();
    locations.filter(coords).forEach(x=>{const s=String(x.status||"active").toLowerCase();const p=L.circleMarker([Number(x.latitude),Number(x.longitude)],{radius:String(selectedId)===String(x.id)?10:7,color:s==="archived"?"#93939d":s==="inactive"?"#dfa64f":"#42cfa4",fillColor:s==="archived"?"#73737d":s==="inactive"?"#dfa64f":"#42cfa4",fillOpacity:.9,weight:2}).addTo(layer);p.bindTooltip(x.name||("Location "+x.id),{permanent:true,direction:"top",offset:[0,-9],opacity:.98,className:"ct-loc-pin-label"});p.on("click",()=>showDetails(x.id,true));});
    if(candidate&&Number.isFinite(candidate.lat)&&Number.isFinite(candidate.lon)){const p=L.marker([candidate.lat,candidate.lon],{draggable:true}).addTo(layer);p.bindTooltip(candidate.label||"Selected pin",{permanent:true,direction:"top",offset:[0,-9],opacity:.98,className:"ct-loc-pin-label"});p.on("dragend",e=>{const g=e.target.getLatLng();setPin(g.lat,g.lng,candidate.label);});}
  }
  function initMap(){
    const box=root&&root.querySelector("#ct-location-map");
    if(!box)return;
    if(!window.L){box.replaceChildren(el("p","ct-loc-map-fallback","The map library did not load. Check your connection and open Browse map again to retry."));return;}
    if(map&&map.getContainer()===box){setTimeout(()=>map&&map.invalidateSize(),80);return;}
    // Always attach exactly one Leaflet map to the current page container.
    if(map){try{map.off();map.remove();}catch(_){}}
    map=null;layer=null;
    map=L.map(box,{scrollWheelZoom:true,zoomControl:true,preferCanvas:true,worldCopyJump:false,maxZoom:20}).setView([20,0],3);
    // Single free, no-key basemap. Avoid offering multiple map layers/providers.
    const tiles=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:20,
      maxNativeZoom:19,
      noWrap:true,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    });
    tiles.on("tileerror",()=>mapMsg("Map tiles could not load. Check your connection. You can still use the saved location directory and place search.",true));
    tiles.addTo(map);
    layer=L.layerGroup().addTo(map);
    buildingLayer=L.layerGroup();
    landmarkLayer=L.layerGroup();
    L.control.layers(
      {"Street map":tiles},
      {
        "Landmarks & localities (OpenStreetMap)":landmarkLayer,
        "Building footprints (OpenStreetMap)":buildingLayer
      },
      {collapsed:true,position:"topright"}
    ).addTo(map);
    map.on("overlayadd",e=>{
      if(e.layer===buildingLayer) loadBuildingFootprints(true);
      if(e.layer===landmarkLayer) loadLandmarks(true);
    });
    map.on("moveend",()=>{
      if(buildingLayer&&map.hasLayer(buildingLayer)){
        if(buildingRefreshTimer)window.clearTimeout(buildingRefreshTimer);
        buildingRefreshTimer=window.setTimeout(()=>loadBuildingFootprints(false),900);
      }
      if(landmarkLayer&&map.hasLayer(landmarkLayer)){
        if(landmarkRefreshTimer)window.clearTimeout(landmarkRefreshTimer);
        landmarkRefreshTimer=window.setTimeout(()=>loadLandmarks(false),1000);
      }
    });
    map.on("click",e=>{
      if(!formNode||formNode.hidden)return;
      setPin(e.latlng.lat,e.latlng.lng,"Map pin");
      notice("Pin placed. Confirm the address and save the location.","success");
    });
    renderMapPins();
    // Use real saved coordinates where available. Without mapped records,
    // show one labelled world view and explain how to add real pins.
    const mappedCount=locations.filter(coords).length;
    if(mappedCount)fitPins();
    else mapMsg("No saved locations have map coordinates yet. Search for a real place above, or add a location and save its coordinates. No sample pins are displayed.",false);
    setTimeout(()=>map&&map.invalidateSize(),100);
  }
  function toggleMapPanel(forceOpen){
    if(!mapCardNode)return;
    const open=typeof forceOpen==="boolean"?forceOpen:mapCardNode.hidden;
    mapCardNode.hidden=!open;
    if(mapToggleButton){
      mapToggleButton.textContent=open?"Hide map":"Browse map";
      mapToggleButton.setAttribute("aria-expanded",open?"true":"false");
    }
    if(open){
      initMap();
      setTimeout(()=>{if(map){map.invalidateSize();renderMapPins();}searchBoxNode&&searchBoxNode.focus({preventScroll:true});},130);
      mapCardNode.scrollIntoView({behavior:"smooth",block:"start"});
    }
  }
  function setPin(lat,lon,label){const same=candidate&&Math.abs(Number(candidate.lat)-Number(lat))<0.000001&&Math.abs(Number(candidate.lon)-Number(lon))<0.000001;candidate=same?{...candidate,lat:Number(lat),lon:Number(lon),label:label||candidate.label||"Map pin"}:{lat:Number(lat),lon:Number(lon),label:label||"Map pin"};if(formNode){const a=formNode.querySelector('[name="latitude"]'),b=formNode.querySelector('[name="longitude"]');if(a)a.value=candidate.lat.toFixed(6);if(b)b.value=candidate.lon.toFixed(6);}renderMapPins();}
  function createPage(container){
    container.replaceChildren();const page=el("section","ct-locations-page");
    const h=el("header","ct-locations-header"),intro=el("div");intro.append(el("p","ct-loc-eyebrow","PLACE DIRECTORY"),el("h1","","Locations"),el("p","ct-loc-muted","Browse real-world places, pin your organization's sites, and manage them against actual teams, zones and operations."));
    const tools=el("div","ct-loc-header-actions");mapToggleButton=btn("Browse map","ct-loc-btn ct-loc-btn-primary",()=>toggleMapPanel());mapToggleButton.setAttribute("aria-expanded","false");tools.append(mapToggleButton,btn("+ Add Location","ct-loc-btn",addLocation));
    const fileLabel=el("label","ct-loc-btn","Import locations");fileLabel.title="Import locations from CSV or GeoJSON";const file=inp("file","","import_file");file.accept=".csv,.geojson,.json";file.hidden=true;file.addEventListener("change",importLocations);fileLabel.append(file);
    tools.append(fileLabel,btn("CSV template","ct-loc-btn",downloadTemplate),btn("Location Package template","ct-loc-btn",downloadPackageTemplate),btn("Export CSV","ct-loc-btn",exportCSV));h.append(intro,tools);
    noticeNode=el("div","ct-loc-notice");noticeNode.hidden=true;noticeNode.setAttribute("role","status");
    const metrics=el("div","ct-loc-metrics");
    const mapCard=el("section","ct-loc-card ct-loc-map-card");mapCard.hidden=true;mapCardNode=mapCard;
    const mh=el("div","ct-loc-section-head"),mt=el("div");mt.append(el("h2","","Browse map"),el("p","ct-loc-muted","Search real countries, cities, roads, landmarks and addresses. Select a result to preview it. A place is added to your organization's directory only after you save it."));const mapHeadActions=el("div","ct-loc-map-head-actions");mapHeadActions.append(el("span","ct-loc-map-chip","Free OpenStreetMap · no API key"),btn("Close map","ct-loc-btn ct-loc-btn-small",()=>toggleMapPanel(false)));mh.append(mt,mapHeadActions);
    const sf=el("form","ct-loc-map-search"),sq=inp("search","","place_query","Search a real place, city, landmark or address");searchBoxNode=sq;sq.autocomplete="off";const sb=btn("Search places","ct-loc-btn ct-loc-btn-primary",null,"submit");sf.append(sq,sb);const guidance=el("p","ct-loc-muted ct-loc-map-guidance","Search results come from OpenStreetMap and are previews, not saved organization records. To show named villages, neighbourhoods and landmarks outside city boundaries, select a place or turn on “Landmarks & localities” in the map layers menu and zoom closer. Use Add Location and Save only to add a record to your organization directory.");searchResultsNode=el("div","ct-loc-search-results");
    sf.addEventListener("submit",e=>{e.preventDefault();searchPlaces(sq.value.trim());});
    mapNotice=el("div","ct-loc-map-notice");mapNotice.hidden=true;
    const mapWrap=el("div","ct-loc-map-wrap"),mapEl=el("div","ct-loc-map");mapEl.id="ct-location-map";mapWrap.append(mapEl);
    const mf=el("div","ct-loc-map-footer");mf.append(el("p","ct-loc-muted","Geographic reference only: this is not indoor routing or employee tracking."),btn("Show all saved pins","ct-loc-btn ct-loc-btn-small",fitPins));
    mapCard.append(mh,sf,guidance,searchResultsNode,mapNotice,mapWrap,mf);
    const add=el("section","ct-loc-card ct-loc-add-card");add.hidden=true;formNode=add;
    detailNode=el("section","ct-loc-card ct-loc-detail-card");detailNode.hidden=true;
    const dir=el("section","ct-loc-card ct-loc-directory"),dh=el("div","ct-loc-section-head"),di=el("div");di.append(el("h2","","Location directory"),el("p","ct-loc-muted","Saved records, team assignments, zones and operation links."));
    const filters=el("div","ct-loc-filters"),q=inp("search",query,"directory_search","Search name, address or team");q.addEventListener("input",()=>{query=q.value;renderDirectory();});
    const status=el("select","ct-loc-input");[["all","All statuses"],["active","Active"],["inactive","Inactive"],["archived","Archived"]].forEach(([v,l])=>{const o=el("option","",l);o.value=v;status.append(o);});status.value=statusFilter;status.addEventListener("change",()=>{statusFilter=status.value;renderDirectory();});filters.append(q,status);dh.append(di,filters);
    const dc=el("div","ct-loc-directory-content");dc.dataset.directory="true";dir.append(dh,dc);
    page.append(h,noticeNode,metrics,mapCard,add,detailNode,dir);container.appendChild(page);
    renderMetrics(metrics);renderDirectory();buildForm();
  }
  function renderMetrics(box){if(!box)return;box.replaceChildren();const active=locations.filter(x=>String(x.status||"active")==="active").length,mapped=locations.filter(coords).length,open=operations.filter(x=>!["completed","complete","approved","done","closed","cancelled","canceled"].includes(String(x.status||"").toLowerCase())).length;
    [[locations.length,"Locations","Saved in this organization"],[active,"Active","Available for new work"],[mapped,"Mapped","Have GPS coordinates"],[dataStatus.operations?open:"—","Open operations",dataStatus.operations?"Across linked records":"Operations API unavailable"]].forEach(([v,l,h])=>{const c=el("article","ct-loc-metric");c.append(el("span","ct-loc-metric-icon","⌖"),el("strong","",String(v)),el("span","",l),el("small","",h));box.append(c);});}
  function renderDirectory(){if(!root)return;const box=root.querySelector("[data-directory]");if(!box)return;box.replaceChildren();const q=query.trim().toLowerCase();const filtered=locations.filter(x=>(statusFilter==="all"||String(x.status||"active").toLowerCase()===statusFilter)&&(!q||[x.name,x.address,x.description,teamName(x.team_id)].join(" ").toLowerCase().includes(q)));
    if(!filtered.length){
      const empty=el("div","ct-loc-empty");
      if(!locations.length){
        empty.append(el("strong","","No saved locations yet"),el("p","","This directory lists only locations saved in your organization database; it does not insert sample places. Search for a real place on the map, or add a location and save it here."));
        const actions=el("div","ct-loc-empty-actions");
        actions.append(btn("Find a place on the map","ct-loc-btn ct-loc-btn-primary",()=>{toggleMapPanel(true);if(searchBoxNode)searchBoxNode.focus({preventScroll:true});}),btn("+ Add Location","ct-loc-btn",addLocation));
        empty.appendChild(actions);
      }else{
        empty.append(el("strong","","No matching locations"),el("p","","No saved location matches the current search and status filters. Clear the search or choose another status."));
      }
      box.append(empty);return;
    }
    const wrap=el("div","ct-loc-table-wrap"),table=el("table","ct-loc-table"),thead=el("thead"),hr=el("tr");["Location","Assigned team","Zones","Operations","Coordinates","Status","Actions"].forEach(v=>hr.append(el("th","",v)));thead.append(hr);const tb=el("tbody");
    filtered.forEach(x=>{const tr=el("tr"),td=el("td","ct-loc-name-cell");td.append(btn(x.name,"ct-loc-text-button",()=>showDetails(x.id,true)),el("small","",x.address||"Address not recorded"));const countZones=x.zone_count??zonesAt(x).length,countOps=x.operation_count??opsAt(x).length,coord=coords(x)?Number(x.latitude).toFixed(5)+", "+Number(x.longitude).toFixed(5):"Not pinned";const st=el("td"),pill=el("span","ct-loc-status status-"+String(x.status||"active").toLowerCase(),txt(x.status,"active"));st.append(pill);const acts=el("td","ct-loc-row-actions");acts.append(btn("Details","ct-loc-btn ct-loc-btn-small",()=>showDetails(x.id,true)),btn("Edit","ct-loc-btn ct-loc-btn-small",()=>editLocation(x.id)));tr.append(td,el("td","",teamName(x.team_id)),el("td","",String(countZones)),el("td","",String(countOps)),el("td","",coord),st,acts);tb.append(tr);});
    table.append(thead,tb);wrap.append(table);box.append(wrap,el("p","ct-loc-table-foot",filtered.length+" of "+locations.length+" records · Loaded from CleanTrack database."));}
  function buildForm(){
    if(!formNode)return;formNode.replaceChildren();const editing=editingId!==null,old=editing?locations.find(x=>String(x.id)===String(editingId)):null;
    const head=el("div","ct-loc-section-head"),copy=el("div");copy.append(el("h2","",editing?"Edit location":"Add a location"),el("p","ct-loc-muted",editing?"Changes are saved to the organization database and added to its audit history.":"Search a place or click directly on the map. You can correct the pin before saving."));head.append(copy,btn("Cancel","ct-loc-btn",cancelForm));formNode.append(head);
    const form=el("form","ct-loc-form"),name=inp("text",old?.name||candidate?.name||"","name","Building or location name");name.maxLength=150;name.required=true;
    const address=inp("text",old?.address||candidate?.address||"","address","Address, building, city");address.maxLength=300;
    const description=el("textarea","ct-loc-input");description.name="description";description.value=old?.description||"";description.rows=3;
    const team=el("select","ct-loc-input");team.name="team_id";[["","No team assigned"],...teams.filter(t=>String(t.status||"active")==="active"||String(t.id)===String(old?.team_id)).map(t=>[String(t.id),t.name])].forEach(([v,l])=>{const o=el("option","",l);o.value=v;team.append(o);});team.value=old?.team_id==null?"":String(old.team_id);
    const lat=inp("number",old?.latitude??candidate?.lat??"","latitude","Latitude");lat.step="any";lat.min="-90";lat.max="90";lat.required=!editing;
    const lon=inp("number",old?.longitude??candidate?.lon??"","longitude","Longitude");lon.step="any";lon.min="-180";lon.max="180";lon.required=!editing;
    const status=el("select","ct-loc-input");status.name="status";[["active","Active"],["inactive","Inactive"],["archived","Archived"]].forEach(([v,l])=>{const o=el("option","",l);o.value=v;status.append(o);});status.value=old?.status||"active";
    const grid=el("div","ct-loc-form-grid");grid.append(field("Location name",name),field("Address",address),field("Assigned team",team,"Teams are loaded from this organization's database."),field("Latitude",lat),field("Longitude",lon),field("Description",description,"Optional information for the team."));
    if(editing)grid.append(field("Status",status));
    const footer=el("div","ct-loc-form-actions");footer.append(btn(editing?"Save location":"Create location","ct-loc-btn ct-loc-btn-primary",null,"submit"));
    form.append(grid,el("p","ct-loc-muted ct-loc-pin-hint","Tip: zoom in for accuracy. Click the map to set the pin, or drag its temporary marker. Coordinates are optional for non-mapped records."),footer);
    form.addEventListener("submit",async e=>{e.preventDefault();if(busy)return;const payload={name:name.value.trim(),address:address.value.trim(),description:description.value.trim(),team_id:team.value||null,latitude:lat.value.trim()===""?null:Number(lat.value),longitude:lon.value.trim()===""?null:Number(lon.value)};if((payload.latitude===null)!==(payload.longitude===null)){notice("Enter both latitude and longitude, or leave both blank.","error");return;}if(payload.latitude!==null&&(!Number.isFinite(payload.latitude)||payload.latitude < -90||payload.latitude>90)){notice("Latitude must be between -90 and 90.","error");return;}if(payload.longitude!==null&&(!Number.isFinite(payload.longitude)||payload.longitude < -180||payload.longitude>180)){notice("Longitude must be between -180 and 180.","error");return;}if(editing)payload.status=status.value;const save=form.querySelector('button[type="submit"]');busy=true;save.disabled=true;save.textContent=editing?"Saving…":"Creating…";
      try{const response=editing?await API.patch("locations/"+old.id,payload):await API.post("locations",payload);selectedId=response.location?.id??selectedId;notice(response.message||(editing?"Location updated.":"Location created."),"success");editingId=null;candidate=null;formNode.hidden=true;await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();if(response.location&&coords(response.location)&&map)map.setView([Number(response.location.latitude),Number(response.location.longitude)],15);if(selectedId!==null)showDetails(selectedId,false);}
      catch(err){notice(err.message||"Location could not be saved.","error");}finally{busy=false;save.disabled=false;save.textContent=editing?"Save location":"Create location";}
    });formNode.append(form);
  }
  function field(label,control,hint){const n=el("label","ct-loc-field");n.append(el("span","",label),control);if(hint)n.append(el("small","ct-loc-muted",hint));return n;}
  function addLocation(){editingId=null;formNode.hidden=false;buildForm();formNode.scrollIntoView({behavior:"smooth",block:"start"});if(candidate&&map)map.setView([candidate.lat,candidate.lon],Math.max(14,map.getZoom()));}
  function editLocation(id){const x=locations.find(v=>String(v.id)===String(id));if(!x)return;selectedId=x.id;editingId=x.id;candidate=coords(x)?{lat:Number(x.latitude),lon:Number(x.longitude),label:x.name}:null;formNode.hidden=false;buildForm();renderMapPins();formNode.scrollIntoView({behavior:"smooth",block:"start"});}
  function cancelForm(){formNode.hidden=true;editingId=null;candidate=null;renderMapPins();}
  function fitPins(){if(!map||!window.L)return;const pts=locations.filter(coords).map(x=>[Number(x.latitude),Number(x.longitude)]);if(pts.length===1)map.setView(pts[0],17);else if(pts.length>1)map.fitBounds(L.latLngBounds(pts),{padding:[30,30],maxZoom:17});else map.setView([20,0],3);}
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
  function focusBuilding(location){
    if(!location||!coords(location))return;
    toggleMapPanel(true);
    if(!map)return;
    map.setView([Number(location.latitude),Number(location.longitude)],19);
    enableLandmarksForCurrentView();
    if(buildingLayer&&!map.hasLayer(buildingLayer)){
      buildingLayer.addTo(map); // overlayadd triggers the first footprint query
    }else loadBuildingFootprints(true);
    mapCardNode&&mapCardNode.scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function searchPlaces(value){if(!value)return;const button=root.querySelector(".ct-loc-map-search button");button.disabled=true;button.textContent="Searching…";searchResultsNode.replaceChildren(el("p","ct-loc-muted","Searching OpenStreetMap place names…"));try{const wait=Math.max(0,1100-(Date.now()-lastPlaceSearchAt));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastPlaceSearchAt=Date.now();const url="https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&namedetails=1&limit=10&q="+encodeURIComponent(value);const response=await fetch(url,{headers:{"Accept":"application/json","Accept-Language":document.documentElement.lang||"en"}});if(!response.ok)throw new Error("Place search is unavailable right now (HTTP "+response.status+").");searchResultsNode.replaceChildren();const results=await response.json();if(!Array.isArray(results)||!results.length){searchResultsNode.append(el("p","ct-loc-muted","No results found. Try a more specific address or place a pin manually."));return;}results.forEach(place=>{
      const title=place.name||String(place.display_name||"").split(",")[0]||"Map result";
      const country=place.address?.country||"Country not identified";
      const region=[place.address?.state,place.address?.region,place.address?.county].filter((v,i,a)=>v&&a.indexOf(v)===i&&v!==country).slice(0,2).join(", ");
      const row=el("div","ct-loc-search-result"),copy=el("div","ct-loc-search-result-copy");
      copy.append(el("strong","",title),el("span","ct-loc-result-country",country),el("small","",([region,place.display_name||""].filter(Boolean).join(" · "))));
      copy.append(el("span","ct-loc-result-kind",String(place.type||place.class||"place").replaceAll("_"," ")));
      row.append(copy,btn("View here","ct-loc-btn ct-loc-btn-small",()=>{
        const lat=Number(place.lat),lon=Number(place.lon);
        if(!Number.isFinite(lat)||!Number.isFinite(lon)){notice("The map provider returned invalid coordinates. No record changed.","error");return;}
        candidate={lat,lon,label:title,name:title,address:place.display_name||""};setPin(lat,lon,title);
        const bbox=Array.isArray(place.boundingbox)?place.boundingbox.map(Number):[];
        if(map&&bbox.length===4&&bbox.every(Number.isFinite)){
          const south=bbox[0],north=bbox[1],west=bbox[2],east=bbox[3];
          if(Math.abs(north-south)>0.02||Math.abs(east-west)>0.02)map.fitBounds([[south,west],[north,east]],{padding:[24,24],maxZoom:14});
          else map.fitBounds([[south,west],[north,east]],{padding:[30,30],maxZoom:19});
        }else if(map){const kindLower=String(place.type||"").toLowerCase();const zoom=["country","state","region"].includes(kindLower)?6:["city","administrative","municipality"].includes(kindLower)?12:["suburb","neighbourhood","quarter","village"].includes(kindLower)?14:["house","building","residential","address","road"].includes(kindLower)?19:17;map.setView([lat,lon],zoom);}
        enableLandmarksForCurrentView();
        if(!formNode.hidden){const n=formNode.querySelector('[name="name"]'),a=formNode.querySelector('[name="address"]');if(n&&!n.value)n.value=title;if(a&&!a.value)a.value=place.display_name||"";}
        searchResultsNode.replaceChildren(el("p","ct-loc-search-picked","Selected "+title+" · "+country+". This is a map reference only until you save it as a CleanTrack location."));
        notice("Map centered on "+title+", "+country+". Save it with Add Location only if you want it in your organization's directory.","info");
      }));
      searchResultsNode.append(row);
    });}catch(err){searchResultsNode.replaceChildren(el("p","ct-loc-notice error",err.message||"Address search failed. You can pin manually."));}finally{button.disabled=false;button.textContent="Browse location";}}
  async function discoverAndDownloadZones(location){
    if(!coords(location)){notice("This Location has no saved coordinates yet. Edit it and set its real latitude and longitude before discovering mapped indoor areas.","warning");return;}
    const action=[...detailNode.querySelectorAll("button")].find(x=>x.textContent==="Discover & download zones");
    if(action){action.disabled=true;action.textContent="Searching OpenStreetMap…";}
    notice("Searching OpenStreetMap for explicitly mapped indoor areas near "+location.name+". Only mapped candidates will be included; no zones or boundaries will be invented.","info");
    try{
      const lat=Number(location.latitude),lon=Number(location.longitude);
      const query='[out:json][timeout:25];(nwr(around:180,'+lat+','+lon+')["indoor"];nwr(around:180,'+lat+','+lon+')["room"];nwr(around:180,'+lat+','+lon+')["level"];);out tags geom;';
      const response=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8","Accept":"application/json"},body:"data="+encodeURIComponent(query)});
      if(!response.ok)throw new Error("OpenStreetMap query failed (HTTP "+response.status+"). Please retry later.");
      const data=await response.json(),seen=new Set(),zonesOut=[];
      for(const item of (Array.isArray(data.elements)?data.elements:[])){
        const tags=item.tags||{},indoor=tags.indoor||tags.room||tags.level;
        if(!indoor)continue;
        const name=String(tags.name||tags.ref||"").trim();
        if(!name||seen.has(name.toLowerCase()))continue;
        seen.add(name.toLowerCase());
        let boundary=null;
        if(item.type==="way"&&Array.isArray(item.geometry)&&item.geometry.length>=4){
          const coordsOut=item.geometry.map(p=>[Number(p.lon),Number(p.lat)]);
          const first=coordsOut[0],last=coordsOut[coordsOut.length-1];
          if(first[0]===last[0]&&first[1]===last[1]&&coordsOut.every(p=>p.every(Number.isFinite)))boundary={type:"Polygon",coordinates:[coordsOut]};
        }
        zonesOut.push({name,floor:tags.level||null,floor_label:tags.level||null,type:tags.amenity||tags.room||tags.indoor||"other",description:"OpenStreetMap mapped indoor feature (OSM "+item.type+" "+item.id+").",boundary,source:{provider:"OpenStreetMap",element_type:item.type,element_id:item.id,tags}});
      }
      if(!zonesOut.length){notice("No named indoor zones were found in OpenStreetMap within 180 metres of this Location. This is not proof that the building has no zones. You can import a verified package or create zones manually; CleanTrack has not generated any fake records.","warning");return;}
      const pkg={format:"cleantrack-location-package",version:1,source:{provider:"OpenStreetMap",url:"https://www.openstreetmap.org/copyright",retrieved_at:new Date().toISOString(),note:"Only named mapped indoor features returned by OpenStreetMap; coverage may be incomplete."},location:{name:location.name,address:location.address||"",description:location.description||"",latitude:lat,longitude:lon,team_id:location.team_id||null},zones:zonesOut};
      const blob=new Blob([JSON.stringify(pkg,null,2)+"\n"],{type:"application/json;charset=utf-8"});
      const url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download=(String(location.name||"location").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"location")+"-zones-cleantrack-package.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      notice("Downloaded "+zonesOut.length+" mapped indoor candidate(s) for "+location.name+". "+zonesOut.filter(z=>z.boundary).length+" include closed mapped polygon boundaries. Review the source and preview the package before importing; OSM coverage can be incomplete.","success");
    }catch(err){notice(err.message||"OpenStreetMap zone discovery failed. No records were imported or fabricated.","error");}
    finally{if(action){action.disabled=false;action.textContent="Discover & download zones";}}
  }
  async function showDetails(id,zoom){const x=locations.find(v=>String(v.id)===String(id));if(!x)return;if(locationFloorPlanUrl){URL.revokeObjectURL(locationFloorPlanUrl);locationFloorPlanUrl=null;}selectedId=x.id;if(zoom&&coords(x))toggleMapPanel(true);renderMapPins();renderDirectory();detailNode.hidden=false;detailNode.replaceChildren();if(zoom&&coords(x)&&map)map.setView([Number(x.latitude),Number(x.longitude)],Math.max(map.getZoom(),18));
    const head=el("div","ct-loc-section-head"),identity=el("div");identity.append(el("p","ct-loc-eyebrow","SAVED LOCATION"),el("h2","",x.name),el("p","ct-loc-muted",x.address||"Address not recorded"));const actions=el("div","ct-loc-detail-actions");
    if(coords(x))actions.append(btn("Building view","ct-loc-btn ct-loc-btn-primary",()=>focusBuilding(x)));
    if(coords(x))actions.append(btn("Satellite view","ct-loc-btn",()=>window.open("https://www.google.com/maps/@?api=1&map_action=map&center="+encodeURIComponent(x.latitude+","+x.longitude)+"&zoom=20&basemap=satellite","_blank","noopener")));
    if(coords(x))actions.append(btn("Directions","ct-loc-btn",()=>window.open("https://www.google.com/maps/dir/?api=1&destination="+encodeURIComponent(x.latitude+","+x.longitude),"_blank","noopener")));
    actions.append(btn("Discover & download zones","ct-loc-btn ct-loc-btn-primary",()=>discoverAndDownloadZones(x)));
    actions.append(btn("Edit","ct-loc-btn ct-loc-btn-primary",()=>editLocation(x.id)));
    if(x.status==="archived")actions.append(btn("Restore","ct-loc-btn",()=>changeStatus(x,"active")));else actions.append(btn("Archive","ct-loc-btn ct-loc-btn-danger",()=>archiveLocation(x)));
    head.append(identity,actions);detailNode.append(head);
    const metrics=el("div","ct-loc-detail-metrics");[[teamName(x.team_id),"Assigned team"],[zonesAt(x).length,"Zones"],[opsAt(x).length,"Operations"],[coords(x)?Number(x.latitude).toFixed(6)+", "+Number(x.longitude).toFixed(6):"Not pinned","Coordinates"]].forEach(([v,l])=>{const c=el("div","ct-loc-detail-stat");c.append(el("small","",l),el("strong","",String(v)));metrics.append(c);});detailNode.append(metrics);
    if(x.description)detailNode.append(el("p","ct-loc-detail-description",x.description));
    const two=el("div","ct-loc-detail-columns"),zc=el("section","ct-loc-detail-subcard");zc.append(el("h3","","Zones in this location"));const zs=zonesAt(x);if(!dataStatus.zones)zc.append(el("p","ct-loc-muted","Zone names could not be loaded; the database reports "+txt(x.zone_count, String(zs.length))+" zones for this location."));else if(!zs.length)zc.append(el("p","ct-loc-muted","No zones are linked to this location yet."));else{const list=el("ul","ct-loc-detail-list");zs.forEach(z=>{const item=el("li",""),open=btn(z.name+" · "+txt(z.status,"active"),"ct-loc-text-button",()=>{try{sessionStorage.setItem("cleantrack.zoneLocationFilter",String(x.id));history.replaceState(null,"",location.pathname+location.search+"#zones-"+z.id);}catch(_){}window.CleanTrackNavigation?.setActivePage("zones");});open.setAttribute("aria-label","Open zone "+z.name);item.append(open);list.append(item)});zc.append(list);}zc.append(btn("Manage this location’s zones","ct-loc-btn ct-loc-btn-small",()=>{try{sessionStorage.setItem("cleantrack.zoneLocationFilter",String(x.id));history.replaceState(null,"",location.pathname+location.search);}catch(_){}window.CleanTrackNavigation?.setActivePage("zones");}));
    const oc=el("section","ct-loc-detail-subcard");oc.append(el("h3","","Operations linked here"));const os=opsAt(x);if(!dataStatus.operations)oc.append(el("p","ct-loc-muted","Operation details could not be loaded; the location API reports "+txt(x.operation_count, String(os.length))+" linked operations."));else if(!os.length)oc.append(el("p","ct-loc-muted","No operations are linked to this location or its zones."));else{const list=el("div","ct-loc-operation-list");os.slice(0,8).forEach(o=>{const r=el("div","ct-loc-operation-row");r.append(el("strong","",o.title||"Untitled operation"),el("span","ct-loc-status",txt(o.status,"Pending")));list.append(r);});if(os.length>8)list.append(el("small","ct-loc-muted",(os.length-8)+" more operations are included in the count."));oc.append(list);}oc.append(btn("Open Operations","ct-loc-btn ct-loc-btn-small",()=>window.CleanTrackNavigation?.setActivePage("operations")));two.append(zc,oc);detailNode.append(two);detailNode.append(renderLocationFloorPlan(x));
    const history=el("section","ct-loc-history-card");history.append(el("h3","","Location activity and history"));const loading=el("p","ct-loc-muted","Loading location audit history…");history.append(loading);detailNode.append(history);
    try{const data=await API.get("locations/"+x.id+"/history");const events=rows(data,"history");loading.remove();if(!events.length)history.append(el("p","ct-loc-muted","No location-specific audit events recorded yet."));else events.forEach(event=>{const r=el("div","ct-loc-history-row"),detail=event.details&&typeof event.details==="object"?JSON.stringify(event.details):txt(event.details,"");r.append(el("strong","",String(event.action||"Activity").replaceAll("."," ")),el("small","",dt(event.created_at)),el("p","",detail.length>450?detail.slice(0,447)+"…":detail));history.append(r);});}catch(err){loading.textContent=err.message||"Location history could not be loaded.";}
    detailNode.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function renderLocationFloorPlan(location){
    const card=el("section","ct-loc-detail-subcard ct-loc-floor-plan");
    card.append(el("h3","","Shared indoor floor plan"),el("p","ct-loc-muted","Upload one private indoor map for this location. Zones inside this location can reuse the same map and draw their own operational boundaries on it. This is separate from the outdoor GPS map."));
    const status=el("p","ct-loc-muted",location.has_floor_plan?"Loading the saved floor plan…":"No shared floor plan has been uploaded for this location.");
    const preview=el("div","ct-loc-floor-plan-preview");
    const file=el("input","ct-loc-input");file.type="file";file.accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";file.setAttribute("aria-label","Choose location indoor floor plan");
    const actions=el("div","ct-loc-floor-plan-actions");
    const remove=btn("Remove shared floor plan","ct-loc-btn ct-loc-btn-danger",async()=>{if(!confirm("Remove the shared indoor floor plan for "+location.name+"? Zone boundary records and history will be retained, but zones using this shared map will no longer display the image."))return;remove.disabled=true;try{const result=await API.del("locations/"+location.id+"/floor-plan");notice(result.message||"Shared floor plan removed.","success");await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();await showDetails(location.id,false);}catch(err){status.textContent=err.message||"Floor plan could not be removed.";remove.disabled=false;}});
    remove.hidden=true;
    const upload=btn("Upload / replace floor plan","ct-loc-btn ct-loc-btn-primary",async()=>{const image=file.files?.[0];if(!image){status.textContent="Choose an indoor floor-plan image first.";return;}if(image.size<1||image.size>10*1024*1024){status.textContent="Choose an image between 1 byte and 10 MB.";return;}upload.disabled=true;status.textContent="Saving shared floor plan to CleanTrack…";try{const form=new FormData();form.append("file",image);const result=await API.post("locations/"+location.id+"/floor-plan",form);notice(result.message||"Shared floor plan saved.","success");await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();await showDetails(location.id,false);}catch(err){status.textContent=err.message||"Floor plan could not be saved.";upload.disabled=false;}});
    actions.append(file,upload,remove);card.append(status,preview,actions);
    (async()=>{try{const headers=new Headers({Accept:"image/png, image/jpeg, image/webp"}),token=window.CleanTrackAuth?.getAuthToken?.()||window.sessionStorage.getItem("cleantrack_token");if(token)headers.set("Authorization","Bearer "+token);const response=await fetch(window.CleanTrackConfig.apiBaseUrl+"/locations/"+encodeURIComponent(location.id)+"/floor-plan",{headers,credentials:"include",cache:"no-store"});if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===404){status.textContent="No shared floor plan has been uploaded for this location. Upload one here; zones can then reuse it.";return;}if(response.status===403){status.textContent=data.error||"Your account cannot access this private floor plan.";return;}throw Error(data.error||data.message||"Floor plan could not be loaded (HTTP "+response.status+").");}const blob=await response.blob();if(!["image/png","image/jpeg","image/webp"].includes(blob.type))throw Error("The server returned an unsupported floor-plan format.");if(!card.isConnected)return;locationFloorPlanUrl=URL.createObjectURL(blob);const img=el("img","ct-loc-floor-plan-image");img.alt="Shared indoor floor plan for "+location.name;img.src=locationFloorPlanUrl;preview.append(img);status.textContent="Saved private floor plan · "+(blob.size/1024).toFixed(0)+" KB. Zones in this location can draw boundaries on this image.";remove.hidden=false;}catch(err){if(card.isConnected)status.textContent=err.message||"Floor plan could not be loaded.";}})();
    return card;
  }
  async function changeStatus(x,status){try{const res=await API.patch("locations/"+x.id,{status});notice(res.message||"Location status updated.","success");await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();await showDetails(x.id,false);}catch(err){notice(err.message||"Location status could not be changed.","error");}}
  async function archiveLocation(x){const open=Number(x.active_operation_count??opsAt(x).filter(o=>!["completed","complete","approved","done","closed","cancelled","canceled"].includes(String(o.status||"").toLowerCase())).length);if(!confirm("Archive “"+x.name+"”?\n\nLinked operations: "+opsAt(x).length+"\nOpen operations / scheduled work: "+open+"\nZones: "+zonesAt(x).length+"\n\nNothing will be deleted or moved. The server will reject archiving while open operations remain."))return;await changeStatus(x,"archived");}
  function parseCSV(text){text=text.replace(/^\uFEFF/,"");const all=[];let row=[],cell="",quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===","&&!quoted){row.push(cell);cell="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v.trim()))all.push(row);row=[];cell="";}else cell+=c;}row.push(cell);if(row.some(v=>v.trim()))all.push(row);if(all.length<2)return [];const headers=all.shift().map(v=>v.trim().toLowerCase().replace(/\s+/g,"_"));return all.map(vals=>Object.fromEntries(headers.map((h,i)=>[h,String(vals[i]??"").trim()])));}
  async function importLocationPackage(pkg){
    const preview=await API.post("locations/import-package/preview",pkg);
    const location=preview.location||pkg.location,zones=preview.zones||pkg.zones||[];
    const match=(preview.matching_locations||[])[0];
    let mode="create_location",locationId=null;
    if(match){
      const choice=prompt('A Location named "'+location.name+'" already exists (ID '+match.id+'). Type "existing" to add the package Zones to that Location, or "cancel" to stop. To create a new Location, rename it in the package and import again.');
      if(String(choice||"").trim().toLowerCase()!=="existing")throw new Error("Import cancelled. No records were saved.");
      mode="existing_location";locationId=match.id;
    }else{
      const choice=confirm('Import preview\n\nLocation: '+location.name+'\nAddress: '+(location.address||"Not supplied")+'\nZones in file: '+zones.length+'\nZones with supplied boundaries: '+(preview.zones_with_boundaries||0)+'\n\nOK = create this Location and its Zones. Cancel = choose an existing Location instead.');
      if(choice){mode="create_location";}
      else{
        const options=locations.map(x=>x.id+" — "+x.name).join("\n");
        const chosen=prompt("Enter the ID of the existing Location to receive these Zones:\n"+options);
        if(!chosen)throw new Error("Import cancelled. No records were saved.");
        locationId=Number(chosen);
        if(!Number.isInteger(locationId)||!locations.some(x=>Number(x.id)===locationId))throw new Error("That Location ID was not found in the current organization. No records were saved.");
        mode="existing_location";
      }
    }
    const finalPreview=await API.post("locations/import-package/preview",pkg);
    const target=mode==="existing_location"?locations.find(x=>Number(x.id)===Number(locationId))?.name:location.name;
    if(!confirm('Confirm import\n\nTarget Location: '+target+'\nZones to add: '+zones.length+'\n\nCleanTrack will not invent missing areas or boundaries. Duplicate Zone names will stop the entire import.'))throw new Error("Import cancelled. No records were saved.");
    const result=await API.post("locations/import-package",{package:pkg,mode,location_id:locationId});
    await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();
    notice(result.message||"Location package imported successfully.","success");
    if(result.location?.id)await showDetails(result.location.id,false);
  }
  async function importLocations(event){const file=event.target.files?.[0];if(!file)return;if(importBusy)return;importBusy=true;try{let records=[];const text=await file.text();if(file.name.toLowerCase().endsWith(".csv"))records=parseCSV(text);else{const json=JSON.parse(text);if(json.format==="cleantrack-location-package"){await importLocationPackage(json);return;}if(json.type==="FeatureCollection"&&Array.isArray(json.features))records=json.features.map(f=>{const p=f.properties||{},c=f.geometry?.coordinates||[];return {...p,longitude:p.longitude??c[0],latitude:p.latitude??c[1]};});else if(Array.isArray(json.locations))records=json.locations;else if(Array.isArray(json))records=json;else throw new Error("Use CSV, GeoJSON FeatureCollection, or JSON containing a locations array.");}if(!records.length)throw new Error("No location rows were found in this file.");if(records.length>500)throw new Error("Import limit is 500 locations per file; split larger files into smaller batches.");const teamsByName=new Map(teams.map(t=>[String(t.name||"").trim().toLowerCase(),t.id]));let success=0;const errors=[];for(let i=0;i<records.length;i++){const r=records[i]||{},pick=(...keys)=>{for(const k of keys)if(r[k]!==undefined&&r[k]!==null&&String(r[k]).trim()!=="")return r[k];return "";};const name=String(pick("name","location","location_name","building")).trim();if(!name){errors.push("Row "+(i+2)+": missing name.");continue;}let team=pick("team_id","teamid");const teamText=String(pick("team","team_name","assigned_team")).trim();if(!team&&teamText){team=teamsByName.get(teamText.toLowerCase())||"";if(!team){errors.push("Row "+(i+2)+" (“"+name+"”): team “"+teamText+"” was not found in this organization.");continue;}}const lat=pick("latitude","lat"),lon=pick("longitude","lon","lng"),hasLat=String(lat).trim()!=="",hasLon=String(lon).trim()!=="";if(hasLat!==hasLon){errors.push("Row "+(i+2)+" (“"+name+"”): provide both latitude and longitude, or leave both blank.");continue;}const latitude=hasLat?Number(lat):null,longitude=hasLon?Number(lon):null;if(hasLat&&(!Number.isFinite(latitude)||latitude < -90||latitude>90||!Number.isFinite(longitude)||longitude < -180||longitude>180)){errors.push("Row "+(i+2)+" (“"+name+"”): invalid latitude/longitude.");continue;}const payload={name,address:String(pick("address","full_address","place_address")),description:String(pick("description","notes")),team_id:team||null,latitude,longitude};try{await API.post("locations",payload);success++;}catch(err){errors.push("Row "+(i+2)+" (“"+name+"”): "+(err.message||"not imported"));if(errors.length>=10){errors.push("Further errors omitted.");break;}}}await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();notice("Import finished: "+success+" of "+records.length+" locations saved."+(errors.length?" "+errors.join(" | "):""),errors.length?"error":"success");}catch(err){notice(err.message||"The location file could not be imported.","error");}finally{importBusy=false;event.target.value="";}}
  function csv(v){const s=v==null?"":String(v);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
  function downloadTemplate(){const blob=new Blob(["name,address,description,latitude,longitude,team_id\r\n"],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="cleantrack-location-import-template.csv";a.click();URL.revokeObjectURL(url);notice("Downloaded a blank CSV template. Fill it with your locations and re-import it; use coordinates from your map or address search.","success");}
  function downloadPackageTemplate(){
    const sample={format:"cleantrack-location-package",version:1,location:{name:"Example Site",address:"",description:"",latitude:null,longitude:null,team_id:null},zones:[]};
    const blob=new Blob([JSON.stringify(sample,null,2)+"\\n"],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="cleantrack-location-package-template.json";a.click();URL.revokeObjectURL(url);
    notice("Downloaded a Location Package template. Add only Zones and boundaries confirmed by your source data; leave zones empty if none are known.","success");
  }
  function exportCSV(){const head=["id","name","address","description","team_id","team_name","latitude","longitude","status","zone_count","operation_count","created_at"];const all=[head,...locations.map(x=>[x.id,x.name,x.address,x.description,x.team_id,teamName(x.team_id),x.latitude,x.longitude,x.status,zonesAt(x).length,opsAt(x).length,x.created_at])];const blob=new Blob(["\ufeff"+all.map(r=>r.map(csv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="cleantrack-locations.csv";a.click();URL.revokeObjectURL(url);notice("Exported "+locations.length+" database location records to CSV.","success");}
  async function render(container){
    // Clean up the previous Leaflet instance before route navigation/remounts.
    // Without this, Leaflet can retain a detached container and the next visit
    // may produce a blank map or stale map UI.
    if(map){try{map.off();map.remove();}catch(_){}}
    if(buildingRefreshTimer)window.clearTimeout(buildingRefreshTimer);
    if(landmarkRefreshTimer)window.clearTimeout(landmarkRefreshTimer);
    map=null;layer=null;buildingLayer=null;landmarkLayer=null;buildingRefreshTimer=null;landmarkRefreshTimer=null;root=null;mapCardNode=null;mapToggleButton=null;searchBoxNode=null;mapNotice=null;noticeNode=null;formNode=null;detailNode=null;searchResultsNode=null;
    if(String(AUTH?.getCurrentUser?.()?.role||"").toLowerCase()!=="admin"){container.replaceChildren(el("p","ct-loc-notice error","Location administration is available to organization Admins only."));return;}
    root=container;container.replaceChildren(el("p","ct-loc-muted","Loading organization locations…"));try{await load();query="";statusFilter="all";selectedId=null;candidate=null;createPage(container);}catch(err){container.replaceChildren();const p=el("section","ct-locations-page");p.append(el("h1","","Locations"),el("p","ct-loc-notice error",err.message||"Locations could not load."),btn("Retry","ct-loc-btn ct-loc-btn-primary",()=>render(container)));container.append(p);}}
  window.CleanTrackLocations=Object.freeze({render,refresh:async()=>{await load();if(root){renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();}}});
})();