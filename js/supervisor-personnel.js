(function(){
"use strict";
const API=window.CleanTrackApi;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
const date=v=>v?new Date(v).toLocaleDateString():"—";
const time=v=>v?new Date(v).toLocaleString():"";
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
async function render(root){
 root.innerHTML='<section class="mp-shell"><aside class="mp-rail"><header class="mp-rail-head"><div><span class="mp-kicker">YOUR TEAM</span><h1>Personnel</h1><p>People and conversations</p></div><button class="mp-invite" type="button">＋</button></header><label class="mp-search"><span>⌕</span><input type="search" placeholder="Search contacts" aria-label="Search contacts"></label><div class="mp-filter"><button class="active" data-filter="all">All</button><button data-filter="recent">Recent chats</button></div><div class="mp-contact-list" aria-live="polite"></div></aside><section class="mp-main"><div class="mp-empty"><div class="mp-empty-mark">M</div><h2>Your team, connected.</h2><p>Select a contact to view their details, or open their name to start a conversation.</p></div></section></section>';
 const rail=root.querySelector(".mp-rail"),list=root.querySelector(".mp-contact-list"),main=root.querySelector(".mp-main"),search=root.querySelector(".mp-search input");
 let members=[],selected=null,mode="empty",filter="all",profileTab="overview";
 const notice=(msg,bad=false)=>{let n=root.querySelector(".mp-toast");if(!n){n=el("div","mp-toast");root.append(n)}n.textContent=msg;n.classList.toggle("bad",bad);n.hidden=false;setTimeout(()=>n.hidden=true,3500)};
 const avatar=(m,large=false)=>{const a=el("span","mp-avatar"+(large?" large":""));if(m.avatar_url){const img=document.createElement("img");img.src=m.avatar_url;img.alt="";a.append(img)}else a.textContent=initials(m.name);return a};
 async function load(){list.innerHTML='<p class="mp-loading">Loading your team…</p>';try{const data=await API.get("supervisor/personnel");members=data.members||[];paintList();}catch(e){list.innerHTML='<p class="mp-error">'+esc(e.message)+'</p>';}}
 function paintList(){
  const q=search.value.trim().toLowerCase();let rows=members.filter(m=>[m.name,m.email,m.phone].join(" ").toLowerCase().includes(q));
  if(filter==="recent")rows=rows.filter(m=>m.last_message_at);
  list.replaceChildren();
  if(!rows.length){list.append(el("p","mp-muted",members.length?"No contacts match your search.":"No active Staff members are assigned to your team yet."));return;}
  rows.forEach(m=>{const row=el("div","mp-contact"+(String(selected?.id)===String(m.id)?" selected":""));
    const av=avatar(m);av.title="View profile";av.tabIndex=0;av.setAttribute("role","button");av.addEventListener("click",()=>openProfile(m));av.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openProfile(m)}});
    const copy=el("div","mp-contact-copy"),name=el("button","mp-contact-name",m.name||"Staff member");name.type="button";name.addEventListener("click",()=>openChat(m));
    const preview=el("p","mp-contact-preview",m.last_message||m.email||"No messages yet");const meta=el("span","mp-contact-time",m.last_message_at?new Date(m.last_message_at).toLocaleDateString():"");
    copy.append(name,preview);row.append(av,copy,meta);row.addEventListener("click",e=>{if(!e.target.closest("button"))openProfile(m)});list.append(row);
  });
 }
 function setActive(m,which){selected=m;mode=which;paintList();}
 function openProfile(m){setActive(m,"profile");profileTab="overview";drawProfile();}
 async function drawProfile(){
  const m=selected;main.innerHTML='<section class="mp-contact-info-panel"><header class="mp-info-topbar"><button class="mp-info-back" type="button" aria-label="Back">‹</button><strong>Contact info</strong><button class="mp-options" type="button" aria-label="More options">⋮</button></header><div class="mp-info-scroll"><div class="mp-contact-hero"><button class="mp-photo-trigger" type="button" aria-label="View profile photo">'+(m.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="">':esc(initials(m.name)))+'</button><h2>'+esc(m.name)+'</h2><p>Staff · '+esc(m.email||"")+'</p></div><div class="mp-contact-actions"><button data-action="message"><span>▣</span><small>Message</small></button><button data-action="skills"><span>✧</span><small>Skills</small></button><button data-action="workload"><span>◷</span><small>Workload</small></button><button data-action="performance"><span>↗</span><small>Performance</small></button></div><section class="mp-info-section"><h3>Contact details</h3><div class="mp-contact-detail"><span>Email</span><strong>'+esc(m.email||"Not provided")+'</strong></div><div class="mp-contact-detail"><span>Phone</span><strong>'+esc(m.phone||"Not provided")+'</strong></div><div class="mp-contact-detail"><span>Joined</span><strong>'+esc(date(m.joined_at))+'</strong></div><div class="mp-contact-detail"><span>Account status</span><strong>'+esc(m.account_status||"—")+'</strong></div></section><section class="mp-info-section mp-info-options"><h3>Personnel information</h3><button data-open="skills"><span>Skills & qualifications</span><b>›</b></button><button data-open="workload"><span>Workload & availability</span><b>›</b></button><button data-open="performance"><span>Performance records</span><b>›</b></button></section></div></section>';
  main.querySelector(".mp-info-back").onclick=()=>{selected=null;mode="empty";paintList();main.innerHTML='<div class="mp-empty"><div class="mp-empty-mark">M</div><h2>Your team, connected.</h2><p>Select a contact to view their details, or open their name to start a conversation.</p></div>'};
  main.querySelector(".mp-photo-trigger").onclick=()=>openPhoto(m);
  main.querySelector(".mp-options").onclick=()=>showProfileOptions();
  main.querySelector('[data-action="message"]').onclick=()=>openChat(m);
  ["skills","workload","performance"].forEach(key=>main.querySelector('[data-action="'+key+'"]').onclick=()=>openProfileDetail(key));
  main.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openProfileDetail(b.dataset.open));
  try{const data=await API.get("supervisor/personnel/"+m.id+"/profile");m.profile=data.profile||{};}catch(e){m.profile={error:e.message};}
 }
 function openPhoto(m){
  const overlay=el("div","mp-photo-viewer");const close=el("button","mp-photo-close","×");close.type="button";close.setAttribute("aria-label","Close photo");
  const img=m.avatar_url?document.createElement("img"):el("div","mp-photo-fallback",initials(m.name));
  if(m.avatar_url){img.src=m.avatar_url;img.alt=m.name+" profile photo";}
  overlay.append(close,img);main.append(overlay);
  const dismiss=()=>overlay.remove();close.onclick=dismiss;overlay.addEventListener("click",e=>{if(e.target===overlay)dismiss()});document.addEventListener("keydown,function",()=>{});
 }
 function openProfileDetail(key){
  profileTab=key;const m=selected;const p=m.profile||{};
  const labels={skills:"Skills & qualifications",workload:"Workload & availability",performance:"Performance records"};
  const panel=el("section","mp-profile-detail-panel");
  const top=el("header","mp-info-topbar");const back=el("button","mp-info-back","‹");back.type="button";const title=el("strong","",labels[key]);top.append(back,title);panel.append(top);
  const body=el("div","mp-info-scroll");panel.append(body);
  if(key==="skills"){
   [["Skills",p.skills],["Qualifications",p.qualifications],["Certifications",p.certifications]].forEach(([label,items])=>{const sec=el("section","mp-info-section");sec.append(el("h3","",label));if(!items||!items.length)sec.append(el("p","mp-muted","No "+label.toLowerCase()+" have been recorded."));else items.forEach(item=>sec.append(el("span","mp-chip",typeof item==="string"?item:item.name||item.title||"Recorded item")));body.append(sec)});
  }else if(key==="workload"){
   const sec=el("section","mp-info-section");sec.append(el("h3","","Current workload"));[["Active operations",m.workload??"—"],["Overdue operations",m.overdue_operations??0],["Availability",m.availability==="not_recorded"?"Not recorded":m.availability]].forEach(([label,value])=>{const row=el("div","mp-contact-detail");row.append(el("span","",label),el("strong","",value));sec.append(row)});body.append(sec);
  }else{
   const sec=el("section","mp-info-section");sec.append(el("h3","","Performance summary"));[["Completed operations",m.completed_operations??0],["Overdue operations",m.overdue_operations??0]].forEach(([label,value])=>{const row=el("div","mp-contact-detail");row.append(el("span","",label),el("strong","",value));sec.append(row)});sec.append(el("p","mp-muted","Based on recorded operations. No rating or score is fabricated."));body.append(sec);
  }
  main.append(panel);back.onclick=()=>{panel.remove();drawProfile()};
 }
 function showProfileOptions(){
  const old=main.querySelector(".mp-options-menu");if(old){old.remove();return}
  const menu=el("div","mp-options-menu");
  [["Message","chat"],["Contact details","overview"],["Skills & qualifications","skills"],["Workload & availability","workload"],["Performance","performance"]].forEach(([label,key])=>{const b=el("button","",label);b.onclick=()=>{menu.remove();if(key==="chat")openChat(selected);else if(key==="overview")drawProfile();else openProfileDetail(key)};menu.append(b)});
  main.querySelector(".mp-info-topbar").append(menu);
 }
 async function openChat(m){
  setActive(m,"chat");main.innerHTML='<section class="mp-chat"><header class="mp-chat-head"><button class="mp-mobile-back" type="button">‹ Contacts</button><button class="mp-chat-person" type="button"><span class="mp-chat-avatar">'+esc(initials(m.name))+'</span><span><strong>'+esc(m.name)+'</strong><small>Staff · '+esc(m.email||"")+'</small></span></button><button class="mp-chat-menu" type="button">⋮</button></header><div class="mp-chat-menu-pop" hidden><button data-clear>Clear chat</button><button data-delete>Delete chat</button><button data-profile>View profile</button></div><div class="mp-messages"><p class="mp-loading">Loading conversation…</p></div><form class="mp-composer"><textarea name="body" rows="1" maxlength="5000" placeholder="Message…" required></textarea><button type="submit" aria-label="Send message">➤</button></form></section>';
  main.querySelector(".mp-mobile-back").onclick=()=>openProfile(m);main.querySelector(".mp-chat-person").onclick=()=>openProfile(m);
  const pop=main.querySelector(".mp-chat-menu-pop");main.querySelector(".mp-chat-menu").onclick=()=>pop.hidden=!pop.hidden;
  main.querySelector("[data-profile]").onclick=()=>openProfile(m);
  main.querySelector("[data-clear]").onclick=async()=>{if(!confirm("Clear this chat from your view? The messages remain retained in the system record."))return;try{await API.post("supervisor/personnel/"+m.id+"/clear",{});notice("Chat cleared.");await loadMessages(m)}catch(e){notice(e.message,true)}pop.hidden=true};
  main.querySelector("[data-delete]").onclick=async()=>{if(!confirm("Remove this conversation from your chat list? The other participant's history is not affected."))return;try{await API.delete("supervisor/personnel/"+m.id+"/chat");notice("Chat removed from your list.");await load();openProfile(m)}catch(e){notice(e.message,true)}};
  const form=main.querySelector(".mp-composer");form.addEventListener("submit",async e=>{e.preventDefault();const input=form.elements.body;const body=input.value.trim();if(!body)return;const btn=form.querySelector("button");btn.disabled=true;try{await API.post("supervisor/personnel/"+m.id+"/messages",{body});input.value="";await loadMessages(m);await load()}catch(err){notice(err.message,true)}finally{btn.disabled=false;input.focus()}});
  await loadMessages(m);
 }
 async function loadMessages(m){
  const host=main.querySelector(".mp-messages");if(!host)return;try{const data=await API.get("supervisor/personnel/"+m.id+"/messages");host.replaceChildren();if(!(data.messages||[]).length){host.append(el("p","mp-chat-empty","This is the beginning of your conversation."));return;}data.messages.forEach(msg=>{const bubble=el("article","mp-bubble"+(msg.mine?" mine":""));bubble.append(el("p","",msg.body),el("time","",time(msg.created_at)));host.append(bubble)});host.scrollTop=host.scrollHeight;}catch(e){host.replaceChildren(el("p","mp-error",e.message));}
 }
 async function invite(){
  const email=prompt("Enter the staff member's email address:");if(!email)return;
  try{const result=await API.post("supervisor/personnel/invites",{email});const url=result.invite_url||"";if(url&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);notice("Invitation created. Link copied; Admin approval is required before the person can join.");}else{window.prompt("Share this invitation link. Admin approval is required:",url);}}catch(e){notice(e.message,true)}
 }
 root.querySelector(".mp-invite").onclick=invite;search.addEventListener("input",paintList);
 root.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{filter=b.dataset.filter;root.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));paintList()});
 await load();
}
window.MechnarPersonnel={render};
})();