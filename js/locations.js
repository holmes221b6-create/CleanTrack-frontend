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
    map=L.map(box,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true,worldCopyJump:false,maxZoom:20}).setView([20,0],3);
    // Normal wheel scrolling must not zoom the map; Ctrl + wheel explicitly zooms it.
    box.addEventListener("wheel",e=>{
      if(!e.ctrlKey||!map)return;
      e.preventDefault();
      if(!e.deltaY)return;
      const current=map.getZoom();
      const next=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),current+(e.deltaY<0?1:-1)));
      if(next!==current)map.setZoomAround(map.mouseEventToLatLng(e),next,{animate:false});
    },{passive:false});
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
    const fileLabel=el("label","ct-loc-btn","Import locations");fileLabel.title="Import locations from CSV, GeoJSON, KML/KMZ, GPX, zipped ESRI Shapefile, or a CleanTrack Location Package. PDF and image floor plans can be uploaded in Location details.";const file=inp("file","","import_file");file.accept=".csv,.geojson,.json,.kml,.kmz,.gpx,.zip,.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/gpx+xml,application/zip";file.hidden=true;file.addEventListener("change",importLocations);fileLabel.append(file);
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

  function renderFloorPlanZoneBuilder(location, blob, host) {
    const panel=el("section","ct-loc-detail-subcard");panel.style.marginTop="16px";
    panel.append(el("h3","","Detect and edit Zones"),el("p","ct-loc-muted","CleanTrack reads visible room labels and proposes enclosed areas from this floor plan. Review every detected boundary. If an area is missed or its outline is wrong, draw that zone directly on the plan before saving."));
    const fields=el("div","ct-loc-floor-plan-actions"),floor=el("input","ct-loc-input");floor.placeholder="Floor / level (optional)";fields.append(floor);
    const pageRow=el("div","ct-loc-floor-plan-actions"),pageLabel=el("label","ct-loc-muted","PDF page "),pageSelect=el("select","ct-loc-input");pageLabel.append(pageSelect);pageRow.append(pageLabel);
    const canvas=el("canvas","ct-loc-zone-builder-canvas");canvas.style.width="100%";canvas.style.height="auto";canvas.style.display="block";canvas.style.border="1px solid #98a2b3";
    const status=el("p","ct-loc-muted","Choose Detect Zones to identify labelled enclosed areas on this page."),list=el("ol","ct-loc-detail-list"),actions=el("div","ct-loc-floor-plan-actions"),edit=el("div","ct-loc-floor-plan-actions");
    let drafts=zonesAt(location).filter(z=>z.boundary&&z.boundary.type==="IndoorPolygon"&&Array.isArray(z.boundary.points)&&z.boundary.points.length>=3&&(blob.type!=="application/pdf"||/^PDF page \d+$/i.test(String(z.floor_label||"")))).map(z=>({name:String(z.name||"Zone"),description:String(z.description||""),floor_label:String(z.floor_label||""),indoor_boundary:{type:"IndoorPolygon",points:z.boundary.points.map(p=>[Number(p[0]),Number(p[1])])},_page:(/^PDF page (\d+)$/i.exec(String(z.floor_label||""))||[])[1]?Number((/^PDF page (\d+)$/i.exec(String(z.floor_label||""))||[])[1]):null,_savedId:z.id,_confidence:null})),pdf=null,pageNo=1,base=document.createElement("canvas"),baseReady=false,task=null,detecting=false,manualMode=false,manualPoints=[],manualName="";
    const colors=["#168a66","#d97706","#2563eb","#9333ea","#db2777","#0891b2"];
    function paint(){const c=canvas.getContext("2d");if(!c||!canvas.width||!canvas.height)return;c.clearRect(0,0,canvas.width,canvas.height);if(baseReady)c.drawImage(base,0,0,canvas.width,canvas.height);drafts.filter(z=>!z._page||z._page===pageNo).forEach((z,i)=>{const ps=z.indoor_boundary.points;c.beginPath();ps.forEach((p,j)=>j?c.lineTo(p[0]*canvas.width,p[1]*canvas.height):c.moveTo(p[0]*canvas.width,p[1]*canvas.height));c.closePath();c.fillStyle=colors[i%colors.length]+"33";c.strokeStyle=colors[i%colors.length];c.lineWidth=Math.max(2,canvas.width/700);c.fill();c.stroke();const center=ps.reduce((a,p)=>[a[0]+p[0]/ps.length,a[1]+p[1]/ps.length],[0,0]);c.fillStyle=colors[i%colors.length];c.font="bold "+Math.max(12,canvas.width/70)+"px sans-serif";c.fillText(z.name,center[0]*canvas.width,center[1]*canvas.height);});if(manualPoints.length){c.beginPath();manualPoints.forEach((p,j)=>j?c.lineTo(p[0]*canvas.width,p[1]*canvas.height):c.moveTo(p[0]*canvas.width,p[1]*canvas.height));c.strokeStyle="#f59e0b";c.lineWidth=Math.max(2,canvas.width/500);c.setLineDash([8,5]);c.stroke();c.setLineDash([]);manualPoints.forEach(p=>{c.beginPath();c.arc(p[0]*canvas.width,p[1]*canvas.height,Math.max(4,canvas.width/180),0,Math.PI*2);c.fillStyle="#f59e0b";c.fill();});}}
    function refresh(){list.replaceChildren();drafts.forEach((z,i)=>{const li=el("li",""),label=el("strong","",z.name),rename=el("input","ct-loc-input");rename.value=z.name;rename.setAttribute("aria-label","Zone name");rename.addEventListener("change",()=>{const v=rename.value.trim();if(v&&v.length<=150&&!drafts.some((d,j)=>j!==i&&d.name.toLowerCase()===v.toLowerCase())){z.name=v;rename.removeAttribute("aria-invalid");paint();}else{rename.value=z.name;rename.setAttribute("aria-invalid","true");status.textContent="Zone names must be unique and contain 1–150 characters.";}});rename.maxLength=150;const remove=btn("Remove","ct-loc-btn",()=>{drafts.splice(i,1);paint();refresh();});li.append(rename,el("span","ct-loc-muted"," · "+(z.floor_label||"Unspecified floor")),remove);list.append(li);});}
    function rectPoints(r){if(Array.isArray(r.points)&&r.points.length>=3)return r.points.map(p=>[+Math.max(0,Math.min(1,p[0]/base.width)).toFixed(6),+Math.max(0,Math.min(1,p[1]/base.height)).toFixed(6)]);return [[r.x/base.width,r.y/base.height],[(r.x+r.width)/base.width,r.y/base.height],[(r.x+r.width)/base.width,(r.y+r.height)/base.height],[r.x/base.width,(r.y+r.height)/base.height]].map(p=>p.map(v=>+Math.max(0,Math.min(1,v)).toFixed(6)));}
    async function findContoursInWorker(){
      const source=`self.Module={onRuntimeInitialized:function(){self.cvReady=true;self.postMessage({type:"ready"});}};importScripts("https://docs.opencv.org/4.x/opencv.js");self.onmessage=function(event){if(!event.data||event.data.type!=="analyse")return;let src,gray,binary,closed,contours,hierarchy,k;try{const d=event.data;src=new cv.Mat(d.height,d.width,cv.CV_8UC4);src.data.set(new Uint8ClampedArray(d.data));gray=new cv.Mat();binary=new cv.Mat();closed=new cv.Mat();contours=new cv.MatVector();hierarchy=new cv.Mat();cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);cv.threshold(gray,binary,0,255,cv.THRESH_BINARY_INV+cv.THRESH_OTSU);k=cv.getStructuringElement(cv.MORPH_RECT,new cv.Size(3,3));cv.morphologyEx(binary,closed,cv.MORPH_CLOSE,k);cv.findContours(closed,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);const areaAll=d.width*d.height,boxes=[];for(let i=0;i<contours.size();i++){const cnt=contours.get(i);const area=cv.contourArea(cnt),r=cv.boundingRect(cnt);if(area<areaAll*.003||area>areaAll*.55||r.width<d.width*.035||r.height<d.height*.025){cnt.delete();continue;}const ratio=r.width/r.height,fill=area/(r.width*r.height);if(ratio<.22||ratio>4.5||fill<.52){cnt.delete();continue;}const approx=new cv.Mat();cv.approxPolyDP(cnt,approx,Math.max(2,cv.arcLength(cnt,true)*.012),true);const points=[];for(let j=0;j<approx.rows;j++){const p=approx.data32S;points.push([p[j*2],p[j*2+1]]);}approx.delete();cnt.delete();if(points.length>=3&&points.length<=80)boxes.push({x:r.x,y:r.y,width:r.width,height:r.height,area,points:points});if(i%250===0)self.postMessage({type:"progress",checked:i,total:contours.size()});}self.postMessage({type:"result",boxes:boxes});}catch(error){self.postMessage({type:"error",message:error&&error.message||String(error)});}finally{[src,gray,binary,closed,contours,hierarchy,k].forEach(x=>{if(x&&x.delete)x.delete();});}};if(self.cvReady)self.postMessage({type:"ready"});`;
      const url=URL.createObjectURL(new Blob([source],{type:"text/javascript"})),worker=new Worker(url);
      try{return await new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>finish(new Error("Background drawing analysis timed out. Try a smaller or clearer floor plan.")),90000);function finish(err,value){if(done)return;done=true;clearTimeout(timer);worker.terminate();URL.revokeObjectURL(url);err?reject(err):resolve(value);}worker.onmessage=event=>{const d=event.data||{};if(d.type==="ready"){const pixels=base.getContext("2d").getImageData(0,0,base.width,base.height);worker.postMessage({type:"analyse",width:base.width,height:base.height,data:pixels.data},[pixels.data.buffer]);}else if(d.type==="progress")status.textContent="Checking room outlines in background: "+d.checked+" / "+d.total+"…";else if(d.type==="result")finish(null,d.boxes);else if(d.type==="error")finish(new Error(d.message||"Drawing analysis failed."));};worker.onerror=event=>finish(new Error(event.message||"Background drawing worker failed."));});}finally{worker.terminate();URL.revokeObjectURL(url);}
    }
    canvas.addEventListener("click",event=>{if(!manualMode||!baseReady||event.detail>1)return;const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;manualPoints.push([+Math.max(0,Math.min(1,x)).toFixed(6),+Math.max(0,Math.min(1,y)).toFixed(6)]);paint();status.textContent="Drawing "+manualName+": "+manualPoints.length+" points. Click around the zone boundary, then double-click to close it.";});canvas.addEventListener("dblclick",event=>{if(!manualMode)return;event.preventDefault();if(manualPoints.length<3){status.textContent="A zone boundary needs at least three points. Add more points, then double-click to close it.";return;}drafts.push({name:manualName,description:"Boundary drawn manually on the uploaded floor plan.",floor_label:floor.value.trim()||(pdf?"PDF page "+pageNo:""),indoor_boundary:{type:"IndoorPolygon",points:manualPoints.map(p=>p.slice())},_page:pdf?pageNo:null,_confidence:null});manualMode=false;manualPoints=[];manualName="";canvas.style.cursor="default";paint();refresh();status.textContent="Manual zone added. Review its label and boundary, then save it to CleanTrack.";});function beginManual(){if(!baseReady){status.textContent="Wait for the floor plan to finish loading before drawing.";return;}if(manualMode){manualMode=false;manualPoints=[];manualName="";canvas.style.cursor="default";paint();status.textContent="Manual drawing cancelled.";return;}const name=prompt("Name this zone (maximum 150 characters):","");if(name===null)return;const clean=name.trim();if(!clean||clean.length>150||drafts.some(z=>String(z.name).toLowerCase()===clean.toLowerCase())){status.textContent="Enter a unique zone name containing 1–150 characters.";return;}manualName=clean;manualPoints=[];manualMode=true;canvas.style.cursor="crosshair";status.textContent="Click around the boundary of "+manualName+" on the floor plan. Double-click to close the outline. Use at least three points.";paint();}async function detect(){if(detecting||!baseReady)return;detecting=true;detectBtn.disabled=true;try{
      if(!window.Tesseract||typeof window.Tesseract.recognize!=="function")throw Error("The room-label reader did not load. Refresh and retry.");
      status.textContent="Step 1 of 2: reading room labels…";
      const ocr=await window.Tesseract.recognize(base,"eng",{logger:m=>{if(m.status==="recognizing text")status.textContent="Reading room labels: "+Math.round((m.progress||0)*100)+"%";},workerPath:"https://cdn.jsdelivr.net/npm/tesseract.js@5.0.4/dist/worker.min.js",corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js",langPath:"https://tessdata.projectnaptha.com/4.0.0"});
      const lines=new Map();for(const w of (ocr.data.words||[])){const text=String(w.text||"").trim();if(!text||Number(w.confidence||0)<30)continue;const k=[w.block_num,w.par_num,w.line_num].join(":");if(!lines.has(k))lines.set(k,{text:[],left:w.bbox.x0,top:w.bbox.y0,right:w.bbox.x1,bottom:w.bbox.y1,confidence:0,count:0});const q=lines.get(k);q.text.push(text);q.left=Math.min(q.left,w.bbox.x0);q.top=Math.min(q.top,w.bbox.y0);q.right=Math.max(q.right,w.bbox.x1);q.bottom=Math.max(q.bottom,w.bbox.y1);q.confidence+=Number(w.confidence||0);q.count++;}
      const labels=[...lines.values()].map(q=>({name:q.text.join(" ").replace(/\s+/g," ").trim(),x:(q.left+q.right)/2,y:(q.top+q.bottom)/2,confidence:q.confidence/Math.max(1,q.count)})).filter(q=>q.name.length>1&&!/^[|._\-]+$/.test(q.name));
      status.textContent="Step 2 of 2: analysing enclosed room outlines in a background worker…";const boxes=await findContoursInWorker();
      const candidates=[];for(const box of boxes){if(candidates.some(q=>{const ix=Math.max(0,Math.min(q.x+q.width,box.x+box.width)-Math.max(q.x,box.x)),iy=Math.max(0,Math.min(q.y+q.height,box.y+box.height)-Math.max(q.y,box.y)),inter=ix*iy;return inter/Math.max(1,Math.min(q.width*q.height,box.width*box.height))>.88;}))continue;candidates.push(box);}
      candidates.sort((a,b)=>a.area-b.area);const proposed=[],used=new Set();for(const r of candidates){const inside=[];labels.forEach((label,i)=>{if(label.x>=r.x&&label.x<=r.x+r.width&&label.y>=r.y&&label.y<=r.y+r.height&&!used.has(i))inside.push({label,i});});if(!inside.length)continue;inside.sort((a,b)=>b.label.confidence-a.label.confidence);const chosen=inside[0];if(proposed.some(z=>z.name.toLowerCase()===chosen.label.name.toLowerCase()))continue;used.add(chosen.i);proposed.push({name:chosen.label.name,description:"Automatically detected from floor-plan label; review before use.",floor_label:floor.value.trim()||(pdf?"PDF page "+pageNo:""),indoor_boundary:{type:"IndoorPolygon",points:rectPoints(r)},_page:pdf?pageNo:null,_confidence:Math.round(chosen.label.confidence)});}
      if(!proposed.length){status.textContent="No labelled enclosed areas were detected confidently. Try a higher-resolution or clearer floor plan.";return;}
      drafts=drafts.filter(z=>z._savedId||(pdf&&z._page!==pageNo));drafts.push(...proposed);paint();refresh();status.textContent="Detected "+proposed.length+" labelled candidate Zone(s). Image analysis ran in a background worker; review the estimated boundaries before downloading.";
    }catch(err){status.textContent="Zone detection could not finish: "+(err.message||"unknown error");}finally{detecting=false;detectBtn.disabled=false;}}
    async function saveZones(){const pending=drafts.filter(z=>!z._savedId);if(!pending.length){status.textContent="All detected zones are already saved to CleanTrack.";return;}const invalid=pending.find(z=>!String(z.name||"").trim()||String(z.name).trim().length>150);if(invalid){status.textContent="Every zone needs a name between 1 and 150 characters. Correct the highlighted names before saving.";return;}saveBtn.disabled=true;const saved=[];const failed=[];try{for(const z of pending){try{const result=await API.post("zones",{location_id:location.id,name:String(z.name).trim(),description:String(z.description||"Detected from the imported floor plan; review the boundary before operational use.").slice(0,1000),floor_label:String(z.floor_label||"").slice(0,120),type:"other",boundary:{type:"IndoorPolygon",points:z.indoor_boundary.points}});z._savedId=result.id||result.zone?.id||true;saved.push(z.name);}catch(err){failed.push(z.name+": "+(err.message||"save failed"));}}if(saved.length){await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();status.textContent="Saved "+saved.length+" zone(s) to the organization database with their editable indoor boundary"+(failed.length?". Some zones failed: "+failed.join("; "):".");notice("Saved "+saved.length+" zone(s) with their boundaries to CleanTrack.","success");}if(failed.length)status.textContent+=" Failed: "+failed.join("; ");refresh();paint();}finally{saveBtn.disabled=false;saveBtn.textContent="Save detected zones to CleanTrack";}}
    async function download(){if(!window.JSZip){status.textContent="The Zone Package writer did not load. Refresh CleanTrack and retry.";return;}if(!drafts.length){status.textContent="Detect at least one Zone before downloading.";return;}if(!baseReady||!base.width||!base.height){status.textContent="The source floor plan is not ready to export.";return;}downloadBtn.disabled=true;status.textContent="Preparing annotated map, editable boundaries, and zone data…";try{const zip=new window.JSZip();const clean=String(location.name||"location").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"location";const current=drafts.filter(z=>!z._page||z._page===pageNo);const svgEsc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");const sourceData=base.toDataURL("image/png");const colors=["#168a66","#d97706","#2563eb","#9333ea","#db2777","#0891b2"];const svgShapes=current.map((z,i)=>{const ps=z.indoor_boundary?.points||[];if(ps.length<3)return "";const points=ps.map(p=>(Number(p[0])*base.width).toFixed(2)+","+(Number(p[1])*base.height).toFixed(2)).join(" ");const center=ps.reduce((a,p)=>[a+Number(p[0])/ps.length,0],[0,0]);const cx=ps.reduce((a,p)=>a+Number(p[0])/ps.length,0)*base.width,cy=ps.reduce((a,p)=>a+Number(p[1])/ps.length,0)*base.height;const color=colors[i%colors.length];return '<g id="zone-'+(i+1)+'" data-zone-name="'+svgEsc(z.name)+'"><polygon points="'+points+'" fill="'+color+'" fill-opacity="0.20" stroke="'+color+'" stroke-width="'+Math.max(2,base.width/700)+'" vector-effect="non-scaling-stroke"/><text x="'+cx.toFixed(2)+'" y="'+cy.toFixed(2)+'" font-family="Arial,sans-serif" font-size="'+Math.max(12,base.width/70)+'" font-weight="bold" fill="'+color+'">'+svgEsc(z.name)+'</text></g>';}).join("\n");const svg='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+base.width+'" height="'+base.height+'" viewBox="0 0 '+base.width+' '+base.height+'"><title>'+svgEsc(location.name)+' — editable zone boundaries</title><image x="0" y="0" width="'+base.width+'" height="'+base.height+'" href="'+sourceData+'" xlink:href="'+sourceData+'"/>\n'+svgShapes+'\n</svg>';zip.file("editable-zone-map.svg",svg);const structureShapes=current.map((z,i)=>{const ps=z.indoor_boundary?.points||[];if(ps.length<3)return "";const points=ps.map(p=>(Number(p[0])*base.width).toFixed(2)+","+(Number(p[1])*base.height).toFixed(2)).join(" ");const cx=ps.reduce((a,p)=>a+Number(p[0])/ps.length,0)*base.width,cy=ps.reduce((a,p)=>a+Number(p[1])/ps.length,0)*base.height;const color=colors[i%colors.length];return '<g id="zone-'+(i+1)+'" data-zone-name="'+svgEsc(z.name)+'"><polygon points="'+points+'" fill="'+color+'" fill-opacity="0.10" stroke="'+color+'" stroke-width="'+Math.max(3,base.width/500)+'" vector-effect="non-scaling-stroke"/><text x="'+cx.toFixed(2)+'" y="'+cy.toFixed(2)+'" font-family="Arial,sans-serif" font-size="'+Math.max(14,base.width/60)+'" font-weight="bold" fill="'+color+'">'+svgEsc(z.name)+'</text></g>';}).join("\\n");const structureSvg='<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+base.width+'" height="'+base.height+'" viewBox="0 0 '+base.width+' '+base.height+'"><title>'+svgEsc(location.name)+' — detected zone structure</title><desc>Standalone editable vector drawing of detected zone boundaries and labels, without the uploaded floor-plan image.</desc><rect width="100%" height="100%" fill="#ffffff"/>\n'+structureShapes+'\n</svg>';zip.file("zone-structure.svg",structureSvg);const annotated=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not render annotated PNG")), "image/png"));zip.file("annotated-floor-plan-page-"+pageNo+".png",annotated);const featureCollection={type:"FeatureCollection",name:location.name+" zones",crs:null,features:drafts.map((z,i)=>({type:"Feature",properties:{name:z.name,description:z.description||"",floor_label:z.floor_label||"",location_name:location.name,source_page:z._page||pageNo,coordinate_system:"normalized_floor_plan_0_to_1",boundary_review_required:true},geometry:{type:"Polygon",coordinates:[[...(z.indoor_boundary?.points||[]).map(p=>[Number(p[0]),Number(p[1])]),...((z.indoor_boundary?.points||[]).length?[[Number(z.indoor_boundary.points[0][0]),Number(z.indoor_boundary.points[0][1])]]:[])]]}}))};zip.file("zones.geojson",JSON.stringify(featureCollection,null,2)+"\n");const csvCell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';zip.file("zones.csv",[["name","description","floor_label","source_page","boundary_points","boundary_review_required"].map(csvCell).join(","),...drafts.map(z=>[z.name,z.description||"",z.floor_label||"",z._page||pageNo,(z.indoor_boundary?.points||[]).length,"yes"].map(csvCell).join(","))].join("\r\n")+"\r\n");const pkg={format:"cleantrack-location-package",version:2,source:{provider:"CleanTrack Floor Plan Zone Detection",floor_plan_mime_type:blob.type,coordinate_system:"normalized_floor_plan_0_to_1",note:"Includes a visually annotated PNG and an editable SVG with the source plan embedded. Boundaries are machine-detected candidates and must be reviewed before operational use."},location:{name:location.name,address:location.address||"",description:location.description||"",latitude:location.latitude??null,longitude:location.longitude??null,team_id:location.team_id||null},zones:drafts.map(z=>({name:z.name,description:z.description||"",floor_label:z.floor_label||"",indoor_boundary:z.indoor_boundary,source_id:"floor-plan-page-"+(z._page||pageNo),boundary_review_required:true}))};zip.file("manifest.json",JSON.stringify(pkg,null,2)+"\n");zip.file("README.txt","CleanTrack Zone Export\r\n\r\nFiles included:\r\n- annotated-floor-plan-page-"+pageNo+".png: source floor plan with detected zone outlines and labels drawn on it.\r\n- editable-zone-map.svg: source plan embedded with separate editable vector polygons and labels. Open in Inkscape, Illustrator, or another SVG editor.\r\n- zones.geojson: polygon coordinates normalized to the source floor-plan image (0 to 1), not geographic longitude/latitude.\r\n- zones.csv: zone names and boundary metadata.\r\n- manifest.json: CleanTrack import package data.\r\n- source-floor-plan: original uploaded source file.\r\n\r\nImportant: Automatically detected boundaries are candidates. Verify and edit the shapes before operational use. PDF exports currently represent the selected page.\r\n");const ext=blob.type==="application/pdf"?"pdf":blob.type==="image/png"?"png":blob.type==="image/webp"?"webp":"jpg";zip.file("source-floor-plan."+ext,blob);const out=await zip.generateAsync({type:"blob",compression:"DEFLATE"}),url=URL.createObjectURL(out),a=el("a");a.href=url;a.download=clean+"-zones-and-drawn-map.zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent="Downloaded Zone Package: annotated map PNG, editable SVG boundaries, GeoJSON, CSV, original plan, and CleanTrack manifest.";notice("Downloaded the annotated zone map and editable boundary files.","success");}catch(err){status.textContent="Could not create the Zone Package: "+(err.message||"unknown error");}finally{downloadBtn.disabled=false;}}
    const detectBtn=btn("Detect Zones automatically","ct-loc-btn ct-loc-btn-primary",detect),redetect=btn("Re-detect current page","ct-loc-btn",detect),manualBtn=btn("Draw zone manually","ct-loc-btn",beginManual),saveBtn=btn("Save zones to CleanTrack","ct-loc-btn ct-loc-btn-primary",saveZones),downloadBtn=btn("Download drawn zone plan","ct-loc-btn",download),close=btn("Close","ct-loc-btn",()=>{manualMode=false;manualPoints=[];panel.hidden=true;});
    actions.append(detectBtn,redetect,manualBtn,saveBtn,downloadBtn,close);panel.append(fields,pageRow,canvas,status,list,actions);host.append(panel);
    async function draw(){try{if(task){try{task.cancel();}catch(_){}}const p=await pdf.getPage(pageNo),v=p.getViewport({scale:Math.min(1.6,1500/p.getViewport({scale:1}).width)});base.width=Math.round(v.width);base.height=Math.round(v.height);task=p.render({canvasContext:base.getContext("2d"),viewport:v});await task.promise;task=null;baseReady=true;canvas.width=base.width;canvas.height=base.height;paint();status.textContent="PDF page "+pageNo+" of "+pdf.numPages+". Choose Detect Zones automatically.";}catch(err){if(err.name!=="RenderingCancelledException")status.textContent="Could not render PDF page: "+(err.message||"unknown error");}}
    if(blob.type==="application/pdf"){pageRow.hidden=false;if(!window.pdfjsLib){status.textContent="PDF renderer did not load. Refresh CleanTrack or use a PNG/JPG plan.";return panel;}window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";blob.arrayBuffer().then(buffer=>window.pdfjsLib.getDocument({data:buffer}).promise).then(doc=>{pdf=doc;pageSelect.replaceChildren();for(let n=1;n<=doc.numPages;n++)pageSelect.append(new Option("Page "+n,String(n)));pageSelect.value="1";pageSelect.addEventListener("change",()=>{pageNo=Number(pageSelect.value)||1;draw();});draw();}).catch(err=>{status.textContent="Could not open PDF: "+(err.message||"invalid PDF");});}
    else{pageRow.hidden=true;const img=new Image();img.onload=()=>{const s=Math.min(1,900/img.naturalWidth,900/img.naturalHeight);base.width=Math.round(img.naturalWidth*s);base.height=Math.round(img.naturalHeight*s);base.getContext("2d").drawImage(img,0,0,base.width,base.height);baseReady=true;canvas.width=base.width;canvas.height=base.height;paint();status.textContent="Floor plan loaded. Choose Detect Zones automatically."};img.onerror=()=>{status.textContent="Could not open the floor-plan image.";};img.src=URL.createObjectURL(blob);}
    return panel;
  }
  function renderLocationFloorPlan(location){
    const card=el("section","ct-loc-detail-subcard ct-loc-floor-plan");
    card.append(el("h3","","Indoor floor plan and zone detection"),el("p","ct-loc-muted","Upload the building interior plan. CleanTrack detects labelled enclosed areas where possible, then lets you review the outlines and manually draw any missed zone."));
    const status=el("p","ct-loc-muted",location.has_floor_plan?"Loading the saved floor plan…":"No shared floor plan has been uploaded for this location.");
    const preview=el("div","ct-loc-floor-plan-preview");
    const file=el("input","ct-loc-input");file.type="file";file.accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";file.setAttribute("aria-label","Choose location indoor floor plan");
    const actions=el("div","ct-loc-floor-plan-actions");
    const canRemoveFloorPlan=AUTH?.hasRole?.("admin")!==false;const remove=btn("Remove shared floor plan","ct-loc-btn ct-loc-btn-danger",async()=>{if(!confirm("Remove the shared indoor floor plan for "+location.name+"? Zone boundary records and history will be retained, but zones using this shared map will no longer display the image."))return;remove.disabled=true;status.textContent="Removing shared floor plan…";try{const result=await API.delete("locations/"+encodeURIComponent(location.id)+"/floor-plan");if(locationFloorPlanUrl){URL.revokeObjectURL(locationFloorPlanUrl);locationFloorPlanUrl=null;}preview.replaceChildren();builderHost?.replaceChildren();remove.hidden=true;const buildButton=actions.querySelector("button[data-floor-plan-build]");if(buildButton)buildButton.remove();status.textContent="Floor plan removed. Upload a new plan to display it again. Existing zone records and boundaries were retained.";location.has_floor_plan=false;notice(result.message||"Shared floor plan removed.","success");await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();}catch(err){status.textContent=err.message||"Floor plan could not be removed.";remove.disabled=false;}});remove.hidden=true;
    remove.hidden=true;
    const upload=btn("Upload / replace floor plan","ct-loc-btn ct-loc-btn-primary",async()=>{const image=file.files?.[0];if(!image){status.textContent="Choose a PDF or indoor floor-plan image first.";return;}if(image.size<1||image.size>15*1024*1024){status.textContent="Choose a file between 1 byte and 15 MB.";return;}upload.disabled=true;status.textContent="Uploading floor plan…";try{const form=new FormData();form.append("file",image,image.name);const result=await API.post("locations/"+encodeURIComponent(location.id)+"/floor-plan",form);if(locationFloorPlanUrl){URL.revokeObjectURL(locationFloorPlanUrl);locationFloorPlanUrl=null;}preview.replaceChildren();builderHost?.replaceChildren();notice(result.message||"Shared floor plan saved.","success");await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();await showDetails(location.id,false);}catch(err){status.textContent=(err.message||"Floor plan could not be saved.")+(err.status?" (HTTP "+err.status+")":"");upload.disabled=false;} });
    const builderHost=el("div","ct-loc-floor-plan-builder-host");actions.append(file,upload,remove);card.append(status,preview,actions,builderHost);
    (async()=>{try{const headers=new Headers({Accept:"application/pdf, image/png, image/jpeg, image/webp"}),token=window.CleanTrackAuth?.getAuthToken?.()||window.sessionStorage.getItem("cleantrack_token");if(token)headers.set("Authorization","Bearer "+token);const response=await fetch(window.CleanTrackConfig.apiBaseUrl+"/locations/"+encodeURIComponent(location.id)+"/floor-plan",{headers,credentials:"include",cache:"no-store"});if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===404){status.textContent="No shared floor plan has been uploaded for this location. Upload one here; zones can then reuse it.";remove.hidden=true;return;}if(response.status===403){status.textContent=data.error||"Your account cannot access this private floor plan.";return;}throw Error(data.error||data.message||"Floor plan could not be loaded (HTTP "+response.status+").");}const blob=await response.blob();if(!["application/pdf","image/png","image/jpeg","image/webp"].includes(blob.type))throw Error("The server returned an unsupported floor-plan format.");if(!card.isConnected)return;locationFloorPlanUrl=URL.createObjectURL(blob);remove.hidden=!canRemoveFloorPlan;if(blob.type==="application/pdf"){const pdf=el("iframe","ct-loc-floor-plan-pdf");pdf.title="Shared architectural floor plan for "+location.name;pdf.src=locationFloorPlanUrl;pdf.loading="lazy";preview.append(pdf);status.textContent="Saved private PDF floor plan · "+(blob.size/1024).toFixed(0)+" KB. Review its pages, then create and save zone boundaries against the plan.";}else{const frame=el("div","ct-loc-floor-plan-frame"),img=el("img","ct-loc-floor-plan-image"),overlay=document.createElement("canvas");img.alt="Shared indoor floor plan for "+location.name;img.src=locationFloorPlanUrl;overlay.className="ct-loc-floor-plan-zone-overlay";overlay.setAttribute("aria-label","Saved zone boundaries overlay");overlay.style.position="absolute";overlay.style.inset="0";overlay.style.width="100%";overlay.style.height="100%";overlay.style.pointerEvents="none";frame.style.position="relative";frame.append(img,overlay);preview.append(frame);const paintSavedZones=()=>{if(!overlay.isConnected||!img.naturalWidth||!img.naturalHeight)return;overlay.width=img.naturalWidth;overlay.height=img.naturalHeight;const c=overlay.getContext("2d");c.clearRect(0,0,overlay.width,overlay.height);const wanted=new URLSearchParams(window.location.search).get("zone_id");zonesAt(location).forEach((zone,i)=>{const b=zone.boundary;if(!b||b.type!=="IndoorPolygon"||!Array.isArray(b.points)||b.points.length<3)return;const ps=b.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(Number(n))));if(ps.length<3)return;const selected=String(zone.id)===String(wanted);c.beginPath();ps.forEach((p,j)=>j?c.lineTo(p[0]*overlay.width,p[1]*overlay.height):c.moveTo(p[0]*overlay.width,p[1]*overlay.height));c.closePath();c.fillStyle=selected?"rgba(255,178,55,.38)":"rgba(22,138,102,.14)";c.strokeStyle=selected?"#ffb237":"#168a66";c.lineWidth=selected?Math.max(4,overlay.width/350):Math.max(2,overlay.width/650);c.fill();c.stroke();const center=ps.reduce((a,p)=>[a[0]+Number(p[0])/ps.length,a[1]+Number(p[1])/ps.length],[0,0]);c.font="bold "+Math.max(14,overlay.width/70)+"px sans-serif";c.lineWidth=3;c.strokeStyle="#111827";c.strokeText(zone.name,center[0]*overlay.width,center[1]*overlay.height);c.fillStyle="#fff";c.fillText(zone.name,center[0]*overlay.width,center[1]*overlay.height);});};img.addEventListener("load",paintSavedZones);if(img.complete)paintSavedZones();status.textContent="Saved private image floor plan · "+(blob.size/1024).toFixed(0)+" KB. Saved zone boundaries are overlaid here; open Build Zones to detect and edit additional areas.";}const build=btn("Build Zones from this floor plan","ct-loc-btn ct-loc-btn-primary",()=>{builderHost.replaceChildren(renderFloorPlanZoneBuilder(location,blob,builderHost));builderHost.firstElementChild.hidden=false;build.disabled=true;build.textContent="Zone builder open";});build.dataset.floorPlanBuild="true";actions.append(build);remove.hidden=false;}catch(err){if(card.isConnected)status.textContent=err.message||"Floor plan could not be loaded.";}})();
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
        locationId=String(chosen).trim();
        if(!locations.some(x=>String(x.id)===locationId))throw new Error("That Location ID was not found in the current organization. No records were saved.");
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
  function parseKmlMap(text){
    const doc=new DOMParser().parseFromString(text,"application/xml");
    if(doc.querySelector("parsererror"))throw new Error("The KML file is invalid XML.");
    const out=[];
    for(const pm of Array.from(doc.getElementsByTagName("Placemark"))){
      const name=pm.getElementsByTagName("name")[0]?.textContent?.trim()||"";
      const description=pm.getElementsByTagName("description")[0]?.textContent?.trim()||"";
      const point=pm.getElementsByTagName("Point")[0];
      const raw=point?.getElementsByTagName("coordinates")[0]?.textContent?.trim();
      if(!name||!raw)continue;
      const parts=raw.split(/[\\s,]+/).filter(Boolean).map(Number);
      if(parts.length>=2&&Number.isFinite(parts[0])&&Number.isFinite(parts[1])&&Math.abs(parts[1])<=90&&Math.abs(parts[0])<=180)out.push({name,description,longitude:parts[0],latitude:parts[1]});
    }
    return out;
  }
  function parseGpxMap(text){
    const doc=new DOMParser().parseFromString(text,"application/xml");
    if(doc.querySelector("parsererror"))throw new Error("The GPX file is invalid XML.");
    return Array.from(doc.getElementsByTagName("wpt")).map((p,i)=>({name:p.getElementsByTagName("name")[0]?.textContent?.trim()||"Waypoint "+(i+1),latitude:Number(p.getAttribute("lat")),longitude:Number(p.getAttribute("lon")),description:p.getElementsByTagName("desc")[0]?.textContent?.trim()||""})).filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180);
  }
  async function importLocations(event){const file=event.target.files?.[0];if(!file)return;if(importBusy)return;importBusy=true;try{const ext=file.name.toLowerCase().split(".").pop();if(["pdf","png","jpg","jpeg","webp"].includes(ext)){if(!locations.length)throw new Error("Create a Location first. Then choose its floor plan file again.");const options=locations.map((x,i)=>(i+1)+". "+x.name+(x.address?" — "+x.address:"")).join("\n");const answer=prompt("Attach this floor plan to which saved Location? Enter its list number, not its ID:\n\n"+options);if(answer===null)throw new Error("Floor-plan upload cancelled.");const n=Number(answer.trim());if(!Number.isInteger(n)||n<1||n>locations.length)throw new Error("Enter a valid number from the Location list.");const target=locations[n-1];if(file.size<1||file.size>15*1024*1024)throw new Error("Choose a non-empty floor plan no larger than 15 MB.");const form=new FormData();form.append("file",file);const result=await API.post("locations/"+encodeURIComponent(target.id)+"/floor-plan",form);notice((result.message||"Floor plan uploaded successfully.")+" Location: "+target.name,"success");await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();return;}let records;if(ext==="json"||ext==="geojson"){const raw=JSON.parse(await file.text());if(raw.format==="cleantrack-location-package"){await importLocationPackage(raw);return;}}records=await window.CleanTrackMapImport.parseFile(file,"locations");if(records?.format==="cleantrack-location-package"){await importLocationPackage(records);return;}if(!Array.isArray(records)||!records.length)throw new Error("No named location points were found in this file. For mapped areas, use Import Zones on the Zones page.");if(records.length>500)throw new Error("Import limit is 500 locations per file; split larger files into smaller batches.");const teamsByName=new Map(teams.map(t=>[String(t.name||"").trim().toLowerCase(),t.id]));let success=0;const errors=[];for(let i=0;i<records.length;i++){const r=records[i]||{},pick=(...keys)=>{for(const k of keys)if(r[k]!==undefined&&r[k]!==null&&String(r[k]).trim()!=="")return r[k];return "";};const name=String(pick("name","location","location_name","building","Name","NAME")).trim();if(!name){errors.push("Row "+(i+2)+": missing name.");continue;}let team=pick("team_id","teamid");const teamText=String(pick("team","team_name","assigned_team")).trim();if(!team&&teamText){team=teamsByName.get(teamText.toLowerCase())||"";if(!team){errors.push("Row "+(i+2)+" (“"+name+"”): team “"+teamText+"” was not found in this organization.");continue;}}const lat=pick("latitude","lat"),lon=pick("longitude","lon","lng"),hasLat=String(lat).trim()!=="",hasLon=String(lon).trim()!=="";if(hasLat!==hasLon){errors.push("Row "+(i+2)+" (“"+name+"”): provide both latitude and longitude, or leave both blank.");continue;}const latitude=hasLat?Number(lat):null,longitude=hasLon?Number(lon):null;if(hasLat&&(!Number.isFinite(latitude)||latitude < -90||latitude>90||!Number.isFinite(longitude)||longitude < -180||longitude>180)){errors.push("Row "+(i+2)+" (“"+name+"”): invalid latitude/longitude.");continue;}const payload={name,address:String(pick("address","full_address","place_address")),description:String(pick("description","notes")),team_id:team||null,latitude,longitude};try{await API.post("locations",payload);success++;}catch(err){errors.push("Row "+(i+2)+" (“"+name+"”): "+(err.message||"not imported"));if(errors.length>=10){errors.push("Further errors omitted.");break;}}}await load();renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();notice("Import finished: "+success+" of "+records.length+" locations saved."+(errors.length?" "+errors.join(" | "):""),errors.length?"error":"success");}catch(err){notice(err.message||"The location file could not be imported.","error");}finally{importBusy=false;event.target.value="";}}
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
    root=container;container.replaceChildren(el("p","ct-loc-muted","Loading organization locations…"));try{await load();query="";statusFilter="all";selectedId=null;candidate=null;createPage(container);const requestedLocationId=new URLSearchParams(window.location.search).get("location_id"),requestedZoneId=new URLSearchParams(window.location.search).get("zone_id");if(requestedLocationId&&locations.some(x=>String(x.id)===String(requestedLocationId)))setTimeout(()=>showDetails(requestedLocationId,true),120);}catch(err){container.replaceChildren();const p=el("section","ct-locations-page");p.append(el("h1","","Locations"),el("p","ct-loc-notice error",err.message||"Locations could not load."),btn("Retry","ct-loc-btn ct-loc-btn-primary",()=>render(container)));container.append(p);}}
  window.CleanTrackLocations=Object.freeze({render,refresh:async()=>{await load();if(root){renderMetrics(root.querySelector(".ct-loc-metrics"));renderDirectory();renderMapPins();}}});
})();