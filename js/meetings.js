(function () {
  "use strict";
  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;
  let meetings = [];
  let teams = [];
  let activeMeeting = null;
  let sdkLoading = null;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const localInputValue = date => {
    const d = new Date(date);
    const pad = n => String(n).padStart(2,"0");
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
  };
  const fmt = value => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Date unavailable" : d.toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
  };
  const node = (tag, cls, text) => {
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(text!==undefined) el.textContent=text;
    return el;
  };
  async function loadSdk() {
    if(window.ZoomMtg) return window.ZoomMtg;
    if(sdkLoading) return sdkLoading;
    const version="3.11.4";
    const urls=[
      "https://source.zoom.us/"+version+"/lib/vendor/react.min.js",
      "https://source.zoom.us/"+version+"/lib/vendor/react-dom.min.js",
      "https://source.zoom.us/"+version+"/lib/vendor/redux.min.js",
      "https://source.zoom.us/"+version+"/lib/vendor/redux-thunk.min.js",
      "https://source.zoom.us/"+version+"/lib/vendor/react-redux.min.js",
      "https://source.zoom.us/"+version+"/lib/vendor/lodash.min.js",
      "https://source.zoom.us/zoom-meeting-"+version+".min.js"
    ];
    sdkLoading=(async()=>{
      for(const src of urls){
        await new Promise((resolve,reject)=>{
          const old=document.querySelector('script[data-zoom-sdk="'+src+'"]');
          if(old){if(old.dataset.loaded==="1")return resolve();old.addEventListener("load",resolve,{once:true});old.addEventListener("error",reject,{once:true});return;}
          const s=document.createElement("script");s.src=src;s.async=false;s.dataset.zoomSdk=src;
          s.onload=()=>{s.dataset.loaded="1";resolve();};s.onerror=()=>reject(new Error("Zoom Meeting SDK could not load. Check your connection or browser content blockers."));
          document.head.appendChild(s);
        });
      }
      if(!window.ZoomMtg) throw new Error("Zoom Meeting SDK did not initialize.");
      window.ZoomMtg.setZoomJSLib("https://source.zoom.us/"+version+"/lib","/av");
      window.ZoomMtg.preLoadWasm();
      window.ZoomMtg.prepareWebSDK();
      return window.ZoomMtg;
    })();
    try{return await sdkLoading;}catch(e){sdkLoading=null;throw e;}
  }
  function notice(root,message,error){
    let box=root.querySelector(".mn-meeting-notice");
    if(!box){box=node("div","mn-meeting-notice");root.prepend(box);}
    box.textContent=message;box.classList.toggle("is-error",!!error);
  }
  async function loadData(){
    const [meetingData, teamData]=await Promise.all([
      API.get("meetings"),
      String(AUTH.getCurrentUser()?.role||"").toLowerCase()==="supervisor"
        ? API.get("teams/supervisor/mine").catch(()=>({team:null}))
        : Promise.resolve({team:null})
    ]);
    meetings=Array.isArray(meetingData.meetings)?meetingData.meetings:[];
    const team=teamData.team||teamData;
    teams=team && team.id ? [team] : [];
  }
  function renderList(root){
    const list=node("div","mn-meeting-list");
    const now=Date.now();
    const sorted=[...meetings].sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
    if(!sorted.length){list.append(node("div","mn-meeting-empty","No meetings have been scheduled for your team yet."));return list;}
    sorted.forEach(m=>{
      const card=node("article","mn-meeting-card");
      const top=node("div","mn-meeting-card-top");
      const title=node("h3","",m.topic);
      const badge=node("span","mn-meeting-status "+(m.status==="cancelled"?"is-cancelled":m.status==="scheduled"?"is-scheduled":""));
      badge.textContent=m.status==="cancelled"?"Cancelled":(new Date(m.start_at).getTime()>now?"Scheduled":"Ready");
      top.append(title,badge);
      const meta=node("p","mn-meeting-meta",m.team_name+" · "+fmt(m.start_at)+" · "+m.duration_minutes+" min");
      const agenda=node("p","mn-meeting-agenda",m.agenda||"No agenda provided.");
      const actions=node("div","mn-meeting-actions");
      if(m.status==="scheduled"){
        const join=node("button","mn-meeting-btn mn-primary",m.is_host?"Start meeting":"Join meeting");
        join.type="button";join.addEventListener("click",()=>joinMeeting(root,m,join));actions.append(join);
        if(m.is_host && String(AUTH.getCurrentUser()?.role||"").toLowerCase()==="supervisor"){
          const cancel=node("button","mn-meeting-btn mn-secondary","Cancel");
          cancel.type="button";cancel.addEventListener("click",()=>cancelMeeting(root,m,cancel));actions.append(cancel);
        }
      }
      card.append(top,meta,agenda,actions);list.append(card);
    });
    return list;
  }
  async function cancelMeeting(root,m,button){
    if(!window.confirm("Cancel this meeting for everyone?"))return;
    button.disabled=true;
    try{await API.post("meetings/"+m.id+"/cancel",{});await refresh(root);notice(root,"Meeting cancelled.",false);}
    catch(e){notice(root,e.message||"Could not cancel meeting.",true);button.disabled=false;}
  }
  async function joinMeeting(root,m,button){
    button.disabled=true;button.textContent="Connecting…";
    try{
      const authData=await API.post("meetings/"+m.id+"/signature",{});
      const sdk=await loadSdk();
      const content=root.querySelector(".mn-meeting-content");
      content.replaceChildren();
      const panel=node("section","mn-live-meeting");
      const heading=node("div","mn-live-heading");
      heading.append(node("h2","",m.topic),node("p","","MECHNAR · "+m.team_name));
      const exit=node("button","mn-meeting-btn mn-secondary","Leave meeting");
      exit.type="button";
      const sdkRoot=node("div","mn-zoom-root");
      sdkRoot.id="mn-zoom-meeting-root";
      panel.append(heading,sdkRoot,exit);content.append(panel);
      exit.addEventListener("click",()=>{try{sdk.leaveMeeting({});}catch(_){}activeMeeting=null;render(root);});
      activeMeeting=m;
      sdk.init({
        leaveUrl:window.location.origin+window.location.pathname,
        isSupportAV:true,
        success:()=>{
          sdk.join({
            sdkKey:authData.client_id,
            signature:authData.signature,
            meetingNumber:String(authData.meeting_number),
            passWord:authData.password||"",
            userName:authData.user_name||"MECHNAR user",
            userEmail:authData.user_email||"",
            success:()=>{},
            error:error=>notice(root,(error&&error.message)||"Zoom could not join the meeting.",true)
          });
        },
        error:error=>notice(root,(error&&error.message)||"Zoom could not initialize.",true)
      });
    }catch(e){notice(root,e.message||"Unable to join this meeting.",true);button.disabled=false;button.textContent=m.is_host?"Start meeting":"Join meeting";}
  }
  async function refresh(root){
    await loadData();
    const area=root.querySelector(".mn-meeting-content");
    if(area) area.replaceChildren(renderList(root));
  }
  async function render(root){
    root.classList.add("mn-meetings-page");
    root.replaceChildren();
    const header=node("header","mn-meeting-header");
    header.append(node("div","mn-meeting-eyebrow","TEAM COLLABORATION"),node("h1","","Meetings"),node("p","","Schedule team discussions and join live meetings without leaving MECHNAR."));
    root.append(header);
    const content=node("section","mn-meeting-content");
    root.append(content);
    try{
      await loadData();
      if(String(AUTH.getCurrentUser()?.role||"").toLowerCase()==="supervisor") renderCreateForm(root,content);
      content.append(node("h2","mn-meeting-section-title","Team meetings"),renderList(root));
    }catch(e){notice(root,e.message||"Meetings could not be loaded.",true);}
  }
  function renderCreateForm(root,content){
    const form=node("form","mn-meeting-create");
    const teamSelect=node("select","");teamSelect.name="team_id";teamSelect.required=true;
    teams.forEach(t=>{const o=node("option","",t.name||("Team "+t.id));o.value=t.id;teamSelect.append(o);});
    const topic=node("input","");topic.name="topic";topic.maxLength=200;topic.required=true;topic.placeholder="e.g. Weekly operations review";
    const agenda=node("textarea","");agenda.name="agenda";agenda.maxLength=5000;agenda.rows=3;agenda.placeholder="Meeting agenda (optional)";
    const start=node("input","");start.type="datetime-local";start.name="start_at";start.required=true;start.value=localInputValue(Date.now()+5*60000);
    const duration=node("select","");duration.name="duration_minutes";
    [15,30,40,60,90,120,180].forEach(n=>{const o=node("option","",n+" minutes");o.value=n;if(n===40)o.selected=true;duration.append(o);});
    function field(label,control){const wrap=node("label","mn-meeting-field");wrap.append(node("span","",label),control);return wrap;}
    form.append(node("h2","","Schedule a meeting"),field("Meeting topic",topic),field("Assigned team",teamSelect),field("Date and time",start),field("Duration",duration),field("Agenda",agenda));
    const submit=node("button","mn-meeting-btn mn-primary","Schedule meeting");submit.type="submit";
    form.append(submit);
    form.addEventListener("submit",async e=>{
      e.preventDefault();submit.disabled=true;submit.textContent="Scheduling…";
      try{
        await API.post("meetings",{topic:topic.value.trim(),agenda:agenda.value.trim(),team_id:Number(teamSelect.value),start_at:new Date(start.value).toISOString(),duration_minutes:Number(duration.value)});
        await refresh(root);notice(root,"Meeting scheduled. Team members have been notified.",false);
      }catch(err){notice(root,err.message||"Could not schedule the meeting.",true);}
      finally{submit.disabled=false;submit.textContent="Schedule meeting";}
    });
    content.append(form);
  }
  window.MechnarMeetings={render};
})();