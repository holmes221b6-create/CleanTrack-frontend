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
  const m=selected;main.innerHTML='<div class="mp-profile"><header class="mp-profile-head"><button class="mp-mobile-back" type="button">‹ Contacts</button><button class="mp-profile-avatar" type="button" aria-label="Profile">'+(m.avatar_url?'<img src="'+esc(m.avatar_url)+'" alt="">':esc(initials(m.name)))+'</button><div class="mp-profile-title"><h2>'+esc(m.name)+'</h2><p>Staff · '+esc(m.email||"")+'</p></div><button class="mp-options" type="button" aria-label="Profile options">⋮</button></header><nav class="mp-tabs"><button data-tab="overview">Overview</button><button data-tab="skills">Skills & qualifications</button><button data-tab="workload">Workload</button><button data-tab="performance">Performance</button></nav><div class="mp-profile-body"><p class="mp-loading">Loading profile…</p></div><footer class="mp-profile-actions"><button class="mp-secondary" data-chat>Message</button><button class="mp-primary" data-invite-placeholder disabled>Staff member</button></footer></div>';
  main.querySelector(".mp-mobile-back").onclick=()=>{selected=null;mode="empty";paintList();main.innerHTML='<div class="mp-empty"><div class="mp-empty-mark">M</div><h2>Your team, connected.</h2><p>Select a contact to view their details, or open their name to start a conversation.</p></div>'};
  main.querySelector(".mp-profile-avatar").onclick=()=>showProfileOptions();
  main.querySelector(".mp-options").onclick=()=>showProfileOptions();
  main.querySelectorAll("[data-tab]").forEach(b=>{b.classList.toggle("active",b.dataset.tab===profileTab);b.onclick=()=>{profileTab=b.dataset.tab;drawProfileBody()}});
  main.querySelector("[data-chat]").onclick=()=>openChat(m);
  try{const data=await API.get("supervisor/personnel/"+m.id+"/profile");m.profile=data.profile||{};}catch(e){m.profile={error:e.message};}
  drawProfileBody();
 }
 function drawProfileBody(){
  const host=main.querySelector(".mp-profile-body");if(!host)return;host.replaceChildren();
  main.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===profileTab));
  const p=selected.profile||{};
  if(profileTab==="overview"){
   const rows=[["Email",p.email||selected.email],["Phone",p.phone||selected.phone||"Not provided"],["Joined",date(p.joined_at||selected.joined_at)],["Account status",p.account_status||selected.account_status],["Availability",p.availability==="not_recorded"?"Not recorded":p.availability]];
   host.append(el("h3","mp-section-title","Contact information"));const grid=el("div","mp-info-grid");rows.forEach(([k,v])=>{const item=el("div","mp-info");item.append(el("span","",k),el("strong","",v||"—"));grid.append(item)});host.append(grid);
  }else if(profileTab==="skills"){
   host.append(el("h3","mp-section-title","Skills & qualifications"));
   const groups=[["Skills",p.skills],["Qualifications",p.qualifications],["Certifications",p.certifications]];
   groups.forEach(([title,items])=>{const sec=el("section","mp-detail-group");sec.append(el("h4","",title));if(!items||!items.length)sec.append(el("p","mp-muted","No "+title.toLowerCase()+" have been recorded."));else items.forEach(x=>sec.append(el("span","mp-chip",typeof x==="string"?x:x.name||x.title||"Recorded item")));host.append(sec)});
  }else if(profileTab==="workload"){
   host.append(el("h3","mp-section-title","Current workload"));const grid=el("div","mp-info-grid");[["Active operations",selected.workload??"—"],["Availability",selected.availability==="not_recorded"?"Not recorded":selected.availability]].forEach(([k,v])=>{const n=el("div","mp-info");n.append(el("span","",k),el("strong","",v));grid.append(n)});host.append(grid);
  }else{
   host.append(el("h3","mp-section-title","Performance"));const grid=el("div","mp-info-grid");[["Completed operations",selected.completed_operations??0],["Overdue operations",selected.overdue_operations??0]].forEach(([k,v])=>{const n=el("div","mp-info");n.append(el("span","",k),el("strong","",v));grid.append(n)});host.append(grid,el("p","mp-muted","Based on available operation records. No rating or score is fabricated."));
  }
 }
 function showProfileOptions(){
  const old=main.querySelector(".mp-options-menu");if(old){old.remove();return}
  const menu=el("div","mp-options-menu");
  [["Contact details","overview"],["Skills & qualifications","skills"],["Workload & availability","workload"],["Performance","performance"],["Open chat","chat"]].forEach(([label,key])=>{const b=el("button","",label);b.onclick=()=>{menu.remove();if(key==="chat")openChat(selected);else{profileTab=key;drawProfileBody()}};menu.append(b)});
  main.querySelector(".mp-profile-head").append(menu);
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