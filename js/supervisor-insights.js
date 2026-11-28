(function(){
"use strict";
const API=window.CleanTrackApi, AUTH=window.CleanTrackAuth;
const $=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const fmt=v=>v===null||v===undefined||v===""?"—":Number(v).toLocaleString();
const pct=v=>v===null||v===undefined?"—":Number(v).toFixed(1)+"%";
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function style(){
 if(document.getElementById("mn-supervisor-insights-style"))return;
 const s=document.createElement("style");s.id="mn-supervisor-insights-style";s.textContent=`
 .mn-insights{box-sizing:border-box;width:100%;max-width:1480px;margin:0 auto;padding:8px 8px 44px;color:var(--text,#f1edf8);min-height:0;overflow:visible}
 .mn-insights-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:22px;flex-wrap:wrap}
 .mn-insights-kicker{font-size:10px;letter-spacing:.19em;font-weight:800;color:var(--primary,#ad82ef);margin:0 0 7px}
 .mn-insights-head h1{font-size:clamp(25px,3vw,34px);margin:0}
 .mn-insights-sub{max-width:760px;color:var(--text-secondary,#aaa5b8);line-height:1.6;margin:8px 0 0}
 .mn-insights-controls{display:flex;gap:8px;align-items:center}
 .mn-insights-controls select,.mn-insights-controls button{min-height:38px;padding:8px 12px;border:1px solid var(--border,#393342);border-radius:9px;background:var(--surface,#17151f);color:inherit;font:inherit}
 .mn-insights-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0 16px}
 .mn-insights-kpi{border:1px solid var(--border,#383241);border-radius:13px;padding:17px 18px;background:var(--surface,#17151f);min-width:0}
 .mn-insights-kpi span{display:block;color:var(--text-secondary,#aaa5b8);font-size:12px}
 .mn-insights-kpi strong{display:block;font-size:clamp(22px,2.5vw,30px);margin-top:9px;font-weight:750}
 .mn-insights-kpi small{display:block;margin-top:4px;color:var(--text-secondary,#aaa5b8);font-size:11px}
 .mn-insights-panels{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,1fr);gap:14px}
 .mn-insights-panel{min-width:0;border:1px solid var(--border,#383241);border-radius:14px;background:var(--surface,#17151f);padding:18px}
 .mn-insights-panel h2{font-size:15px;margin:0 0 4px}
 .mn-insights-muted{font-size:12px;color:var(--text-secondary,#aaa5b8);margin:0 0 14px;line-height:1.5}
 .mn-insights-chart{width:100%;height:auto;display:block;overflow:visible}
 .mn-insights-donut-wrap{display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:wrap;padding:12px 0}
 .mn-insights-donut{width:176px;height:176px;border-radius:50%;position:relative;display:grid;place-items:center;background:conic-gradient(#9b70d8 0deg,#9b70d8 0deg,#51475f 0deg 360deg)}
 .mn-insights-donut:after{content:"";position:absolute;inset:20px;border-radius:50%;background:var(--surface,#17151f)}
 .mn-insights-donut-center{position:relative;z-index:1;text-align:center}
 .mn-insights-donut-center strong{display:block;font-size:27px}
 .mn-insights-donut-center span{font-size:11px;color:var(--text-secondary,#aaa5b8)}
 .mn-insights-legend{display:grid;gap:10px;min-width:120px}
 .mn-insights-legend div{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary,#aaa5b8)}
 .mn-insights-dot{width:9px;height:9px;border-radius:3px;display:inline-block;flex:0 0 9px}
 .mn-insights-table{width:100%;border-collapse:collapse;font-size:12px}
 .mn-insights-table th,.mn-insights-table td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--border,#383241);white-space:nowrap}
 .mn-insights-table th{color:var(--text-secondary,#aaa5b8);font-weight:600}
 .mn-insights-table td:last-child,.mn-insights-table th:last-child{text-align:right}
 .mn-insights-bar{height:5px;border-radius:9px;background:var(--border,#383241);overflow:hidden;margin-top:5px;min-width:70px}
 .mn-insights-bar i{display:block;height:100%;background:#9b70d8;border-radius:9px}
 .mn-insights-heat{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
 .mn-insights-heat-cell{border:1px solid var(--border,#383241);border-radius:9px;padding:11px;background:var(--bg-elevated,#201c29)}
 .mn-insights-heat-cell strong{display:block;font-size:12px;margin-bottom:5px}
 .mn-insights-heat-cell span{font-size:11px;color:var(--text-secondary,#aaa5b8)}
 .mn-insights-status{padding:24px 18px;border:1px solid var(--border,#383241);border-radius:12px;color:var(--text-secondary,#aaa5b8);line-height:1.6;background:var(--surface,#17151f)}
 .mn-insights-error{color:#e7a1a1}
 @media(max-width:900px){.mn-insights-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mn-insights-panels{grid-template-columns:1fr}}
 @media(max-width:520px){.mn-insights{padding-left:2px;padding-right:2px}.mn-insights-grid{gap:8px}.mn-insights-kpi{padding:13px}.mn-insights-panel{padding:14px}.mn-insights-donut{width:145px;height:145px}}
 `;document.head.appendChild(s);
}
function svgLine(rows){
 const w=720,h=230,p=28;
 const validRows=rows.filter(r=>r.compliance_pct!==null&&r.compliance_pct!==undefined&&Number.isFinite(Number(r.compliance_pct)));
 if(!validRows.length)return '<div class="mn-insights-status">No completed operations were recorded in this period, so a compliance trend cannot be calculated yet.</div>';
 const points=validRows.map((r,i)=>({x:p+(validRows.length<2?0:i*(w-p*2)/(validRows.length-1)),y:h-p-(Math.max(0,Math.min(100,Number(r.compliance_pct)||0))/100)*(h-p*2),v:Number(r.compliance_pct)||0,label:r.period}));
 const path=points.map((q,i)=>(i?"L":"M")+q.x.toFixed(1)+" "+q.y.toFixed(1)).join(" ");
 const grid=[0,25,50,75,100].map(v=>{const y=h-p-(v/100)*(h-p*2);return '<line x1="'+p+'" y1="'+y+'" x2="'+(w-p)+'" y2="'+y+'" stroke="currentColor" opacity=".12"/><text x="3" y="'+(y+4)+'" fill="currentColor" opacity=".55" font-size="10">'+v+'</text>';}).join("");
 const dots=points.map(q=>'<circle cx="'+q.x+'" cy="'+q.y+'" r="3.5" fill="#a77be3"><title>'+safe(q.label)+': '+q.v+'%</title></circle>').join("");
 return '<svg class="mn-insights-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Team compliance trend">'+grid+'<path d="'+path+'" fill="none" stroke="#a77be3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+dots+'</svg>';
}
function groupTrend(rows,period){
 if(period==="daily")return rows.slice(-14);
 const groups=new Map();
 rows.forEach(r=>{const d=String(r.period||"");const key=period==="weekly"?d.slice(0,7)+" · W"+Math.ceil(Number(d.slice(8,10)||1)/7):d.slice(0,7);const x=groups.get(key)||{period:key,total:0,completed:0,missed:0};x.total+=Number(r.total)||0;x.completed+=Number(r.completed)||0;x.missed+=Number(r.missed)||0;x.compliance_pct=x.total?Math.round(x.completed*1000/x.total)/10:null;groups.set(key,x);});
 return Array.from(groups.values()).slice(period==="weekly"?-8:-6);
}
async function render(container){
 style();container.scrollTop=0;window.scrollTo(0,0);container.replaceChildren();
 const user=AUTH?.getCurrentUser?.();
 if(!user||String(user.role||"").toLowerCase()!=="supervisor"){container.appendChild($("p","mn-insights-status","Insights is available to Supervisors only."));return;}
 const page=$("section","mn-insights");
 const head=$("header","mn-insights-head"),intro=$("div","");
 intro.append($("p","mn-insights-kicker","TEAM INTELLIGENCE"),$("h1","","Insights"),$("p","mn-insights-sub","A data-backed view of your assigned team’s work, compliance and operational pressure points."));
 const controls=$("div","mn-insights-controls"),range=$("select","");
 [["7","7 days"],["30","30 days"],["90","90 days"]].forEach(([v,l])=>{const o=$("option","",l);o.value=v;range.appendChild(o);});range.value="30";
 const refresh=$("button","","Refresh");refresh.type="button";controls.append(range,refresh);head.append(intro,controls);page.appendChild(head);
 const status=$("div","mn-insights-status","Loading your team's verified records…");page.appendChild(status);container.appendChild(page);
 let request=0;
 async function load(){
  const token=++request;status.className="mn-insights-status";status.textContent="Updating team insights…";
  try{
   if(!API?.get)throw new Error("The data service is unavailable.");
   const data=await API.get("supervisor/insights?days="+encodeURIComponent(range.value));
   if(token!==request||!container.isConnected)return;
   const summary=data.summary||{},trend=Array.isArray(data.trend)?data.trend:[],staff=Array.isArray(data.staff)?data.staff:[],zones=Array.isArray(data.zones)?data.zones:[];
   const kpis=$("div","mn-insights-grid");
   [[ "Team members",fmt(summary.staff_count),"Active staff in your assigned team" ],["Tasks recorded",fmt(summary.total_tasks),range.value+" day period"],["Team compliance",pct(summary.compliance_pct),"Completed ÷ recorded work"],["Average completion",summary.avg_duration==null?"—":fmt(summary.avg_duration)+" min","Completed operations only"]].forEach(([label,value,note])=>{const card=$("div","mn-insights-kpi");card.append($("span","",label),$("strong","",value),$("small","",note));kpis.appendChild(card);});
   const panels=$("div","mn-insights-panels");
   const trendPanel=$("section","mn-insights-panel");trendPanel.append($("h2","","Compliance Over Time"),$("p","mn-insights-muted","Team completion rate across the selected period."));
   const period=$("select","");[["daily","Daily"],["weekly","Weekly"],["monthly","Monthly"]].forEach(([v,l])=>{const o=$("option","",l);o.value=v;period.appendChild(o);});
   const chart=$("div","");chart.innerHTML=svgLine(groupTrend(trend,"daily"));period.addEventListener("change",()=>{chart.innerHTML=svgLine(groupTrend(trend,period.value));});
   trendPanel.append(period,chart);
   const donutPanel=$("section","mn-insights-panel");donutPanel.append($("h2","","Team Work Distribution"),$("p","mn-insights-muted","Completed, missed and other recorded operations."));
   const pending=Math.max(0,Number(summary.total_tasks||0)-Number(summary.completed||0)-Number(summary.missed||0));
   const total=Number(summary.total_tasks)||0,done=Number(summary.completed)||0,missed=Number(summary.missed)||0;
   const doneDeg=total?done/total*360:0,missDeg=total?missed/total*360:0;
   const donutWrap=$("div","mn-insights-donut-wrap"),donut=$("div","mn-insights-donut");
   donut.style.background='conic-gradient(#a77be3 0deg '+doneDeg+'deg,#d17b86 '+doneDeg+'deg '+(doneDeg+missDeg)+'deg,#51475f '+(doneDeg+missDeg)+'deg 360deg)';
   const center=$("div","mn-insights-donut-center");center.append($("strong","",fmt(total)),$("span","","Total operations"));donut.appendChild(center);
   const legend=$("div","mn-insights-legend");[[ "#a77be3","Completed",done ],["#d17b86","Missed",missed],["#51475f","Other",pending]].forEach(([c,l,v])=>{const row=$("div","");const dot=$("i","mn-insights-dot");dot.style.background=c;row.append(dot,document.createTextNode(l+" · "+fmt(v)));legend.appendChild(row);});donutWrap.append(donut,legend);donutPanel.appendChild(donutWrap);
   panels.append(trendPanel,donutPanel);
   const dataNote=$("div","mn-insights-data-note");
   if(total===0){dataNote.append($("strong","","No operations found in this reporting period"),$("span","","There are no operations assigned to your team within the selected dates. Try 90 days, or check that operations are assigned to your team, its locations or zones. MECHNAR will not generate placeholder figures."));}
   const staffPanel=$("section","mn-insights-panel");staffPanel.style.marginTop="14px";staffPanel.append($("h2","","Staff Performance Ranking"),$("p","mn-insights-muted","Ranked using recorded completion rate. Staff without completed work remain unranked."));
   const table=$("table","mn-insights-table"),thead=$("thead",""),tr=$("tr","");["Staff","Completed / Total","Compliance"].forEach(x=>tr.appendChild($("th","",x)));thead.appendChild(tr);table.appendChild(thead);
   const tbody=$("tbody","");staff.forEach(person=>{const row=$("tr","");row.append($("td","",person.name||"Staff"),$("td","",fmt(person.completed)+" / "+fmt(person.total_tasks)),$("td","",pct(person.compliance_pct)));tbody.appendChild(row);});if(!staff.length){const row=$("tr","");const cell=$("td","","No staff performance records are available for this period.");cell.colSpan=3;row.appendChild(cell);tbody.appendChild(row);}table.appendChild(tbody);staffPanel.appendChild(table);
   const heat=$("section","mn-insights-panel");heat.style.marginTop="14px";heat.append($("h2","","Zone Miss Heatmap"),$("p","mn-insights-muted","Zones within your assigned team's locations, ordered by missed operations."));
   const heatGrid=$("div","mn-insights-heat");zones.forEach(z=>{const n=Number(z.missed_count)||0;const severity=n===0?"Low":n<=2?"Medium":n<=5?"High":"Critical";const cell=$("div","mn-insights-heat-cell");cell.append($("strong","",z.name||"Zone"),$("span","",(z.location_name||"Location")+" · "+severity+" · "+n+" missed"));heatGrid.appendChild(cell);});if(!zones.length)heatGrid.appendChild($("div","mn-insights-status","No zone-level task records are available for your assigned team."));heat.appendChild(heatGrid);
   const foot=$("p","mn-insights-muted","Data scope: "+(Array.isArray(data.teams)&&data.teams.length?data.teams.join(", "):"your assigned team")+" · "+range.value+" days. Metrics reflect recorded operations only.");
   page.replaceChildren(head,kpis,...(total===0?[dataNote]:[]),panels,staffPanel,heat,foot);
  }catch(error){if(token!==request)return;status.className="mn-insights-status mn-insights-error";status.replaceChildren($("strong","","Insights could not be loaded"),$("span","",(error?.message||"The server could not return your team records.")+((error?.status===401||error?.status===403)?" Check that you are signed in with an active Supervisor account assigned to one active team.":" Check the backend terminal for the matching request error.")));const retry=$("button","mn-insights-retry","Try again");retry.type="button";retry.addEventListener("click",load);status.appendChild(retry);}
 }
 range.addEventListener("change",load);refresh.addEventListener("click",load);await load();
}
window.MechnarSupervisorInsights=Object.freeze({render});
})();