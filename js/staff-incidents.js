(function () {
  "use strict";
  const API = window.CleanTrackApi;
  const el = (tag, cls, text) => { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=String(text); return n; };
  const date = value => { const d=new Date(value); return value&&!Number.isNaN(d.getTime())?d.toLocaleString():"Not recorded"; };
  const badge = value => el("span","sr-badge "+String(value||"reported"),String(value||"reported").replaceAll("_"," "));
  function render(container) {
    const root=el("section","sr-page"), header=el("header","sr-head"), intro=el("div");
    intro.append(el("span","sr-kicker","STAFF WORKSPACE"),el("h1","","Incidents & Issues"),el("p","","Report an operational issue to your Team Supervisor, attach evidence and follow its resolution."));
    const refresh=el("button","sr-refresh","Refresh");refresh.type="button";header.append(intro,refresh);
    const notice=el("div","sr-notice");notice.hidden=true;
    const body=el("div","sr-body");root.append(header,notice,body);container.replaceChildren(root);
    let teams=[],items=[],urgentAlerts=[];
    const say=(message,bad=false)=>{notice.hidden=!message;notice.textContent=message||"";notice.classList.toggle("is-error",bad);};
    const panel=(title,desc)=>{const p=el("section","sr-panel"),h=el("div","sr-panel-heading");h.append(el("div","",title),el("p","",desc));p.append(h);return p;};
    async function load(){
      try{
        const [o,l,alerts]=await Promise.all([API.get("staff/incident-reports/options"),API.get("staff/incident-reports"),API.get("announcements")]);
        teams=o.teams||[];items=l.items||[];urgentAlerts=(alerts.announcements||[]).filter(x=>x.announcement_type==="alert"&&x.status==="published");draw();
      }catch(e){body.replaceChildren(el("p","sr-error",e.message||"Could not load your incident reports."));}
    }
    function draw(){
      body.replaceChildren();
      const urgentPanel=panel("Urgent Alerts","Raise an immediate operational alert. Your assigned Team Supervisor and organisation Admin are notified; urgent alerts from other authorised roles appear here for acknowledgement.");
      const urgentForm=el("form","sr-form"),urgentTeam=el("select","sr-control");
      urgentTeam.required=true;urgentTeam.append(new Option("Choose assigned team",""));teams.forEach(t=>urgentTeam.append(new Option(t.name,String(t.id))));if(teams.length===1)urgentTeam.value=String(teams[0].id);
      const urgentTitle=el("input","sr-control");urgentTitle.maxLength=200;urgentTitle.required=true;urgentTitle.placeholder="Urgent alert title";
      const urgentSeverity=el("select","sr-control");urgentSeverity.append(new Option("High","high"),new Option("Critical","critical"));
      const urgentMessage=el("textarea","sr-control");urgentMessage.rows=3;urgentMessage.maxLength=12000;urgentMessage.required=true;urgentMessage.placeholder="What is happening, where, and what immediate action is needed?";
      const urgentSubmit=el("button","sr-primary","Send urgent alert");urgentSubmit.type="submit";
      function urgentField(label,node){const w=el("label","sr-field");w.append(el("span","",label),node);return w;}
      urgentForm.append(urgentField("Assigned team",urgentTeam),urgentField("Title",urgentTitle),urgentField("Priority",urgentSeverity),urgentField("Details",urgentMessage),urgentSubmit);
      urgentForm.addEventListener("submit",async e=>{e.preventDefault();urgentSubmit.disabled=true;try{await API.post("announcements/urgent/staff",{team_id:Number(urgentTeam.value),title:urgentTitle.value.trim(),message:urgentMessage.value.trim(),severity:urgentSeverity.value});say("Urgent alert sent to your Team Supervisor and organisation Admin.");urgentForm.reset();if(teams.length===1)urgentTeam.value=String(teams[0].id);await load();}catch(err){say(err.message||"Urgent alert could not be sent.",true);}finally{urgentSubmit.disabled=false;}});
      urgentPanel.append(urgentForm);
      const urgentList=el("div","sr-records");
      const visibleUrgent=urgentAlerts.filter(x=>x.alert_status!=="resolved");
      if(!visibleUrgent.length)urgentList.append(el("p","sr-empty","No open urgent alerts."));
      visibleUrgent.forEach(item=>{
        const card=el("article","sr-record"),top=el("div","sr-record-top");
        top.append(el("h3","",item.title),badge(item.severity));card.append(top,el("p","sr-record-copy",item.message),el("p","sr-meta",[item.created_by_name,item.team_name,date(item.published_at||item.created_at)].filter(Boolean).join(" · ")));
        const receipt=item.my_receipt||{};
        if(item.can_acknowledge&&receipt.state!=="acknowledged"){
          const ack=el("button","sr-secondary","Acknowledge alert");ack.type="button";ack.onclick=async()=>{ack.disabled=true;try{await API.post("announcements/"+item.id+"/acknowledge",{});say("Urgent alert acknowledged.");await load();}catch(err){say(err.message||"Could not acknowledge alert.",true);ack.disabled=false;}};card.append(ack);
        }else if(receipt.state==="acknowledged")card.append(el("p","sr-resolution","You acknowledged this alert."));
        urgentList.append(card);
      });
      urgentPanel.append(urgentList);body.append(urgentPanel);
      const formPanel=panel("Report an incident or issue","A photo, screenshot or document is mandatory so your Supervisor can verify the report. Up to five files, 10 MB each.");
      const form=el("form","sr-form");
      const team=el("select","sr-control");team.required=true;team.append(new Option("Choose your team",""));teams.forEach(t=>team.append(new Option(t.name,String(t.id))));if(teams.length===1)team.value=String(teams[0].id);
      const title=el("input","sr-control");title.maxLength=180;title.required=true;title.placeholder="Short, clear report title";
      const type=el("select","sr-control");[["issue","Issue"],["incident","Incident"]].forEach(x=>type.append(new Option(x[1],x[0])));
      const category=el("select","sr-control");[["equipment","Equipment"],["safety","Safety"],["staffing","Staffing"],["resource","Resource"],["facility","Facility"],["operational","Operational"],["other","Other"]].forEach(x=>category.append(new Option(x[1],x[0])));
      const severity=el("select","sr-control");[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]].forEach(x=>severity.append(new Option(x[1],x[0])));severity.value="medium";
      const description=el("textarea","sr-control");description.rows=4;description.maxLength=12000;description.required=true;description.placeholder="Describe what happened, where it happened and how it affects the operation.";
      const evidence=el("input","sr-control");evidence.type="file";evidence.multiple=true;evidence.required=true;evidence.accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain";
      const fileHint=el("small","sr-muted","Required: at least one JPG, PNG, WEBP, PDF or TXT file. Maximum five files, 10 MB each.");
      const submit=el("button","sr-primary","Submit report with evidence");submit.type="submit";
      function field(label,node){const wrap=el("label","sr-field");wrap.append(el("span","",label),node);return wrap;}
      form.append(field("Assigned team",team),field("Title",title),field("Report type",type),field("Category",category),field("Severity",severity),field("Details",description),field("Evidence (required)",evidence),fileHint,submit);
      form.addEventListener("submit",async e=>{
        e.preventDefault();const files=Array.from(evidence.files||[]);
        if(!files.length){say("Attach at least one evidence file before submitting.",true);return;}
        if(files.length>5||files.some(f=>f.size>10*1024*1024)){say("Choose no more than five files, each 10 MB or smaller.",true);return;}
        submit.disabled=true;submit.textContent="Submitting report…";
        const data=new FormData();data.append("team_id",team.value);data.append("title",title.value.trim());data.append("report_type",type.value);data.append("category",category.value);data.append("severity",severity.value);data.append("description",description.value.trim());files.forEach(f=>data.append("evidence",f));
        try{await API.request("staff/incident-reports",{method:"POST",body:data});say("Report submitted to your Team Supervisor with evidence.");form.reset();if(teams.length===1)team.value=String(teams[0].id);await load();}
        catch(err){say(err.message||"Report could not be submitted.",true);}
        finally{submit.disabled=false;submit.textContent="Submit report with evidence";}
      });
      formPanel.append(form);body.append(formPanel);
      const listPanel=panel("My reports","Track the status and activity of reports you submitted.");
      const search=el("input","sr-control");search.type="search";search.placeholder="Search your reports…";
      const filters=el("div","sr-list-controls"),status=el("select","sr-control");status.append(new Option("All statuses",""));["reported","acknowledged","in_progress","awaiting_staff_response","resolution_submitted","forwarded_to_admin","forwarded_acknowledged","resolved"].forEach(s=>status.append(new Option(s.replaceAll("_"," "),s)));
      filters.append(search,status);listPanel.append(filters);
      const list=el("div","sr-records");listPanel.append(list);body.append(listPanel);
      const paint=()=>{
        const q=search.value.trim().toLowerCase();
        const rows=items.filter(x=>(!status.value||x.status===status.value)&&[x.reference,x.title,x.description,x.status,x.category,x.severity].join(" ").toLowerCase().includes(q));
        list.replaceChildren();
        if(!rows.length){list.append(el("p","sr-empty","No reports match your search."));return;}
        rows.forEach(item=>{
          const card=el("article","sr-record"),top=el("div","sr-record-top");top.append(el("h3","",item.reference+" · "+item.title),badge(item.status));
          card.append(top,el("p","sr-record-copy",item.description),el("p","sr-meta",[item.report_type,item.category,item.severity,date(item.created_at)].join(" · ")));
          const flow=[["reported","Reported"],["acknowledged","Acknowledged"],["in_progress","In progress"],["awaiting_staff_response","Staff response"],["resolution_submitted","Verification"],["forwarded_to_admin","Admin review"],["forwarded_acknowledged","Admin acknowledged"],["resolved","Resolved"]];
          const stepIndex=flow.findIndex(x=>x[0]===item.status),track=el("div","sr-lifecycle");
          flow.forEach((step,i)=>{const node=el("div","sr-lifecycle-step"+(i<=stepIndex?" is-complete":"")+(i===stepIndex?" is-current":""));node.append(el("span","sr-lifecycle-dot",i<stepIndex?"✓":String(i+1)),el("span","sr-lifecycle-label",step[1]));track.append(node);});
          card.append(track);

          if(item.staff_resolution_note)card.append(el("p","sr-resolution","Your resolution: "+item.staff_resolution_note));
          const attachments=el("div","sr-evidence-list");(item.attachments||[]).forEach(file=>{const b=el("button","sr-secondary","View / download · "+file.filename);b.type="button";b.onclick=async()=>{try{const url=await API.download("incident-reports/attachments/"+file.id+"/download");const a=el("a");a.href=url;a.download=file.filename;a.target="_blank";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){say(e.message,true);}};attachments.append(b);});card.append(attachments);
          if(item.status==="awaiting_staff_response"){
            const responseForm=el("form","sr-inline-upload"),responseNote=el("textarea","sr-control");responseNote.rows=2;responseNote.required=true;responseNote.placeholder="Reply to your Supervisor's request for information.";const reply=el("button","sr-secondary","Send response");reply.type="submit";responseForm.append(responseNote,reply);
            responseForm.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("staff/incident-reports/"+item.id+"/respond",{response_note:responseNote.value.trim()});say("Response sent to your Supervisor.");await load();}catch(err){say(err.message,true);}});
            card.append(responseForm);
          }
          if(item.status==="awaiting_staff_response"||item.status==="in_progress"||item.status==="acknowledged"){
            const addForm=el("form","sr-inline-upload"),files=el("input","sr-control");files.type="file";files.multiple=true;files.accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,image/jpeg,image/png,image/webp,application/pdf,text/plain";const add=el("button","sr-secondary","Add evidence");add.type="submit";addForm.append(files,add);
            addForm.addEventListener("submit",async e=>{e.preventDefault();if(!files.files.length){say("Choose evidence files first.",true);return;}if(files.files.length>5||Array.from(files.files).some(f=>f.size>10*1024*1024)){say("Maximum five files, 10 MB each.",true);return;}const fd=new FormData();Array.from(files.files).forEach(f=>fd.append("evidence",f));try{await API.request("incident-reports/"+item.id+"/attachments",{method:"POST",body:fd});say("Evidence added.");await load();}catch(err){say(err.message,true);}});
            card.append(addForm);
          }
          if(!item.staff_resolved_at&&item.status!=="resolved"){
            const resolve=el("form","sr-inline-upload"),note=el("textarea","sr-control");note.rows=2;note.required=true;note.placeholder="Explain what was done to resolve the issue.";const submit=el("button","sr-secondary","Submit resolution for verification");submit.type="submit";resolve.append(note,submit);
            resolve.addEventListener("submit",async e=>{e.preventDefault();try{await API.post("staff/incident-reports/"+item.id+"/resolve",{resolution_note:note.value.trim()});say("Resolution submitted. Your Supervisor will verify it.");await load();}catch(err){say(err.message,true);}});
            card.append(resolve);
          }
          list.append(card);
        });
      };
      search.addEventListener("input",paint);status.addEventListener("change",paint);paint();
    }
    refresh.addEventListener("click",load);load();
  }
  window.MechnarStaffIncidents=Object.freeze({render});
})();