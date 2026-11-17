(function(){
"use strict";
const API=window.CleanTrackApi, AUTH=window.CleanTrackAuth;
const role=()=>String(AUTH?.getCurrentUser?.()?.role||"").toLowerCase();
const $=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!==undefined)n.textContent=String(txt);return n};
const btn=(label,fn,primary)=>{const b=$("button","mt-btn"+(primary?" mt-btn-primary":""),label);b.type="button";b.addEventListener("click",fn);return b};
const field=(label,control)=>{const l=$("label","mt-field");l.append($("span","",label),control);return l};
const input=(name,value,type)=>{const n=$("input","mt-input");n.name=name;n.type=type||"text";n.value=value??"";return n};
const area=(name,value)=>{const n=$("textarea","mt-input");n.name=name;n.value=value||"";n.rows=3;return n};
const select=(name,opts,value)=>{const n=$("select","mt-input");n.name=name;opts.forEach(([v,l])=>{const o=$("option","",l);o.value=v;n.append(o)});n.value=value??opts[0]?.[0]??"";return n};
function notice(root,msg,error){let n=root.querySelector(".mt-notice");if(!n){n=$("p","mt-notice");root.prepend(n)}n.textContent=msg;n.classList.toggle("is-error",!!error);n.hidden=!msg}
function panel(title,subtitle,content){
 const overlay=$("div","mt-overlay"),dialog=$("section","mt-panel");dialog.setAttribute("role","dialog");dialog.setAttribute("aria-modal","true");
 const head=$("header","mt-panel-head"),copy=$("div","");copy.append($("p","mt-eyebrow","MECHNAR WORKSPACE"),$("h2","",title),$("p","mt-muted",subtitle));
 const close=btn("×",()=>overlay.remove());close.className="mt-close";close.setAttribute("aria-label","Close panel");head.append(copy,close);dialog.append(head,content);overlay.append(dialog);
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});document.addEventListener("keydown",function esc(e){if(e.key==="Escape"&&overlay.isConnected){overlay.remove();document.removeEventListener("keydown",esc)}});
 const teamWorkspace=document.querySelector(".ct-team-fullscreen-shell");
 (teamWorkspace||document.body).append(overlay);return {overlay,dialog};
}
function shell(container,eyebrow,title,desc){container.replaceChildren();const root=$("section","mt-page");const head=$("header","mt-page-head"),copy=$("div","");copy.append($("p","mt-eyebrow",eyebrow),$("h1","",title),$("p","mt-muted",desc));head.append(copy);root.append(head);container.append(root);return root}
function table(headers,rows){const wrap=$("div","mt-table-wrap"),t=$("table","mt-table"),thead=$("thead"),tr=$("tr");headers.forEach(x=>tr.append($("th","",x)));thead.append(tr);const body=$("tbody");rows.forEach(row=>{const r=$("tr");row.forEach(cell=>{const td=$("td");if(cell instanceof Node)td.append(cell);else td.textContent=cell??"—";r.append(td)});body.append(r)});t.append(thead,body);wrap.append(t);return wrap}
function stats(items){const n=$("div","mt-stats");items.forEach(([k,v])=>{const x=$("div","mt-stat");x.append($("span","mt-muted",k),$("strong","",v));n.append(x)});return n}
async function renderInventory(container){
 const root=shell(container,"OPERATIONS RESOURCES","Inventory","A unified inventory control centre for assets, procurement, stock, locations and demand.");
 const canManage=["admin","supervisor"].includes(role());
 const state={items:[],requests:[],purchases:[],suppliers:[],transfers:[],locations:[],analytics:null,view:"overview"};
 const toolbar=$("div","mt-toolbar"),search=input("search","","search");search.placeholder="Search inventory, SKU, supplier, location or request";toolbar.append(search);
 if(canManage)toolbar.append(btn("+ Register item",()=>itemPanel(null),true),btn("Record stock movement",()=>movementPicker()));
 toolbar.append(btn("New request",()=>requestPanel()));root.append(toolbar);
 const tabs=$("nav","mt-inventory-tabs"),content=$("div","mt-content");root.append(tabs,content);
 const views=[["overview","Overview"],["items","Items & assets"],["procurement","Procurement"],["stock","Stock control"],["locations","Locations"],["transfers","Transfers"],["requests","Requests"],["maintenance","Maintenance"],["analytics","Analytics"],["forecast","Forecast"],["history","Movement history"]];
 views.forEach(([id,label])=>{const b=btn(label,()=>{state.view=id;draw()});b.dataset.view=id;tabs.append(b)});
 async function load(){
  content.replaceChildren($("p","mt-muted","Synchronising inventory records…"));
  try{
   const [inv,req]=await Promise.all([API.get("org-tools/inventory"),API.get("org-tools/inventory-requests")]);
   state.items=inv.items||[];state.requests=req.requests||[];
   if(canManage){
    const results=await Promise.all([API.get("org-tools/inventory-purchases"),API.get("org-tools/inventory-suppliers"),API.get("org-tools/inventory-transfers")]);
    state.purchases=results[0].purchases||[];state.suppliers=results[1].suppliers||[];state.transfers=results[2].transfers||[];
   }
   const loc=await API.get("org-tools/inventory-locations").catch(()=>({locations:[]}));
   state.locations=loc.locations||[];
   root.querySelector(".mt-stats")?.remove();draw();
  }catch(e){content.replaceChildren($("p","mt-error",e.message||"Inventory could not be loaded."),btn("Retry",load))}
 }
 function metric(label,value,sub,action){const b=btn("",action);b.className="mt-stat mt-stat-action";b.append($("span","mt-muted",label),$("strong","",String(value)),$("small","mt-muted",sub));return b}
 function draw(){
  tabs.querySelectorAll("button").forEach(b=>b.classList.toggle("is-active",b.dataset.view===state.view));
  content.replaceChildren();const q=search.value.trim().toLowerCase();
  if(state.view==="overview"){drawOverview();return}
  if(state.view==="items"){drawItems(q);return}
  if(state.view==="procurement"){drawProcurement(q);return}
  if(state.view==="stock"){drawStock();return}
  if(state.view==="locations"){drawLocations(q);return}
  if(state.view==="transfers"){drawTransfers(q);return}
  if(state.view==="requests"){drawRequests(q);return}
  if(state.view==="maintenance"){drawMaintenance(q);return}
  if(state.view==="analytics"){drawAnalytics();return}
  if(state.view==="forecast"){drawForecast();return}
  if(state.view==="history"){drawHistory(q);return}
 }
 function tableSection(title,heads,rows,empty="No matching records."){const sec=$("section","mt-section");sec.append($("h2","",title));if(!rows.length){sec.append($("p","mt-empty",empty));return sec}sec.append(table(heads,rows));return sec}
 function drawOverview(){
  const low=state.items.filter(x=>x.low_stock),due=state.items.filter(x=>x.maintenance_due_at&&new Date(x.maintenance_due_at)<=new Date()),open=state.requests.filter(x=>["pending","approved","partially_fulfilled"].includes(x.status)),over=state.items.filter(x=>Number(x.maximum_quantity)>0&&Number(x.quantity)>Number(x.maximum_quantity));
  const metrics=$("div","mt-stats");
  metrics.append(metric("REGISTERED ITEMS",state.items.length,"Catalogue records",()=>openListPanel("Registered items",state.items)));
  metrics.append(metric("LOW STOCK",low.length,"At or below minimum",()=>openListPanel("Low-stock items",low)));
  metrics.append(metric("MAINTENANCE DUE",due.length,"Due now or overdue",()=>openListPanel("Maintenance due",due)));
  metrics.append(metric("OPEN REQUESTS",open.length,"Awaiting fulfilment or review",()=>openRequestList(open)));
  metrics.append(metric("OVER MAXIMUM",over.length,"Above preferred stock ceiling",()=>openListPanel("Overstock items",over)));
  content.append(metrics);
  const quick=$("div","mt-actions");
  [["Register item",()=>itemPanel(null)],["Record purchase",()=>purchasePanel()],["Upload invoice",()=>invoicePanel()],["Receive stock",()=>movementPicker("receipt")],["Record consumption",()=>movementPicker("consumption")],["Create transfer",()=>transferPanel()]].forEach(([t,f])=>{if(canManage||!["Register item","Record purchase","Upload invoice","Receive stock","Record consumption","Create transfer"].includes(t))quick.append(btn(t,f))});
  content.append(quick);
  content.append(tableSection("Recently registered items",["Item","Category","On hand","Min / Max","Location",""],state.items.slice().sort((a,b)=>b.id-a.id).slice(0,8).map(x=>[x.name,x.category,x.quantity+" "+x.unit,x.minimum_quantity+" / "+(x.maximum_quantity||"—"),x.storage_location||"Unassigned",btn("Open",()=>itemDetails(x))])));
  content.append(tableSection("Recent requests",["Item","Quantity","Status","Requested",""],state.requests.slice(0,5).map(x=>[x.item_name,x.quantity,x.status,new Date(x.created_at).toLocaleDateString(),btn("Open",()=>requestDetails(x))])));
 }
 function drawItems(q){const rows=state.items.filter(x=>([x.name,x.category,x.sku,x.asset_tag,x.serial_number,x.storage_location].join(" ")).toLowerCase().includes(q));const actions=$("div","mt-actions");if(canManage)actions.append(btn("+ Register item",()=>itemPanel(null),true));content.append(actions,tableSection("Items & assets",["Item","Category","SKU / asset tag","On hand","Min","Max","Condition","Location",""],rows.map(x=>[x.name,x.category,[x.sku,x.asset_tag].filter(Boolean).join(" · ")||"—",x.quantity+" "+x.unit,x.minimum_quantity,x.maximum_quantity||"—",x.condition,x.storage_location||"Unassigned",btn("Open details",()=>itemDetails(x))])));}
 function drawProcurement(q){if(!canManage){content.append($("p","mt-muted","Procurement records are restricted to Admin and Supervisor."));return}const actions=$("div","mt-actions");actions.append(btn("+ Record purchase",()=>purchasePanel(),true),btn("Upload invoice",()=>invoicePanel()),btn("Supplier directory",()=>{state.view="procurement";supplierPanel()}));content.append(actions,tableSection("Purchases & invoices",["Supplier","Invoice","Date","Total","Status",""],state.purchases.filter(x=>(x.supplier_name+" "+x.invoice_number+" "+x.status).toLowerCase().includes(q)).map(x=>[x.supplier_name,x.invoice_number||"—",x.invoice_date||"—",x.currency+" "+x.grand_total,x.status,btn("Open",()=>purchaseDetails(x))])));content.append(tableSection("Suppliers",["Supplier","Contact","Email","Phone"],state.suppliers.filter(x=>(x.name+" "+x.email).toLowerCase().includes(q)).map(x=>[x.name,x.contact_name||"—",x.email||"—",x.phone||"—"])));}
 function drawStock(){const actions=$("div","mt-actions");actions.append(btn("Receive stock",()=>movementPicker("receipt"),true),btn("Record consumption / issue",()=>movementPicker("consumption")),btn("Adjust stock balance",()=>movementPicker("adjustment")));content.append(actions,$("p","mt-muted","Every confirmed action writes a dated stock movement. Receipts increase on-hand stock; consumption reduces it; adjustments require a recorded reference and reason."),tableSection("Stock position",["Item","On hand","Minimum","Maximum","Status",""],state.items.map(x=>[x.name,x.quantity+" "+x.unit,x.minimum_quantity,x.maximum_quantity||"Not set",x.low_stock?"LOW STOCK":Number(x.maximum_quantity)>0&&Number(x.quantity)>Number(x.maximum_quantity)?"OVER MAX":"Normal",btn("Move stock",()=>movementPanel(x))])));}
 function drawLocations(q){content.append(btn("+ Record location transfer",()=>transferPanel(),true),tableSection("Location balances",["Location","Item","Quantity",""],state.locations.filter(x=>(x.location+" "+(state.items.find(i=>i.id===x.item_id)?.name||"")).toLowerCase().includes(q)).map(x=>[x.location,state.items.find(i=>i.id===x.item_id)?.name||"Item #"+x.item_id,x.quantity,btn("Open item",()=>{const item=state.items.find(i=>i.id===x.item_id);if(item)itemDetails(item)})])));}
 function drawTransfers(q){if(!canManage){content.append($("p","mt-muted","Transfers are managed by Admin and Supervisor."));return}content.append(btn("+ Create transfer",()=>transferPanel(),true),tableSection("Transfer register",["Item","Source","Destination","Quantity","Status",""],state.transfers.filter(x=>(x.from_location+" "+x.to_location+" "+x.status).toLowerCase().includes(q)).map(x=>[state.items.find(i=>i.id===x.item_id)?.name||"Item #"+x.item_id,x.from_location,x.to_location,x.quantity,x.status,x.status==="pending"?btn("Dispatch",()=>transferAction(x,"dispatch")):x.status==="in_transit"?btn("Confirm receipt",()=>transferAction(x,"receive")):btn("Details",()=>transferDetails(x))])));}
 function drawRequests(q){content.append(btn("+ New request",()=>requestPanel(),true),tableSection("Inventory requests",["Item","Type","Quantity","Fulfilled","Status","Reason",""],state.requests.filter(x=>(x.item_name+" "+x.status+" "+x.reason).toLowerCase().includes(q)).map(x=>[x.item_name,x.type,x.quantity,x.fulfilled_quantity||0,x.status,x.reason||"—",canManage&&["pending","approved","partially_fulfilled"].includes(x.status)?btn("Review",()=>reviewRequest(x)):btn("Details",()=>requestDetails(x))])));}
 function drawMaintenance(q){const rows=state.items.filter(x=>(x.maintenance_due_at||x.condition==="poor"||x.condition==="damaged")&&(x.name+" "+x.category+" "+x.condition).toLowerCase().includes(q));content.append($("p","mt-muted","Maintenance register is based on equipment condition and recorded maintenance dates. Add a due date or update the item after service."),tableSection("Maintenance register",["Asset","Condition","Last serviced","Next due","Warranty",""],rows.map(x=>[x.name,x.condition,x.last_maintenance_at?String(x.last_maintenance_at).slice(0,10):"—",x.maintenance_due_at?String(x.maintenance_due_at).slice(0,10):"Not scheduled",x.warranty_until||"—",btn("Manage",()=>itemPanel(x))])));}
 async function drawAnalytics(){content.append($("p","mt-muted","Calculating from recorded stock movements. Transfers are shown separately from consumption in the movement ledger."));try{const a=await API.get("org-tools/inventory-analytics");const m=$("div","mt-stats");m.append(stats([["Catalogue items",a.summary.items],["Total on hand",a.summary.on_hand],["Low stock",a.summary.low_stock],["Over maximum",a.summary.over_maximum]]));content.replaceChildren(m,tableSection("Monthly movement analysis",["Month","Receipts","Consumption","Adjustments"],a.monthly.map(x=>[x.month,x.receipts.toFixed(2),x.consumption.toFixed(2),x.adjustments.toFixed(2)])));content.append($("p","mt-muted","Based on "+a.data_points+" recorded movements. This is operational quantity analysis, not financial valuation."))}catch(e){content.append($("p","mt-error",e.message||"Analytics unavailable."))}}
 async function drawForecast(){if(!canManage){content.append($("p","mt-muted","Forecasting is restricted to Admin and Supervisor."));return}const horizon=select("days",[["7","7 days"],["14","14 days"],["30","30 days"],["60","60 days"],["90","90 days"]],"30"),go=btn("Calculate forecast",null,true),bar=$("div","mt-actions");bar.append(field("Forecast horizon",horizon),go);content.append(bar);const results=$("div","mt-content");content.append(results);async function run(){results.replaceChildren($("p","mt-muted","Analysing recorded consumption…"));try{const f=await API.get("org-tools/inventory-forecast?days="+horizon.value);results.replaceChildren(tableSection("Demand forecast · "+f.days+" days",["Item","On hand","Avg / day","Expected use","Projected balance","Suggested replenishment","History"],f.forecasts.map(x=>[x.item_name,x.on_hand+" "+x.unit,x.average_daily_consumption,x.forecast_consumption,x.projected_balance,x.suggested_replenishment,x.observations+" records / "+x.history_days+" days"])));results.append($("p","mt-muted",f.method+" Forecasts appear only with at least 3 consumption records spanning 14 days. Estimates are indicative, not guarantees."))}catch(e){results.replaceChildren($("p","mt-error",e.message))}}go.addEventListener("click",run);run();}
 function drawHistory(q){const candidates=state.items.filter(x=>(x.name+" "+x.sku).toLowerCase().includes(q));content.append(tableSection("Select an item to inspect its complete stock ledger",["Item","Current balance","Location",""],candidates.map(x=>[x.name,x.quantity+" "+x.unit,x.storage_location||"Unassigned",btn("View movements",()=>movementHistory(x))])));}
 function openListPanel(title,rows){const body=$("div","mt-content");body.append(tableSection(title,["Item","On hand","Minimum","Maximum","Location",""],rows.map(x=>[x.name,x.quantity+" "+x.unit,x.minimum_quantity,x.maximum_quantity||"—",x.storage_location||"Unassigned",btn("Open",()=>itemDetails(x))])));panel(title,rows.length+" matching inventory records",body)}
 function openRequestList(rows){const body=$("div","mt-content");body.append(tableSection("Open requests",["Item","Quantity","Status",""],rows.map(x=>[x.item_name,x.quantity,x.status,btn("Open",()=>requestDetails(x))])));panel("Open inventory requests",rows.length+" active requests",body)}
 function itemDetails(x){const body=$("div","mt-content");body.append(stats([["On hand",x.quantity+" "+x.unit],["Minimum",x.minimum_quantity],["Maximum",x.maximum_quantity||"Not set"],["Condition",x.condition]]));const dl=$("dl","mt-inventory-details");[["Category",x.category],["SKU",x.sku||"—"],["Asset tag",x.asset_tag||"—"],["Serial",x.serial_number||"—"],["Location",x.storage_location||"Unassigned"],["Purchase date",x.purchase_date||"—"],["Warranty",x.warranty_until||"—"],["Maintenance due",x.maintenance_due_at?String(x.maintenance_due_at).slice(0,10):"—"],["Description",x.description||"—"],["Notes",x.notes||"—"]].forEach(([k,v])=>dl.append($("dt","",k),$("dd","",String(v))));body.append(dl);const a=$("div","mt-actions");if(canManage)a.append(btn("Edit item",()=>itemPanel(x),true),btn("Record movement",()=>movementPanel(x)));a.append(btn("Movement history",()=>movementHistory(x)));body.append(a);panel("Inventory item",x.name,body)}
 function itemPanel(item){const form=$("form","mt-form"),keys=["name","category","description","sku","asset_tag","serial_number","quantity","minimum_quantity","maximum_quantity","unit","condition","status","storage_location","purchase_date","warranty_until","maintenance_due_at","last_maintenance_at","notes"],v={};const grid=$("div","mt-form-grid");keys.forEach(k=>{const date=["purchase_date","warranty_until","maintenance_due_at","last_maintenance_at"].includes(k),num=["quantity","minimum_quantity","maximum_quantity"].includes(k);v[k]=["description","notes"].includes(k)?area(k,item?.[k]||""):input(k,date?String(item?.[k]||"").slice(0,10):String(item?.[k]??({quantity:0,minimum_quantity:0,maximum_quantity:0,category:"General",unit:"units",condition:"good",status:"available"}[k]??"")),date?"date":num?"number":"text");if(num){v[k].min="0";v[k].step=".01"}grid.append(field(k.replaceAll("_"," ").replace(/^./,z=>z.toUpperCase()),v[k]))});form.append(grid);const save=btn(item?"Save item changes":"Register item",null,true);save.type="submit";form.append(save);const p=panel(item?"Edit inventory item":"Register inventory item","Set catalogue data, stock thresholds and storage location.",form);form.addEventListener("submit",async e=>{e.preventDefault();const d={};keys.forEach(k=>d[k]=v[k].value);["quantity","minimum_quantity","maximum_quantity"].forEach(k=>d[k]=Number(d[k]||0));try{if(!d.name.trim())throw Error("Item name is required.");if(d.maximum_quantity>0&&d.maximum_quantity<d.minimum_quantity)throw Error("Maximum stock must be greater than or equal to minimum stock.");if(item)await API.patch("org-tools/inventory/"+item.id,d);else await API.post("org-tools/inventory",d);p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 function movementPicker(preferred){const body=$("div","mt-content");body.append(tableSection("Choose an item",["Item","On hand",""],state.items.map(x=>[x.name,x.quantity+" "+x.unit,btn("Select",()=>movementPanel(x,preferred))])));panel("Select inventory item","Choose which item is being moved.",body)}
 function movementPanel(item,preferred){const form=$("form","mt-form"),type=select("type",[["receipt","Goods received"],["consumption","Consumption / issue"],["adjustment","Correct stock balance"]],preferred||"receipt"),qty=input("quantity","","number"),loc=input("location",item.storage_location||"Unassigned / central stock","text"),ref=input("reference","","text"),notes=area("notes","");qty.min=".01";qty.step=".01";form.append(field("Movement",type),field("Quantity",qty),field("Location",loc),field("Reference",ref),field("Reason / notes",notes));const save=btn("Record movement",null,true);save.type="submit";form.append(save);const p=panel("Stock movement",item.name+" · Current total "+item.quantity+" "+item.unit,form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("org-tools/inventory/"+item.id+"/movements",{type:type.value,quantity:Number(qty.value),location:loc.value,reference:ref.value,notes:notes.value,allow_over_maximum:override.checked,override_reason:overrideReason.value});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 async function movementHistory(item){const body=$("div","mt-content");body.append($("p","mt-muted","Loading movement history…"));const p=panel("Movement ledger",item.name,body);try{const r=await API.get("org-tools/inventory/"+item.id+"/movements");body.replaceChildren(tableSection("Stock movements",["Date","Type","Quantity","Balance after","Reference","Notes"],(r.movements||[]).map(x=>[new Date(x.created_at).toLocaleString(),x.type,x.quantity,x.balance_after,x.reference||"—",x.notes||"—"])))}catch(e){body.replaceChildren($("p","mt-error",e.message))}}
 function purchasePanel(){const form=$("form","mt-form"),supplier=select("supplier_id",[["","Select supplier"],...state.suppliers.map(x=>[String(x.id),x.name])]),supplierName=input("supplier_name","","text"),invoice=input("invoice_number","","text"),date=input("invoice_date","","date"),desc=input("description","","text"),item=select("item_id",[["","New / unlinked catalogue item"],...state.items.map(x=>[String(x.id),x.name])]),qty=input("quantity","1","number"),unit=input("unit","units","text"),price=input("unit_price","0","number"),tax=input("tax_amount","0","number");qty.min=".01";price.min=tax.min="0";form.append(field("Existing supplier",supplier),field("Or supplier name",supplierName),field("Invoice number",invoice),field("Invoice date",date),field("Invoice line description",desc),field("Catalogue match",item),field("Quantity",qty),field("Unit",unit),field("Unit price",price),field("Tax",tax));const save=btn("Save purchase draft",null,true);save.type="submit";form.append(save);const p=panel("Record purchase","One line per purchase entry. A purchase draft never changes on-hand stock.",form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("org-tools/inventory-purchases",{supplier_id:supplier.value?Number(supplier.value):null,supplier_name:supplierName.value||state.suppliers.find(x=>String(x.id)===supplier.value)?.name,invoice_number:invoice.value,invoice_date:date.value,lines:[{description:desc.value,item_id:item.value?Number(item.value):null,quantity:Number(qty.value),unit:unit.value,unit_price:Number(price.value),tax_amount:Number(tax.value)}]});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 function invoicePanel(){const form=$("form","mt-form"),file=input("invoice","","file");file.accept=".pdf,.jpg,.jpeg,.png,.webp";form.append(field("Invoice PDF or image (maximum 8 MB)",file),$("p","mt-muted","Digital PDF text is parsed locally using deterministic rules. Image OCR runs locally only when the Tesseract engine is available on the server. Every extracted value must be checked; no stock is changed by upload."));const save=btn("Upload and read invoice",null,true);save.type="submit";form.append(save);const p=panel("Smart invoice reader","Private upload · local extraction · human verification required.",form);form.addEventListener("submit",async e=>{e.preventDefault();if(!file.files[0])return notice(form,"Choose an invoice file.",true);const fd=new FormData();fd.append("invoice",file.files[0]);try{const r=await API.request("org-tools/inventory-purchases/invoice-upload",{method:"POST",body:fd});p.overlay.remove();await load();state.view="procurement";draw();const x=state.purchases.find(z=>z.id===r.purchase?.id);if(x)verifyPurchase(x,r.extraction?.fields)}catch(err){notice(form,err.message,true)}})}
 function verifyPurchase(x,extracted){const form=$("form","mt-form"),supplier=input("supplier_name",extracted?.supplier_name||x.supplier_name||"","text"),invoice=input("invoice_number",extracted?.invoice_number||x.invoice_number||"","text"),date=input("invoice_date",x.invoice_date||"","date"),desc=input("description",x.lines?.[0]?.description||"","text"),item=select("item_id",[["","No catalogue match"],...state.items.map(i=>[String(i.id),i.name])],String(x.lines?.[0]?.item_id||"")),qty=input("quantity",x.lines?.[0]?.quantity||"1","number"),unit=input("unit",x.lines?.[0]?.unit||"units","text"),price=input("unit_price",x.lines?.[0]?.unit_price||"0","number"),tax=input("tax_amount",x.lines?.[0]?.tax_amount||"0","number");form.append(field("Supplier",supplier),field("Invoice number",invoice),field("Invoice date",date),field("Line description",desc),field("Catalogue match",item),field("Quantity",qty),field("Unit",unit),field("Unit price",price),field("Tax",tax));if(extracted?.grand_total_raw)form.append($("p","mt-muted","Detected invoice total: "+extracted.grand_total_raw+" · compare it against the entered line total."));const save=btn("Confirm verified details",null,true);save.type="submit";form.append(save);const p=panel("Verify invoice details","Review every value. Extraction suggestions are not trusted until you confirm them.",form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.patch("org-tools/inventory-purchases/"+x.id,{action:"verify_details",supplier_name:supplier.value,invoice_number:invoice.value,invoice_date:date.value,lines:[{description:desc.value,item_id:item.value?Number(item.value):null,quantity:Number(qty.value),unit:unit.value,unit_price:Number(price.value),tax_amount:Number(tax.value)}]});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 function purchaseDetails(x){const body=$("div","mt-content");body.append(tableSection("Purchase line",["Description","Ordered","Received","Unit price","Tax","Total"],x.lines.map(l=>[l.description,l.quantity,l.received_quantity,l.unit_price,l.tax_amount,l.line_total])));if(x.invoice_filename)body.append(btn("View / download invoice",async()=>{try{window.open(await API.download("org-tools/inventory-purchases/"+x.id+"/invoice"),"_blank","noopener")}catch(e){notice(body,e.message,true)}}));if(x.status==="draft"){body.append(btn("Verify details",()=>verifyPurchase(x),true),btn("Cancel draft",()=>purchaseAction(x,"cancel")));if(x.extraction_status==="human_verified"&&x.lines.length)body.append(btn("Approve purchase",()=>purchaseAction(x,"approve"),true))}if(["approved","partially_received"].includes(x.status))body.append(btn("Receive goods",()=>receivePurchase(x),true));panel("Purchase #"+x.id,x.supplier_name+" · "+x.status,body)}
 async function purchaseAction(x,action){try{await API.patch("org-tools/inventory-purchases/"+x.id,{action});await load()}catch(e){notice(content,e.message,true)}}
 function receivePurchase(x){const form=$("form","mt-form"),l=x.lines[0],qty=input("received_quantity",String(Math.max(0,l.quantity-l.received_quantity)),"number"),loc=input("location",state.items.find(i=>i.id===l.item_id)?.storage_location||"Unassigned / central stock","text"),override=document.createElement("input"),overrideReason=input("override_reason","","text");override.type="checkbox";qty.min="0";qty.max=String(l.quantity-l.received_quantity);qty.step=".01";form.append(field("Quantity received · "+l.description,qty),field("Receiving location",loc),field("Authorise above maximum stock",override),field("Override reason",overrideReason));const save=btn("Confirm physical receipt",null,true);save.type="submit";form.append(save);const p=panel("Receive purchased goods","Only the confirmed received quantity is added to inventory.",form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.patch("org-tools/inventory-purchases/"+x.id,{action:"receive",received_quantities:{[l.id]:Number(qty.value)+Number(l.received_quantity)},location:loc.value,allow_over_maximum:override.checked,override_reason:overrideReason.value});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 function supplierPanel(){const form=$("form","mt-form"),v={};["name","contact_name","email","phone","tax_reference","address"].forEach(k=>{v[k]=k==="address"?area(k,""):input(k,"",k==="email"?"email":"text");form.append(field(k.replaceAll("_"," "),v[k]))});const save=btn("Save supplier",null,true);save.type="submit";form.append(save);const p=panel("Add supplier","Supplier records remain inside this organisation.",form);form.addEventListener("submit",async e=>{e.preventDefault();const d={};Object.keys(v).forEach(k=>d[k]=v[k].value);try{await API.post("org-tools/inventory-suppliers",d);p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 function transferPanel(){const form=$("form","mt-form"),item=select("item_id",state.items.map(x=>[String(x.id),x.name])),from=input("from_location","","text"),to=input("to_location","","text"),qty=input("quantity","1","number"),notes=area("notes","");qty.min=".01";qty.step=".01";form.append(field("Item",item),field("Source location",from),field("Destination location",to),field("Quantity",qty),field("Notes",notes));const save=btn("Create transfer request",null,true);save.type="submit";form.append(save);const p=panel("Create stock transfer","Request → dispatch → receive. Stock is deducted from the source only at dispatch and added to destination only at receipt.",form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("org-tools/inventory-transfers",{item_id:Number(item.value),from_location:from.value,to_location:to.value,quantity:Number(qty.value),notes:notes.value});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 async function transferAction(x,action){try{await API.patch("org-tools/inventory-transfers/"+x.id,{action});await load()}catch(e){notice(content,e.message,true)}}
 function transferDetails(x){const body=$("div","mt-content");body.append($("p","",x.from_location+" → "+x.to_location),$("p","mt-muted","Quantity "+x.quantity+" · "+x.status));panel("Transfer #"+x.id,"Transfer lifecycle",body)}
 function requestPanel(){const form=$("form","mt-form"),item=select("item_id",[["","Unlinked request"],...state.items.map(x=>[String(x.id),x.name])]),name=input("item_name","","text"),type=select("type",[["supply","Supply"],["equipment","Equipment"]]),qty=input("quantity","1","number"),reason=area("reason","");qty.min=".01";qty.step=".01";item.addEventListener("change",()=>{const x=state.items.find(i=>String(i.id)===item.value);if(x)name.value=x.name});form.append(field("Catalogue item",item),field("Item name",name),field("Request type",type),field("Quantity",qty),field("Reason",reason));const save=btn("Submit request",null,true);save.type="submit";form.append(save);const p=panel("New inventory request","Requests are routed to the relevant management workflow.",form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("org-tools/inventory-requests",{item_id:item.value?Number(item.value):null,item_name:name.value,type:type.value,quantity:Number(qty.value),reason:reason.value});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 function requestDetails(x){const body=$("div","mt-content");body.append($("p","",x.item_name),$("p","mt-muted","Requested "+x.quantity+" · fulfilled "+(x.fulfilled_quantity||0)+" · "+x.status),$("p","",x.reason||"No reason supplied."));if(canManage&&["pending","approved","partially_fulfilled"].includes(x.status))body.append(btn("Review request",()=>reviewRequest(x),true));panel("Request #"+x.id,"Inventory request",body)}
 function reviewRequest(x){const form=$("form","mt-form"),status=select("status",[["approved","Approve"],["rejected","Reject"],["fulfilled","Fulfil"],["partially_fulfilled","Partially fulfil"]],"approved"),qty=input("fulfilled_quantity",String(x.quantity),"number");qty.min=String(x.fulfilled_quantity||0);qty.max=String(x.quantity);qty.step=".01";form.append(field("Decision",status),field("Cumulative quantity fulfilled",qty));const save=btn("Save decision",null,true);save.type="submit";form.append(save);const p=panel("Review inventory request",x.item_name,form);form.addEventListener("submit",async e=>{e.preventDefault();try{await API.patch("org-tools/inventory-requests/"+x.id,{status:status.value,fulfilled_quantity:Number(qty.value)});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}})}
 search.addEventListener("input",draw);await load();
}
async function renderWorkforce(container){
 const root=shell(container,"WORKFORCE INTELLIGENCE","Capacity & Coverage","Understand operational demand, team capacity and workload using recorded assignments and estimates.");
 const content=$("div","mt-content");root.append(content);content.append($("p","mt-muted","Calculating current workload…"));
 try{const r=await API.get("org-tools/workforce");content.replaceChildren();const teams=r.teams||[];content.append(stats([["Teams",teams.length],["Open operations",teams.reduce((n,x)=>n+Number(x.open_operations||0),0)],["Estimated workload",teams.reduce((n,x)=>n+Number(x.estimated_workload_minutes||0),0)+" min"],["Capacity flags",teams.filter(x=>x.capacity_flag==="over_capacity").length]]));teams.forEach(t=>{const section=$("section","mt-section");section.append($("h2","",t.team_name),$("p","mt-muted",t.staff_count===null?"Your assigned workload":"Active members: "+t.staff_count+" · Capacity: "+(t.configured_capacity??"Not configured")),table(["Workload","Open operations","Estimated effort","Capacity"],[[t.staff_count===null?"My assignments":t.staff_count,t.open_operations,t.estimated_workload_minutes+" min",t.capacity_flag.replace("_"," ")]]));if(t.people?.length)section.append(table(["Person","Open operations","Estimated effort"],t.people.map(p=>[p.name,p.open_operations,p.estimated_minutes+" min"])));if((t.recommendations||[]).length){const rec=$("div","mt-recommendations");rec.append($("h3","","Recommended attention"));t.recommendations.forEach(x=>rec.append($("p","",x)));section.append(rec)}content.append(section)});if(!teams.length)content.append($("p","mt-empty","No active team data is available."));content.append($("p","mt-footnote",r.method||"Workload uses recorded operation estimates. Missing estimates are not guessed; availability and skills are not yet modelled."));
 }catch(e){content.replaceChildren($("p","mt-error",e.message||"Workforce data could not be loaded."),btn("Retry",()=>renderWorkforce(container)))}
}
async function renderEscalations(container){
 const root=shell(container,"OPERATIONAL OVERSIGHT","Intelligent Escalations","A traceable record of rule-triggered operational risks, acknowledgements and resolutions.");
 const toolbar=$("div","mt-toolbar");if(role()==="admin")toolbar.append(btn("+ Create rule",()=>openRule(root),true));root.append(toolbar);
 const content=$("div","mt-content");root.append(content);
 async function load(){content.replaceChildren($("p","mt-muted","Checking configured escalation conditions…"));try{const r=await API.get("org-tools/escalations");content.replaceChildren();const events=r.events||[];content.append(stats([["Open",events.filter(x=>x.status==="open").length],["Acknowledged",events.filter(x=>x.status==="acknowledged").length],["Resolved",events.filter(x=>x.status==="resolved").length],["Rules",r.rules?.length??"—"]]));if(role()==="admin"){const rules=$("section","mt-section");rules.append($("h2","","Configured rules"));rules.append(rulesTable(r.rules||[]));content.append(rules)}const section=$("section","mt-section");section.append($("h2","","Escalation register"));if(!events.length)section.append($("p","mt-empty","No escalation events have been triggered."));else section.append(table(["Risk","Severity","Status","Detected","Action"],events.map(x=>[x.title,x.severity,x.status,new Date(x.created_at).toLocaleString(),x.status==="resolved"?"Resolved":!x.can_update?"Awaiting authorised review":btn(x.status==="open"?"Acknowledge":"Resolve",async()=>{try{await API.patch("org-tools/escalations/"+x.id,{action:x.status==="open"?"acknowledge":"resolve"});await load()}catch(e){notice(root,e.message,true)}})])));content.append(section)}catch(e){content.replaceChildren($("p","mt-error",e.message||"Escalations could not be loaded."),btn("Retry",load))}}
 function rulesTable(rules){if(!rules.length)return $("p","mt-muted","No rules configured yet.");return table(["Rule","Trigger","Threshold","Severity","Scope","Enabled"],rules.map(x=>[x.name,x.trigger_type.replaceAll("_"," "),x.threshold_minutes+" min",x.severity,x.team_id?"Team #"+x.team_id:"Organisation",x.enabled?"Yes":"No"]))}
 function openRule(){const form=$("form","mt-form"),name=input("name",""),trigger=select("trigger_type",[["operation_overdue","Operation overdue"],["high_priority_overdue","High-priority operation overdue"]]),minutes=input("threshold_minutes",60,"number"),severity=select("severity",[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]]),notify=input("notify_admin","on","checkbox");const teams=API.get("teams").then(r=>r.teams||[]).catch(()=>[]);const team=select("team_id",[["","All organisation teams"]]);teams.then(list=>list.forEach(t=>{const o=$("option","",t.name);o.value=t.id;team.append(o)}));const grid=$("div","mt-form-grid");grid.append(field("Rule name",name),field("Trigger",trigger),field("Threshold (minutes)",minutes),field("Severity",severity),field("Team scope",team),field("Notify Admin",notify));const actions=$("div","mt-actions"),save=btn("Save escalation rule",null,true);save.type="submit";actions.append(save,btn("Cancel",()=>p.overlay.remove()));form.append(grid,actions);const p=panel("Create escalation rule","Set an organisation policy for overdue operational work.",form);form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;try{await API.post("org-tools/escalations/rules",{name:name.value,trigger_type:trigger.value,threshold_minutes:Number(minutes.value),severity:severity.value,team_id:team.value?Number(team.value):null,notify_admin:notify.checked});p.overlay.remove();await load()}catch(err){notice(form,err.message,true)}finally{save.disabled=false}})}
 await load();
}
async function renderTeamPolicy(container,embedded){
 const root=embedded?container:shell(container,"TEAM GOVERNANCE","Team Policy","The current instructions and standards your team is expected to follow.");
 root.replaceChildren();if(!embedded)container.append(root);
 const canEdit=role()==="supervisor";
 const head=$("div","mt-policy-toolbar"),teamSelect=select("team_id",[]);
 const teamField=field("Team",teamSelect);
 const writeButton=canEdit?btn("Write your first policy",openEditor,true):null;
 head.append(teamField);if(writeButton)head.append(writeButton);
 root.append(head);
 const content=$("div","mt-policy-content");root.append(content);
 let teamRows=[];
 function selectedTeam(){return teamRows.find(x=>String(x.team.id)===teamSelect.value)||teamRows[0]||null}
 function openEditor(){
  if(!selectedTeam()){notice(root,"No team is available for policy creation.",true);return}
  try{editPolicy(null)}catch(error){console.error("MECHNAR team policy editor:",error);notice(root,error.message||"The policy editor could not be opened.",true)}
 }
 async function load(){
  content.replaceChildren($("p","mt-muted","Loading team policy…"));
  try{
   const r=await API.get("org-tools/team-policy");teamRows=r.teams||[];
   teamSelect.replaceChildren();
   teamRows.forEach(x=>{const o=$("option","",x.team.name);o.value=x.team.id;teamSelect.append(o)});
   teamField.hidden=teamRows.length<2;
   if(writeButton){writeButton.hidden=!teamRows.length;writeButton.textContent=selectedTeam()?.policy?"Write policy":"Write your first policy"}
   if(!teamRows.length){content.replaceChildren($("div","mt-policy-empty","No team policy is available for your membership yet."));return}
   draw();
  }catch(e){content.replaceChildren($("p","mt-error",e.message||"Team policy could not be loaded."))}
 }
 function draw(){
  const selected=selectedTeam();content.replaceChildren();if(!selected)return;
  const policy=selected.policy;
  const teamHead=$("div","mt-policy-teamhead");
  teamHead.append($("div","mt-eyebrow","TEAM STANDARD"),$("h2","",selected.team.name));
  if(policy)teamHead.append($("span","mt-policy-version","CURRENT VERSION · "+policy.version));
  content.append(teamHead);
  if(!policy){
   const empty=$("div","mt-policy-empty");
   empty.append($("strong","","No published policy yet"),$("p","","Your supervisor has not published the team's instructions. Once published, the current policy will appear here for everyone in the team."));
   content.append(empty);return;
  }
  const intro=$("div","mt-policy-intro");
  intro.append($("span","mt-policy-live","● PUBLISHED"),$("span","mt-footnote","Effective version "+policy.version));
  content.append(intro);
  const body=$("article","mt-policy-document");body.append($("h2","mt-policy-document-title",policy.title));
  if(policy.policy_type==="custom"){body.append($("div","mt-policy-custom-copy",policy.instructions||""))}
  else{
   const sections=[["Purpose & objectives",policy.objectives],["Roles & responsibilities",policy.responsibilities],["Instructions to follow",policy.instructions],["Standards & expectations",policy.standards],["Safety guidance",policy.safety_guidance]];
   sections.forEach(([label,value])=>{if(!String(value||"").trim())return;const section=$("section","mt-policy-block");section.append($("h3","",label),$("p","mt-policy-copy",value));body.append(section)});
  }
  const meta=$("footer","mt-policy-meta");meta.append($("span","","Published "+(policy.published_at?new Date(policy.published_at).toLocaleString():"date unavailable")));body.append(meta);content.append(body);
  if(canEdit){
   content.append(btn("Publish new version",()=>editPolicy(policy),true));
   if((selected.drafts||[]).length){
    const drafts=$("section","mt-policy-drafts"),title=$("div","mt-policy-drafts-head");
    title.append($("h3","","Unpublished drafts"),$("span","mt-footnote",String(selected.drafts.length)+" saved"));drafts.append(title);
    selected.drafts.forEach(d=>{const row=$("div","mt-policy-draft-row"),copy=$("div","mt-policy-draft-copy");copy.append($("strong","",d.title),$("small","","Draft · Version "+d.version));row.append(copy,btn("Edit draft",()=>editPolicy(d)));drafts.append(row)});
    content.append(drafts);
   }
  }
 }
 teamSelect.addEventListener("change",()=>{if(writeButton)writeButton.textContent=selectedTeam()?.policy?"Write policy":"Write your first policy";draw()});
 function editPolicy(existing){
  const form=$("form","mt-form mt-policy-form"),fields={};
  const currentType=existing?.policy_type||"structured";
  const typeSelect=$("select","mt-input");typeSelect.name="policy_type";
  [["structured","Structured policy"],["custom","Custom policy — free writing"]].forEach(([value,label])=>{const option=$("option","",label);option.value=value;typeSelect.append(option)});
  typeSelect.value=currentType;
  const typeField=field("Policy format",typeSelect);
  const formatChoices=$("div","mt-policy-format-choices");
  const structuredChoice=btn("Structured policy",()=>setPolicyMode("structured"),false);
  const customChoice=btn("Custom policy",()=>setPolicyMode("custom"),false);
  formatChoices.append(structuredChoice,customChoice);
  function setPolicyMode(mode){typeSelect.value=mode;typeSelect.dispatchEvent(new Event("change"));structuredChoice.classList.toggle("is-selected",mode==="structured");customChoice.classList.toggle("is-selected",mode==="custom")}
  const defs=[["title","Policy title","Single, clear title for this team's policy."],["objectives","Purpose & objectives","What the team is responsible for achieving."],["responsibilities","Roles & responsibilities","Who is responsible for each part of the work."],["instructions","Instructions to follow","Write the actual steps and procedures team members must follow."],["standards","Standards & expectations","Define expected quality, conduct and completion standards."],["safety_guidance","Safety guidance","Required precautions, reporting steps and safety rules."]];
  defs.forEach(([key])=>{fields[key]=key==="title"?input(key,existing?.[key]||""):area(key,existing?.[key]||"")});
  const customContent=area("custom_content",currentType==="custom"?(existing?.instructions||""):"");
  const customField=field("Write your policy",customContent);
  const grid=$("div","mt-policy-form-grid");grid.append(formatChoices,typeField);
  defs.forEach(([key,label,hint])=>{const group=$("div","mt-policy-field-group");group.append(field(label,fields[key]),$("small","mt-policy-field-hint",hint));grid.append(group)});
  grid.append(customField);
  function updateMode(){
   const custom=typeSelect.value==="custom";
   defs.forEach(([key])=>{const group=fields[key].closest(".mt-policy-field-group");if(group)group.hidden=custom});
   customField.hidden=!custom;
  }
  updateMode();typeSelect.addEventListener("change",updateMode);setPolicyMode(currentType);
  const actions=$("div","mt-policy-form-actions"),save=btn("Save draft",null,false),publish=btn("Publish to team",null,true);
  actions.append(save,publish);
  const p=panel(existing?.status==="draft"?"Edit policy draft":existing?"Prepare new policy version":"Write team policy","Choose structured sections or write freely. Publishing makes the policy visible to every member of the selected team.",form);
  actions.append(btn("Cancel",()=>p.overlay.remove()));
  form.append(grid,actions);
  async function savePolicy(publishNow){
   const isCustom=typeSelect.value==="custom";
   const title=isCustom?(fields.title.value.trim()||"Custom policy"):fields.title.value.trim();
   if(!isCustom&&!title){notice(form,"Enter a policy title before saving.",true);fields.title.focus();return}
   if(isCustom&&!customContent.value.trim()){notice(form,"Write the policy before saving or publishing.",true);customContent.focus();return}
   const selected=selectedTeam();if(!selected){notice(form,"Select a team before saving.",true);return}
   const payload={team_id:Number(selected.team.id),publish:publishNow,policy_type:typeSelect.value,custom_content:customContent.value.trim(),title};
   if(existing?.status==="draft")payload.policy_id=existing.id;
   defs.forEach(([key])=>payload[key]=isCustom?"":fields[key].value.trim());
   save.disabled=publish.disabled=true;
   try{
    const result=await API.post("org-tools/team-policy",payload);
    p.overlay.remove();await load();
    if(publishNow)notice(root,result.message||"The policy is now published for the team.");
   }catch(e){notice(form,e.message||"Could not save policy.",true)}
   finally{save.disabled=publish.disabled=false}
  }
  save.addEventListener("click",()=>savePolicy(false));
  publish.addEventListener("click",()=>savePolicy(true));
 }
 await load();
}
window.MechnarOrgTools=Object.freeze({renderInventory,renderWorkforce,renderEscalations,renderTeamPolicy});
})();