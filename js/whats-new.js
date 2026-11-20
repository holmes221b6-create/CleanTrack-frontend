/* MECHNAR What's New — developer-published, per-user feature acknowledgements.
   To publish an update, add an entry to RELEASE_UPDATES with a unique id, route,
   feature name, description and optional target selector. Never add routine data changes. */
(function(){
  "use strict";
  const RELEASE_UPDATES = [
    // Example:
    // {id:"settings-notification-preferences-2026-11",page:"settings",
    //  feature:"Notification preferences",description:"New notification controls are available.",
    //  target:"[data-feature='notification-preferences']"}
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
    window.MechnarWhatsNew={refresh:decorate,pendingFor:page=>unseen(page).length};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
