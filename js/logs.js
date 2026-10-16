(function () {
  "use strict";
  const API = window.CleanTrackApi;
  const CFG = window.CleanTrackConfig;
  const AUTH = window.CleanTrackAuth;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm = value => String(value || "").trim().toLowerCase();
  const date = value => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
  };
  const elapsed = (start, end) => {
    if (!start || !end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (!Number.isFinite(ms) || ms < 0) return "—";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return mins + " min";
    const hours = Math.floor(mins / 60), remain = mins % 60;
    if (hours < 24) return hours + "h " + remain + "m";
    return Math.floor(hours / 24) + "d " + (hours % 24) + "h";
  };
  const statusKey = row => { const raw = norm(row.status); return raw === "completed" && row.reviewed_at ? "approved" : raw; };
  const statusLabel = row => ({submitted:"Awaiting review",completed:"Completed",approved:"Approved",rejected:"Rejected"}[statusKey(row)] || row.status || "Unknown");
  const isSubmitted = row => statusKey(row) === "submitted";
  const formatBytes = bytes => !bytes ? "" : bytes < 1024*1024 ? Math.ceil(bytes/1024)+" KB" : (bytes/1024/1024).toFixed(1)+" MB";
  const create = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  async function render(root) {
    const user = AUTH?.getCurrentUser?.();
    if (norm(user?.role) !== "admin") {
      root.appendChild(create("p","ct-logs-message","Logs are available to organization Admins only."));
      return;
    }
    root.replaceChildren();
    root.classList.add("ct-logs-page");
    const header = create("div","ct-logs-heading");
    const titleWrap = create("div","ct-logs-title-wrap");
    titleWrap.append(create("p","ct-logs-eyebrow","WORK RECORDS"),create("h2","ct-logs-title","Logs"));
    titleWrap.appendChild(create("p","ct-logs-subtitle","Review what happened on the floor. Operations define the work; logs record its execution and evidence."));
    header.appendChild(titleWrap);
    root.appendChild(header);

    const toolbar = create("div","ct-logs-toolbar");
    const searchWrap = create("label","ct-logs-search");
    const searchIcon = create("span","ct-logs-search-icon","⌕");
    const search = create("input");
    search.type = "search"; search.placeholder = "Search task, employee, creator…"; search.setAttribute("aria-label","Search logs");
    searchWrap.append(searchIcon,search);
    const filter = create("select","ct-logs-status-filter");
    filter.setAttribute("aria-label","Filter logs by status");
    [["all","All logs"],["submitted","Awaiting review"],["completed","Completed"],["approved","Approved"],["rejected","Rejected"]].forEach(([value,label])=>filter.add(new Option(label,value)));
    toolbar.append(searchWrap,filter);
    root.appendChild(toolbar);

    const resultLine = create("div","ct-logs-result-line");
    const list = create("div","ct-logs-list");
    root.append(resultLine,list);
    const loadError = create("div","ct-logs-message ct-logs-error");
    let records = [];
    let loading = create("div","ct-logs-loading","Loading organization logs…");
    list.appendChild(loading);
    try {
      const response = await API.get("operations");
      records = (response?.operations || []).filter(row => ["submitted","completed","approved","rejected"].includes(statusKey(row)));
      records.sort((a,b) => new Date(b.submitted_at || b.reviewed_at || b.updated_at || b.created_at || 0) - new Date(a.submitted_at || a.reviewed_at || a.updated_at || a.created_at || 0));
    } catch (error) {
      list.replaceChildren();
      loadError.textContent = error?.message || "Logs could not be loaded. Check your connection and try again.";
      root.appendChild(loadError);
      return;
    }

    function draw() {
      const q = norm(search.value);
      const st = filter.value;
      const shown = records.filter(row => {
        const searchable = [row.title,row.created_by_name,row.assigned_to_name,row.status,row.task_type,row.review_feedback].map(norm).join(" ");
        return (!q || searchable.includes(q)) && (st === "all" || statusKey(row) === st);
      });
      resultLine.replaceChildren();
      const count = create("span","ct-logs-count",shown.length+" "+(shown.length===1?"log":"logs"));
      resultLine.appendChild(count);
      resultLine.appendChild(create("span","ct-logs-hint","Select a submitted log to review its details and evidence."));
      list.replaceChildren();
      if (!shown.length) {
        const empty = create("div","ct-logs-empty");
        empty.appendChild(create("div","ct-logs-empty-icon","✓"));
        empty.appendChild(create("h3","",records.length ? "No logs match your search" : "No execution logs yet"));
        empty.appendChild(create("p","",records.length ? "Try another search or status." : "Submitted and reviewed work will appear here when employees complete operations."));
        list.appendChild(empty);
        return;
      }
      shown.forEach(row => {
        const card = create("article","ct-log-card");
        const main = create("div","ct-log-main");
        const nameLine = create("div","ct-log-name-line");
        nameLine.appendChild(create("h3","ct-log-name",row.title || "Untitled operation"));
        const key = statusKey(row);
        const badge = create("span","ct-log-status ct-log-status-"+(key==="submitted"?"pending":key==="rejected"?"rejected":"approved"),statusLabel(row));
        nameLine.appendChild(badge);
        main.appendChild(nameLine);
        const meta = create("div","ct-log-meta");
        [[ "Created by",row.created_by_name || "—" ],["Completed by",row.assigned_to_name || "—"],["Created",date(row.created_at)],["Submitted",date(row.submitted_at)],["Time taken",executionDuration(row)]].forEach(([label,value])=>{
          const item=create("div","ct-log-meta-item"); item.append(create("span","ct-log-meta-label",label),create("span","ct-log-meta-value",value)); meta.appendChild(item);
        });
        main.appendChild(meta);
        if (row.review_feedback && key !== "submitted") {
          const feedback=create("p","ct-log-feedback"); feedback.append(create("strong","",key==="rejected"?"Rejection reason: ":"Review note: "),document.createTextNode(row.review_feedback)); main.appendChild(feedback);
        }
        const actions = create("div","ct-log-actions");
        const detail = create("button","ct-log-secondary","View log");
        detail.type="button"; detail.addEventListener("click",()=>openReview(row,"view"));
        actions.appendChild(detail);
        if (isSubmitted(row)) {
          const approve=create("button","ct-log-approve","Approve"); approve.type="button"; approve.addEventListener("click",()=>openReview(row,"approve")); 
          const reject=create("button","ct-log-reject","Reject"); reject.type="button"; reject.addEventListener("click",()=>openReview(row,"reject"));
          actions.append(approve,reject);
        }
        card.append(main,actions);
        list.appendChild(card);
      });
    }
    function executionDuration(row) {
      if (Number.isFinite(Number(row.time_taken_minutes)) && row.time_taken_minutes !== null) {
        const mins = Math.max(0, Number(row.time_taken_minutes));
        if (mins < 60) return mins + " min";
        if (mins < 1440) return Math.floor(mins / 60) + "h " + (mins % 60) + "m";
        return Math.floor(mins / 1440) + "d " + Math.floor((mins % 1440) / 60) + "h";
      }
      const end = row.execution_submitted_at || row.submitted_at;
      const duration = elapsed(row.started_at, end);
      return duration !== "—" ? duration : "—";
    }
    search.addEventListener("input",draw); filter.addEventListener("change",draw);
    draw();

    async function openReview(row, intent) {
      const modal = create("div","ct-logs-overlay");
      modal.setAttribute("role","dialog"); modal.setAttribute("aria-modal","true"); modal.setAttribute("aria-label","Log review");
      const panel = create("section","ct-logs-review-panel");
      const top = create("div","ct-logs-review-top");
      const heading = create("div");
      heading.append(create("p","ct-logs-eyebrow","LOG DETAIL"),create("h2","ct-logs-review-title",row.title || "Operation log"));
      const close = create("button","ct-logs-close","×"); close.type="button"; close.setAttribute("aria-label","Close review"); close.addEventListener("click",()=>modal.remove());
      top.append(heading,close);
      panel.appendChild(top);
      const body = create("div","ct-logs-review-body");
      body.appendChild(create("p","ct-logs-loading","Loading log details and private evidence…"));
      panel.appendChild(body); modal.appendChild(panel); root.appendChild(modal);
      const escapeClose = event => {if(event.key==="Escape" && root.contains(modal)){modal.remove();document.removeEventListener("keydown",escapeClose);}};
      document.addEventListener("keydown",escapeClose);
      modal.addEventListener("click",event=>{if(event.target===modal)modal.remove();});
      let detail;
      try {
        const response = await API.get("operations/"+encodeURIComponent(row.id));
        detail = response.operation;
      } catch(error) {
        body.replaceChildren(create("p","ct-logs-error",error?.message || "Unable to load this log."));
        return;
      }
      const executions = detail.executions || [];
      const execution = [...executions].reverse().find(x=>x.submitted_at) || [...executions].reverse()[0] || {};
      body.replaceChildren();
      const facts=create("div","ct-logs-detail-grid");
      const factsList=[
        ["Status",statusLabel(detail)],["Created by",detail.created_by_name||"—"],["Created",date(detail.created_at)],
        ["Completed by",detail.assigned_to_name||execution.performed_by_name||"—"],["Completed / submitted",date(detail.submitted_at||execution.submitted_at)],
        ["Time taken",elapsed(execution.started_at,execution.submitted_at||detail.submitted_at)],
        ["Reviewed at",date(detail.reviewed_at)],["Operation type",detail.task_type||"General"]
      ];
      factsList.forEach(([label,value])=>{const item=create("div","ct-logs-detail-item");item.append(create("span","ct-log-meta-label",label),create("span","ct-logs-detail-value",value));facts.appendChild(item);});
      body.appendChild(facts);
      if (detail.description || detail.instructions || execution.completion_notes) {
        const notes=create("section","ct-logs-detail-section"); notes.appendChild(create("h3","","Work notes"));
        [detail.description,detail.instructions,execution.completion_notes].filter(Boolean).forEach(text=>notes.appendChild(create("p","",text)));
        body.appendChild(notes);
      }
      if (detail.review_feedback) {
        const feedback=create("section","ct-logs-detail-section");feedback.appendChild(create("h3","",statusKey(detail)==="rejected"?"Rejection reason":"Review message"));feedback.appendChild(create("p","",detail.review_feedback));body.appendChild(feedback);
      }
      const evidence=(detail.evidence||[]).filter(item=>item.evidence_type==="photo");
      const before=evidence.filter(item=>item.stage==="before"), after=evidence.filter(item=>item.stage==="after"), other=evidence.filter(item=>!["before","after"].includes(item.stage));
      const evidenceSection=create("section","ct-logs-detail-section");
      evidenceSection.appendChild(create("h3","","Execution photos"));
      const evidenceGrid=create("div","ct-logs-evidence-grid");
      const photoGroups=[["Before photos",before],["After photos",after],["Other photos",other]];
      photoGroups.forEach(([label,items])=>{
        if (!items.length) return;
        const group=create("div","ct-logs-photo-group");group.appendChild(create("h4","",label));
        items.forEach(item=>{
          const figure=create("figure","ct-logs-photo");
          const image=create("img");image.alt=label+" · "+(item.original_filename||"evidence photo");image.loading="lazy";
          const caption=create("figcaption","",item.original_filename||"Evidence photo");
          caption.title=item.original_filename||"Evidence photo";
          figure.append(image,caption);
          const timestamp=create("small","",date(item.created_at));figure.appendChild(timestamp);group.appendChild(figure);
          loadPrivateImage(image,detail.id,item).catch(()=>{image.replaceWith(create("div","ct-logs-photo-unavailable","Private photo unavailable"));});
        });
        evidenceGrid.appendChild(group);
      });
      if (!evidence.length) evidenceGrid.appendChild(create("p","ct-logs-muted","No before/after photos were attached to this log."));
      evidenceSection.appendChild(evidenceGrid);body.appendChild(evidenceSection);
      const docs=(detail.evidence||[]).filter(item=>item.evidence_type!=="photo");
      if(docs.length){const section=create("section","ct-logs-detail-section");section.appendChild(create("h3","","Other evidence"));docs.forEach(item=>{const line=create("div","ct-logs-document-row");line.append(create("span","",item.original_filename+" · "+formatBytes(item.file_size)),create("button","ct-log-secondary","Download"));line.lastChild.type="button";line.lastChild.addEventListener("click",()=>downloadEvidence(detail.id,item));section.appendChild(line);});body.appendChild(section);}
      const history=(detail.history||[]).filter(item=>["verified","rejected","submitted","completed"].includes(norm(item.action)));
      if(history.length){const section=create("section","ct-logs-detail-section");section.appendChild(create("h3","","Review record"));history.slice(-6).reverse().forEach(item=>{const line=create("p","ct-logs-history-row",(item.action||"").replaceAll("_"," ")+" · "+date(item.created_at)+(item.message?" · "+item.message:""));section.appendChild(line);});body.appendChild(section);}
      if(intent!=="view" && isSubmitted(detail)) {
        const review=create("section","ct-logs-review-form");
        review.appendChild(create("h3","",intent==="approve"?"Confirm approval":"Reject submitted work"));
        review.appendChild(create("p","ct-logs-muted",intent==="approve"?"Confirm that the submitted work meets the operation requirements.":"Explain what needs correction. A rejection reason is required before the decision can be saved."));
        const label=create("label","ct-logs-feedback-label",intent==="approve"?"Approval message (optional)":"Rejection reason (required)");
        const textarea=create("textarea");textarea.rows=3;textarea.maxLength=2000;textarea.placeholder=intent==="approve"?"Your work has been approved. Great work, thank you!":"Describe the issue and required correction…";label.appendChild(textarea);review.appendChild(label);
        const actions=create("div","ct-logs-confirm-actions");
        const cancel=create("button","ct-log-secondary","Cancel");cancel.type="button";cancel.addEventListener("click",()=>modal.remove());
        const confirm=create("button",intent==="approve"?"ct-log-approve":"ct-log-reject",intent==="approve"?"Confirm approval":"Confirm rejection");confirm.type="button";
        confirm.addEventListener("click",async()=>{
          const feedback=textarea.value.trim();
          if(intent==="reject"&&!feedback){textarea.setCustomValidity("A rejection reason is required.");textarea.reportValidity();return;}
          textarea.setCustomValidity("");confirm.disabled=true;cancel.disabled=true;confirm.textContent="Saving…";
          try{
            const reviewResult = await API.post("operations/"+encodeURIComponent(detail.id)+"/review",{decision:intent,feedback});
            modal.remove();
            await render(root);
            if (reviewResult?.email_delivery === "not_configured") {
              const notice = create("div","ct-logs-message ct-logs-email-notice");
              notice.textContent = "Review saved and the employee was notified in CleanTrack. Email delivery is not configured, so no email was sent.";
              root.insertBefore(notice, root.firstChild);
            }
          }catch(error){confirm.disabled=false;cancel.disabled=false;confirm.textContent=intent==="approve"?"Confirm approval":"Confirm rejection";let msg=review.querySelector(".ct-logs-error");if(!msg){msg=create("p","ct-logs-error");review.appendChild(msg);}msg.textContent=error?.message||"The review could not be saved.";}
        });
        actions.append(cancel,confirm);review.appendChild(actions);body.appendChild(review);
      } else if (isSubmitted(detail)) {
        const note=create("p","ct-logs-muted ct-logs-view-note","This submission is awaiting review. Use Approve or Reject from the log list to record a decision.");body.appendChild(note);
      }
    }

    async function loadPrivateImage(img, operationId, evidence) {
      const token=AUTH?.getAuthToken?.() || "";
      const url=CFG.apiBaseUrl.replace(/\/$/,"")+"/operations/"+encodeURIComponent(operationId)+"/evidence/"+encodeURIComponent(evidence.id)+"/download";
      const response=await fetch(url,{headers:token?{Authorization:"Bearer "+token}:{},credentials:"include",cache:"no-store"});
      if(!response.ok)throw new Error("Evidence unavailable");
      const blob=await response.blob();
      if(!blob.type.startsWith("image/"))throw new Error("Not an image");
      const objectUrl=URL.createObjectURL(blob);img.src=objectUrl;
      img.addEventListener("load",()=>URL.revokeObjectURL(objectUrl),{once:true});
      img.addEventListener("error",()=>URL.revokeObjectURL(objectUrl),{once:true});
    }
    async function downloadEvidence(operationId,evidence){
      const token=AUTH?.getAuthToken?.()||"";
      const url=CFG.apiBaseUrl.replace(/\/$/,"")+"/operations/"+encodeURIComponent(operationId)+"/evidence/"+encodeURIComponent(evidence.id)+"/download";
      try{const response=await fetch(url,{headers:token?{Authorization:"Bearer "+token}:{},credentials:"include",cache:"no-store"});if(!response.ok)throw new Error("Download unavailable");const blob=await response.blob();const objectUrl=URL.createObjectURL(blob);const link=create("a");link.href=objectUrl;link.download=evidence.original_filename||"evidence";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(objectUrl);}catch(error){window.alert(error?.message||"Evidence could not be downloaded.");}
    }
  }
  window.CleanTrackLogs = Object.freeze({render});
})();