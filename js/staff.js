(function () {
  "use strict";
  const API=window.CleanTrackApi;
  const AUTH=window.CleanTrackAuth;
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n;}
  function button(label,cls,fn){const n=el("button",cls,label);n.type="button";n.addEventListener("click",fn);return n;}
  function date(value){if(!value)return "—";const d=new Date(value);if(Number.isNaN(d.getTime()))return "—";return window.CleanTrackPreferences?.formatDate?window.CleanTrackPreferences.formatDate(d):new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(d);}
  function notice(root,msg,type){const n=root.querySelector("[data-staff-notice]");if(!n)return;n.textContent=msg||"";n.className="ct-staff-notice"+(type?" is-"+type:"");n.hidden=!msg;}
  async function shareUrl(url){
    const message="Invite a Supervisor to request access to our CleanTrack organization. An Admin must approve every request: "+url;
    if(navigator.share){await navigator.share({title:"CleanTrack — Invite a Supervisor",text:"Request access to our CleanTrack organization. An Admin must approve every request.",url});return;}
    window.open("https://wa.me/?text="+encodeURIComponent(message),"_blank","noopener");
  }
  async function copy(value){
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}
    const n=el("textarea");n.value=value;n.style.position="fixed";n.style.opacity="0";document.body.appendChild(n);n.select();const ok=document.execCommand("copy");n.remove();if(!ok)throw new Error("Copy was blocked. Select and copy the link manually.");
  }
  function render(root){
    root.replaceChildren();
    const user=AUTH?.getCurrentUser?AUTH.getCurrentUser():null;
    if(!user||String(user.role||"").toLowerCase()!=="admin"){root.appendChild(el("p","ct-staff-muted","Staff administration is available to organization Admins only."));return;}
    const page=el("section","ct-staff-page");
    const header=el("header","ct-staff-header");const copyBlock=el("div");
    copyBlock.append(el("p","ct-staff-eyebrow","PEOPLE AND ACCESS"),el("h1","","Staff"),el("p","ct-staff-muted","View real organization member records, share a supervisor join link, and manage seven-day termination schedules."));
    header.append(copyBlock,button("Open Invitations","ct-staff-button ct-staff-button--primary",()=>window.CleanTrackNavigation?.setActivePage("invitations")));
    page.appendChild(header);
    const note=el("div","ct-staff-notice");note.dataset.staffNotice="true";note.hidden=true;note.setAttribute("role","status");page.appendChild(note);

    const summary=el("div","ct-staff-summary");
    const summaryData=[
      ["Active staff","active"],["Pending invitations","pending_invitations"],["Waiting for approval","pending_requests"],["Termination pending","termination_pending"]
    ];
    const summaryValues={};
    summaryData.forEach(([label,key])=>{const card=el("article","ct-staff-kpi");card.append(el("span","",label));const value=el("strong","","—");card.appendChild(value);summaryValues[key]=value;summary.appendChild(card);});
    page.appendChild(summary);

    const invite=el("section","ct-staff-card");
    invite.append(el("h2","","Invite supervisors"),el("p","ct-staff-muted","Share a join link by SMS, WhatsApp, or your device’s other sharing options. The link pre-fills the organization code and Supervisor role; it does not grant access without Admin approval."));
    const linkRow=el("div","ct-staff-link-row");
    const link=el("input","ct-staff-input");link.type="url";link.readOnly=true;link.value="Loading organization join link…";link.setAttribute("aria-label","Supervisor join link");
    linkRow.append(link,
      button("Copy link","ct-staff-button",async()=>{if(!link.value||link.value.startsWith("Loading")||link.value==="Not available"){notice(page,"The organization join link is not available.","error");return;}try{await copy(link.value);notice(page,"Supervisor join link copied. Share it with the intended recipient.","success");}catch(e){notice(page,e.message,"error");}}),
      button("Share link…","ct-staff-button ct-staff-button--primary",async()=>{if(!link.value||link.value.startsWith("Loading")||link.value==="Not available"){notice(page,"The organization join link is not available.","error");return;}try{await shareUrl(link.value);}catch(e){if(e.name!=="AbortError")notice(page,"Share sheet was not available; use Copy link instead.","error");}})
    );
    invite.appendChild(linkRow);
    invite.appendChild(el("p","ct-staff-muted","For a link tied to a specific email address, use Open Invitations to generate and manage a targeted invite. Outbound email is not configured in this deployment."));
    page.appendChild(invite);

    const members=el("section","ct-staff-card");
    const membersHead=el("div","ct-staff-card-head");const mIntro=el("div");mIntro.append(el("h2","","Organization members"),el("p","ct-staff-muted","Member names, roles, contact details, and account states are loaded from the organization database."));
    membersHead.append(mIntro,button("Refresh","ct-staff-button",()=>load(page,false)));members.appendChild(membersHead);
    const search=el("input","ct-staff-input");search.type="search";search.placeholder="Search name, email, role, or status";search.setAttribute("aria-label","Search organization members");members.appendChild(search);
    const list=el("div","ct-staff-list");members.appendChild(list);page.appendChild(members);
    let rows=[];
    function renderRows(){
      list.replaceChildren();
      const q=search.value.trim().toLowerCase();
      const filtered=rows.filter(m=>[m.full_name,m.email,m.phone,m.role,m.account_status].some(v=>String(v||"").toLowerCase().includes(q)));
      if(!filtered.length){list.appendChild(el("div","ct-staff-empty",rows.length?"No members match your search.":"No active or historical staff records are available for this organization yet."));return;}
      filtered.forEach(member=>{
        const card=el("article","ct-staff-member");
        const first=el("div","ct-staff-member-head");const identity=el("div");
        identity.append(el("h3","",member.full_name||"Name unavailable"),el("p","ct-staff-muted",member.email||"Email unavailable"));
        const s=String(member.account_status||"unknown").toLowerCase();
        first.append(identity,el("span","ct-staff-status ct-staff-status--"+s.replace(/[^a-z0-9-]/g,"-"),s.replace(/_/g," ")));
        card.appendChild(first);
        const meta=el("div","ct-staff-member-meta");
        [["Role",member.role||"—"],["Phone",member.phone||"Not provided"],["Account created",date(member.created_at)],["Termination effective",member.termination_effective_at?date(member.termination_effective_at):"—"]].forEach(([label,value])=>{const field=el("div","ct-staff-member-field");field.append(el("span","",label),el("strong","",value));meta.appendChild(field);});
        card.appendChild(meta);
        if(s==="active"){
          card.appendChild(button("Schedule termination (7 days)","ct-staff-button ct-staff-button--danger",async()=>{
            if(!confirm("Schedule termination for "+(member.full_name||member.email)+"? They keep access for 7 days. Their access is disabled after the deadline; historical records are retained."))return;
            try{const out=await API.post("organizations/members/"+member.id+"/termination",{});notice(page,out.message||"Termination scheduled.","success");await load(page,false);}
            catch(e){notice(page,e.message||"Could not schedule termination.","error");}
          }));
        } else if(s==="termination_pending"){
          card.appendChild(button("Cancel pending termination","ct-staff-button",async()=>{
            if(!confirm("Cancel the scheduled termination for "+(member.full_name||member.email)+"?"))return;
            try{const out=await API.post("organizations/members/"+member.id+"/termination/cancel",{});notice(page,out.message||"Pending termination cancelled.","success");await load(page,false);}
            catch(e){notice(page,e.message||"Could not cancel termination.","error");}
          }));
        }
        list.appendChild(card);
      });
    }
    search.addEventListener("input",renderRows);

    async function load(root,initial){
      if(initial)notice(root,"Loading organization staff from CleanTrack…");
      try{
        const result=await Promise.all([
          API.get("organizations/staff"),API.get("organizations/current"),API.get("membership/requests"),API.get("invitations")
        ]);
        rows=Array.isArray(result[0].staff)?result[0].staff:[];
        const summaryData=result[0].summary||{};
        summaryValues.active.textContent=String(summaryData.active??0);
        summaryValues.pending_invitations.textContent=String(summaryData.pending_invitations??0);
        summaryValues.pending_requests.textContent=String(Array.isArray(result[2].membership_requests)?result[2].membership_requests.length:0);
        summaryValues.termination_pending.textContent=String(summaryData.termination_pending??0);
        const org=result[1].organization||{};
        const code=org.code||org.organization_code||"";
        if(code){link.value=window.location.origin+"/?join="+encodeURIComponent(code)+"&role=supervisor";}
        else link.value="Not available";
        renderRows();
        if(initial)notice(root,"Staff records and access counts loaded from the organization database.","success");
      }catch(e){
        if(initial)list.replaceChildren(el("div","ct-staff-error",e.message||"Could not load organization staff."));
        notice(root,e.message||"Could not load staff records. Check your connection and permissions.","error");
      }
    }
    root.appendChild(page);
    load(page,true);
  }
  window.CleanTrackStaff=Object.freeze({render});
})();