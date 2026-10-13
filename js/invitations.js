(function () {
  "use strict";
  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function button(label, cls, fn) {
    const node = el("button", cls || "ct-inv-button", label);
    node.type = "button";
    node.addEventListener("click", fn);
    return node;
  }
  function date(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    const pref = window.CleanTrackPreferences;
    if (pref && pref.formatDate) return pref.formatDate(parsed);
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
  }
  function statusClass(value) {
    return "ct-inv-status ct-inv-status--" + String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }
  function showMessage(root, message, type) {
    const notice = root.querySelector("[data-inv-notice]");
    if (!notice) return;
    notice.textContent = message || "";
    notice.className = "ct-inv-notice" + (type ? " is-" + type : "");
    notice.hidden = !message;
  }
  async function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const temp = el("textarea");
    temp.value = value;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const copied = document.execCommand("copy");
    temp.remove();
    if (!copied) throw new Error("Copy was blocked. Select the link and copy it manually.");
  }

  function organizationJoinUrl(code, role) {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("join", code);
    url.searchParams.set("role", role || "employee");
    return url.href;
  }

  function channelLink(label, href) {
    const link = el("a", "ct-inv-button ct-inv-button--secondary", label);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function shareMessage(url, details) {
    return (details || "You are invited to request access to our organization on CleanTrack.") +
      " An Admin must approve your request: " + url;
  }

  function openNativeShare(data, fallbackMessage) {
    if (typeof navigator.share !== "function") {
      showMessage(fallbackMessage.root, fallbackMessage.text, "info");
      return Promise.resolve(false);
    }
    return navigator.share(data).then(() => true).catch(error => {
      if (!error || error.name !== "AbortError") {
        showMessage(fallbackMessage.root, "Sharing could not be opened. Use WhatsApp, SMS, or Copy instead.", "error");
      }
      return false;
    });
  }

  function quickShareLinks(container, url, message, emailAddress) {
    const encoded = encodeURIComponent(message + " " + url);
    container.append(
      channelLink("WhatsApp", "https://wa.me/?text=" + encoded),
      channelLink("SMS / Messages", "sms:?body=" + encoded)
    );
    if (emailAddress) {
      const subject = encodeURIComponent("Your CleanTrack invitation");
      container.append(channelLink("Email app", "mailto:" + encodeURIComponent(emailAddress) + "?subject=" + subject + "&body=" + encoded));
    } else {
      container.append(channelLink("Email app", "mailto:?subject=" + encodeURIComponent("Join us on CleanTrack") + "&body=" + encoded));
    }
  }
  function render(root) {
    root.replaceChildren();
    const user = AUTH && AUTH.getCurrentUser ? AUTH.getCurrentUser() : null;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      root.appendChild(el("p", "ct-inv-muted", "Invitations and membership approvals are available to organization Admins only."));
      return;
    }
    const page = el("section", "ct-invitations-page");
    const header = el("header", "ct-inv-header");
    const intro = el("div");
    intro.append(el("p", "ct-inv-eyebrow", "ORGANIZATION ACCESS"), el("h1", "", "Invitations"),
      el("p", "ct-inv-muted", "Review requests to join and manage invitation links. An organization code or invitation link never grants access by itself; every join request needs Admin approval. Outgoing email is not configured, so no approval, rejection, or invitation email is sent by this deployment."));
    header.appendChild(intro);
    header.appendChild(button("Refresh", "ct-inv-button", () => load(page, false)));
    page.appendChild(header);
    const notice = el("div", "ct-inv-notice");
    notice.dataset.invNotice = "true"; notice.hidden = true; notice.setAttribute("role", "status");
    page.appendChild(notice);

    const codeCard = el("section", "ct-inv-card");
    const codeHead = el("div", "ct-inv-card-head");
    const codeInfo = el("div");
    codeInfo.append(el("h2", "", "Organization code"), el("p", "ct-inv-muted", "Share this code outside CleanTrack when someone needs to request to join. The Admin must still approve their request."));
    codeHead.append(codeInfo);
    codeCard.appendChild(codeHead);
    const codeRow = el("div", "ct-inv-code-row");
    const codeValue = el("code", "ct-inv-code", "Loading organization code…");
    codeValue.dataset.orgCode = "true";
    const copyCode = button("Copy code", "ct-inv-button ct-inv-button--secondary", async () => {
      const code = codeValue.dataset.value || "";
      if (!code) return showMessage(page, "Organization code is not available yet.", "error");
      try { await copyText(code); showMessage(page, "Organization code copied.", "success"); }
      catch (err) { showMessage(page, err.message, "error"); }
    });
    codeRow.append(codeValue, copyCode);
    codeCard.appendChild(codeRow);

    const publicShareRole = el("select", "ct-inv-input");
    publicShareRole.setAttribute("aria-label", "Role requested by the organization invite link");
    [["employee","Employee"],["supervisor","Supervisor"]].forEach(([value,label]) => {
      const option = el("option", "", label);
      option.value = value;
      publicShareRole.appendChild(option);
    });
    const orgShareText = () => "Join our organization on CleanTrack as a " + publicShareRole.value +
      ". The link opens a join request; an Admin must approve you.";
    const orgInviteActions = el("div", "ct-inv-share-tools");
    const shareOrgInvite = button("Share invite", "ct-inv-button ct-inv-button--primary", async () => {
      const code = codeValue.dataset.value || "";
      if (!code) return showMessage(page, "The organization code has not loaded yet.", "error");
      const url = organizationJoinUrl(code, publicShareRole.value);
      await openNativeShare({
        title: "Join our organization on CleanTrack",
        text: orgShareText() + " Organization code: " + code,
        url
      }, {root:page,text:"Your browser doesn't offer the device share sheet. Choose WhatsApp, SMS / Messages, or Email below."});
    });
    const copyOrgInvite = button("Copy invite link", "ct-inv-button ct-inv-button--secondary", async () => {
      const code = codeValue.dataset.value || "";
      if (!code) return showMessage(page, "The organization code has not loaded yet.", "error");
      try {
        await copyText(organizationJoinUrl(code, publicShareRole.value));
        showMessage(page, "Join link copied. Admin approval is still required.", "success");
      } catch (error) { showMessage(page, error.message || "Unable to copy the join link.", "error"); }
    });
    orgInviteActions.append(publicShareRole, shareOrgInvite, copyOrgInvite);
    codeCard.appendChild(orgInviteActions);
    const quickOrgActions = el("div", "ct-inv-actions");
    const quickOrgMessage = () => {
      const code = codeValue.dataset.value || "";
      return code ? orgShareText() + " Organization code: " + code + ". An Admin must approve your request." : "";
    };
    quickOrgActions.append(
      channelLink("WhatsApp", "https://wa.me/"),
      channelLink("SMS / Messages", "sms:"),
      channelLink("Email app", "mailto:")
    );
    function refreshOrgShareTargets() {
      quickOrgActions.replaceChildren();
      const code = codeValue.dataset.value || "";
      if (!code) {
        quickOrgActions.append(el("span", "ct-inv-muted", "Share options will be ready when the organization code loads."));
        return;
      }
      quickShareLinks(quickOrgActions, organizationJoinUrl(code, publicShareRole.value), quickOrgMessage(), "");
    }
    publicShareRole.addEventListener("change", refreshOrgShareTargets);
    refreshOrgShareTargets();
    codeCard.appendChild(quickOrgActions);
    page.appendChild(codeCard);

    const createCard = el("section", "ct-inv-card");
    const createHead = el("div", "ct-inv-card-head");
    const createIntro = el("div");
    createIntro.append(el("h2", "", "Create a targeted invitation"), el("p", "ct-inv-muted", "Create a one-time, 14-day link for a specific email address. The recipient can submit a join request; the link does not approve them or activate their account."));
    createHead.appendChild(createIntro);
    createCard.appendChild(createHead);
    const inviteForm = el("form", "ct-inv-create-form");
    const emailField = el("label", "ct-inv-field");
    emailField.append(el("span", "", "Recipient email"));
    const email = el("input", "ct-inv-input");
    email.type = "email"; email.name = "email"; email.required = true; email.maxLength = 254; email.placeholder = "person@example.com"; email.autocomplete = "email";
    emailField.appendChild(email);
    const roleField = el("label", "ct-inv-field");
    roleField.append(el("span", "", "Requested role"));
    const role = el("select", "ct-inv-input"); role.name = "role";
    [["Supervisor","Supervisor"],["Employee","Employee"]].forEach(([value,label]) => { const option=el("option","",label); option.value=value; role.appendChild(option); });
    roleField.appendChild(role);
    const create = el("button", "ct-inv-button ct-inv-button--primary", "Generate invitation link");
    create.type = "submit";
    inviteForm.append(emailField, roleField, create);
    createCard.appendChild(inviteForm);
    const generated = el("div", "ct-inv-generated"); generated.hidden = true; generated.setAttribute("aria-live","polite");
    createCard.appendChild(generated);
    const deliveryNote = el("p","ct-inv-muted","Email delivery is not configured in this deployment. Create the link here, then copy it or use your device's share options to send it yourself.");
    createCard.appendChild(deliveryNote);
    page.appendChild(createCard);

    const requestsCard = el("section", "ct-inv-card");
    const requestsHeader = el("div", "ct-inv-card-head");
    const requestsIntro = el("div");
    requestsIntro.append(el("h2", "", "Join requests"), el("p", "ct-inv-muted", "The following lists are real requests stored in this organization's database. Review applicant details before approving or rejecting."));
    requestsHeader.appendChild(requestsIntro);
    requestsCard.appendChild(requestsHeader);

    const reqTabs = el("div", "ct-inv-tabs"); reqTabs.setAttribute("role","tablist"); reqTabs.setAttribute("aria-label","Membership request status");
    const reqSearch = el("input", "ct-inv-input");
    reqSearch.type="search"; reqSearch.placeholder="Search by name, email, role, or phone"; reqSearch.setAttribute("aria-label","Search membership requests");
    const reqToolbar=el("div","ct-inv-toolbar"); reqToolbar.append(reqTabs,reqSearch); requestsCard.appendChild(reqToolbar);
    const requestList = el("div","ct-inv-list"); requestList.dataset.requestList="true";
    requestsCard.appendChild(requestList);
    page.appendChild(requestsCard);

    const invitesCard=el("section","ct-inv-card");
    const invHeader=el("div","ct-inv-card-head");
    const invIntro=el("div");
    invIntro.append(el("h2","","Invitation link management"),el("p","ct-inv-muted","Invitations are separate from join requests. If a link is renewed, the previous link stops working."));
    invHeader.appendChild(invIntro); invitesCard.appendChild(invHeader);
    const invTabs=el("div","ct-inv-tabs"); invTabs.setAttribute("role","tablist"); invTabs.setAttribute("aria-label","Invitation status");
    const invSearch=el("input","ct-inv-input"); invSearch.type="search"; invSearch.placeholder="Search invitations by email or role"; invSearch.setAttribute("aria-label","Search invitations");
    const invToolbar=el("div","ct-inv-toolbar"); invToolbar.append(invTabs,invSearch); invitesCard.appendChild(invToolbar);
    const invitationList=el("div","ct-inv-list"); invitationList.dataset.invitationList="true";
    invitesCard.appendChild(invitationList);
    page.appendChild(invitesCard);

    let requests=[], invitations=[], activeRequestStatus="pending", activeInvitationStatus="pending";
    const requestStatuses=["pending","approved","rejected"];
    const invitationStatuses=["pending","accepted","expired","cancelled"];
    function buildTabs(container, statuses, selected, counts, setStatus, type) {
      container.replaceChildren();
      statuses.forEach(status=>{
        const label=status.charAt(0).toUpperCase()+status.slice(1);
        const count=counts[status] || 0;
        const b=button(label+" "+count,"ct-inv-tab"+(selected===status?" is-active":""),()=>{setStatus(status);paintTabsAndLists();});
        b.setAttribute("role","tab"); b.setAttribute("aria-selected",selected===status?"true":"false");
        container.appendChild(b);
      });
    }
    function renderRequests() {
      const counts={pending:0,approved:0,rejected:0};
      requests.forEach(r=>{if(counts[r.status]!==undefined)counts[r.status]++;});
      buildTabs(reqTabs,requestStatuses,activeRequestStatus,counts,s=>{activeRequestStatus=s;},"request");
      requestList.replaceChildren();
      const needle=reqSearch.value.trim().toLowerCase();
      const rows=requests.filter(r=>r.status===activeRequestStatus).filter(r=>{
        const a=r.applicant||{};
        return [a.full_name,a.name,a.email,a.phone,r.requested_role,r.message,r.review_message].some(v=>String(v||"").toLowerCase().includes(needle));
      });
      if(!rows.length) {
        requestList.appendChild(el("div","ct-inv-empty",activeRequestStatus==="pending"?"No pending join requests. New requests submitted with an organization code or invitation link will appear here.":"No "+activeRequestStatus+" join requests are recorded for this organization."));
        return;
      }
      rows.forEach(r=>{
        const a=r.applicant||{};
        const card=el("article","ct-inv-request");
        const main=el("div","ct-inv-request-main");
        const identity=el("div","ct-inv-request-identity");
        identity.append(el("h3","",a.full_name||a.name||"Applicant name unavailable"),el("p","ct-inv-muted",a.email||"Email unavailable"));
        main.append(identity,el("span",statusClass(r.status),r.status));
        card.appendChild(main);
        const meta=el("div","ct-inv-meta");
        [["Requested role",r.requested_role||"Not recorded"],["Phone",a.phone||"Not provided"],["Requested",date(r.created_at)],["Account status",a.account_status||"Not available"]].forEach(([k,v])=>{
          const field=el("div","ct-inv-meta-item");field.append(el("span","",k),el("strong","",v));meta.appendChild(field);
        });
        card.appendChild(meta);
        const details=el("details","ct-inv-details");
        const summary=el("summary","","Review submitted information");
        const body=el("div","ct-inv-details-body");
        body.append(el("p","", "Applicant: "+(a.full_name||a.name||"—")),el("p","","Email: "+(a.email||"—")),el("p","","Phone: "+(a.phone||"Not provided")),el("p","","Role requested: "+(r.requested_role||"—")),el("p","","Request date: "+date(r.created_at)));
        if(r.message) body.append(el("p","","Applicant message: "+r.message));
        if(r.review_message) body.append(el("p","","Review note: "+r.review_message));
        if(r.reviewer) body.append(el("p","","Reviewed by: "+(r.reviewer.name||r.reviewer.email||"Admin")));
        if(r.reviewed_at) body.append(el("p","","Reviewed: "+date(r.reviewed_at)));
        details.append(summary,body);card.appendChild(details);
        if(r.status==="pending") {
          const actions=el("div","ct-inv-actions");
          actions.append(button("Approve request","ct-inv-button ct-inv-button--primary",async()=>{
            if(!confirm("Approve "+(a.full_name||a.email||"this applicant")+" as "+r.requested_role+"? Their account will become active."))return;
            await reviewRequest(page,r.id,"approve","");
          }),button("Reject request","ct-inv-button ct-inv-button--danger",async()=>{
            const prompted=prompt("Optional rejection reason (this is recorded in the audit trail and review history):","");
            if(prompted===null)return;
            await reviewRequest(page,r.id,"reject",prompted.trim());
          }));
          card.appendChild(actions);
        }
        requestList.appendChild(card);
      });
    }
    function renderInvitations() {
      const counts={pending:0,accepted:0,expired:0,cancelled:0};
      invitations.forEach(i=>{const s=i.effective_status||i.status;if(counts[s]!==undefined)counts[s]++;});
      buildTabs(invTabs,invitationStatuses,activeInvitationStatus,counts,s=>{activeInvitationStatus=s;},"invitation");
      invitationList.replaceChildren();
      const needle=invSearch.value.trim().toLowerCase();
      const rows=invitations.filter(i=>(i.effective_status||i.status)===activeInvitationStatus).filter(i=>[i.email,i.role,i.invited_by_name].some(v=>String(v||"").toLowerCase().includes(needle)));
      if(!rows.length) {
        invitationList.appendChild(el("div","ct-inv-empty",activeInvitationStatus==="pending"?"No pending invitation links. Create one above for a specific email address.":"No "+activeInvitationStatus+" invitations are recorded."));
        return;
      }
      rows.forEach(i=>{
        const s=i.effective_status||i.status;
        const card=el("article","ct-inv-request");
        const main=el("div","ct-inv-request-main");const identity=el("div","ct-inv-request-identity");
        identity.append(el("h3","",i.email),el("p","ct-inv-muted",i.role+" · Created "+date(i.created_at)));
        main.append(identity,el("span",statusClass(s),s));card.appendChild(main);
        const meta=el("div","ct-inv-meta");
        [["Expires",date(i.expires_at)],["Invited by",i.invited_by_name||"Admin"],["Link use",s==="accepted"?"Link used; join request may still be pending":s==="expired"?"Expired — renew to create a new link":s==="cancelled"?"Cancelled":"Awaiting recipient"]].forEach(([k,v])=>{const f=el("div","ct-inv-meta-item");f.append(el("span","",k),el("strong","",v));meta.appendChild(f);});
        card.appendChild(meta);
        if(s==="pending"||s==="expired"){
          const actions=el("div","ct-inv-actions");
          actions.append(button(s==="expired"?"Renew link":"Resend / rotate link","ct-inv-button ct-inv-button--secondary",async()=>{
            try{
              const out=await API.post("invitations/"+i.id+"/resend",{});
              showGenerated(generated,out.invite_url,out.message,i.email,i.role);
              showMessage(page,out.message,"success");
              await load(page,false);
            }catch(e){showMessage(page,e.message||"Could not renew invitation.","error");}
          }),button("Cancel invitation","ct-inv-button ct-inv-button--danger",async()=>{
            if(!confirm("Cancel the invitation for "+i.email+"? Its link will stop working."))return;
            try{const out=await API.post("invitations/"+i.id+"/cancel",{});showMessage(page,out.message,"success");await load(page,false);}
            catch(e){showMessage(page,e.message||"Could not cancel invitation.","error");}
          }));
          card.appendChild(actions);
        }
        invitationList.appendChild(card);
      });
    }
    function paintTabsAndLists(){renderRequests();renderInvitations();}
    reqSearch.addEventListener("input",renderRequests);
    invSearch.addEventListener("input",renderInvitations);
    function showGenerated(holder,url,message,recipientEmail,recipientRole) {
      holder.replaceChildren();
      holder.hidden=false;
      holder.append(el("strong","","Invitation link ready"),el("p","ct-inv-muted",message||"Copy or share this link with the invited person."));
      const input=el("input","ct-inv-input");input.type="url";input.readOnly=true;input.value=url||"";input.setAttribute("aria-label","Generated invitation link");
      const details = "You've been invited to request access to CleanTrack" +
        (recipientRole ? " as a " + recipientRole : "") +
        (recipientEmail ? " (invitation for " + recipientEmail + ")" : "") +
        ". An Admin must approve your request.";
      const actions=el("div","ct-inv-actions");
      actions.append(button("Copy link","ct-inv-button ct-inv-button--primary",async()=>{try{if(!input.value)throw new Error("Invitation URL is unavailable.");await copyText(input.value);showMessage(page,"Invitation link copied. Email was not sent.","success");}catch(e){showMessage(page,e.message||"Unable to copy the invitation link.","error");}}));
      actions.append(button("Share invite","ct-inv-button ct-inv-button--secondary",async()=>{
        if(!input.value) return showMessage(page,"Invitation URL is unavailable.","error");
        try {
          await openNativeShare({title:"CleanTrack invitation",text:details,url:input.value},
            {root:page,text:"Your browser doesn't offer the device share sheet. Choose WhatsApp, SMS / Messages, or Email below."});
        } catch(err) { showMessage(page,err.message||"Sharing isn't available.","error"); }
      }));
      quickShareLinks(actions, input.value, details, recipientEmail);
      holder.append(input,actions);
    }
    inviteForm.addEventListener("submit",async event=>{
      event.preventDefault();const submit=inviteForm.querySelector("[type=submit]");
      submit.disabled=true;submit.textContent="Creating link…";
      try{
        const out=await API.post("invitations",{email:email.value.trim(),role:role.value});
        showGenerated(generated,out.invite_url,out.message,email.value.trim(),role.value);
        email.value="";showMessage(page,out.message,"success");
        await load(page,false);
      }catch(err){showMessage(page,err.message||"Could not create invitation.","error");}
      finally{submit.disabled=false;submit.textContent="Generate invitation link";}
    });
    async function reviewRequest(root,id,decision,reviewMessage) {
      try {
        const out=await API.post("membership/requests/"+id+"/review",{decision,review_message:reviewMessage});
        showMessage(root,out.message||"Membership request updated.","success");
        await load(root,false);
      } catch(err) { showMessage(root,err.message||"Could not review membership request.","error"); }
    }
    async function load(root, firstLoad) {
      if(firstLoad) showMessage(root,"Loading organization access records…");
      try {
        const responses=await Promise.all([
          API.get("organizations/current"),
          API.get("membership/requests?status=all"),
          API.get("invitations")
        ]);
        const org=responses[0].organization||{};
        const code=org.code||org.organization_code||"";
        codeValue.textContent=code||"Organization code unavailable";
        codeValue.dataset.value=code;
        requests=Array.isArray(responses[1].membership_requests)?responses[1].membership_requests:[];
        invitations=Array.isArray(responses[2].invitations)?responses[2].invitations:[];
        paintTabsAndLists();
        if(firstLoad)showMessage(root,"Loaded current organization access records from CleanTrack.","success");
        else if(!requests.length&&!invitations.length)showMessage(root,"There are no join requests or invitation records yet.","info");
      }catch(err) {
        if(firstLoad) {
          requestList.replaceChildren(el("div","ct-inv-error",err.message||"Could not load organization access records."));
          invitationList.replaceChildren(el("div","ct-inv-error","Invitation records could not be loaded."));
        }
        showMessage(root,err.message||"Could not load access records. Check your connection and permissions.","error");
      }
    }
    root.appendChild(page);
    load(page,true);
  }
  window.CleanTrackInvitations=Object.freeze({render});
})();