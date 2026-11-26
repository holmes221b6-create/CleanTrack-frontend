/* MECHNAR What's New — automatically loaded release manifest with per-user acknowledgements. */
(function(){
  "use strict";
  let RELEASE_UPDATES=[];
  const style=document.createElement("style");
  style.textContent=".mn-whats-new-pending-target{position:relative;outline:1px solid rgba(210,55,75,.7)!important;outline-offset:5px;border-radius:6px}.mn-whats-new-feature-dot{display:inline-flex;align-items:center;justify-content:center;margin:0 0 8px 8px;padding:3px 7px;border:0;border-radius:10px;background:#d73550;color:#fff;font:700 9px/1.2 inherit;letter-spacing:.06em;cursor:pointer;box-shadow:0 0 0 3px rgba(215,53,80,.16)}.mn-whats-new-highlight{animation:mnWhatsNewPulse 1.1s ease 2}@keyframes mnWhatsNewPulse{50%{box-shadow:0 0 0 5px rgba(215,53,80,.2)}}";
  document.head.appendChild(style);

  let manifestRequest=null;
  const auth=window.CleanTrackAuth;
  const user=()=>auth&&auth.getCurrentUser?auth.getCurrentUser():null;
  const storageKey=()=>{const u=user()||{};return "mechnar.whats-new.v1:"+String(u.organization_id||"org")+":"+String(u.id||u.email||"user");};
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey())||"[]")}catch(_){return []}};
  const save=a=>{try{localStorage.setItem(storageKey(),JSON.stringify(a))}catch(_){}};
  const unseen=page=>RELEASE_UPDATES.filter(x=>x.page===page&&!read().includes(x.id));
  async function loadManifest(){
    if(manifestRequest)return manifestRequest;
    manifestRequest=fetch("whats-new.json?v="+encodeURIComponent(Date.now()),{cache:"no-store",credentials:"same-origin"})
      .then(response=>{if(!response.ok)throw new Error("Release manifest unavailable");return response.json()})
      .then(data=>{RELEASE_UPDATES=Array.isArray(data.updates)?data.updates.filter(x=>x&&x.id&&x.page&&x.feature):[];decorate();return RELEASE_UPDATES})
      .catch(()=>{RELEASE_UPDATES=[];decorate();return RELEASE_UPDATES})
      .finally(()=>{manifestRequest=null});
    return manifestRequest;
  }
  function decorate(){
    const root=document.getElementById("workspace-navigation"); if(!root)return;
    root.querySelectorAll(".nav-item[data-page]").forEach(button=>{
      const page=button.dataset.page,label=button.querySelector(".nav-item-label");
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
      const p=document.createElement("p");p.textContent=update.description||"A feature on this page has been updated.";
      const action=document.createElement("button");action.type="button";action.className="mn-whats-new-action";action.textContent="Explore feature";
      action.addEventListener("click",async()=>{
        overlay.remove();
        await navigateToFeature(update);
      });
      item.append(h,p,action);panel.append(item);
    });
    overlay.append(panel);overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
    const esc=e=>{if(e.key==="Escape"){overlay.remove();document.removeEventListener("keydown",esc)}};
    document.addEventListener("keydown",esc);
    document.body.append(overlay);close.focus();
  }
  async function navigateToFeature(update){
    const nav=window.CleanTrackNavigation;
    if(nav&&typeof nav.setActivePage==="function"&&update.page)nav.setActivePage(update.page);
    const findTarget=()=>{try{return update.target?document.querySelector(update.target):null}catch(_){return null}};
    let target=findTarget();
    for(let i=0;!target&&i<30;i++){await new Promise(resolve=>setTimeout(resolve,150));target=findTarget();}
    if(!target)target=document.querySelector("#workspace-content, #main-content, [data-workspace-content], main");
    if(!target)return;
    target.scrollIntoView({behavior:"smooth",block:"center"});
    target.classList.add("mn-whats-new-highlight","mn-whats-new-pending-target");
    let badge=target.querySelector(":scope > .mn-whats-new-feature-dot");
    if(!badge){badge=document.createElement("button");badge.type="button";badge.className="mn-whats-new-feature-dot";badge.textContent="NEW";badge.title="Click to acknowledge this feature";badge.setAttribute("aria-label","Acknowledge new feature");target.appendChild(badge);}
    const acknowledge=()=>{
      const seen=read();if(!seen.includes(update.id))seen.push(update.id);save(seen);
      badge.remove();target.classList.remove("mn-whats-new-pending-target","mn-whats-new-highlight");
      target.removeEventListener("click",acknowledge,true);decorate();
    };
    target.addEventListener("click",acknowledge,true);
    badge.addEventListener("click",e=>{e.stopPropagation();acknowledge();});
  }
  function init(){
    const root=document.getElementById("workspace-navigation");if(!root)return;
    decorate();
    new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
    root.addEventListener("click",e=>{
      const button=e.target.closest(".nav-item[data-page]");if(!button)return;
      const page=button.dataset.page;
      loadManifest().then(()=>setTimeout(()=>showUpdates(page),250));
    });
    window.addEventListener("storage",decorate);
    ["cleantrack:login","cleantrack:session-restored"].forEach(event=>window.addEventListener(event,()=>loadManifest()));
    window.addEventListener("cleantrack:logout",decorate);
    window.MechnarWhatsNew={refresh:()=>loadManifest(),pendingFor:page=>unseen(page).length,openFeature:id=>{const update=RELEASE_UPDATES.find(x=>x.id===id);return update?navigateToFeature(update):Promise.resolve(false);}};
    loadManifest();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
