(function(){
"use strict";
const API=window.CleanTrackApi,AUTH=window.CleanTrackAuth,NS="http://www.w3.org/2000/svg";
const $=(t,c,s)=>{const n=document.createElement(t);if(c)n.className=c;if(s!==undefined&&s!==null)n.textContent=String(s);return n;};
const S=(t,a,s)=>{const n=document.createElementNS(NS,t);Object.entries(a||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));if(s!==undefined)n.textContent=String(s);return n;};
const B=(s,c,fn)=>{const n=$("button",c,s);n.type="button";n.addEventListener("click",fn);return n;};
const W=(s,n,h)=>{const x=$("label","ct-analytics3-field");x.append($("span","",s),n);if(h)x.appendChild($("small","",h));return x;};
const SEL=(name,items,multi)=>{const n=$("select","ct-analytics3-input");n.name=name;if(multi){n.multiple=true;n.size=4;}items.forEach(([v,l])=>{const o=$("option","",l);o.value=v;n.appendChild(o);});return n;};
const PICK=n=>Array.from(n.selectedOptions).map(o=>o.value).filter(Boolean);
function options(n,rows,chosen,k,v){n.replaceChildren();if(!n.multiple){const o=$("option","","All");o.value="";n.appendChild(o);}rows.forEach(r=>{const o=$("option","",r[k]);o.value=String(r[v]);n.appendChild(o);});if(n.multiple){const allowed=new Set(rows.map(r=>String(r[v])));chosen.filter(x=>allowed.has(String(x))).forEach(x=>{const o=Array.from(n.options).find(y=>y.value===String(x));if(o)o.selected=true;});}else n.value=rows.some(r=>String(r[v])===String(chosen))?String(chosen):"";}
const NUM=v=>v===null||v===undefined||v===""?"—":new Intl.NumberFormat().format(Number(v));
const PCT=v=>v===null||v===undefined?"N/A":Number(v).toFixed(1)+"%";
function shortDate(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
 if(!match)return String(value||"");
 const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
 return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(date);
}
function compactPeriodLabel(value){
 const label=String(value??"");
 if(/^\d{4}-\d{2}-\d{2}$/.test(label))return shortDate(label);
 const month=/^(\d{4})-(\d{2})$/.exec(label);
 if(month)return new Intl.DateTimeFormat(undefined,{month:"short",year:"2-digit"}).format(new Date(Number(month[1]),Number(month[2])-1,1));
 const quarter=/^(\d{4})-?Q([1-4])$/i.exec(label);
 if(quarter)return "Q"+quarter[2]+" ’"+quarter[1].slice(-2);
 return label.length>19?label.slice(0,16)+"…":label;
}
function readableDate(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||""));
 if(!match)return String(value||"");
 return new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short",year:"numeric"}).format(new Date(Number(match[1]),Number(match[2])-1,Number(match[3])));
}
const NAMES={total_tasks:"Tasks created",completed_tasks:"Completed tasks",completion_rate:"Completion rate",open_tasks:"Open tasks",overdue_tasks:"Overdue tasks",overdue_rate:"Overdue rate",on_time_rate:"On-time rate",average_completion_hours:"Average completion time"};
const TRENDS=[["all","All work trends"],["created","Tasks created"],["completed","Completion events"],["approved","Approval events"],["rejected","Rejection events"],["submitted","Submission events"]];
const METRICS=Object.keys(NAMES).map(k=>[k,NAMES[k]]);
function render(container){
container.replaceChildren();const user=AUTH&&AUTH.getCurrentUser?AUTH.getCurrentUser():null;
if(!user||String(user.role||"").toLowerCase()!=="admin"){container.appendChild($("p","ct-analytics-muted","Organization Analytics is available to Admin users only."));return;}
const page=$("section","ct-analytics3-page"),hero=$("header","ct-analytics3-hero");
hero.append($("p","ct-analytics3-eyebrow","ORGANIZATION PERFORMANCE"),$("h1","","Analytics"),$("p","","Explore employee output, work trends, locations, operation types and organization performance. Charts are built from your organization’s actual operations and audit events."));
const tags=$("div","ct-analytics3-tags");["Live organization records","Filterable reports","Multiple chart formats"].forEach(x=>tags.appendChild($("span","",x)));hero.appendChild(tags);page.appendChild(hero);
const dates=(days=7)=>{const e=new Date(),s=new Date(e);s.setDate(s.getDate()-(Math.max(1,days)-1));return{start:s.getFullYear()+"-"+String(s.getMonth()+1).padStart(2,"0")+"-"+String(s.getDate()).padStart(2,"0"),end:e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0")};};
const range=SEL("date_preset",[["7","Last 7 days"],["30","Last 30 days"],["90","Last 90 days"],["custom","Custom dates"]]);range.value="7";
const d=dates(7),from=$("input","ct-analytics3-input"),to=$("input","ct-analytics3-input");from.type=to.type="date";from.value=d.start;to.value=d.end;
const fromField=W("From",from),toField=W("To",to);
const bucket=SEL("bucket",[["day","Day"],["week","Week"],["month","Month"],["quarter","Quarter"],["year","Year"]]);bucket.value="day";
const team=SEL("team_ids",[],true),location=SEL("location_ids",[],true),zone=SEL("zone_ids",[],true),employee=SEL("employee_ids",[],true),type=SEL("task_type",[],false);
const filterPanel=$("details","ct-analytics3-filter-panel ct-analytics3-filter-details");
const rangeSummary=$("span","ct-analytics3-filter-summary-range","Last 7 days");
const filterSummary=$("summary","ct-analytics3-filter-summary");
filterSummary.append($("span","ct-analytics3-filter-summary-title","Date range & filters"),rangeSummary,$("span","ct-analytics3-filter-summary-chevron","⌄"));
filterPanel.append(filterSummary,$("h2","","Refine your analytics"),$("p","ct-analytics3-muted","Choose a date range and optionally narrow the report by team, location, zone, employee, or operation type."));
function refreshRangeControls(){
 const custom=range.value==="custom";
 fromField.hidden=toField.hidden=!custom;
 rangeSummary.textContent=custom?("Custom · "+readableDate(from.value)+" – "+readableDate(to.value)):"Last "+range.value+" days";
}
const fg=$("div","ct-analytics3-filter-grid");
fg.append(W("Date range",range),fromField,toField,W("Trend interval",bucket),W("Teams",team,"Choose multiple teams to compare."),W("Locations",location),W("Zones",zone),W("Employees",employee),W("Operation type",type));
const apply=B("Apply filters","ct-analytics3-button ct-analytics3-primary",load),reset=B("Reset filters","ct-analytics3-button ct-analytics3-secondary",()=>{range.value="7";const x=dates(7);from.value=x.start;to.value=x.end;bucket.value="day";[team,location,zone,employee].forEach(n=>Array.from(n.options).forEach(o=>o.selected=false));type.value="";refreshRangeControls();load();});
const fb=$("div","ct-analytics3-filter-actions");fb.append(apply,reset);filterPanel.append(fg,fb);page.appendChild(filterPanel);
range.addEventListener("change",()=>{if(range.value==="custom"){filterPanel.open=true;refreshRangeControls();return;}const x=dates(Number(range.value));from.value=x.start;to.value=x.end;refreshRangeControls();load();});
[from,to].forEach(n=>n.addEventListener("change",refreshRangeControls));
refreshRangeControls();
const status=$("p","ct-analytics3-status","Loading organization analytics…");status.setAttribute("role","status");status.setAttribute("aria-live","polite");page.appendChild(status);
const kpiDefs=[["Tasks created","tasks_created_in_period","Creation cohort","n"],["Completed","completed_tasks","Current status of period work","n"],["Completion rate","completion_rate","Completed ÷ created","p"],["Approvals recorded","approval_events","Audit events in period","n"],["Approval rate","approval_rate","Approvals ÷ recorded review decisions","p"],["Rejections recorded","rejection_events","Audit events in period","n"],["Rejection rate","rejection_rate","Rejections ÷ recorded review decisions","p"],["Overdue open work","overdue_tasks","Currently overdue in cohort","n"],["Overdue rate","overdue_rate","Overdue ÷ created tasks","p"],["On-time rate","on_time_rate","Completed with due dates and timestamps","p"],["Average completion time","average_completion_hours","Elapsed hours","h"]];
const kg=$("div","ct-analytics3-kpis"),kv={};kpiDefs.forEach(([label,key,note,kind])=>{const c=$("article","ct-analytics3-kpi"),v=$("strong","ct-analytics3-kpi-value","—");c.append($("span","ct-analytics3-kpi-label",label),v,$("small","",note));kv[key]={v,kind};kg.appendChild(c);});page.appendChild(kg);
const panel=$("section","ct-analytics3-panel"),ph=$("div","ct-analytics3-panel-head"),pc=$("div");pc.append($("p","ct-analytics3-eyebrow","ANALYSIS BUILDER"),$("h2","","Build your view"),$("p","ct-analytics3-muted","Change the subject, measure and visualization while retaining your filters."));ph.appendChild(pc);
const view=SEL("analysis_view",[["trends","Work trends"],["teams","Team comparisons"],["employees","Employee analytics"],["locations","Location analytics"],["operation_types","Operation-type analytics"],["statuses","Current status distribution"],["zones","Zone analytics"]]);
const chart=SEL("chart_type",[["line","Line chart"],["area","Area chart"],["bar","Bar chart"],["stacked","Stacked bar chart"],["pie","Pie chart"],["donut","Donut chart"],["table","Data table"]]);chart.value="line";
const metric=SEL("metric",TRENDS),download=B("Export current view (CSV)","ct-analytics3-button ct-analytics3-secondary",csv),downloadExcel=B("Export current view (Excel)","ct-analytics3-button ct-analytics3-secondary",exportExcel),printPdf=B("Export visual report (PDF)","ct-analytics3-button ct-analytics3-secondary",exportPdf);
const builder=$("div","ct-analytics3-builder"),exportCell=$("div","ct-analytics3-builder-action");exportCell.append(download,downloadExcel,printPdf);builder.append(W("Analysis",view),W("Visualization",chart),W("Measure",metric),exportCell);
const title=$("h3","ct-analytics3-chart-title","Work trends"),legend=$("div","ct-analytics3-legend"),drawing=$("div","ct-analytics3-chart-wrap");
const tableDetails=$("details","ct-analytics3-data-details"),tableSummary=$("summary","ct-analytics3-data-summary"),tableTitle=$("span","ct-analytics3-chart-title","Data behind this view"),tableDisclosure=$("span","ct-analytics3-table-disclosure","Show data"),tableWrap=$("div","ct-analytics3-table-wrap"),note=$("p","ct-analytics3-muted");
tableSummary.append(tableTitle,tableDisclosure);tableDetails.append(tableSummary,tableWrap);
tableDetails.addEventListener("toggle",()=>{tableDisclosure.textContent=tableDetails.open?"Hide data":"Show data";});
panel.append(ph,builder,title,legend,drawing,tableDetails,note);page.appendChild(panel);
const ai=$("section","ct-analytics3-ai-panel"),aic=$("div");ai.append($("span","ct-analytics3-ai-icon","✦"));aic.append($("h2","","AI predictions"),$("p","","Under development. Predictions will appear only after a validated prediction model is connected. No predicted values are shown yet."));ai.append(aic,$("span","ct-analytics3-ai-badge","In development"));page.appendChild(ai);
const details=$("details","ct-analytics3-methodology"),mb=$("div","ct-analytics3-methodology-body");details.append($("summary","","How this report is calculated"),mb);page.appendChild(details);container.appendChild(page);
let report=null,current=null,sequence=0,lastLoadedQuery="";
function query(){const p=new URLSearchParams({start_date:from.value,end_date:to.value,bucket:bucket.value});const prefs=window.CleanTrackPreferences&&window.CleanTrackPreferences.get?window.CleanTrackPreferences.get():{};p.set("time_zone",prefs.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC");if(PICK(team).length)p.set("team_ids",PICK(team).join(","));if(PICK(location).length)p.set("location_ids",PICK(location).join(","));if(PICK(zone).length)p.set("zone_ids",PICK(zone).join(","));if(PICK(employee).length)p.set("employee_ids",PICK(employee).join(","));if(type.value)p.set("task_type",type.value);return p;}
function fillFilters(f){const t=PICK(team),l=PICK(location),z=PICK(zone),e=PICK(employee),ty=type.value;options(team,f.teams||[],t,"name","id");options(location,f.locations||[],l,"name","id");options(zone,f.zones||[],z,"name","id");options(employee,f.employees||[],e,"name","id");options(type,(f.operation_types||[]).map(n=>({name:n,value:n})),ty,"name","value");}
function configureMetric(){const allowed=view.value==="trends"?TRENDS:view.value==="statuses"?[["statuses","Operations by current status"]]:METRICS,old=metric.value;metric.replaceChildren();allowed.forEach(([v,l])=>{const o=$("option","",l);o.value=v;metric.appendChild(o);});metric.value=allowed.some(a=>a[0]===old)?old:allowed[0][0];}
function getData(){
if(!report)return{labels:[],series:[],rows:[],title:"Analytics",metric:metric.value};
if(view.value==="trends"){if(metric.value==="all"&&(chart.value==="pie"||chart.value==="donut")){const rows=report.breakdowns?.statuses||[];return{labels:rows.map(r=>r.name),series:[{name:"Operations",key:"value",values:rows.map(r=>Number(r.value||0))}],rows,title:"Current status distribution",metric:"statuses",effectiveView:"statuses"};}const rows=report.trends||[],defs=metric.value==="all"?TRENDS.slice(1):TRENDS.filter(x=>x[0]===metric.value);return{labels:rows.map(r=>r.label),series:defs.map(([key,name])=>({name,key,values:rows.map(r=>Number(r[key]||0))})),rows,title:"Work trends",metric:metric.value,effectiveView:"trends"};}
if(view.value==="statuses"){const rows=report.breakdowns?.statuses||[];return{labels:rows.map(r=>r.name),series:[{name:"Operations",key:"value",values:rows.map(r=>Number(r.value||0))}],rows,title:"Current status distribution",metric:"statuses"};}
let rows=(report.breakdowns?.[view.value]||[]).slice();if(view.value==="teams"&&PICK(team).length)rows=rows.filter(r=>PICK(team).includes(String(r.id)));
return{labels:rows.map(r=>r.name),series:[{name:NAMES[metric.value]||"Operations",key:metric.value,values:rows.map(r=>r[metric.value]===null||r[metric.value]===undefined?0:Number(r[metric.value]))}],rows,title:({teams:"Team comparisons",employees:"Employee analytics",locations:"Location analytics",operation_types:"Operation-type analytics",zones:"Zone analytics"})[view.value]||"Analytics",metric:metric.value};
}
function drawLegend(series){legend.replaceChildren();series.forEach((s,i)=>{const n=$("span","ct-analytics3-legend-item");n.append($("i","ct-analytics3-swatch swatch-"+i%6),$("span","",s.name));legend.appendChild(n);});legend.hidden=!series.length||["pie","donut","table"].includes(chart.value);}
function sample(data,max){if(data.labels.length<=max)return data;const idx=[];for(let i=0;i<max;i++)idx.push(Math.round(i*(data.labels.length-1)/(max-1)));return{labels:idx.map(i=>data.labels[i]),series:data.series.map(s=>({...s,values:idx.map(i=>s.values[i])}))};}
function axisChart(data,kind){
const xdata=sample(data,64),labels=xdata.labels,series=xdata.series,w=1000,h=410,L=64,R=22,T=24,BOT=95,pw=w-L-R,phh=h-T-BOT,values=series.flatMap(s=>s.values),raw=Math.max(0,...values),max=raw?raw*1.15:1,root=S("svg",{viewBox:"0 0 "+w+" "+h,role:"img","aria-label":data.title+" chart"});
for(let i=0;i<=4;i++){const y=T+phh*i/4;root.append(S("line",{x1:L,y1:y,x2:w-R,y2:y,class:"ct-analytics3-gridline"}),S("text",{x:L-12,y:y+4,"text-anchor":"end",class:"ct-analytics3-axis-label"},String(Math.round(max*(1-i/4)))+(data.metric&&data.metric.endsWith("_rate")?"%":data.metric==="average_completion_hours"?" h":"")));}
if(!labels.length||!series.length||raw===0){root.appendChild(S("text",{x:w/2,y:h/2,"text-anchor":"middle",class:"ct-analytics3-empty-svg"},"No records match these filters."));drawing.appendChild(root);return;}
const xpos=i=>L+(labels.length===1?pw/2:pw*i/(labels.length-1)),ypos=v=>T+phh-Math.max(0,Number(v)||0)/max*phh;
if(kind==="bar"||kind==="stacked"){const slot=pw/labels.length,g=Math.max(2,Math.min(slot*.82,54));labels.forEach((label,i)=>{if(kind==="stacked"){let stack=0;series.forEach((s,j)=>{const v=Math.max(0,Number(s.values[i])||0),hh=v/max*phh;root.appendChild(S("rect",{x:L+slot*i+(slot-g)/2,y:ypos(stack+v),width:g,height:hh,class:"ct-analytics3-bar series-"+j%6,rx:2}));stack+=v;});}else{const sw=g/series.length;series.forEach((s,j)=>{const v=Math.max(0,Number(s.values[i])||0);root.appendChild(S("rect",{x:L+slot*i+(slot-g)/2+sw*j,y:ypos(v),width:Math.max(1,sw-2),height:v/max*phh,class:"ct-analytics3-bar series-"+j%6,rx:2}));});}});}
else{series.forEach((s,j)=>{const pts=s.values.map((v,i)=>xpos(i)+","+ypos(v)).join(" ");if(kind==="area")root.appendChild(S("polygon",{points:L+","+(T+phh)+" "+pts+" "+(L+pw)+","+(T+phh),class:"ct-analytics3-area series-"+j%6}));root.appendChild(S("polyline",{points:pts,fill:"none",class:"ct-analytics3-line series-"+j%6}));if(labels.length<=24)s.values.forEach((v,i)=>root.appendChild(S("circle",{cx:xpos(i),cy:ypos(v),r:3.5,class:"ct-analytics3-point series-"+j%6})));});}
const stride=Math.max(1,Math.ceil(labels.length/9));labels.forEach((label,i)=>{if(i%stride&&i!==labels.length-1)return;const xx=(kind==="bar"||kind==="stacked")?L+pw*(i+.5)/labels.length:xpos(i);const tick=S("text",{x:xx,y:T+phh+25,transform:"rotate(-30 "+xx+" "+(T+phh+25)+")","text-anchor":"end",class:"ct-analytics3-axis-label"},compactPeriodLabel(label));tick.appendChild(S("title",{},label));root.appendChild(tick);});drawing.appendChild(root);
}
function pieChart(data,donut){
let labels=data.labels.slice(),values=data.series.length?data.series[0].values.map(v=>Math.max(0,Number(v)||0)):[];
const total=values.reduce((a,b)=>a+b,0),root=S("svg",{viewBox:"0 0 1000 390",role:"img","aria-label":data.title+" share chart"});if(!labels.length||total<=0){root.appendChild(S("text",{x:500,y:195,"text-anchor":"middle",class:"ct-analytics3-empty-svg"},"No values to chart for this selection."));drawing.appendChild(root);return;}
const cx=310,cy=188,r=donut?135:145;let a=-Math.PI/2;values.forEach((v,i)=>{if(v<=0)return;const n=a+v/total*Math.PI*2,x1=cx+r*Math.cos(a),y1=cy+r*Math.sin(a),x2=cx+r*Math.cos(n),y2=cy+r*Math.sin(n),large=n-a>Math.PI?1:0;const d=v/total>.99999?"M "+cx+" "+(cy-r)+" A "+r+" "+r+" 0 1 1 "+(cx-.01)+" "+(cy-r)+" Z":"M "+cx+" "+cy+" L "+x1+" "+y1+" A "+r+" "+r+" 0 "+large+" 1 "+x2+" "+y2+" Z";root.appendChild(S("path",{d,class:"ct-analytics3-slice series-"+i%6}));a=n;});
if(donut){root.append(S("circle",{cx,cy,r:76,class:"ct-analytics3-donut-hole"}),S("text",{x:cx,y:cy-4,"text-anchor":"middle",class:"ct-analytics3-donut-total"},NUM(total)),S("text",{x:cx,y:cy+20,"text-anchor":"middle",class:"ct-analytics3-donut-caption"},"Total"));}
labels.forEach((l,i)=>{const y=54+i*33;if(y>372)return;root.append(S("rect",{x:560,y:y-12,width:12,height:12,rx:3,class:"ct-analytics3-bar series-"+i%6}),S("text",{x:584,y,class:"ct-analytics3-pie-label"},l.length>27?l.slice(0,25)+"…":l),S("text",{x:960,y,"text-anchor":"end",class:"ct-analytics3-axis-label"},NUM(values[i])+" ("+(values[i]/total*100).toFixed(1)+"%)"));});drawing.appendChild(root);
}
function drawTable(data){const dv=data.effectiveView||view.value;
tableWrap.replaceChildren();const table=$("table","ct-analytics3-table"),head=$("thead"),hr=$("tr");hr.appendChild($("th","","Name / Period"));
if(dv==="trends")data.series.forEach(s=>hr.appendChild($("th","",s.name)));else if(dv==="statuses")hr.appendChild($("th","","Operations"));else["Tasks created","Completed","Completion rate","Open","Overdue","Overdue rate","On-time rate","Average completion (h)"].forEach(x=>hr.appendChild($("th","",x)));head.appendChild(hr);table.appendChild(head);const body=$("tbody");
if(dv==="trends")data.rows.forEach(r=>{const tr=$("tr"),period=$("th","",compactPeriodLabel(r.label));period.title=String(r.label);tr.appendChild(period);data.series.forEach(s=>tr.appendChild($("td","",NUM(r[s.key]))));body.appendChild(tr);});
else if(dv==="statuses")data.rows.forEach(r=>{const tr=$("tr");tr.append($("th","",r.name),$("td","",NUM(r.value)));body.appendChild(tr);});
else data.rows.forEach(r=>{const tr=$("tr");tr.appendChild($("th","",r.name));[["total_tasks","n"],["completed_tasks","n"],["completion_rate","p"],["open_tasks","n"],["overdue_tasks","n"],["overdue_rate","p"],["on_time_rate","p"],["average_completion_hours","h"]].forEach(([k,t])=>tr.appendChild($("td","",t==="p"?PCT(r[k]):t==="h"?(r[k]===null||r[k]===undefined?"N/A":NUM(r[k])):NUM(r[k]))));body.appendChild(tr);});
if(!body.children.length){const tr=$("tr"),td=$("td","ct-analytics3-empty-cell","No records match the selected filters.");td.colSpan=dv==="trends"?data.series.length+1:dv==="statuses"?2:9;tr.appendChild(td);body.appendChild(tr);}table.appendChild(body);tableWrap.appendChild(table);
}
function draw(){if(!report)return;configureMetric();const d=getData();current=d;title.textContent=d.title+" · "+chart.options[chart.selectedIndex].textContent;tableTitle.textContent="Data behind "+d.title.toLowerCase();drawing.replaceChildren();legend.replaceChildren();d.series.forEach((s,i)=>{const l=$("span","ct-analytics3-legend-item");l.append($("i","ct-analytics3-swatch swatch-"+i%6),$("span","",s.name));legend.appendChild(l);});legend.hidden=!d.series.length||["pie","donut","table"].includes(chart.value);
if(chart.value==="table")drawing.appendChild($("p","ct-analytics3-muted","Table format selected; complete values are shown below."));else if(chart.value==="pie"||chart.value==="donut")pieChart(d,chart.value==="donut");else axisChart(d,chart.value);drawTable(d);note.textContent=view.value==="trends"?"For long daily periods, only the plotted line/bar points are sampled for readability; the table retains every bucket. Created tasks use creation timestamps; completion, approval, rejection and submission trends use recorded operation audit events.":"Group metrics describe operations created in the selected period and their currently recorded state. Existing teams and other organization dimensions remain visible even when their counts are zero.";
}
function exportPdf(){
if(!report||!current){status.textContent="Load analytics before exporting.";status.className="ct-analytics3-status is-error";return;}
const svg=drawing.querySelector("svg");
if(!svg){status.textContent="There is no chart visual to export for this selection.";status.className="ct-analytics3-status is-error";return;}
const win=window.open("","_blank");
if(!win){status.textContent="Allow pop-ups to export the chart visual.";status.className="ct-analytics3-status is-error";return;}
let css="";Array.from(document.styleSheets).forEach(sheet=>{try{Array.from(sheet.cssRules).forEach(rule=>{css+=rule.cssText+"\\n";});}catch(_){}});
const svgCopy=svg.cloneNode(true);
const svgNodes=[svg,...Array.from(svg.querySelectorAll("*"))],copyNodes=[svgCopy,...Array.from(svgCopy.querySelectorAll("*"))];
svgNodes.forEach((node,i)=>{const copy=copyNodes[i];if(!copy)return;try{const computed=getComputedStyle(node);const props=["stroke","stroke-width","stroke-linecap","stroke-linejoin","fill","fill-opacity","opacity","color","font-family","font-size","font-weight","text-anchor","display","visibility","stroke-dasharray"];const styles=props.map(p=>p+":"+computed.getPropertyValue(p)).filter(x=>!x.endsWith(":")).join(";");if(styles)copy.setAttribute("style",(copy.getAttribute("style")||"")+";"+styles);}catch(_){}});
const vb=svg.getAttribute("viewBox");if(vb){const dims=vb.split(/[ ,]+/).map(Number);if(dims.length===4&&dims[2]>0&&dims[3]>0){svgCopy.setAttribute("width",dims[2]);svgCopy.setAttribute("height",dims[3]);}}
const chartMarkup=new XMLSerializer().serializeToString(svgCopy),legendMarkup=legend.hidden?"":legend.outerHTML;
const chartHeading=title.textContent||current.title||"Analytics visualization";
const esc=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(chartHeading)+'</title><style>'+css+'*{box-sizing:border-box}body{margin:0;padding:28px;background:#111318;color:#f2f4f8;font:13px Arial,sans-serif}.visual-report{width:100%;max-width:1400px;margin:0 auto}.visual-report h1{font-size:20px;font-weight:600;margin:0 0 18px}.visual-chart{width:100%;padding:12px}.visual-chart svg{display:block;width:100%;height:auto;max-height:78vh}.ct-analytics3-legend{display:flex;flex-wrap:wrap;gap:14px;margin:0 12px 14px}.ct-analytics3-legend-item{display:inline-flex;align-items:center;gap:6px}.ct-analytics3-swatch{display:inline-block;width:11px;height:11px;border-radius:2px}.ct-analytics3-gridline{stroke:#414652!important}.ct-analytics3-axis-label,.ct-analytics3-pie-label,.ct-analytics3-donut-total,.ct-analytics3-donut-caption{fill:#c7ceda!important}.report-back{position:fixed;top:14px;left:14px;z-index:9999;padding:9px 14px;border:1px solid #424958;border-radius:8px;background:#20242d;color:#f2f4f8;font-weight:600;cursor:pointer;box-shadow:0 2px 8px #0005}@page{size:A4 landscape;margin:12mm}@media print{body{padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}.visual-report{max-width:none}.visual-chart svg{max-height:175mm}.report-back{display:none}}</style></head><body><button class="report-back" type="button" onclick="if(window.opener&&!window.opener.closed){window.close()}else if(history.length>1){history.back()}">Back</button><main class="visual-report"><h1>'+esc(chartHeading)+'</h1><section class="visual-chart">'+legendMarkup+chartMarkup+'</section></main></body></html>';
win.document.open();win.document.write(html);win.document.close();status.textContent="Chart-only visual report opened. Choose Save as PDF in the print dialog.";status.className="ct-analytics3-status is-success";
win.addEventListener("load",()=>{win.focus();win.print();});
}
async function exportExcel(){
if(!report||!current){status.textContent="Load analytics before exporting.";status.className="ct-analytics3-status is-error";return;}
const base=window.CleanTrackConfig&&window.CleanTrackConfig.apiBaseUrl;if(!base){status.textContent="API configuration is unavailable.";status.className="ct-analytics3-status is-error";return;}
const params=query();params.set("format","xlsx");params.set("view",current.effectiveView||view.value);
status.textContent="Preparing filtered Excel workbook…";status.className="ct-analytics3-status";
try{
const headers=new Headers({Accept:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),token=AUTH&&AUTH.getAuthToken?AUTH.getAuthToken():"";if(token)headers.set("Authorization","Bearer "+token);
const response=await fetch(base.replace(/\/+$/,"")+"/analytics/workspace?"+params.toString(),{method:"GET",headers,credentials:"include"});
if(!response.ok){let message="Excel export failed.";try{const body=await response.json();message=body.error||body.message||message;}catch(_){}throw new Error(message);}
const blob=await response.blob(),disp=response.headers.get("Content-Disposition")||"",match=disp.match(/filename="?([^";]+)"?/i),filename=match?match[1]:"cleantrack-analytics.xlsx",url=URL.createObjectURL(blob),link=$("a","");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
status.textContent="Excel export ready: "+filename;status.className="ct-analytics3-status is-success";
}catch(error){status.textContent=error.message||"Excel export failed.";status.className="ct-analytics3-status is-error";}
}
function csv(){if(!report||!current)return;const dv=current.effectiveView||view.value;const q=v=>'"'+String(v===null||v===undefined?"":v).replace(/"/g,'""')+'"',rows=[["Analytics view",current.title],["Period",report.period.start_date,report.period.end_date],["Interval",report.bucket]];
if(dv==="trends"){rows.push(["Period",...current.series.map(s=>s.name)]);current.rows.forEach(r=>rows.push([r.label,...current.series.map(s=>r[s.key]||0)]));}else if(dv==="statuses"){rows.push(["Status","Operations"]);current.rows.forEach(r=>rows.push([r.name,r.value]));}else{rows.push(["Name","Tasks created","Completed","Completion rate","Open","Overdue","Overdue rate","On-time rate","Average completion hours"]);current.rows.forEach(r=>rows.push([r.name,r.total_tasks,r.completed_tasks,r.completion_rate,r.open_tasks,r.overdue_tasks,r.overdue_rate,r.on_time_rate,r.average_completion_hours]));}
const blob=new Blob(["\ufeff"+rows.map(r=>r.map(q).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=$("a","");a.href=url;a.download="cleantrack-analytics-"+dv+"-"+report.period.start_date+"-to-"+report.period.end_date+".csv";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function load(){
if(!from.value||!to.value){status.textContent="Choose both start and end dates.";status.className="ct-analytics3-status is-error";return;}if(from.value>to.value){status.textContent="Start date must be on or before end date.";status.className="ct-analytics3-status is-error";return;}
const n=++sequence;apply.disabled=true;status.textContent="Loading filtered organization records…";status.className="ct-analytics3-status";
try{const r=await API.get("analytics/workspace?"+query().toString());if(n!==sequence)return;report=r;const pt=PICK(team),pl=PICK(location),pz=PICK(zone),pe=PICK(employee),py=type.value;options(team,r.filters?.teams||[],pt,"name","id");options(location,r.filters?.locations||[],pl,"name","id");options(zone,r.filters?.zones||[],pz,"name","id");options(employee,r.filters?.employees||[],pe,"name","id");options(type,(r.filters?.operation_types||[]).map(x=>({name:x,value:x})),py,"name","value");lastLoadedQuery=query().toString();
kpiDefs.forEach(([lab,key,note,kind])=>{const v=r.summary?.[key];kv[key].v.textContent=kind==="p"?PCT(v):kind==="h"?(v===null||v===undefined?"N/A":NUM(v)+" h"):NUM(v);});configureMetric();draw();
mb.replaceChildren();[["Cohort",r.methodology?.cohort],["Trends",r.methodology?.trends],["Completion rate",r.methodology?.completion_rate],["On-time rate",r.methodology?.on_time_rate],["Average completion time",r.methodology?.average_completion_hours],["Filters",r.methodology?.filters],["Time zone",r.methodology?.time_zone]].forEach(([a,b])=>{if(!b)return;const p=$("p");p.append($("strong","",a+": "),$("span","",b));mb.appendChild(p);});
status.textContent="Loaded "+readableDate(r.period.start_date)+" – "+readableDate(r.period.end_date)+". Trend labels are shortened; expand the data table for full results.";status.className="ct-analytics3-status is-success";refreshRangeControls();
}catch(e){if(n!==sequence)return;report=null;drawing.replaceChildren();tableWrap.replaceChildren();Object.values(kv).forEach(x=>x.v.textContent="—");status.textContent=e.message||"Could not load analytics.";status.className="ct-analytics3-status is-error";}
finally{if(n===sequence)apply.disabled=false;}}
view.addEventListener("change",()=>{configureMetric();draw();});chart.addEventListener("change",draw);metric.addEventListener("change",draw);
load();
const refreshInterval=window.setInterval(()=>{if(!page.isConnected){window.clearInterval(refreshInterval);return;}if(document.visibilityState!=="hidden"&&report&&query().toString()===lastLoadedQuery)load();},60000);
}
window.CleanTrackAnalytics=Object.freeze({render});
})();