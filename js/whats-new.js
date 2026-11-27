/* MECHNAR What's New — release announcements and guided feature walkthroughs. */
(function(){
  "use strict";
  let RELEASE_UPDATES=[];
  let manifestRequest=null;
  let manifestLoaded=false;
  let activeGuide=null;
  const auth=window.CleanTrackAuth;
  const user=()=>auth&&auth.getCurrentUser?auth.getCurrentUser():null;
  const storageKey=()=>{const u=user()||{};return "mechnar.whats-new.v1:"+String(u.organization_id||"org")+":"+String(u.id||u.email||"user");};
  const read=()=>{try{return JSON.parse(localStorage.getItem(storageKey())||"[]")}catch(_){return []}};
  const save=a=>{try{localStorage.setItem(storageKey(),JSON.stringify(a))}catch(_){}};
  const presentedKey=()=>storageKey()+":presented";
  const presented=()=>{try{return JSON.parse(localStorage.getItem(presentedKey())||"[]")}catch(_){return []}};
  const savePresented=a=>{try{localStorage.setItem(presentedKey(),JSON.stringify(a))}catch(_){}};
  const acknowledge=update=>{const seen=read();if(!seen.includes(update.id))seen.push(update.id);save(seen);decorate();};
  const unseen=page=>{const role=String((user()||{}).role||"").toLowerCase();return RELEASE_UPDATES.filter(x=>(x.page==="all"||x.page===page)&&(!Array.isArray(x.roles)||!x.roles.length||x.roles.some(r=>String(r).toLowerCase()===role))&&!read().includes(x.id));};

  async function loadManifest(){
    if(manifestLoaded)return Promise.resolve(RELEASE_UPDATES);
    if(manifestRequest)return manifestRequest;
    manifestRequest=fetch("whats-new.json?v="+encodeURIComponent(Date.now()),{cache:"no-store",credentials:"same-origin"})
      .then(r=>{if(!r.ok)throw new Error("Release manifest unavailable");return r.json()})
      .then(data=>{RELEASE_UPDATES=Array.isArray(data.updates)?data.updates.filter(x=>x&&x.id&&x.page&&x.feature):[];manifestLoaded=true;decorate();return RELEASE_UPDATES})
      .catch(()=>{RELEASE_UPDATES=[];manifestLoaded=false;decorate();return RELEASE_UPDATES})
      .finally(()=>{manifestRequest=null});
    return manifestRequest;
  }
  function decorate(){
    const root=document.getElementById("workspace-navigation");if(!root)return;
    root.querySelectorAll(".nav-item[data-page]").forEach(button=>{
      const page=button.dataset.page,label=button.querySelector(".nav-item-label");if(!label)return;
      let dot=button.querySelector(".mn-whats-new-dot");const pending=unseen(page).length>0;
      if(pending&&!dot){dot=document.createElement("span");dot.className="mn-whats-new-dot";dot.setAttribute("aria-label","New feature update");dot.title="New feature update — open to explore";label.appendChild(dot)}
      if(!pending&&dot)dot.remove();
      button.classList.toggle("has-whats-new",pending);
    });
  }
  function showUpdates(page,selectedUpdates){
    // The release announcement is shown once per update and per user/org.
    // The guided walkthrough itself is launched only by the explicit Explore
    // Features action. Closing the announcement does not acknowledge the update.
    const shown=presented();
    const pending=unseen(page);\n    const list=selectedUpdates?selectedUpdates.filter(update=>pending.some(item=>item.id===update.id)):pending.filter(update=>!shown.includes(update.id));
    if(!list.length)return;
    savePresented([...shown,...list.map(update=>update.id)]);
    document.getElementById("mn-whats-new-overlay")?.remove();
    const overlay=document.createElement("div");overlay.id="mn-whats-new-overlay";overlay.className="mn-whats-new-overlay";
    const panel=document.createElement("section");panel.className="mn-whats-new-panel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","What's New");
    const head=document.createElement("header");head.className="mn-whats-new-head";
    const title=document.createElement("div");title.innerHTML="<span class='mn-whats-new-kicker'>MECHNAR RELEASE NOTES</span><h2>What's New</h2><p>Choose a feature to see its guided walkthrough.</p>";
    const close=document.createElement("button");close.type="button";close.className="mn-whats-new-close";close.textContent="×";close.setAttribute("aria-label","Close");
    close.addEventListener("click",()=>overlay.remove());head.append(title,close);panel.append(head);
    list.forEach(update=>{
      const item=document.createElement("article");item.className="mn-whats-new-item";
      const h=document.createElement("h3");h.textContent=update.feature;
      const action=document.createElement("button");action.type="button";action.className="mn-whats-new-action";action.textContent="Explore Features";
      action.addEventListener("click",async()=>{overlay.remove();await navigateToFeature(update)});
      const skip=document.createElement("button");skip.type="button";skip.className="mn-whats-new-skip";skip.textContent="Skip";
      skip.addEventListener("click",()=>{acknowledge(update);item.remove();if(!panel.querySelector(".mn-whats-new-item"))overlay.remove();});
      const actions=document.createElement("div");actions.className="mn-whats-new-actions";actions.append(action,skip);
      item.append(h,actions);panel.append(item);
    });
    overlay.append(panel);overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
    const esc=e=>{if(e.key==="Escape"){overlay.remove();document.removeEventListener("keydown",esc)}};
    document.addEventListener("keydown",esc);document.body.append(overlay);close.focus();
  }
  function closeGuide(shouldAcknowledge){
    if(!activeGuide)return;
    const guide=activeGuide;activeGuide=null;
    guide.timer&&clearInterval(guide.timer);
    guide.keydown&&document.removeEventListener("keydown",guide.keydown);
    guide.blocker.remove();
    document.body.style.overflow=guide.previousBodyOverflow;
    if(guide.workspace){guide.workspace.inert=guide.previousInert;}
    guide.resize&&window.removeEventListener("resize",guide.resize);
    guide.scroll&&window.removeEventListener("scroll",guide.scroll,true);
    guide.bubble.remove();
    guide.target.classList.remove("mn-whats-new-highlight","mn-whats-new-pending-target");
    if(shouldAcknowledge)acknowledge(guide.update);
  }
  function positionGuide(guide){
    const r=guide.target.getBoundingClientRect(),bubble=guide.bubble;
    const width=Math.min(390,window.innerWidth-32);
    bubble.style.width=width+"px";
    const left=Math.max(16,Math.min(window.innerWidth-width-16,r.left+r.width/2-width/2));
    const below=r.bottom+18,above=r.top-bubble.offsetHeight-18;
    const placeAbove=below+bubble.offsetHeight>window.innerHeight-12&&above>12;
    bubble.classList.toggle("mn-whats-new-guide-above",placeAbove);
    bubble.style.left=left+"px";
    bubble.style.top=Math.max(12,placeAbove?above:Math.min(below,window.innerHeight-bubble.offsetHeight-12))+"px";
    bubble.style.setProperty("--mn-guide-arrow-left",Math.max(22,Math.min(width-34,r.left+r.width/2-left))+"px");
  }
  function typeDescription(guide){
    const words=(guide.update.description||"This feature has been updated.").split(/\s+/);
    let index=0;guide.text.textContent="";guide.timer=setInterval(()=>{
      if(!activeGuide||activeGuide!==guide){clearInterval(guide.timer);return}
      guide.text.textContent+=(index?" ":"")+words[index++];
      if(index>=words.length){clearInterval(guide.timer);guide.timer=null;guide.done=true;guide.doneButton.disabled=false;guide.doneButton.textContent="Got it";}
    },65);
  }
  async function navigateToFeature(update){
    closeGuide(false);
    const nav=window.CleanTrackNavigation;
    if(nav&&typeof nav.setActivePage==="function"&&update.page&&update.page!=="all")nav.setActivePage(update.page);
    if(update.section){
      // Route rendering is event-driven; wait for Settings to mount before
      // selecting its nested section.
      await new Promise(resolve=>setTimeout(resolve,350));
      const sectionButton=document.querySelector(`[data-settings-nav="${CSS.escape(update.section)}"]`);
      if(sectionButton)sectionButton.click();
    }
    const findTarget=()=>{
      try{
        if(update.target){const exact=document.querySelector(update.target);if(exact&&exact.getClientRects().length)return exact;}
        const wanted=String(update.feature||"").trim().toLowerCase();
        const candidates=Array.from(document.querySelectorAll("h1,h2,h3,h4,[role='tab'],button,.sr-panel-heading,.sr-directory-card,.sr-metric"));
        const exact=candidates.find(node=>node.getClientRects().length&&node.textContent.trim().toLowerCase()===wanted);
        if(exact)return exact.closest(".sr-panel,.sr-directory-card,.sr-metric,.sr-workspace,.sr-page")||exact;
        const words=wanted.split(/\\s+/).filter(word=>word.length>3);
        const partial=candidates.find(node=>node.getClientRects().length&&words.length&&words.every(word=>node.textContent.toLowerCase().includes(word)));
        if(partial)return partial.closest(".sr-panel,.sr-directory-card,.sr-metric,.sr-workspace,.sr-page")||partial;
        // Never place a walkthrough at a generic page/footer location. If its
        // actual feature cannot be identified, do not show a misleading guide.
        return null;
      }catch(_){return null}
    };
    let target=findTarget();
    for(let i=0;!target&&i<30;i++){await new Promise(resolve=>setTimeout(resolve,150));target=findTarget();}
    if(!target)return false;
    target.scrollIntoView({behavior:"smooth",block:"center"});
    target.classList.add("mn-whats-new-highlight","mn-whats-new-pending-target");
    const blocker=document.createElement("div");blocker.className="mn-whats-new-guide-blocker";blocker.setAttribute("aria-hidden","true");
    const workspace=document.getElementById("workspace-view");
    const previousInert=workspace?workspace.inert:false;
    const previousBodyOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    if(workspace)workspace.inert=true;
    const stop=(event)=>{event.preventDefault();event.stopPropagation();};
    ["wheel","touchmove","pointerdown","click","keydown"].forEach(type=>blocker.addEventListener(type,stop,{passive:false}));
    document.body.append(blocker);
    const bubble=document.createElement("aside");bubble.className="mn-whats-new-guide";bubble.setAttribute("role","dialog");bubble.setAttribute("aria-modal","true");bubble.setAttribute("aria-label","Feature walkthrough");
    const pointer=document.createElement("span");pointer.className="mn-whats-new-guide-pointer";
    const kicker=document.createElement("div");kicker.className="mn-whats-new-guide-kicker";kicker.textContent="FEATURE WALKTHROUGH";
    const heading=document.createElement("h3");heading.textContent="Here's what's new";
    const text=document.createElement("p");text.className="mn-whats-new-guide-text";
    const done=document.createElement("button");done.type="button";done.className="mn-whats-new-guide-done";done.disabled=true;done.textContent="Showing you…";
    done.addEventListener("click",()=>closeGuide(true));
    const dismiss=document.createElement("button");dismiss.type="button";dismiss.className="mn-whats-new-guide-dismiss";dismiss.textContent="×";dismiss.setAttribute("aria-label","Close walkthrough");
    dismiss.addEventListener("click",()=>closeGuide(false));
    bubble.append(pointer,dismiss,kicker,heading,text,done);document.body.append(bubble);
    const guide={update,target,bubble,blocker,workspace,previousInert,previousBodyOverflow,text,doneButton:done,timer:null,done:false};
    activeGuide=guide;
    guide.resize=()=>positionGuide(guide);guide.scroll=()=>positionGuide(guide);
    guide.keydown=e=>{if(e.key==="Escape"){e.preventDefault();closeGuide(false);}else if(e.key==="Tab"){e.preventDefault();(document.activeElement===done?dismiss:done).focus();}};
    document.addEventListener("keydown",guide.keydown);
    window.addEventListener("resize",guide.resize);window.addEventListener("scroll",guide.scroll,true);
    positionGuide(guide);setTimeout(()=>{if(activeGuide===guide){positionGuide(guide);typeDescription(guide)}},450);
    return true;
  }
  function renderPageDiscovery(page){
    const updates=unseen(page).filter(update=>update.page!=="all"&&update.target);
    updates.forEach(update=>{
      let target=null;
      try{target=document.querySelector(update.target)}catch(_){}
      if(!target||!target.getClientRects().length)return;
      if(target.querySelector(':scope > .mn-feature-discovery-trigger[data-update-id="'+CSS.escape(update.id)+'"]'))return;
      const trigger=document.createElement("button");
      trigger.type="button";trigger.className="mn-feature-discovery-trigger";
      trigger.dataset.updateId=update.id;
      trigger.textContent="New · Explore feature";
      trigger.setAttribute("aria-label","Explore "+update.feature);
      trigger.addEventListener("click",()=>showUpdates(page,[update]));
      target.append(trigger);
    });
  }
  function activePage(){
    const nav=window.CleanTrackNavigation;
    return nav&&typeof nav.getActivePage==="function"?nav.getActivePage():document.querySelector(".nav-item[aria-current='page']")?.dataset.page||null;
  }
  function init(){
    const root=document.getElementById("workspace-navigation");if(!root)return;
    decorate();new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
    // Do not observe page-content mutations here: rendering the discovery banner
    // mutates that same node and would create an endless MutationObserver loop.
    window.addEventListener("cleantrack:navigate",event=>{const page=event.detail?.page;if(page)loadManifest().then(()=>setTimeout(()=>renderPageDiscovery(page),650));});
    root.addEventListener("click",e=>{const button=e.target.closest(".nav-item[data-page]");if(!button)return;const page=button.dataset.page;loadManifest().then(()=>setTimeout(()=>renderPageDiscovery(page),650));});
    window.addEventListener("storage",decorate);
    ["cleantrack:login","cleantrack:session-restored"].forEach(event=>window.addEventListener(event,()=>loadManifest()));
    window.addEventListener("cleantrack:logout",decorate);
    window.MechnarWhatsNew={refresh:()=>loadManifest(),pendingFor:page=>unseen(page).length,showForPage:page=>renderPageDiscovery(page),openFeature:id=>{const update=RELEASE_UPDATES.find(x=>x.id===id);return update?navigateToFeature(update):Promise.resolve(false)}};
    loadManifest();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
