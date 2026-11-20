/* MECHNAR What's New — developer-published, per-user feature acknowledgements.
   To publish an update, add an entry to RELEASE_UPDATES with a unique id, route,
   feature name, description and optional target selector. Never add routine data changes. */
(function(){
  "use strict";
  const RELEASE_UPDATES = [
    {
      id:"teams-native-team-performance-2026-11-v1",
      page:"teams",
      feature:"Team Performance Overview",
      description:"The Teams workspace now has a native performance overview with operational totals, completion and punctuality rates, workload-aware team scoring, weekly trends and individual team rankings."
    },
    {
      id:"inventory-separated-workspace-panels-2026-11-v1",
      page:"inventory",
      feature:"Dedicated Inventory panels",
      description:"Inventory sections now open in their own focused panels, including Items & Assets, Procurement, Stock Control, Locations, Transfers, Requests, Maintenance, Analytics, Forecast and Movement History."
    },
    {
      id:"supervisor-personnel-fullscreen-2026-11-v1",
      page:"personnel",
      feature:"Full-screen Personnel workspace",
      description:"Personnel now opens in a dedicated full-screen workspace with independently scrollable contacts, conversations and profile details."
    },
    {
      id:"supervisor-performance-analysis-2026-11-v1",
      page:"performance-analysis",
      feature:"Performance Analysis",
      description:"A dedicated analysis page brings together team comparisons, performance rankings, improvement guidance, history and measurable next steps."
    },
    {
      id:"operations-nested-detail-panels-2026-11-v1",
      page:"operations",
      feature:"Operation details in nested panels",
      description:"Opening an operation from an operations queue now displays its details inside that queue panel, so you can return to the same list without losing your place."
    }
  ];
  const auth=window.CleanTrackAuth;
  const user=()=>auth&&auth.getCurrentUser?auth.getCurrentUser():null;
  const storageKey=()=>{const u=user()||{};return "mechnar.whats-new.v1:"+String(u.organization_id||"org")+":"+String(u.id||u.email||"user");};
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey())||"[]")}catch(_){return []}};
  const save=a=>{try{localStorage.setItem(storageKey(),JSON.stringify(a))}catch(_){}};
  const unseen=page=>RELEASE_UPDATES.filter(x=>x.page===page&&!read().includes(x.id));
  function decorate(){
    const root=document.getElementById("workspace-navigation"); if(!root)return;
    root.querySelectorAll(".nav-item[data-page]").forEach(button=>{
      const page=button.dataset.page, label=button.querySelector(".nav-item-label");
      if(!label)return;
      let dot=button.querySelector(".mn-whats-new-dot");
      const pending=unseen(page).length>0;
      if(pending&&!dot){dot=document.createElement("span");dot.className="mn-whats-new-dot";dot.setAttribute("aria-label","New feature update");dot.title="New feature update — open to explore";label.appendChild(dot)}
      if(!pending&&dot)dot.remove();
      button.classList.toggle("has-whats-new",pending);
    });
  }
  function showUpdates(page){
    const list=unseen(page);if(!list.length)return;
    document.getElementById("mn-whats-new-overlay")?.remove();
    const overlay=document.createElement("div");overlay.id="mn-whats-new-overlay";overlay.className="mn-whats-new-overlay";
    const panel=document.createElement("section");panel.className="mn-whats-new-panel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","What's New");
    const head=document.createElement("header");head.className="mn-whats-new-head";
    const title=document.createElement("div");title.innerHTML="<span class='mn-whats-new-kicker'>MECHNAR RELEASE NOTES</span><h2>What's New</h2><p>Explore the latest changes on this page.</p>";
    const close=document.createElement("button");close.type="button";close.className="mn-whats-new-close";close.textContent="×";close.setAttribute("aria-label","Close");
    close.addEventListener("click",()=>overlay.remove());head.append(title,close);panel.append(head);
    list.forEach(update=>{
      const item=document.createElement("article");item.className="mn-whats-new-item";
      const h=document.createElement("h3");h.textContent=update.feature;
      const p=document.createElement("p");p.textContent=update.description;
      const action=document.createElement("button");action.type="button";action.className="mn-whats-new-action";action.textContent="Explore feature";
      action.addEventListener("click",()=>{
        const seen=read();if(!seen.includes(update.id))seen.push(update.id);save(seen);
        overlay.remove();decorate();
        if(update.target){const target=document.querySelector(update.target);if(target){target.scrollIntoView({behavior:"smooth",block:"center"});target.classList.add("mn-whats-new-highlight");setTimeout(()=>target.classList.remove("mn-whats-new-highlight"),2200)}}
      });
      item.append(h,p,action);panel.append(item);
    });
    overlay.append(panel);overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
    document.addEventListener("keydown",function esc(e){if(e.key==="Escape"){overlay.remove();document.removeEventListener("keydown",esc)}});
    document.body.append(overlay);close.focus();
  }
  function init(){
    const root=document.getElementById("workspace-navigation");if(!root)return;
    decorate();
    new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
    root.addEventListener("click",e=>{
      const button=e.target.closest(".nav-item[data-page]");if(!button)return;
      const page=button.dataset.page;setTimeout(()=>showUpdates(page),250);
    });
    window.addEventListener("storage",decorate);
    window.addEventListener("cleantrack:login",decorate);
    window.addEventListener("cleantrack:session-restored",decorate);
    window.addEventListener("cleantrack:logout",decorate);
    window.MechnarWhatsNew={refresh:decorate,pendingFor:page=>unseen(page).length};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
