(function(){
"use strict";
function parse(text,fileName){
 const ext=String(fileName||"").toLowerCase().split(".").pop();
 if(ext==="json"||ext==="geojson"){
  const data=JSON.parse(text);
  if(data.format==="cleantrack-location-package")return data;
  if(data.type==="FeatureCollection"&&Array.isArray(data.features)){
   const zones=data.features.map(f=>{const p=f.properties||{},g=f.geometry||{};if(g.type==="Polygon"||g.type==="MultiPolygon")return {name:String(p.name||p.zone_name||p.ref||"").trim(),floor:p.level??p.floor??null,floor_label:p.level??p.floor??null,description:p.description||"",type:p.type||"other",boundary:g};if(g.type==="Point")return {name:String(p.name||p.zone_name||p.ref||"").trim(),floor:p.level??p.floor??null,description:p.description||"",type:p.type||"other",boundary:null};return null;}).filter(x=>x&&x.name);
   return {format:"cleantrack-location-package",version:1,location:data.location||{name:data.name||data.properties?.name||"Imported map zones"},zones};
  }
  throw new Error("GeoJSON must be a FeatureCollection with named Point, Polygon or MultiPolygon features, or a CleanTrack Location Package.");
 }
 if(ext==="kml"){
  const doc=new DOMParser().parseFromString(text,"application/xml");if(doc.querySelector("parsererror"))throw new Error("The KML file is invalid XML.");
  const zones=[];
  for(const pm of Array.from(doc.getElementsByTagName("Placemark"))){
   const name=pm.getElementsByTagName("name")[0]?.textContent?.trim()||"";if(!name)continue;
   const description=pm.getElementsByTagName("description")[0]?.textContent?.trim()||"";
   const ring=pm.getElementsByTagName("Polygon")[0]?.getElementsByTagName("outerBoundaryIs")[0]?.getElementsByTagName("LinearRing")[0]?.getElementsByTagName("coordinates")[0]?.textContent?.trim();
   let boundary=null;
   if(ring){const coords=ring.split(/\\s+/).map(pair=>pair.split(",").slice(0,2).map(Number)).filter(pair=>pair.length===2&&pair.every(Number.isFinite));if(coords.length>=4){const first=coords[0],last=coords[coords.length-1];if(first[0]!==last[0]||first[1]!==last[1])coords.push([...first]);boundary={type:"Polygon",coordinates:[coords]};}}
   if(boundary)zones.push({name,description,type:"other",floor:null,boundary});
  }
  return {format:"cleantrack-location-package",version:1,location:{name:"Imported KML map"},zones};
 }
 throw new Error("Supported zone maps are CleanTrack JSON packages, GeoJSON (.geojson), and KML (.kml).");
}
window.CleanTrackMapImport=Object.freeze({parse});
})();