(function(){
"use strict";
const API=window.CleanTrackApi,AUTH=window.CleanTrackAuth,PREF=window.CleanTrackPreferences;
const LANGS=[["en","English"],["es","Spanish"],["ar","Arabic"],["hi","Hindi"],["ur","Urdu"],["zh","Chinese"]];
const CURS="USD EUR GBP INR CNY JPY KRW AED SAR QAR KWD BHD OMR JOD SGD AUD CAD CHF NZD HKD TWD THB IDR MYR PHP VND BDT PKR LKR NPR ZAR NGN KES EGP TRY BRL MXN ARS CLP COP PEN UYU DOP PLN CZK HUF RON SEK NOK DKK ISK RUB ILS UAH MAD GHS UGX TZS ETB KZT MUR".split(" ");
const SECS=[["account","Account","♙"],["preferences","Preferences","⚙"],["privacy","Privacy and Security","◈"],["sessions","Sessions and Devices","⌁"],["notifications","Notifications","♧"],["appearance","Appearance","◐"],["data","Data and Reports","▤"],["integrations","Integrations","⌘"],["help","Help and Support","?"],["legal","Legal","§"],["about","About","ⓘ"],["actions","Account actions","↗"]];
function el(t,c,x){const n=document.createElement(t);if(c)n.className=c;if(x!==undefined&&x!==null)n.textContent=String(x);return n}
function btn(x,c,fn){const n=el("button",c||"ct-settings-button",x);n.type="button";n.addEventListener("click",fn);return n}
function fld(x,n,h){const w=el("label","ct-settings-field");w.append(el("span","",x),n);if(h)w.appendChild(el("small","ct-settings-muted",h));return w}
function inp(type,v,name){const n=el("input","ct-settings-input");n.type=type;n.name=name||"";n.value=v==null?"":String(v);if(type==="url")n.placeholder="https://…";return n}
function sel(opts,v,name){const n=el("select","ct-settings-input");n.name=name||"";opts.forEach(([v,l])=>{const o=el("option","",l);o.value=v;n.appendChild(o)});n.value=v;return n}
function chk(label,value,name){const w=el("label","ct-settings-check"),n=el("input");n.type="checkbox";n.checked=!!value;n.name=name;w.append(n,el("span","",label));return {wrap:w,input:n}}
function card(title,desc,ico){const c=el("section","ct-settings-card"),h=el("div","ct-settings-card-header"),txt=el("div");h.appendChild(el("span","ct-settings-icon",ico||"•"));txt.appendChild(el("h2","",title));if(desc)txt.appendChild(el("p","ct-settings-muted",desc));h.appendChild(txt);c.appendChild(h);return c}
function formcard(title,desc,ico,fields,run,label){const c=card(title,desc,ico),f=el("form","ct-settings-form"),g=el("div","ct-settings-grid"),a=el("div","ct-settings-actions"),s=el("p","ct-settings-status"),b=el("button","ct-settings-button ct-settings-button-primary",label||"Save changes");fields.forEach(q=>g.appendChild(q));b.type="submit";s.hidden=true;s.setAttribute("role","status");a.appendChild(b);f.append(g,a,s);c.appendChild(f);f.addEventListener("submit",async e=>{e.preventDefault();b.disabled=true;const old=b.textContent;b.textContent="Saving…";try{await run();s.textContent="Saved.";s.className="ct-settings-status is-success"}catch(err){s.textContent=err.message||"Unable to save.";s.className="ct-settings-status is-error"}finally{s.hidden=false;b.disabled=false;b.textContent=old;if(PREF)PREF.applyLanguage()}});return c}
function open(page,id){page.querySelectorAll("[data-settings-panel]").forEach(n=>n.hidden=n.dataset.settingsPanel!==id);page.querySelectorAll("[data-settings-nav]").forEach(n=>{const yes=n.dataset.settingsNav===id;n.classList.toggle("is-active",yes);n.setAttribute("aria-current",yes?"page":"false")});try{history.replaceState(null,"","#settings-"+id)}catch(_){}}
function localRead(k){try{return localStorage.getItem(k)||""}catch(_){return ""}}
async function render(container){
container.replaceChildren();let user=AUTH?.getCurrentUser?.();if(!user){container.appendChild(el("p","ct-settings-muted","Sign in to view settings."));return}
let detail={};try{detail=(await API.get("auth/me")).user||{}}catch(_){}user={...user,...detail};const role=String(user.role||"").toLowerCase(),pr=PREF.get(),page=el("section","ct-settings-page"),head=el("header","ct-settings-header");head.append(el("p","ct-settings-eyebrow","YOUR WORKSPACE"),el("h1","","Settings"),el("p","ct-settings-muted","Personal account settings. Organization-wide controls remain in the separate Admin-only section."));page.appendChild(head);
const layout=el("div","ct-settings-layout"),nav=el("nav","ct-settings-nav"),panels=el("div","ct-settings-panels"),p={};nav.setAttribute("aria-label","Settings sections");
SECS.forEach(([id,label,ico])=>{const b=btn("", "ct-settings-nav-item",()=>open(page,id));b.dataset.settingsNav=id;b.append(el("span","ct-settings-icon",ico),el("span","",label));nav.appendChild(b);p[id]=el("section","ct-settings-panel");p[id].dataset.settingsPanel=id;p[id].hidden=true;panels.appendChild(p[id])});layout.append(nav,panels);page.appendChild(layout);
// ACCOUNT
const a=p.account,avKey="cleantrack.avatar."+user.id,av=inp("url",user.avatar_url||"","avatar_url"),nm=inp("text",user.full_name||user.name,"full_name"),ph=inp("tel",user.phone,"phone"),em=inp("email",user.email,"email"),avatarFile=inp("file","","profile_picture");
avatarFile.accept="image/png,image/jpeg,image/webp,image/gif";avatarFile.style.display="none";avatarFile.tabIndex=-1;
nm.required=true;nm.minLength=2;nm.maxLength=120;ph.maxLength=30;em.readOnly=true;
const headerAvatar=document.getElementById("header-avatar");
function localAvatar(){try{return localStorage.getItem(avKey)||""}catch(_){return ""}}
function applyHeaderAvatar(src){if(headerAvatar){headerAvatar.textContent=src?"":(user.full_name||user.name||"U").trim().charAt(0).toUpperCase();headerAvatar.style.backgroundImage=src?"url('"+src+"')":"";headerAvatar.style.backgroundSize=src?"cover":"";headerAvatar.style.backgroundPosition="center";headerAvatar.style.color=src?"transparent":""}}
applyHeaderAvatar(localAvatar()||user.avatar_url||"");
const avatarPickerWrap=el("div","ct-settings-avatar-picker");
const avatarPickerButton=el("button","ct-settings-avatar-circle");
avatarPickerButton.type="button";avatarPickerButton.setAttribute("aria-label","Change profile picture");avatarPickerButton.title="Change profile picture";
const avatarPickerText=el("span","ct-settings-avatar-picker-text","Change profile picture");
function paintSettingsPicker(src){avatarPickerButton.textContent=src?"":"＋";avatarPickerButton.style.backgroundImage=src?"url('"+src+"')":"";avatarPickerButton.style.backgroundSize=src?"cover":"";avatarPickerButton.style.backgroundPosition="center";avatarPickerButton.style.color=src?"transparent":""}
paintSettingsPicker(localAvatar()||user.avatar_url||"");avatarPickerButton.addEventListener("click",()=>avatarFile.click());avatarPickerWrap.append(avatarPickerButton,avatarPickerText,avatarFile);

avatarFile.addEventListener("change",()=>{const file=avatarFile.files&&avatarFile.files[0];if(!file)return;if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type||"")){alert("Choose a PNG, JPG, WEBP, or GIF image.");avatarFile.value="";return}if(file.size>2*1024*1024){alert("Choose an image smaller than 2 MB.");avatarFile.value="";return}const reader=new FileReader();reader.onload=()=>{try{const data=String(reader.result||"");localStorage.setItem(avKey,data);applyHeaderAvatar(data);paintSettingsPicker(data);window.dispatchEvent(new CustomEvent("cleantrack:avatar-updated",{detail:{userId:user.id}}))}catch(_){alert("Unable to save this picture in the browser. Try a smaller image.")}};reader.onerror=()=>alert("Unable to read this image.");reader.readAsDataURL(file)});

a.appendChild(formcard("Personal profile","Update details for your own account. Email editing is not enabled yet.","♙",[avatarPickerWrap,fld("Full name",nm),fld("Email address",em,"Read-only until account email change is supported."),fld("Phone number",ph),fld("Profile avatar URL",av,"Optional public image URL, saved to your account.")],async()=>{const r=await API.patch("auth/me",{full_name:nm.value.trim(),phone:ph.value.trim(),avatar_url:av.value.trim()}),u=r.user||{},name=u.full_name||nm.value.trim();Object.assign(user,{name,full_name:name,phone:u.phone||ph.value.trim(),avatar_url:u.avatar_url||av.value.trim()});if(AUTH.getCurrentUser())Object.assign(AUTH.getCurrentUser(),{name,phone:user.phone});try{localStorage.setItem(avKey,av.value.trim())}catch(_){}const h=document.getElementById("header-user-name");if(h)h.textContent=name;const icon=document.getElementById("header-avatar");if(icon){icon.textContent=name[0]?.toUpperCase()||"U";icon.style.backgroundImage=av.value.trim()?"url('"+av.value.trim().replace(/['()\\]/g,"")+"')":"";icon.style.backgroundSize="cover";icon.style.color=av.value.trim()?"transparent":""}},"Save account details"));
const info=card("Account information","Current values returned by your account record.","ⓘ"),dl=el("dl","ct-settings-account-data");[["Account status",user.account_status||"Not available"],["Role",user.role||"Not available"],["Organization",user.organization_name||"Not available"],["Email verified",user.email_verified===true?"Yes":user.email_verified===false?"No":"Not available"],["Created",user.created_at||"Not available"],["Account ID",user.id??"Not available"]].forEach(([x,y])=>dl.append(el("dt","",x),el("dd","",y)));info.appendChild(dl);a.appendChild(info);
const cp=inp("password","","current_password"),np=inp("password","","new_password"),xp=inp("password","","confirm_password");cp.required=np.required=xp.required=true;np.minLength=8;cp.autocomplete="current-password";np.autocomplete=xp.autocomplete="new-password";
a.appendChild(formcard("Change password","A current password is required. Email-based forgot/reset password is not configured yet.","⌑",[fld("Current password",cp),fld("New password",np,"At least 8 characters."),fld("Confirm new password",xp)],async()=>{if(np.value!==xp.value)throw Error("New passwords do not match.");await API.patch("auth/me",{current_password:cp.value,new_password:np.value});cp.value=np.value=xp.value=""},"Save password"));
a.appendChild(btn("Forgot password?","ct-settings-button",()=>alert(PREF.translate("Email-based password recovery is not configured in this deployment. No reset email was sent."))));
if(role==="admin"){const org=card("Organization settings","Organization profile, member approvals, policies, audit trail and archive controls.","◇");org.appendChild(btn("Open Organization Settings","ct-settings-button ct-settings-button-primary",()=>window.CleanTrackNavigation?.setActivePage("org-settings")));a.appendChild(org)}
if(role==="supervisor"){const sc=card("Team scope","Assigned team/location/zone scope is read-only; ask an Admin to change it.","♧"),load=el("p","ct-settings-muted","Loading assigned scope…"),groups=el("div","ct-settings-scope-grid");sc.append(load,groups);a.appendChild(sc);API.get("organizations/team-scope").then(d=>{load.remove();[["Teams",d.teams],["Locations",d.locations],["Zones",d.zones]].forEach(([label,rows])=>{const g=el("div","ct-settings-scope-group");g.appendChild(el("h3","",label));const ns=Array.isArray(rows)?rows.map(x=>x.name):[];if(!ns.length)g.appendChild(el("p","ct-settings-muted","No assignments recorded."));else{const ul=el("ul","ct-settings-chip-list");ns.forEach(x=>ul.appendChild(el("li","",x)));g.appendChild(ul)}groups.appendChild(g)})}).catch(e=>load.textContent=e.message||"Unable to load assigned scope.")}
// PREFERENCES
const language=sel(LANGS,pr.language||"en","language"),date=sel([["YYYY-MM-DD","YYYY-MM-DD"],["DD/MM/YYYY","DD/MM/YYYY"],["MM/DD/YYYY","MM/DD/YYYY"],["DD Mon YYYY","DD Mon YYYY"]],pr.dateFormat,"dateFormat"),time=sel([["24","24-hour (14:30)"],["12","12-hour (2:30 PM)"]],pr.timeFormat,"timeFormat");
let zones=["UTC","Asia/Kolkata","Asia/Dubai","Asia/Singapore","Asia/Tokyo","Asia/Shanghai","Europe/London","Europe/Paris","America/New_York","America/Los_Angeles","Australia/Sydney"];try{if(Intl.supportedValuesOf)zones=Intl.supportedValuesOf("timeZone")}catch(_){}const tz=sel([...new Set([pr.timeZone,...zones])].map(x=>[x,x]),pr.timeZone,"timeZone");
let cs=CURS.map(c=>{let l=c;try{l=c+" — "+(new Intl.DisplayNames([pr.language||"en"],{type:"currency"}).of(c)||c)}catch(_){}return[c,l]});const currency=sel(cs,pr.currency,"currency");
p.preferences.appendChild(formcard("Regional preferences","Language, date/time, timezone and currency preferences are saved to your account and reused on sign-in. Supported interface labels translate app-wide; unlisted content may remain in its source language.","⚙",[fld("Language",language,"English, Spanish, Arabic, Hindi, Urdu and Chinese."),fld("Date format",date),fld("Time format",time),fld("Time zone",tz),fld("Currency",currency)],async()=>{PREF.update({language:language.value,dateFormat:date.value,timeFormat:time.value,timeZone:tz.value,currency:currency.value});try{await PREF.sync()}catch(e){throw Error("Preferences changed locally, but the account save failed: "+e.message)}},"Save preferences"));
// PRIVACY & SECURITY
const sec=card("Privacy and security","Server-enforced access is limited by your role and organization membership. Personal visibility preferences never override organization permissions.","◈");sec.append(el("div","ct-settings-info-row","Your organization membership and role continue to determine server-side access."));const priv=card("Profile visibility preference","Saved to your account as a preference; server-enforced role and organization permissions always take priority.","◇");const visibility=chk("Prefer profile visibility restricted to authorized organization members",pr.privacy?.restricted??true,"restricted");priv.appendChild(visibility.wrap);priv.appendChild(btn("Save privacy preference","ct-settings-button ct-settings-button-primary",async()=>{PREF.update({privacy:{restricted:visibility.input.checked}});try{await PREF.sync();alert("Privacy preference saved to your account.")}catch(e){alert("Saved locally, but the account save failed: "+e.message)}}));priv.appendChild(el("p","ct-settings-muted","This preference records your choice; it does not override access controls enforced by the server."));p.privacy.append(sec,priv); const sessionCard=card("Sessions and devices","Review the session this browser is using. The current backend does not expose a complete active-device inventory or remote session revocation.","⌁");sessionCard.append(el("div","ct-settings-info-row","Current session: this signed-in browser."),el("div","ct-settings-info-row","Other active devices: session inventory is not provided by the backend."),btn("Sign out of other devices","ct-settings-button",()=>alert(PREF.translate("Remote-session revocation is not configured. No sessions were changed."))));p.sessions.appendChild(sessionCard);
// NOTIFICATIONS
const nvals=pr.notifications||{},checks=[chk("In-app notifications",nvals.inApp,"inApp"),chk("Task assignment and status updates",nvals.taskUpdates,"taskUpdates"),chk("Announcements and alerts",nvals.announcements,"announcements"),chk("Security and account alerts",nvals.security,"security"),chk("Email notifications",nvals.email,"email")],nc=card("Notification preferences","Saved locally as personal preferences. Actual delivery controls need the notification service to be connected.","♧"),list=el("div","ct-settings-check-list");checks.forEach(x=>list.appendChild(x.wrap));nc.appendChild(list);nc.appendChild(btn("Save notification settings","ct-settings-button ct-settings-button-primary",async()=>{PREF.update({notifications:Object.fromEntries(checks.map(x=>[x.input.name,x.input.checked]))});try{await PREF.sync();alert("Notification preferences saved to your account. Actual delivery still depends on the notification service.")}catch(e){alert("Saved locally, but the account save failed: "+e.message)}}));p.notifications.appendChild(nc);
// APPEARANCE
const ac=card("Appearance","Applies throughout the app in this browser.","◐"),themes=el("div","ct-settings-theme-options");
[["default","Default","◐","CleanTrack’s current dark charcoal interface"],["light","Light","☀","Bright interface"],["black","Dark","☾","Pure-black backgrounds with white text"]].forEach(([v,label,ico,desc])=>{
 const b=btn("", "ct-settings-theme-option"+(pr.theme===v?" is-selected":""),()=>{
  PREF.update({theme:v});
  themes.querySelectorAll("button").forEach(x=>{x.classList.toggle("is-selected",x===b);x.setAttribute("aria-pressed",String(x===b))});
  PREF.sync().catch(e=>alert("Theme changed on this device, but the account save failed: "+e.message));
 });
 b.setAttribute("aria-pressed",String(pr.theme===v));
 b.append(el("span","",ico),el("strong","",label),el("small","ct-settings-muted",desc));
 themes.appendChild(b);
});
ac.appendChild(themes);
const appearanceLanguage=sel(LANGS,pr.language||"en","appearanceLanguage");
ac.appendChild(fld("Language",appearanceLanguage,"Changes the interface language across supported CleanTrack pages."));
appearanceLanguage.addEventListener("change",()=>{
 PREF.update({language:appearanceLanguage.value});
 PREF.sync().catch(e=>alert("Language changed on this device, but the account save failed: "+e.message));
});
ac.appendChild(el("p","ct-settings-muted","Each account can choose its own theme and language; this does not change other users' preferences."));
p.appearance.appendChild(ac);
// DATA AND REPORTS
const rv=pr.reports||{},fmt=sel([["csv","CSV"],["xlsx","Excel (.xlsx)"],["pdf","PDF"]],rv.exportFormat||"csv","exportFormat"),range=sel([["7","Last 7 days"],["30","Last 30 days"],["90","Last 90 days"],["365","Last 12 months"]],rv.dateRange||"30","dateRange"),dateFormat=sel([["iso","ISO (YYYY-MM-DD)"],["day-first","Day first (DD/MM/YYYY)"],["month-first","Month first (MM/DD/YYYY)"]],rv.dateFormat||"iso","dateFormat"),arch=chk("Include archived records by default where permitted",rv.includeArchived,"includeArchived");
p.data.appendChild(formcard("Data and report defaults","These choices set personal defaults; they do not generate or export reports by themselves.","▤",[fld("Default export format",fmt),fld("Report date range",range),fld("Export date format",dateFormat),arch.wrap],async()=>{PREF.update({reports:{exportFormat:fmt.value,dateRange:range.value,dateFormat:dateFormat.value,includeArchived:arch.input.checked}});try{await PREF.sync()}catch(e){throw Error("Report defaults changed locally, but the account save failed: "+e.message)}},"Save data preferences"));
p.data.appendChild(card("Formatting","Shared helpers are available for localized date, time and currency. Individual pages must use these helpers to reflect selections in all output.","◷"));
// INTEGRATIONS & PERSONAL SYNC
const integrations=card("Sync & Integrations","Choose how CleanTrack can reach you. These settings are personal to your account; provider connections and delivery are shown separately.", "⌘");
const statusLine=(text,kind)=>{const n=el("p","ct-settings-status"+(kind?" is-"+kind:""),text);n.setAttribute("role","status");return n};
const providerCard=card("Calendar Sync","Prepare personal calendar preferences for Google Calendar or Microsoft Outlook. OAuth and automatic task-to-event synchronization still require provider connection work.", "▦");
const calEnabled=chk("Enable calendar sync for my account",false,"calendarEnabled");
const calProvider=sel([["google","Google Calendar"],["outlook","Microsoft Outlook Calendar"]],"google","calendarProvider");
const calMode=sel([["confirm","Ask before adding each assignment"],["automatic","Automatically add eligible assignments"]],"confirm","calendarMode");
const calReminder=sel([["0","No reminder"],["5","5 minutes before"],["10","10 minutes before"],["15","15 minutes before"],["30","30 minutes before"],["60","1 hour before"]],"15","calendarReminder");
const calStatus=statusLine("Checking provider configuration…");
providerCard.append(calEnabled.wrap,fld("Preferred calendar",calProvider),fld("When assigned a task",calMode),fld("Calendar reminder",calReminder),calStatus);
const calSave=btn("Save calendar preferences","ct-settings-button ct-settings-button-primary",async()=>{
 calSave.disabled=true;try{const result=await API.patch("integrations/sync-settings",{calendar:{enabled:calEnabled.input.checked,provider:calProvider.value,mode:calMode.value,reminderMinutes:Number(calReminder.value)}});calStatus.textContent="Preferences saved to your CleanTrack account. Calendar authorization and live event sync are not yet implemented.";calStatus.className="ct-settings-status is-success";calStatus.hidden=false;}catch(e){calStatus.textContent=e.message||"Unable to save calendar preferences.";calStatus.className="ct-settings-status is-error";calStatus.hidden=false;}finally{calSave.disabled=false}
});
providerCard.appendChild(calSave);
const smsCard=card("SMS Sync","Send task notifications to the phone number saved in your CleanTrack Account settings. SMS delivery requires Twilio credentials on the backend.", "✉");
const smsEnabled=chk("Enable SMS notification preference",false,"smsEnabled");
const smsEvents=[
 chk("When a task is assigned to me",true,"assigned"),
 chk("When my task changes or is reassigned",true,"changed"),
 chk("When a task becomes overdue",true,"overdue"),
 chk("When a task is cancelled",false,"cancelled")
];
const smsEventList=el("div","ct-settings-check-list");smsEvents.forEach(x=>smsEventList.appendChild(x.wrap));
const smsStatus=statusLine("Checking SMS provider configuration…");
smsCard.append(smsEnabled.wrap,el("p","ct-settings-muted","Phone number is taken from Account settings. Test messages go only to your own registered number."),smsEventList,smsStatus);
const smsActions=el("div","ct-settings-actions");
const smsSave=btn("Save SMS preferences","ct-settings-button ct-settings-button-primary",async()=>{
 smsSave.disabled=true;try{await API.patch("integrations/sync-settings",{sms:{enabled:smsEnabled.input.checked,events:Object.fromEntries(smsEvents.map(x=>[x.input.name,x.input.checked]))}});smsStatus.textContent="SMS preferences saved to your CleanTrack account. Assignment-triggered SMS delivery is not yet enabled.";smsStatus.className="ct-settings-status is-success";smsStatus.hidden=false;}catch(e){smsStatus.textContent=e.message||"Unable to save SMS preferences.";smsStatus.className="ct-settings-status is-error";smsStatus.hidden=false;}finally{smsSave.disabled=false}
});
const smsTest=btn("Send test SMS to my saved number","ct-settings-button",async()=>{
 smsTest.disabled=true;smsStatus.textContent="Sending test message…";smsStatus.className="ct-settings-status";smsStatus.hidden=false;
 try{const result=await API.post("integrations/sms/test",{});smsStatus.textContent=result.message||"Test SMS accepted by the provider.";smsStatus.className="ct-settings-status is-success";}
 catch(e){smsStatus.textContent=e.message||"SMS test failed. Check provider configuration and your saved phone number.";smsStatus.className="ct-settings-status is-error";}
 finally{smsTest.disabled=false;smsStatus.hidden=false}
});
smsActions.append(smsSave,smsTest);smsCard.appendChild(smsActions);
const syncInfo=card("Provider readiness","Configuration status only confirms that server environment variables are present. It does not mean your account is connected or that assignment notifications are running.","ⓘ");
const providerList=el("div","ct-settings-integration-list");
[[ "Google Calendar","OAuth connection and task event sync are not implemented yet." ],["Microsoft Outlook Calendar","OAuth connection and task event sync are not implemented yet."],["SMS via Twilio","A test SMS can be sent when backend credentials and your saved phone number are valid. Automatic assignment SMS is not implemented yet."]].forEach(([name,desc])=>{const row=el("div","ct-settings-integration-row"),body=el("div");body.append(el("strong","",name),el("p","ct-settings-muted",desc));row.appendChild(body);providerList.appendChild(row)});
syncInfo.appendChild(providerList);
p.integrations.append(providerCard,smsCard,syncInfo);
(async()=>{
 try{
  const result=await API.get("integrations/sync-settings"),settings=result.settings||{},providers=result.providers||{};
  const cal=settings.calendar||{},sms=settings.sms||{};
  calEnabled.input.checked=!!cal.enabled;calProvider.value=cal.provider==="outlook"?"outlook":"google";calMode.value=cal.mode==="automatic"?"automatic":"confirm";calReminder.value=String([0,5,10,15,30,60].includes(Number(cal.reminderMinutes))?Number(cal.reminderMinutes):15);
  smsEnabled.input.checked=!!sms.enabled;
  smsEvents.forEach(x=>{x.input.checked=!!((sms.events||{})[x.input.name])});
  const gp=providers.googleCalendar||{},op=providers.outlookCalendar||{},tw=providers.sms||{};
  calStatus.textContent="Google OAuth credentials: "+(gp.configured?"present":"missing")+"; Outlook OAuth credentials: "+(op.configured?"present":"missing")+". Calendar account authorization and event synchronization are still pending.";
  smsStatus.textContent=tw.configured?"Twilio credentials are present. Test SMS is available; automatic assignment notifications are not yet wired up.":"Twilio is not configured on the backend. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER to enable test SMS.";
  calStatus.className="ct-settings-status";smsStatus.className="ct-settings-status";calStatus.hidden=smsStatus.hidden=false;
 }catch(e){
  calStatus.textContent="Cannot load sync settings from backend: "+(e.message||"connection failed");calStatus.className="ct-settings-status is-error";calStatus.hidden=false;
  smsStatus.textContent="Cannot load SMS status from backend: "+(e.message||"connection failed");smsStatus.className="ct-settings-status is-error";smsStatus.hidden=false;
 }
})();

// BUILDING-LEVEL PLACE DIRECTORY
// HELP
const help=card("Help and support","Available published help resources.","?");[["Help Center","center"],["User/Admin guide","guide"],["Contact support","contact"],["Report a problem","problem"],["Feedback","feedback"]].forEach(([label,id])=>help.appendChild(btn(label,"ct-settings-button",()=>{const target=document.querySelector('[data-help-action="'+id+'"]');if(target)target.click();else alert("No support destination is configured yet. No message was sent.")})));p.help.appendChild(help);
// LEGAL
const legal=card("Legal documents","Available published legal documents.","§"),ll=el("div","ct-settings-link-list");[["Terms and Conditions","legal/terms.html"],["Privacy Policy","legal/privacy.html"]].forEach(([label,url])=>{const link=el("a","ct-settings-link",label);link.href=url;link.target="_blank";link.rel="noopener";ll.appendChild(link)});legal.appendChild(ll);[["Cookie policy","Not published"],["Third-party licences and acknowledgements","Not published"],["Data-processing information","Not published"]].forEach(([x,y])=>{const r=el("div","ct-settings-integration-row");r.append(el("span","",x),el("span","ct-settings-tag",y));legal.appendChild(r)});p.legal.appendChild(legal);
// ABOUT
const about=card("About CleanTrack","Operations management for teams, locations, tasks, reviews and accountability.","ⓘ"),version=document.querySelector('meta[name="app-version"]')?.content||"Release metadata not configured";[["Product","CleanTrack"],["Version",version],["Release notes","Not configured"],["Credits","Not published"]].forEach(([x,y])=>about.appendChild(el("div","ct-settings-info-row",x+": "+y)));about.appendChild(btn("Check for updates","ct-settings-button",()=>alert("Automatic update checking is not configured. No update check was performed.")));p.about.appendChild(about);
// ACCOUNT ACTIONS
const actions=card("Account actions","Sign out works. Deactivation and deletion are unavailable until server-side retention and approval workflows are added.","↗");actions.appendChild(btn("Log out","ct-settings-button ct-settings-button-primary",async()=>{if(!confirm("Log out of CleanTrack on this device?"))return;try{await AUTH.logout()}finally{window.location.reload()}}));actions.appendChild(btn("Deactivate account","ct-settings-button",()=>alert("Account deactivation is not enabled. Your account has not changed.")));actions.appendChild(btn("Request account deletion","ct-settings-button ct-settings-button-danger",()=>alert("Account deletion requests are not enabled. Nothing was submitted.")));p.actions.appendChild(actions);
container.appendChild(page);const requested=location.hash.startsWith("#settings-")?location.hash.slice(10):"account";open(page,p[requested]?requested:"account");PREF.applyTheme();PREF.applyLanguage();
}
window.CleanTrackSettings=Object.freeze({render});
})();