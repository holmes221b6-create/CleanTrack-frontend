(function(){
"use strict";
const API=window.CleanTrackApi;
const esc=v=>String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct=v=>v==null?"—":Number(v).toFixed(1)+"%";
const num=v=>Number(v||0).toLocaleString();
const metric=(label,value,sub="")=>'<div class="pa-metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub)+'</small></div>';
const table=(headers,rows)=>'<div class="pa-analysis-table-wrap"><table class="pa-analysis-table"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+(rows.length?rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x??"—")+'</td>').join("")+'</tr>').join(""):'<tr><td colspan="'+headers.length+'" class="pa-empty">No recorded data for this period.</td></tr>')+'</tbody></table></div>';
function csvDownload(data){
 const sections=[["Team rankings",["Rank","Team","Supervisor","Operations","Completed","Completion %","On time %","Approval %","Overdue %","Score"],data.teams.map(x=>[x.rank,x.team_name,x.supervisor,x.total_operations,x.completed,x.completion_rate,x.on_time_rate,x.approval_rate,x.overdue_rate,x.score])],["Individual rankings",["Rank","Staff","Operations","Completed","Completion %","On time %","Approval %","Overdue %","Score"],data.individuals.map(x=>[x.rank,x.name,x.total_operations,x.completed,x.completion_rate,x.on_time_rate,x.approval_rate,x.overdue_rate,x.score])],["Location rankings",["Rank","Location","Operations","Completed","Completion %","On time %","Score"],data.locations.map(x=>[x.rank,x.location_name,x.total_operations,x.completed,x.completion_rate,x.on_time_rate,x.score])],["Operation type rankings",["Rank","Operation type","Operations","Completed","Completion %","On time %","Score"],data.operation_types.map(x=>[x.rank,x.operation_type,x.total_operations,x.completed,x.completion_rate,x.on_time_rate,x.score])],["Role rankings",["Rank","Role","Operations","Completed","Completion %","On time %","Score"],(data.roles||[]).map(x=>[x.rank,x.role,x.total_operations,x.completed,x.completion_rate,x.on_time_rate,x.score])],["Performance history",["Period","Operations","Completed","Completion %","On time %","Approval %","Overdue %","Score"],data.history.map(x=>[x.period,x.total_operations,x.completed,x.completion_rate,x.on_time_rate,x.approval_rate,x.overdue_rate,x.score])]];
 const csv=sections.map(s=>s[0]+"\n"+s[1].join(",")+"\n"+s[2].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n")).join("\n\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="MECHNAR-performance-analysis.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function reportSections(data){
 const rows=(arr,fields)=>(arr||[]).map(x=>fields.map(k=>x[k]??""));
 return [
  {title:"Team rankings",headers:["Rank","Team","Supervisor","Operations","Completed","Completion %","On time %","Approval %","Overdue %","Score"],rows:rows(data.teams,["rank","team_name","supervisor","total_operations","completed","completion_rate","on_time_rate","approval_rate","overdue_rate","score"])},
  {title:"Individual rankings",headers:["Rank","Staff","Operations","Completed","Completion %","On time %","Approval %","Overdue %","Score"],rows:rows(data.individuals,["rank","name","total_operations","completed","completion_rate","on_time_rate","approval_rate","overdue_rate","score"])},
  {title:"Location rankings",headers:["Rank","Location","Operations","Completed","Completion %","On time %","Score"],rows:rows(data.locations,["rank","location_name","total_operations","completed","completion_rate","on_time_rate","score"])},
  {title:"Operation type rankings",headers:["Rank","Operation type","Operations","Completed","Completion %","On time %","Score"],rows:rows(data.operation_types,["rank","operation_type","total_operations","completed","completion_rate","on_time_rate","score"])},
  {title:"Role rankings",headers:["Rank","Role","Operations","Completed","Completion %","On time %","Score"],rows:rows(data.roles,["rank","role","total_operations","completed","completion_rate","on_time_rate","score"])},
  {title:"Performance history",headers:["Period","Operations","Completed","Completion %","On time %","Approval %","Overdue %","Score"],rows:rows(data.history,["period","total_operations","completed","completion_rate","on_time_rate","approval_rate","overdue_rate","score"])}
 ];
}
function buildReportCanvas(data){
 const o=data.overview||{},sections=reportSections(data);
 const overview=[["Total operations",o.total_operations??0],["Completed",o.completed??0],["Pending",o.pending??0],["Overdue",o.overdue??0],["Completion rate",pct(o.completion_rate)],["On-time rate",pct(o.on_time_rate)],["Approval rate",pct(o.approval_rate)],["Overdue rate",pct(o.overdue_rate)],["Average completion",o.average_completion_hours==null?"—":o.average_completion_hours+" hrs"],["Weighted workload",o.weighted_workload??0]];
 const improvements=data.automated_improvements||[],notices=data.admin_improvements||[];
 const count=sections.reduce((n,x)=>n+Math.max(1,x.rows.length)+2,0);
 const c=document.createElement("canvas");c.width=1600;c.height=Math.max(1100,760+overview.length*48+count*43+(improvements.length+notices.length)*90);
 const ctx=c.getContext("2d");ctx.fillStyle="#10111a";ctx.fillRect(0,0,c.width,c.height);
 let y=92;
 const text=(v,x,yy,size=23,color="#e9e5f2",weight="400")=>{ctx.fillStyle=color;ctx.font=weight+" "+size+"px Arial";ctx.fillText(String(v??"—"),x,yy);};
 const line=yy=>{ctx.strokeStyle="#494157";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(72,yy);ctx.lineTo(1528,yy);ctx.stroke();};
 text("MECHNAR",72,y,22,"#b7a2e4","bold");y+=58;text("Performance Analysis",72,y,42,"#ffffff","bold");y+=40;
 text("Reporting period: "+(data.period?.start_date||"—")+" to "+(data.period?.end_date||"—"),72,y,20,"#bcb5ca");y+=45;line(y);y+=42;
 text("PERFORMANCE OVERVIEW",72,y,21,"#b7a2e4","bold");y+=38;
 overview.forEach((v,i)=>{const col=i%2,row=Math.floor(i/2);text(v[0],72+col*740,y+row*47,18,"#bcb5ca");text(v[1],410+col*740,y+row*47,21,"#ffffff","bold");});
 y+=Math.ceil(overview.length/2)*54+26;line(y);y+=40;
 for(const sec of sections){
  text(sec.title.toUpperCase(),72,y,21,"#b7a2e4","bold");y+=36;
  if(!sec.rows.length){text("No recorded data for this period.",82,y,17,"#bcb5ca");y+=38;continue;}
  const colW=1456/sec.headers.length;
  sec.headers.forEach((h,i)=>text(h,72+i*colW,y,14,"#c8b8e8","bold"));y+=29;
  sec.rows.forEach(row=>{row.forEach((v,i)=>text(String(v??"—").slice(0,26),72+i*colW,y,14,"#e9e5f2"));y+=31;});
  y+=20;line(y);y+=36;
 }
 if(notices.length||improvements.length){
  text("AREAS FOR IMPROVEMENT",72,y,21,"#b7a2e4","bold");y+=38;
  [...notices.map(x=>({title:x.title,body:x.message,tag:"ADMIN GUIDANCE"})),...improvements.map(x=>({title:x.title,body:x.evidence+" — "+x.action,tag:x.priority||"RECOMMENDATION"}))].forEach(x=>{
   text(x.tag+" · "+x.title,82,y,17,"#ffffff","bold");y+=26;
   const words=String(x.body||"").split(/\s+/);let lineText="";
   for(const w of words){const next=lineText?lineText+" "+w:w;if(ctx.measureText(next).width>1390){text(lineText,95,y,15,"#c9c3d4");y+=24;lineText=w;}else lineText=next;}
   if(lineText){text(lineText,95,y,15,"#c9c3d4");y+=24;}y+=14;
  });
 }
 return c;
}
function downloadBlob(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function imageDownload(data){
 const canvas=buildReportCanvas(data);
 canvas.toBlob(blob=>{if(blob)downloadBlob(blob,"MECHNAR-performance-analysis.png");else alert("The image export could not be generated in this browser.");},"image/png");
}
async function pdfDownload(data){
 const source=buildReportCanvas(data),pageW=842,pageH=595,sliceH=Math.floor(source.width*pageH/pageW),pages=[];
 for(let top=0;top<source.height;top+=sliceH){
  const h=Math.min(sliceH,source.height-top),part=document.createElement("canvas");part.width=source.width;part.height=h;
  part.getContext("2d").drawImage(source,0,top,source.width,h,0,0,source.width,h);
  const blob=await new Promise(resolve=>part.toBlob(resolve,"image/jpeg",.92));
  if(!blob)throw new Error("PDF page image could not be generated.");
  pages.push({bytes:new Uint8Array(await blob.arrayBuffer()),height:h});
 }
 const enc=new TextEncoder(),chunks=[],offsets=[];let length=0;
 const add=b=>{chunks.push(b);length+=b.length;};
 const str=t=>enc.encode(t);
 const pageIds=pages.map((_,i)=>3+i*3),objects=[];
 objects.push([1,str("<< /Type /Catalog /Pages 2 0 R >>")]);
 objects.push([2,str("<< /Type /Pages /Kids ["+pageIds.map(id=>id+" 0 R").join(" ")+"] /Count "+pages.length+" >>")]);
 pages.forEach((page,i)=>{
  const p=pageIds[i],im=p+1,co=p+2;
  objects.push([p,str("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+pageW+" "+pageH+"] /Resources << /XObject << /Im0 "+im+" 0 R >> >> /Contents "+co+" 0 R >>")]);
  objects.push([im,{dict:str("<< /Type /XObject /Subtype /Image /Width "+source.width+" /Height "+page.height+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+page.bytes.length+" >>"),stream:page.bytes}]);
  const cmd=str("q "+pageW+" 0 0 "+pageH+" 0 0 cm /Im0 Do Q");
  objects.push([co,{dict:str("<< /Length "+cmd.length+" >>"),stream:cmd}]);
 });
 add(str("%PDF-1.4\n%MECHNAR\n"));
 for(const [id,obj] of objects){
  offsets[id]=length;add(str(id+" 0 obj\n"));
  if(obj instanceof Uint8Array){add(obj);add(str("\nendobj\n"));}
  else{add(obj.dict);add(str("\nstream\n"));add(obj.stream);add(str("\nendstream\nendobj\n"));}
 }
 const xref=length,size=objects.length+1;add(str("xref\n0 "+size+"\n0000000000 65535 f \n"));
 for(let id=1;id<size;id++)add(str(String(offsets[id]).padStart(10,"0")+" 00000 n \n"));
 add(str("trailer\n<< /Size "+size+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF"));
 downloadBlob(new Blob(chunks,{type:"application/pdf"}),"MECHNAR-performance-analysis.pdf");
}
async function render(root){
 let currentData=null;
 root.innerHTML='<main class="pa-analysis"><header class="paa-heading"><div><p>ORGANISATION INTELLIGENCE</p><h2>Performance Analysis</h2><span>Evidence-based team performance, rankings and improvement planning.</span></div><div class="paa-header-actions"><label class="paa-export-select-label" for="paa-export-format">Export format</label><select id="paa-export-format" aria-label="Select export format"><option value="csv">CSV</option><option value="pdf">PDF</option><option value="png">Image (PNG)</option></select><button class="paa-export-top" type="button" id="paa-export-top">Export</button><button class="paa-refresh" type="button">↻ Refresh</button></div></header><section class="paa-filters"><label>From<input type="date" id="paa-start"></label><label>To<input type="date" id="paa-end"></label><label>Team<select id="paa-team"><option value="">'+(String(window.CleanTrackAuth?.getCurrentUser()?.role||"").toLowerCase()==="admin"?"All organisation":"My team")+'</option></select></label><button id="paa-apply">Apply filters</button></section><div class="paa-status" role="status">Loading organisation performance…</div><div id="paa-body" hidden></div></main>';
 const start=root.querySelector("#paa-start"),end=root.querySelector("#paa-end"),team=root.querySelector("#paa-team"),status=root.querySelector(".paa-status"),body=root.querySelector("#paa-body");
  root.querySelector("#paa-export-top").onclick=async()=>{
   if(!currentData){status.textContent="Load performance data before exporting.";return;}
   const button=root.querySelector("#paa-export-top"),format=root.querySelector("#paa-export-format").value;
   button.disabled=true;button.textContent="Preparing…";
   try{if(format==="csv")csvDownload(currentData);else if(format==="pdf")await pdfDownload(currentData);else if(format==="png")imageDownload(currentData);}
   catch(error){console.error("Performance export failed:",error);status.textContent="Export failed. Please try again.";status.hidden=false;}
   finally{button.disabled=false;button.textContent="Export";}
  };
 const today=new Date(),prior=new Date(today);prior.setDate(today.getDate()-29);const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);start.value=iso(prior);end.value=iso(today);
 async function load(){
 status.textContent="Loading recorded performance…";status.hidden=false;body.hidden=true;
 try{
 const q=new URLSearchParams({start_date:start.value,end_date:end.value});if(team.value)q.set("team_id",team.value);
 const data=await API.get("analytics/performance-analysis?"+q.toString());
  currentData=data;
 if(!team.dataset.ready){(data.teams||[]).forEach(t=>{const o=document.createElement("option");o.value=t.team_id;o.textContent=t.team_name;team.appendChild(o);});if(String(window.CleanTrackAuth?.getCurrentUser()?.role||"").toLowerCase()==="supervisor"){team.disabled=true;team.options[0].textContent="All teams · aggregate comparison";}team.dataset.ready="1";}
 const o=data.overview||{},own=(data.teams||[]).find(t=>t.team_id===data.scope?.own_team_id)||null;
 const summary=String(window.CleanTrackAuth?.getCurrentUser()?.role||"").toLowerCase()==="supervisor"?o: o;
 const improvement=(data.automated_improvements||[]).map(x=>'<article class="paa-improvement"><span class="paa-priority">'+esc(x.priority)+'</span><h4>'+esc(x.title)+'</h4><p>'+esc(x.evidence)+'</p><small>'+esc(x.action)+'</small></article>').join("");
 const notices=(data.admin_improvements||[]).map(x=>'<article class="paa-notice"><b>'+esc(x.title)+'</b><p>'+esc(x.message)+'</p><small>'+esc(x.severity)+' · Admin guidance</small></article>').join("");
 const teamRows=(data.teams||[]).map(x=>[x.rank??"—",x.team_name,x.supervisor,x.total_operations,x.completed,pct(x.completion_rate),pct(x.on_time_rate),pct(x.approval_rate),pct(x.overdue_rate),x.score??"Insufficient data"]);
 const peopleRows=(data.individuals||[]).map(x=>[x.rank??"—",x.name,x.total_operations,x.completed,pct(x.completion_rate),pct(x.on_time_rate),pct(x.approval_rate),pct(x.overdue_rate),x.score??"Insufficient data"]);
 const locationRows=(data.locations||[]).map(x=>[x.rank??"—",x.location_name,x.total_operations,x.completed,pct(x.completion_rate),pct(x.on_time_rate),x.score??"Insufficient data"]);
 const typeRows=(data.operation_types||[]).map(x=>[x.rank??"—",x.operation_type,x.total_operations,x.completed,pct(x.completion_rate),pct(x.on_time_rate),x.score??"Insufficient data"]);
 const roleRows=(data.roles||[]).map(x=>[x.rank??"—",x.role,x.total_operations,x.completed,pct(x.completion_rate),pct(x.on_time_rate),x.score??"Insufficient data"]);
 const histRows=(data.history||[]).map(x=>[x.period,x.total_operations,x.completed,pct(x.completion_rate),pct(x.on_time_rate),pct(x.approval_rate),pct(x.overdue_rate),x.score??"Insufficient data"]);
 const rankingPanel='<section class="paa-section"><div class="paa-section-head"><div><p>PERFORMANCE RANKINGS</p><h3>Comparative rankings</h3></div></div><h4>Team rankings</h4>'+table(["Rank","Team","Supervisor","Operations","Completed","Completion","On time","Approval","Overdue","Score"],teamRows)+'<h4>Individual staff · '+(own?.team_name||"Selected team")+'</h4>'+table(["Rank","Staff","Operations","Completed","Completion","On time","Approval","Overdue","Score"],peopleRows)+'<div class="paa-two-col"><div><h4>Location-wise rankings</h4>'+table(["Rank","Location","Operations","Completed","Completion","On time","Score"],locationRows)+'</div><div><h4>Operation-type rankings</h4>'+table(["Rank","Operation type","Operations","Completed","Completion","On time","Score"],typeRows)+'</div></div><h4>Role-wise rankings</h4>'+table(["Rank","Role","Operations","Completed","Completion","On time","Score"],roleRows)+'<p class="paa-note">Role and attendance rankings are shown only when the organisation has reliable source records. '+esc(data.attendance?.message||"Attendance data is not connected.")+'</p></section>';
 const goals=[];
 if(o.completion_rate!=null&&o.completion_rate<90)goals.push(["Completion","Reach 90% completion",pct(o.completion_rate),"Review the open-operation queue each shift; redistribute aged work."]);
 if(o.on_time_rate!=null&&o.on_time_rate<90)goals.push(["Punctuality","Reach 90% on-time completion",pct(o.on_time_rate),"Review due dates and rebalance high-effort assignments before shift start."]);
 if(o.approval_rate!=null&&o.approval_rate<95)goals.push(["Approval quality","Reach 95% approval",pct(o.approval_rate),"Review rejection feedback and verify completion criteria before submission."]);
 if(o.overdue_rate!=null&&o.overdue_rate>5)goals.push(["Overdue control","Bring overdue rate below 5%",pct(o.overdue_rate),"Create a daily overdue review and escalate blocked operations."]);
 if(!goals.length)goals.push(["Maintain","Maintain current performance","No threshold breach detected","Keep weekly reviews and compare the next period against this baseline."]);
 body.innerHTML=
 '<section class="paa-section"><div class="paa-section-head"><div><p>TEAM OVERVIEW</p><h3>'+(data.scope?.role==="Supervisor"?(own?.team_name||"Your team"):"Organisation overview")+'</h3></div><span class="paa-period">'+esc(data.period.start_date)+' — '+esc(data.period.end_date)+'</span></div><div class="paa-metrics">'+metric("Operations",num(o.total_operations),"Created in selected period")+metric("Completed",num(o.completed),pct(o.completion_rate)+" completion")+metric("Pending",num(o.pending),"Not completed or cancelled")+metric("Overdue",num(o.overdue),pct(o.overdue_rate)+" of operations")+metric("On-time rate",pct(o.on_time_rate),"Completed operations with due dates")+metric("Approval rate",pct(o.approval_rate),"Reviewed operations")+metric("Avg. completion",o.average_completion_hours==null?"—":o.average_completion_hours+" hrs","Recorded completion duration")+metric("Weighted workload",num(o.weighted_workload),"Estimated minutes × priority")+'</div></section>'+
 '<section class="paa-section paa-ranking-launch"><div class="paa-section-head"><div><p>PERFORMANCE RANKINGS</p><h3>Comparative rankings</h3><span class="paa-note">Explore team, individual, location, operation-type and role comparisons in a separate workspace.</span></div><button type="button" id="paa-open-rankings">Open comparative rankings ↗</button></div></section>'+
  '<section class="paa-section paa-improvement-launch"><div class="paa-section-head"><h3>Areas for Improvement</h3><button type="button" id="paa-open-improvements">Open</button></div></section>'+
 '<section class="paa-section paa-history-launch"><div class="paa-section-head"><div><p>PERFORMANCE HISTORY</p><h3>Progress over time</h3><span class="paa-note">Review historical performance trends in a separate panel.</span></div><button type="button" id="paa-open-history">Open performance history ↗</button></div></section>'+
 '<section class="paa-section"><div class="paa-section-head"><div><p>PERFORMANCE GOALS</p><h3>Measurable next steps</h3></div></div><div class="paa-goals">'+goals.map((g,i)=>'<article><span>GOAL</span><h4>'+esc(g[1])+'</h4><p>Current baseline: '+esc(g[2])+'</p><small>'+esc(g[3])+'</small></article>').join("")+'</div><p class="paa-note">Goals are generated from this historical baseline; they are recommendations, not persisted targets or completion tracking.</p></section>'+
 '<section class="paa-section"><div class="paa-section-head"><div><p>METHODOLOGY & DATA COVERAGE</p><h3>How rankings are calculated</h3></div></div><p class="paa-note">'+esc(data.methodology)+'</p><p class="paa-note">No attendance model is connected to this analysis. Attendance ranking is deliberately not fabricated. Team-level comparisons are aggregates; Supervisor individual detail is restricted to their own team.</p></section>';
 document.querySelectorAll(".paa-ranking-overlay").forEach(node=>node.remove());
 const rankingOverlay=document.createElement("div");
 rankingOverlay.className="paa-ranking-overlay";
 rankingOverlay.hidden=true;
 rankingOverlay.innerHTML='<section class="paa-ranking-dialog" role="dialog" aria-modal="true" aria-labelledby="paa-ranking-title"><header><div><p>PERFORMANCE RANKINGS</p><h2 id="paa-ranking-title">Comparative rankings</h2></div><button type="button" class="paa-ranking-close" aria-label="Close comparative rankings">×</button></header><div class="paa-ranking-content"></div></section>';
 rankingOverlay.querySelector(".paa-ranking-content").innerHTML=rankingPanel;
 document.body.appendChild(rankingOverlay);
 const closeRankings=()=>{rankingOverlay.hidden=true;document.body.classList.remove("paa-ranking-open");document.removeEventListener("keydown",rankingEsc);};
 root.querySelector("#paa-open-rankings").onclick=()=>{rankingOverlay.hidden=false;document.body.classList.add("paa-ranking-open");rankingOverlay.querySelector(".paa-ranking-content").scrollTop=0;rankingOverlay.querySelector(".paa-ranking-close").focus();document.addEventListener("keydown",rankingEsc);};
 rankingOverlay.querySelector(".paa-ranking-close").onclick=closeRankings;
 rankingOverlay.addEventListener("click",e=>{if(e.target===rankingOverlay)closeRankings();});
 const rankingEsc=e=>{if(e.key==="Escape"&&!rankingOverlay.hidden)closeRankings();};
 const historyOverlay=document.createElement("div");
 historyOverlay.className="paa-history-overlay";
 historyOverlay.hidden=true;
 historyOverlay.innerHTML='<section class="paa-ranking-dialog paa-history-dialog" role="dialog" aria-modal="true" aria-labelledby="paa-history-title"><header><div><p>PERFORMANCE TRENDS</p><h2 id="paa-history-title">Performance History</h2></div><button type="button" class="paa-ranking-close paa-history-close" aria-label="Close performance history">×</button></header><div class="paa-history-content"></div></section>';
 historyOverlay.querySelector(".paa-history-content").innerHTML='<section class="paa-section"><div class="paa-section-head"><div><p>SELECTED REPORTING PERIOD</p><h3>Progress over time</h3><span class="paa-period">'+esc(data.period.start_date)+' — '+esc(data.period.end_date)+'</span></div></div>'+table(["Period","Operations","Completed","Completion","On time","Approval","Overdue","Score"],histRows)+'</section>';
 document.body.appendChild(historyOverlay);
 const closeHistory=()=>{historyOverlay.hidden=true;document.body.classList.remove("paa-history-open");document.removeEventListener("keydown",historyEsc);};
 root.querySelector("#paa-open-history").onclick=()=>{historyOverlay.hidden=false;document.body.classList.add("paa-history-open");historyOverlay.querySelector(".paa-history-content").scrollTop=0;historyOverlay.querySelector(".paa-history-close").focus();document.addEventListener("keydown",historyEsc);};
 historyOverlay.querySelector(".paa-history-close").onclick=closeHistory;
 historyOverlay.addEventListener("click",e=>{if(e.target===historyOverlay)closeHistory();});
 const historyEsc=e=>{if(e.key==="Escape"&&!historyOverlay.hidden)closeHistory();};

 const improvementOverlay=document.createElement("div");
 improvementOverlay.className="paa-improvement-overlay";
 improvementOverlay.hidden=true;
 improvementOverlay.innerHTML='<section class="paa-ranking-dialog paa-improvement-dialog" role="dialog" aria-modal="true" aria-labelledby="paa-improvement-title"><header><div><p>TEAM DEVELOPMENT</p><h2 id="paa-improvement-title">Areas for Improvement</h2></div><button type="button" class="paa-ranking-close paa-improvement-close" aria-label="Close areas for improvement">×</button></header><div class="paa-improvement-content"></div></section>';
 improvementOverlay.querySelector(".paa-improvement-content").innerHTML='<section class="paa-section">'+(notices?'<h3>Published by Admin</h3><div class="paa-guidance">'+notices+'</div>':'<p class="paa-note">No published Admin improvement guidance is assigned to this team.</p>')+'<h3>Automated suggestions from recorded performance</h3><div class="paa-guidance">'+(improvement||'<p class="paa-note">Not enough recorded data to generate suggestions.</p>')+'</div></section>';
 document.body.appendChild(improvementOverlay);
 const closeImprovements=()=>{improvementOverlay.hidden=true;document.body.classList.remove("paa-improvement-open");document.removeEventListener("keydown",improvementEsc);};
 root.querySelector("#paa-open-improvements").onclick=()=>{improvementOverlay.hidden=false;document.body.classList.add("paa-improvement-open");improvementOverlay.querySelector(".paa-improvement-content").scrollTop=0;improvementOverlay.querySelector(".paa-improvement-close").focus();document.addEventListener("keydown",improvementEsc);};
 improvementOverlay.querySelector(".paa-improvement-close").onclick=closeImprovements;
 improvementOverlay.addEventListener("click",e=>{if(e.target===improvementOverlay)closeImprovements();});
 const improvementEsc=e=>{if(e.key==="Escape"&&!improvementOverlay.hidden)closeImprovements();};

 body.hidden=false;status.hidden=true;
 
 
 }catch(e){status.textContent=e?.message||"Performance data could not be loaded. Check your connection and try again.";status.classList.add("is-error");}
 }
 root.querySelector("#paa-apply").onclick=load;root.querySelector(".paa-refresh").onclick=load;await load();
}
window.MechnarPerformanceAnalysis={render};
})();