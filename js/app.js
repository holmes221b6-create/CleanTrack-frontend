
/* =========================================
   CleanTrack - Application Startup
   File: js/app.js
   ========================================= */

(function () {
  "use strict";

  const auth = window.CleanTrackAuth;
  const navigation = window.CleanTrackNavigation;

  if (!auth || !navigation) {
    throw new Error(
      "CleanTrack dependencies are missing. Load config.js, api.js, auth.js, and navigation.js first."
    );
  }

  const state = {
    started: false,
    loading: false,
    error: null,
    currentPage: null
  };

  function getElement(id) {
    return document.getElementById(id);
  }

  function showMessage(message, type) {
    const container =
      getElement("app-message") ||
      getElement("auth-message");

    if (!container) {
      console.info(message);
      return;
    }

    container.textContent = message;
    container.className = "auth-message " + (type || "");
    container.hidden = false;
  }

  function clearMessage() {
    const container =
      getElement("app-message") ||
      getElement("auth-message");

    if (container) {
      container.textContent = "";
      container.hidden = true;
    }
  }

  function setLoading(isLoading) {
    state.loading = Boolean(isLoading);
    document.documentElement.classList.toggle(
      "app-loading",
      state.loading
    );

    document.querySelectorAll("[data-app-loading]").forEach(
      function (element) {
        element.hidden = !state.loading;
      }
    );
  }

  function setVisible(element, visible) {
    if (element) {
      element.hidden = !visible;
    }
  }

  function applyOrganizationIdentity(organization) {
    if (!organization || typeof organization !== "object") return;
    const normalized = {
      id: organization.id ?? null,
      name: String(organization.name || "").trim(),
      description: String(organization.description || ""),
      avatar_url: String(organization.avatar_url || ""),
      contact_email: String(organization.contact_email || ""),
      status: String(organization.status || "active")
    };
    window.CleanTrackOrganization = Object.freeze(normalized);
    const user = auth.getCurrentUser && auth.getCurrentUser();
    if (user) {
      user.organization_name = normalized.name;
      user.organizationName = normalized.name;
      user.organization = { ...(user.organization && typeof user.organization === "object" ? user.organization : {}), ...normalized };
    }
    const label = getElement("workspace-organization");
    if (label && normalized.name) label.textContent = normalized.name;
    const brand = document.querySelector("#workspace-view .brand-mark");
    if (brand) {
      const mark = brand.querySelector("svg");
      if (normalized.avatar_url) {
        brand.style.backgroundImage = 'url("' + normalized.avatar_url.replaceAll('"', "%22") + '")';
        brand.style.backgroundSize = "cover";
        brand.style.backgroundPosition = "center";
        if (mark) mark.hidden = true;
        brand.setAttribute("aria-label", normalized.name + " logo");
      } else {
        brand.style.backgroundImage = "";
        brand.style.backgroundSize = "";
        brand.style.backgroundPosition = "";
        if (mark) mark.hidden = false;
        brand.removeAttribute("aria-label");
      }
    }
    document.dispatchEvent(new CustomEvent("cleantrack:organization-updated", { detail: normalized }));
  }
  async function loadOrganizationIdentity() {
    if (!window.CleanTrackApi || !auth.getCurrentUser || !auth.getCurrentUser()) return;
    try {
      const response = await window.CleanTrackApi.get("organizations/my-profile");
      if (response && response.organization) applyOrganizationIdentity(response.organization);
    } catch (error) {
      console.warn("Organization details could not be refreshed:", error.message || error);
    }
  }
  window.CleanTrackOrganizationContext = Object.freeze({ apply: applyOrganizationIdentity, refresh: loadOrganizationIdentity });

  function showAuthenticatedLayout(user) {
    setVisible(getElement("auth-view"), false);
    setVisible(getElement("workspace-view"), true);
    updateFooterGuide(user);

    const nameElement = getElement("header-user-name");
    const avatarElement = getElement("header-avatar");
    const roleElement = getElement("workspace-role");
    const organizationElement = getElement("workspace-organization");
    const menuElement = getElement("workspace-navigation");

    // Restore this user's browser-local avatar preference whenever a session is shown.
    if (avatarElement && user && user.id !== undefined && user.id !== null) {
      let avatarUrl = user.avatarUrl || user.avatar_url || "";
      try { if (!avatarUrl) avatarUrl = localStorage.getItem("cleantrack.avatar." + user.id) || ""; } catch (_) {}
      avatarElement.textContent = (user.name || user.email || "U").trim().charAt(0).toUpperCase() || "U";
      avatarElement.style.backgroundImage = avatarUrl ? "url('" + avatarUrl.replace(/['()\\]/g, "") + "')" : "";
      avatarElement.style.backgroundSize = avatarUrl ? "cover" : "";
      avatarElement.style.backgroundPosition = avatarUrl ? "center" : "";
      avatarElement.style.color = avatarUrl ? "transparent" : "";
    }

    if (nameElement) {
      nameElement.textContent = user.name || user.email || "User";
    }
    refreshNotificationBadge();

    if (roleElement) {
      roleElement.textContent = formatRole(user.role);
    }

    if (organizationElement) {
      const organization =
        user.organization_name ||
        user.organizationName ||
        user.organization?.name ||
        user.organization;

      organizationElement.textContent =
        typeof organization === "string" && organization.trim()
          ? organization.trim()
          : "Organization";
    }
    loadOrganizationIdentity();

    if (menuElement) {
      navigation.renderMenu(menuElement);
    }
    refreshAnnouncementBadge();

    const defaultPage = navigation.getDefaultPage(user.role);

    if (defaultPage) {
      navigation.setActivePage(defaultPage);
    }
  }
  
  

  function setupKey(user, suffix) { return "cleantrack.setup." + suffix + "." + String(user && (user.id || user.email) || "unknown").toLowerCase(); }
  function setupSteps(role) {
    const steps = {
      admin: [["Organisation","Confirm your organisation details.","settings"],["Locations & maps","Add real work locations and floor plans.","locations"],["Zones","Create or import zones linked to locations.","zones"],["Teams & employees","Invite staff and assign roles.","members"],["Operations & schedules","Create operations and schedule work.","operations"],["Reviews & reports","Review completed work and Analytics.","analytics"]],
      supervisor: [["Assigned locations","Review the locations and zones assigned to you.","locations"],["Your team","Check team members and responsibilities.","members"],["Operations","Review assigned work and schedules.","operations"],["Reviews & logs","Review submissions and track work.","reviews"]],
      employee: [["Your profile","Check your profile and notification preferences.","settings"],["Your schedule","Review assigned work and due times.","schedule"],["Complete work","Follow operation instructions and record progress.","operations"],["Submit evidence","Add required photos and submit completed work.","operations"],["Notifications","Check announcements and feedback.","home"]]
    };
    return steps[String(role || "").toLowerCase()] || steps.employee;
  }
  function showSetupGuide(user, startIndex) {
    if (!user) return;
    const steps = setupSteps(user.role);
    let index = Math.max(0, Math.min(Number(startIndex) || 0, steps.length - 1));
    const overlay = document.createElement("div");
    overlay.className = "ct-setup-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ct-setup-title");
    const style = document.createElement("style");
    style.textContent = ".ct-setup-overlay{position:fixed;inset:0;z-index:999990;background:#0009;display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit}.ct-setup-card{width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--surface,#202329);color:var(--text,#f3f4f6);border:1px solid var(--border,#3a3d44);border-radius:26px;padding:clamp(22px,4vw,38px);box-shadow:0 24px 90px #0005}.ct-setup-mark{width:58px;height:58px;margin:0 auto 18px;border-radius:18px;display:grid;place-items:center;background:#173c2c;color:#6ee7a4;font-size:27px}.ct-setup-card h2{text-align:center;margin:0 0 8px;font-size:26px}.ct-setup-intro{text-align:center;opacity:.8;line-height:1.5;margin:0 auto 18px}.ct-setup-progress{display:flex;justify-content:center;gap:7px;margin:18px}.ct-setup-dot{width:9px;height:9px;border-radius:50%;background:#59615f}.ct-setup-dot.active{background:#25b56a}.ct-setup-step{border:1px solid var(--border,#3a3d44);border-radius:16px;padding:18px;margin:20px 0}.ct-setup-step p{opacity:.86;line-height:1.6}.ct-setup-actions{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-top:22px}.ct-setup-actions button{border-radius:12px;padding:12px 18px;border:1px solid var(--border,#41454e);background:transparent;color:inherit;font:inherit;font-weight:650;cursor:pointer}.ct-setup-actions .primary{background:#16a34a;border-color:#16a34a;color:white;flex:1}.ct-setup-meta{text-align:center;opacity:.65;font-size:13px}.ct-setup-language{display:flex;justify-content:center}.ct-setup-language select{background:var(--surface,#202329);color:inherit;border:1px solid var(--border,#41454e);padding:8px 12px;border-radius:10px}.ct-tour-focus{position:relative!important;z-index:999989!important;outline:3px solid #43e58b!important;outline-offset:5px!important;box-shadow:0 0 0 8px #22c55e35,0 0 28px #22c55e50!important;scroll-margin:110px;animation:ct-tour-pulse 1.8s ease-in-out infinite}@keyframes ct-tour-pulse{0%,100%{outline-offset:4px}50%{outline-offset:8px}}.ct-tour-coach{position:fixed;z-index:999999;right:22px;bottom:22px;display:flex;align-items:flex-start;gap:12px;width:min(490px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:var(--surface,#202329);color:var(--text,#f3f4f6);border:1px solid #27c96b;border-radius:22px;padding:16px;box-shadow:0 22px 75px #000a;animation:ct-tour-arrive .28s ease-out}.ct-tour-avatar{flex:0 0 48px;width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(145deg,#1c9b61,#124a35);color:#fff;font-size:25px;font-weight:850;box-shadow:inset 0 0 0 2px #ffffff28}.ct-tour-speech{min-width:0;flex:1}.ct-tour-kicker{font-size:10px!important;letter-spacing:.15em;font-weight:800;opacity:.72;margin:0 0 5px!important}.ct-tour-coach h3{margin:0 0 8px;font-size:19px}.ct-tour-coach p{line-height:1.5;margin:7px 0}.ct-tour-status{font-size:12px;opacity:.68}.ct-tour-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.ct-tour-coach button{border-radius:10px;padding:10px 12px;border:1px solid var(--border,#41454e);background:transparent;color:inherit;font:inherit;cursor:pointer}.ct-tour-coach .primary{background:#16a34a;color:white;border-color:#16a34a;font-weight:750}@keyframes ct-tour-arrive{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@media(max-width:600px){.ct-tour-coach{right:10px;bottom:10px;width:calc(100vw - 20px);padding:13px}.ct-tour-avatar{width:40px;height:40px;flex-basis:40px;border-radius:13px}}";
    const card = document.createElement("section");
    card.className = "ct-setup-card";
    const mark = document.createElement("div"); mark.className = "ct-setup-mark"; mark.textContent = "✧";
    const title = document.createElement("h2"); title.id = "ct-setup-title"; title.textContent = "Learn CleanTrack by doing";
    const intro = document.createElement("p"); intro.className = "ct-setup-intro"; intro.textContent = "We’ll show you the real pages and controls for your role, explain why they matter, and let you explore. Skip anytime.";
    const languageWrap = document.createElement("div"); languageWrap.className = "ct-setup-language";
    const language = document.createElement("select"); language.setAttribute("aria-label","Guide language");
    [["en","English"],["hi","Hindi"],["ur","Urdu"],["es","Español"],["pt","Português"]].forEach(function(pair){const o=document.createElement("option");o.value=pair[0];o.textContent=pair[1];language.appendChild(o)});
    languageWrap.appendChild(language);
    const progress = document.createElement("div"); progress.className = "ct-setup-progress";
    const box = document.createElement("div"); box.className = "ct-setup-step";
    const meta = document.createElement("p"); meta.className = "ct-setup-meta";
    const actions = document.createElement("div"); actions.className = "ct-setup-actions";
    card.append(mark,title,intro,languageWrap,progress,box,meta,actions); document.head.appendChild(style); overlay.appendChild(card); document.body.appendChild(overlay);
    function clearFocus(){document.querySelectorAll(".ct-tour-focus").forEach(function(el){el.classList.remove("ct-tour-focus")});}
    function finish(){try{localStorage.setItem(setupKey(user,"completed"),"1");localStorage.removeItem(setupKey(user,"pending"))}catch(_){}clearFocus();const coach=document.querySelector(".ct-tour-coach");if(coach)coach.remove();overlay.remove();if(style.isConnected)style.remove();}
    function showCoach(step){
      overlay.remove();
      const page = step[2];
      const menu = document.getElementById("workspace-navigation");
      const pageItem = menu && Array.from(menu.querySelectorAll("[data-page]")).find(function(el){return el.getAttribute("data-page")===page;});
      const heading = document.getElementById("page-title");
      const pageTitle = (heading && heading.textContent || step[0] || "").trim();
      const candidates = {
        settings: /organisation settings|organization settings|edit organisation|edit organization|profile settings/i,
        locations: /import location|add location|create location|upload floor plan|import map|add map/i,
        zones: /create zone|add zone|import zones|new zone/i,
        members: /invite member|invite employee|add member|add employee|team member/i,
        operations: /create operation|new operation|create task|new task|start work/i,
        analytics: /reports|analytics|generate report/i,
        reviews: /review|approve|logs|activity history/i,
        schedule: /schedule|my tasks|assigned work/i,
        home: /announcement|notification|my desk|dashboard/i
      };
      const pattern = candidates[page];
      const controls = Array.from(document.querySelectorAll("button,a,[role='button'],[data-action]")).filter(function(el){
        return !el.closest(".ct-setup-overlay,.ct-tour-coach") && el.offsetParent !== null && !el.disabled;
      });
      let target = pattern && controls.find(function(el){return pattern.test((el.innerText || el.textContent || el.getAttribute("aria-label") || "").trim());});
      if (!target && pageItem && pageItem.offsetParent !== null) target = pageItem;
      if (!target && heading) target = heading;
      clearFocus();
      if(target){target.classList.add("ct-tour-focus");try{target.scrollIntoView({behavior:"smooth",block:"center"});}catch(_){}}
      const coach = document.createElement("aside");
      coach.className = "ct-tour-coach";
      coach.setAttribute("role","dialog");
      coach.setAttribute("aria-live","polite");
      const avatar = document.createElement("div"); avatar.className = "ct-tour-avatar"; avatar.setAttribute("aria-hidden","true"); avatar.textContent = "C";
      const speech = document.createElement("div"); speech.className = "ct-tour-speech";
      const kicker = document.createElement("p"); kicker.className = "ct-tour-kicker"; kicker.textContent = "YOUR CLEANTRACK GUIDE";
      const h = document.createElement("h3"); h.textContent = "Let's explore: " + step[0];
      const p = document.createElement("p");
      p.textContent = target && target !== pageItem && target !== heading
        ? "You're on " + (pageTitle || step[0]) + ". " + step[1] + " I've highlighted " + ((target.innerText || target.textContent || target.getAttribute("aria-label") || "the relevant control").trim().replace(/\\s+/g," ").slice(0,90)) + ". Click it to try the real feature. Avoid confirming or saving anything you don't intend to change."
        : "You're learning the real " + (pageTitle || step[0]) + " page. " + step[1] + " Look around the highlighted area; if this control isn't available in your layout, you can continue without changing anything.";
      const status = document.createElement("p"); status.className = "ct-tour-status"; status.textContent = "Lesson " + (index+1) + " of " + steps.length + " · You can skip at any time";
      const buttons = document.createElement("div"); buttons.className = "ct-tour-actions";
      const back = document.createElement("button"); back.textContent = "Guide menu"; back.addEventListener("click",function(){coach.remove();clearFocus();showSetupGuide(user,index);});
      const skip = document.createElement("button"); skip.textContent = "Skip"; skip.addEventListener("click",function(){coach.remove();finish();});
      const next = document.createElement("button"); next.className = "primary"; next.textContent = index===steps.length-1 ? "Finish journey" : "Next lesson";
      next.addEventListener("click",function(){coach.remove();clearFocus();if(index<steps.length-1){index++;showSetupGuide(user,index);}else finish();});
      buttons.append(back,skip,next);
      speech.append(kicker,h,p,status,buttons);
      coach.append(avatar,speech);
      document.body.appendChild(coach);
      if(target && target !== pageItem && target !== heading){
        target.addEventListener("click",function onGuideTargetClick(){
          target.removeEventListener("click",onGuideTargetClick);
          if(!coach.isConnected) return;
          p.textContent = "Nice — you tried the real control. Take a moment to look at what opened. When you're ready, choose Next lesson and I'll guide you to the next part. Don't save anything unless you mean to.";
          status.textContent = "Feature explored · Lesson " + (index+1) + " of " + steps.length;
          target.classList.remove("ct-tour-focus");
        },{once:true});
      }
    }
    function draw(){
      progress.replaceChildren();
      steps.forEach(function(_,i){const dot=document.createElement("span");dot.className="ct-setup-dot"+(i<=index?" active":"");progress.appendChild(dot)});
      const step=steps[index];box.replaceChildren();
      const h=document.createElement("h3");h.textContent=step[0];
      const p=document.createElement("p");p.textContent=step[1];
      const detail=document.createElement("p");detail.textContent="Why this matters: CleanTrack connects people, places and actual work. Understanding this area helps you avoid missed assignments, disconnected zones or incomplete work records.";
      const hint=document.createElement("p");hint.textContent="Choose “Show me this page” to open the real page and highlight its navigation item. Then explore the page and return for the next lesson.";
      box.append(h,p,detail,hint);
      meta.textContent="Lesson "+(index+1)+" of "+steps.length+" · Role: "+String(user.role||"employee")+" · You can skip at any time";
      actions.replaceChildren();
      const skip=document.createElement("button");skip.textContent="Skip tutorial";skip.addEventListener("click",finish);
      const back=document.createElement("button");back.textContent="Back";back.disabled=index===0;back.addEventListener("click",function(){if(index>0){index--;draw()}});
      const show=document.createElement("button");show.textContent="Show me this page";show.addEventListener("click",function(){const target=step[2];if(!target){showCoach(step);return;}const moved=navigation.setActivePage(target);if(!moved){p.textContent="This page isn't available to your current role. Continue to the next lesson or skip the tutorial.";return;}window.setTimeout(function(){showCoach(step)},300)});
      const next=document.createElement("button");next.className="primary";next.textContent=index===steps.length-1?"Finish tutorial":"Next lesson";next.addEventListener("click",function(){if(index<steps.length-1){index++;draw()}else finish()});
      actions.append(skip,back,show,next);
    }
    draw();
  }
  function maybeShowFirstSetup(user){try{if(user&&localStorage.getItem(setupKey(user,"pending"))==="1"&&localStorage.getItem(setupKey(user,"completed"))!=="1")window.setTimeout(function(){showSetupGuide(user)},80)}catch(_){}}
  window.CleanTrackSetupGuide = Object.freeze({ open: function(){ const user = auth.getCurrentUser(); if (user) showSetupGuide(user); } });
  function showUnauthenticatedLayout() {
    setVisible(getElement("workspace-view"), false);
    setVisible(getElement("auth-view"), true);
    const params = new URLSearchParams(window.location.search);
    const joiningFromLink = params.has("invite") || params.has("join");
    setVisible(getElement("login-view"), !joiningFromLink);
    setVisible(getElement("register-view"), joiningFromLink);
    setVisible(getElement("forgot-password-view"), false);
    updateFooterGuide(null);
  }


  function formatRole(role) {
    const labels = {
      admin: "Administrator",
      supervisor: "Supervisor",
      employee: "Employee"
    };

    return labels[String(role || "").toLowerCase()] || "User";
  }

  function updateFooterGuide(user) {
    const guide = getElement("footer-role-guide");
    if (!guide) return;

    const role = String(user?.role || "").toLowerCase();
    const labels = {
      admin: "Admin Guide",
      supervisor: "Supervisor Guide",
      employee: "Employee Guide"
    };
    guide.textContent = labels[role] || "Getting Started Guide";
    guide.dataset.guideRole = role || "guest";
  }

  function openFooterHelp(action) {
    const dialog = getElement("app-modal");
    const titleElement = getElement("modal-title");
    const content = getElement("modal-content");
    if (!dialog || !titleElement || !content) return;

    const user = auth.getCurrentUser();
    const role = String(user?.role || "").toLowerCase();
    const roleTitle = {
      admin: "Admin Guide",
      supervisor: "Supervisor Guide",
      employee: "Employee Guide"
    }[role] || "Getting Started Guide";

    content.replaceChildren();

    if (action === "center") {
      titleElement.textContent = "Help Center";
      content.innerHTML = `
        <div class="ct-help-dialog">
          <p class="ct-help-lead">Find your way around CleanTrack and get help with everyday work.</p>
          <section class="ct-help-topic">
            <h3>Finding your workspace</h3>
            <p>Use the left navigation to open the sections available to your account. On smaller screens, use the three-line menu button to open navigation.</p>
          </section>
          <section class="ct-help-topic">
            <h3>Roles and access</h3>
            <p>Your role determines which tools and actions are available. If a section is missing or you need access, contact your workspace administrator.</p>
          </section>
          <section class="ct-help-topic">
            <h3>Tasks and records</h3>
            <p>Open the task or operations area available to your role to review work. Follow the instructions shown for each task and record evidence when requested.</p>
          </section>
          <div class="ct-help-dialog-actions">
            <button type="button" class="ct-help-action-button" data-help-open="guide">Open ${roleTitle}</button>
            <button type="button" class="ct-help-secondary-button" data-help-open="contact">Contact Support</button>
          </div>
        </div>`;
    } else if (action === "guide") {
      titleElement.textContent = roleTitle;
      const guideContent = {
        admin: `
          <p class="ct-help-lead">Manage your organization and keep operations accountable.</p>
          <ol>
            <li><strong>Set up the workspace.</strong> Check organization details, locations, and zones.</li>
            <li><strong>Manage people.</strong> Review staff and invitations, and confirm that each person has the correct access.</li>
            <li><strong>Plan work.</strong> Create and organize tasks or operations, with clear ownership and timing.</li>
            <li><strong>Review execution.</strong> Check task progress, submitted evidence, and items that need attention.</li>
            <li><strong>Monitor performance.</strong> Use the dashboard, reports, logs, and audit trail to follow up on exceptions.</li>
          </ol>
          <p class="ct-help-note">Only grant access appropriate to each person's responsibilities. Server-side permissions determine what actions are allowed.</p>`,
        supervisor: `
          <p class="ct-help-lead">Coordinate the team, review work, and follow up on exceptions.</p>
          <ol>
            <li><strong>Check today's work.</strong> Open the workspace and operations areas available to you.</li>
            <li><strong>Coordinate coverage.</strong> Review personnel, sites, zones, and assigned responsibilities.</li>
            <li><strong>Follow progress.</strong> Watch for pending, delayed, or incomplete work and raise issues early.</li>
            <li><strong>Review submissions.</strong> Use the review queue to check records or evidence when that function is available to your account.</li>
            <li><strong>Report blockers.</strong> Escalate missing access, unclear instructions, or site issues to your administrator.</li>
          </ol>`,
        employee: `
          <p class="ct-help-lead">Use your workspace to understand assigned work and keep your records up to date.</p>
          <ol>
            <li><strong>Start with My Desk or My Tasks.</strong> Review the work and instructions available to you.</li>
            <li><strong>Complete the task as instructed.</strong> Follow site procedures and any timing or safety requirements.</li>
            <li><strong>Record completion accurately.</strong> Add requested evidence or notes when the task flow provides those options.</li>
            <li><strong>Check your history.</strong> Review prior activity and announcements available to your account.</li>
            <li><strong>Ask for help early.</strong> Contact your supervisor if an instruction is unclear or a task cannot be completed.</li>
          </ol>`,
        guest: `
          <p class="ct-help-lead">Get started with your CleanTrack workspace.</p>
          <ol>
            <li>Sign in with your work account, or complete registration if your organization allows it.</li>
            <li>Choose the role and organization details you were given by your organization.</li>
            <li>After signing in, use the navigation to find the tools available to your account.</li>
            <li>If you cannot access your workspace, contact your organization administrator.</li>
          </ol>`
      };
      content.innerHTML = `<div class="ct-help-dialog">${guideContent[role] || guideContent.guest}<div class="ct-help-dialog-actions"><button type="button" class="ct-help-secondary-button" data-help-open="center">Help Center</button><button type="button" class="ct-help-secondary-button" data-help-open="contact">Contact Support</button></div></div>`;
    } else if (action === "contact") {
      titleElement.textContent = "Contact Support";
      const replyEmail = user?.email || "";
      const accountName = user?.name || "";
      const org = user?.organization_name || user?.organizationName || user?.organization?.name || (typeof user?.organization === "string" ? user.organization : "");
      content.innerHTML = `
        <div class="ct-help-dialog">
          <p class="ct-help-lead">Prepare a support request with the details needed to investigate your issue.</p>
          <p class="ct-help-note">The support email address has not been configured in this workspace. When your email app opens, enter your organization's support contact or ask your workspace administrator for it. The message will not be sent automatically.</p>
          <form id="ct-support-form" class="ct-support-form">
            <label for="ct-support-name">Your name</label>
            <input id="ct-support-name" name="name" type="text" autocomplete="name" required>
            <label for="ct-support-email">Reply-to email</label>
            <input id="ct-support-email" name="email" type="email" autocomplete="email" required>
            <label for="ct-support-subject">Subject</label>
            <input id="ct-support-subject" name="subject" type="text" maxlength="120" value="CleanTrack support request" required>
            <label for="ct-support-message">What do you need help with?</label>
            <textarea id="ct-support-message" name="message" rows="4" maxlength="3000" required placeholder="Describe what happened and which page you were using."></textarea>
            <div class="ct-help-dialog-actions">
              <button type="submit" class="ct-help-action-button">Prepare email</button>
              <button type="button" class="ct-help-secondary-button" data-help-open="center">Help Center</button>
            </div>
          </form>
        </div>`;
      const nameInput = content.querySelector("#ct-support-name");
      const emailInput = content.querySelector("#ct-support-email");
      if (nameInput) nameInput.value = accountName;
      if (emailInput) emailInput.value = replyEmail;
      const supportForm = content.querySelector("#ct-support-form");
      if (supportForm) {
        supportForm.addEventListener("submit", function (event) {
          event.preventDefault();
          const formData = new FormData(supportForm);
          const body = [
            "Name: " + String(formData.get("name") || ""),
            "Reply-to email: " + String(formData.get("email") || ""),
            "Role: " + (role || "guest"),
            "Organization: " + (typeof org === "string" && org ? org : "Not available"),
            "",
            "Issue:",
            String(formData.get("message") || "")
          ].join("\n");
          const mailto = "mailto:?subject=" + encodeURIComponent(String(formData.get("subject") || "CleanTrack support request")) + "&body=" + encodeURIComponent(body);
          window.location.href = mailto;
        });
      }
    } else {
      return;
    }

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function bindFooterHelp() {
    const footer = getElement("app-footer");
    const dialog = getElement("app-modal");
    if (!footer || footer.dataset.helpReady === "true") return;
    footer.dataset.helpReady = "true";
    const year = getElement("footer-year");
    if (year) year.textContent = String(new Date().getFullYear());

    footer.addEventListener("click", function (event) {
      const link = event.target.closest("[data-help-action]");
      if (!link) return;
      event.preventDefault();
      openFooterHelp(link.dataset.helpAction);
    });

    if (dialog && dialog.dataset.footerHelpReady !== "true") {
      dialog.dataset.footerHelpReady = "true";
      dialog.addEventListener("click", function (event) {
        if (event.target.closest("[data-action='close-modal']")) {
          dialog.close ? dialog.close() : dialog.removeAttribute("open");
          return;
        }
        const opener = event.target.closest("[data-help-open]");
        if (opener) openFooterHelp(opener.dataset.helpOpen);
      });
    }
  }

  async function renderPage(pageId) {
    state.currentPage = pageId;

    const pageTitle = getElement("page-title");
    const pageContent = getElement("page-content");
    const menuElement = getElement("workspace-navigation");

    const user = auth.getCurrentUser();
    const activeMenuItem = navigation
      .getMenu(user?.role)
      .find(function (item) {
        return item.id === pageId;
      });

    const title = activeMenuItem ? activeMenuItem.label : "CleanTrack";

    if (pageTitle) {
      pageTitle.textContent = title;
    }

    if (menuElement) {
      navigation.renderMenu(menuElement);
    }

    if (!pageContent) return;

    pageContent.replaceChildren();
    // Re-apply the signed-in user's display preference as routes change.
    if (window.CleanTrackPreferences) window.CleanTrackPreferences.applyTheme();

    if (pageId === "reviews" && String(user?.role || "").toLowerCase() === "admin") {
      if (window.CleanTrackLogs && typeof window.CleanTrackLogs.render === "function") {
        await window.CleanTrackLogs.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Logs could not load. Refresh the page and try again."
        }));
      }
      return;
    }

    if (pageId === "audit") {
      if (window.CleanTrackAuditTrail && typeof window.CleanTrackAuditTrail.render === "function") {
        await window.CleanTrackAuditTrail.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Audit Trail could not load. Refresh and try again." }));
      }
      return;
    }

    if (pageId === "settings") {
      if (window.CleanTrackSettings && typeof window.CleanTrackSettings.render === "function") {
        await window.CleanTrackSettings.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Settings could not load. Refresh and try again." }));
      }
      return;
    }

    if (pageId === "billing") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Billing is available to organization Admins only." }));
        return;
      }
      if (window.CleanTrackBilling && typeof window.CleanTrackBilling.render === "function") {
        await window.CleanTrackBilling.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Billing could not load. Refresh and try again." }));
      }
      return;
    }

    if (pageId === "announcements" || pageId === "team-channel") {
      const role = String(user?.role || "").toLowerCase();
      const pageAllowed = pageId === "announcements"
        ? ["admin", "employee"].includes(role)
        : ["supervisor", "employee"].includes(role);
      if (!pageAllowed) {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "This announcements view is not available to your role."
        }));
        return;
      }
      if (window.CleanTrackAnnouncements && typeof window.CleanTrackAnnouncements.render === "function") {
        await window.CleanTrackAnnouncements.render(pageContent, pageId);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Announcements could not load. Refresh and try again."
        }));
      }
      return;
    }

    if (pageId === "org-settings") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Organization Settings are available to Admin users only." }));
        return;
      }
      if (window.CleanTrackOrganizationSettings && typeof window.CleanTrackOrganizationSettings.render === "function") {
        await window.CleanTrackOrganizationSettings.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Organization Settings could not load. Refresh and try again." }));
      }
      return;
    }

    if (pageId === "invitations") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Invitations are available to organization Admins only." }));
        return;
      }
      if (window.CleanTrackInvitations && typeof window.CleanTrackInvitations.render === "function") {
        await window.CleanTrackInvitations.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "The Invitations module could not load. Refresh and try again." }));
      }
      return;
    }

    // Home is the admin landing/control page; Dashboard remains the deeper analytics page.
    if (pageId === "home" && String(user?.role || "").toLowerCase() === "admin") {
      if (window.CleanTrackAdminHome && typeof window.CleanTrackAdminHome.render === "function") {
        await window.CleanTrackAdminHome.render(pageContent);
      } else {
        const message = document.createElement("p");
        message.textContent = "Home could not load. Refresh the page and try again.";
        pageContent.appendChild(message);
      }
      return;
    }

    // Admin-only live operational dashboard. Other roles never render this page.
    if (pageId === "dashboard") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        const message = document.createElement("p");
        message.textContent = "The Dashboard is available to Admin users only.";
        pageContent.appendChild(message);
        return;
      }
      if (window.CleanTrackDashboard) {
        window.CleanTrackDashboard.render(pageContent);
      } else {
        const message = document.createElement("p");
        message.textContent = "The Admin Dashboard could not load. Refresh the page and try again.";
        pageContent.appendChild(message);
      }
      return;
    }

    // Organization Analytics is deliberately limited to team comparison and team rankings.
    if (pageId === "analytics") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Analytics is available to organization Admins only."
        }));
        return;
      }
      if (window.CleanTrackAnalytics && typeof window.CleanTrackAnalytics.render === "function") {
        await window.CleanTrackAnalytics.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Team Analytics could not load. Refresh the page and try again."
        }));
      }
      return;
    }

    if (pageId === "reports") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Reports are not available to your role."
        }));
        return;
      }
      if (window.CleanTrackReports && typeof window.CleanTrackReports.render === "function") {
        await window.CleanTrackReports.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Reports could not load. Refresh and try again."
        }));
      }
      return;
    }

    // Operations is the role-scoped work engine. Employee routes reuse the same
    // data-backed module but expose only operations assigned to the signed-in user.
    if (["operations", "my-tasks", "my-history"].includes(pageId)) {
      if (window.CleanTrackOperations && typeof window.CleanTrackOperations.render === "function") {
        const mode = pageId === "my-history" ? "history" : pageId === "my-tasks" ? "work" : "operations";
        await window.CleanTrackOperations.render(pageContent, mode);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Operations could not load. Refresh and try again."
        }));
      }
      return;
    }

    // Render the landing page instead of the generic placeholder.
    if (["home", "workspace", "my-desk"].includes(pageId)) {
      const intro = document.createElement("p");
      const userName = user?.name || user?.email || "there";
      intro.textContent = `Welcome back, ${userName}.`;
      pageContent.appendChild(intro);

      const cards = [
        { id: "teams", title: "Teams", description: "View and manage teams." },
        { id: "operations", title: "Operations", description: "Review work and operational tasks." },
        { id: "reports", title: "Reports", description: "Review available reports." },
        { id: "my-tasks", title: "My Tasks", description: "View your assigned tasks." },
        { id: "my-history", title: "My History", description: "Review your work history." }
      ];

      const allowedIds = navigation.getMenu(user?.role).map(item => item.id);
      const grid = document.createElement("div");
      grid.className = "content-grid";

      cards.filter(card => allowedIds.includes(card.id)).forEach(card => {
        const section = document.createElement("section");
        section.className = "span-4";
        section.style.cssText =
          "padding:20px;margin:8px 0;border:1px solid #2a3850;" +
          "border-radius:12px;background:#111a2b;color:#e7edf7;";

        const titleElement = document.createElement("h3");
        titleElement.textContent = card.title;

        const description = document.createElement("p");
        description.textContent = card.description;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `Open ${card.title}`;
        button.addEventListener("click", () => {
          navigation.setActivePage(card.id);
        });

        section.append(titleElement, description, button);
        grid.appendChild(section);
      });

      pageContent.appendChild(grid);
      return;
    }
    
    
    if (pageId === "locations") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Location administration is available to organization Admins only."
        }));
        return;
      }
      if (window.CleanTrackLocations && typeof window.CleanTrackLocations.render === "function") {
        await window.CleanTrackLocations.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "The Locations map could not load. Refresh and try again."
        }));
      }
      return;
    }

    if (pageId === "zones") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Zone administration is available to organization Admins only."
        }));
        return;
      }
      if (window.CleanTrackZones && typeof window.CleanTrackZones.render === "function") {
        await window.CleanTrackZones.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "The Zones module could not load. Refresh and try again."
        }));
      }
      return;
    }

    if (pageId === "staff") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Staff administration is available to organization Admins only." }));
        return;
      }
      if (window.CleanTrackStaff && typeof window.CleanTrackStaff.render === "function") {
        await window.CleanTrackStaff.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "The Staff module could not load. Refresh and try again." }));
      }
      return;
    }

    if (pageId === "teams") {
      if (String(user?.role || "").toLowerCase() !== "admin") {
        const message = document.createElement("p");
        message.textContent = "Team management is available to Admin users.";
        pageContent.appendChild(message);
        return;
      }

      // The existing Teams module will render this page.
      if (window.CleanTrackTeams &&
          typeof window.CleanTrackTeams.render === "function") {
        await window.CleanTrackTeams.render(pageContent);
      } else {
        const message = document.createElement("p");
        message.textContent =
          "The Teams module has not loaded. Check the teams.js script path.";
        pageContent.appendChild(message);
      }

      return;
    }

    const message = document.createElement("p");
    message.className = "page-placeholder";
    message.textContent =
      "This section will be connected as its feature is implemented.";
    pageContent.appendChild(message);
  }

  
  async function refreshNotificationBadge() {
    const badge = getElement("notification-count");
    if (!badge || !window.CleanTrackApi || !auth.isAuthenticated()) return;
    try {
      const data = await window.CleanTrackApi.get("notifications");
      const count = Number(data.unread_count || 0);
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count <= 0;
      const notificationButton = getElement("notifications-button");
      if (notificationButton) {
        notificationButton.setAttribute("aria-label", count ? "Open notifications, " + count + " unread" : "Open notifications");
        notificationButton.title = count ? count + " unread notification" + (count === 1 ? "" : "s") : "Notifications";
      }
    } catch (_) {
      // The badge remains hidden if notification retrieval is unavailable.
    }
  }

  async function refreshAnnouncementBadge() {
    if (!window.CleanTrackApi || !auth.isAuthenticated()) return;
    try {
      const data = await window.CleanTrackApi.get("announcements");
      const rows = Array.isArray(data.announcements) ? data.announcements : [];
      const user = auth.getCurrentUser() || {};
      const count = rows.filter(function (item) {
        const receipt = item.my_receipt || {};
        const receiptState = receipt.state || (Number(item.created_by_id) === Number(user.id) ? "issued" : "unread");
        return item.status === "published" && !item.archived_at &&
          receiptState === "unread" && (item.can_mark_read || item.can_acknowledge);
      }).length;
      if (navigation && typeof navigation.setAnnouncementUnreadCount === "function") navigation.setAnnouncementUnreadCount(count);
    } catch (_) {}
  }

  function bindNotificationsButton() {
    const button = getElement("notifications-button");
    if (!button || button.dataset.notificationsReady === "true") return;
    button.dataset.notificationsReady = "true";
    button.addEventListener("click", async function () {
      const dialog = getElement("app-modal");
      const title = getElement("modal-title");
      const content = getElement("modal-content");
      if (!dialog || !title || !content || !window.CleanTrackApi) return;
      title.textContent = "Notifications";
      content.replaceChildren();
      const loading = document.createElement("p");
      loading.textContent = "Loading notifications…";
      content.appendChild(loading);
      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else dialog.setAttribute("open", "");
      try {
        const data = await window.CleanTrackApi.get("notifications");
        const rows = Array.isArray(data.notifications) ? data.notifications : [];
        content.replaceChildren();
        const toolbar = document.createElement("div");
        toolbar.className = "ct-notifications-toolbar";
        const summary = document.createElement("p");
        summary.textContent = Number(data.unread_count || 0) + " unread";
        toolbar.appendChild(summary);
        const readAll = document.createElement("button");
        readAll.type = "button";
        readAll.className = "ct-help-secondary-button";
        readAll.textContent = "Mark all as read";
        readAll.addEventListener("click", async function () {
          try {
            await window.CleanTrackApi.post("notifications/read-all", {});
            await refreshNotificationBadge();
            button.click();
          } catch (error) {
            summary.textContent = error.message || "Could not mark notifications as read.";
          }
        });
        toolbar.appendChild(readAll);
        content.appendChild(toolbar);
        if (!rows.length) {
          const empty = document.createElement("p");
          empty.textContent = "No notifications have been recorded for your account.";
          content.appendChild(empty);
        }
        rows.forEach(function (item) {
          const row = document.createElement("article");
          row.className = "ct-notification-item" + (item.is_read ? "" : " is-unread");
          const heading = document.createElement("strong");
          heading.textContent = item.title || "Notification";
          const message = document.createElement("p");
          message.textContent = item.message || "";
          const meta = document.createElement("small");
          meta.textContent = item.created_at ? (window.CleanTrackPreferences?.formatDate ? window.CleanTrackPreferences.formatDate(item.created_at) + " " + window.CleanTrackPreferences.formatTime(item.created_at) : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))) : "";
          row.append(heading, message, meta);
          const actions = document.createElement("div");
          actions.className = "ct-notification-actions";
          if (!item.is_read) {
            const mark = document.createElement("button");
            mark.type = "button";
            mark.className = "ct-help-secondary-button";
            mark.textContent = "Mark read";
            mark.addEventListener("click", async function () {
              try {
                await window.CleanTrackApi.patch("notifications/" + item.id + "/read", {});
                await refreshNotificationBadge();
                row.classList.remove("is-unread");
                mark.remove();
              } catch (error) {
                message.textContent = error.message || "Could not update notification.";
              }
            });
            actions.appendChild(mark);
          }
          if (item.resource_type === "MembershipRequest" && String(auth.getCurrentUser()?.role || "").toLowerCase() === "admin") {
            const open = document.createElement("button");
            open.type = "button";
            open.className = "ct-help-action-button";
            open.textContent = "Open join requests";
            open.addEventListener("click", async function () {
              if (!item.is_read) {
                try { await window.CleanTrackApi.patch("notifications/" + item.id + "/read", {}); } catch (_) {}
              }
              if (dialog.close) dialog.close(); else dialog.removeAttribute("open");
              navigation.setActivePage("invitations");
              refreshNotificationBadge();
            });
            actions.appendChild(open);
          }
          if (item.resource_type === "Announcement") {
            const openAnnouncement = document.createElement("button");
            openAnnouncement.type = "button";
            openAnnouncement.className = "ct-help-action-button";
            openAnnouncement.textContent = "Open announcements";
            openAnnouncement.addEventListener("click", async function () {
              if (!item.is_read) {
                try {
                  await window.CleanTrackApi.patch("notifications/" + item.id + "/read", {});
                } catch (_) {}
              }
              if (dialog.close) dialog.close(); else dialog.removeAttribute("open");
              const role = String(auth.getCurrentUser()?.role || "").toLowerCase();
              navigation.setActivePage(role === "admin" ? "announcements" : "team-channel");
              refreshNotificationBadge();
            });
            actions.appendChild(openAnnouncement);
          }
          if (actions.childNodes.length) row.appendChild(actions);
          content.appendChild(row);
        });
        await refreshNotificationBadge();
      } catch (error) {
        content.replaceChildren();
        const message = document.createElement("p");
        message.textContent = error.message || "Notifications could not be loaded.";
        content.appendChild(message);
      }
    });
  }

  function bindLogoutButton() {
    const button = getElement("logout-button");

    if (!button) {
      return;
    }

    button.addEventListener("click", async function () {
      setLoading(true);

      try {
        await auth.logout();
      } catch (error) {
        showMessage(
          error.message || "There was a problem signing out.",
          "error"
        );
      } finally {
        state.started = false;
        showUnauthenticatedLayout();
        clearMessage();
        setLoading(false);
      }
    });
  }

function bindNavigation() {
  window.addEventListener("cleantrack:navigate", function (event) {
    if (event.detail && event.detail.page) {
      renderPage(event.detail.page);
    }
  });

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-view]");
    if (!button) return;

    const view = button.dataset.view;
    const views = {
      "login": "login-view",
      "register": "register-view",
      "forgot-password": "forgot-password-view"
    };

    const targetId = views[view];
    if (!targetId) return;

    const authViews = [
      "login-view",
      "register-view",
      "forgot-password-view",
      "organization-view"
    ];

    authViews.forEach(function (id) {
      const element = document.getElementById(id);
      if (element) element.hidden = id !== targetId;
    });
  });
}

  function bindRegistrationForm() {
    const form = getElement("register-form");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";

    const nameGroup = getElement("organization-name-group");
    const codeGroup = getElement("organization-code-group");
    const organizationName = getElement("register-organization-name");
    const organizationCode = getElement("register-organization-code");
    const invitationTokenInput = getElement("register-invitation-token");
    const invitationNotice = getElement("register-invitation-notice");
    const membershipMessageGroup = getElement("membership-message-group");
    const joinMessage = getElement("register-join-message");
    const emailInput = getElement("register-email");
    const phoneInput = getElement("register-phone");
    const message = getElement("register-message");
    const submit = getElement("register-submit");
    const roleInputs = Array.from(form.querySelectorAll('input[name="role"]'));
    let invitationRole = "";

    function clearInvitationContext() {
      invitationRole = "";
      roleInputs.forEach(input => { input.disabled = false; });
      if (invitationTokenInput) invitationTokenInput.value = "";
      if (emailInput) emailInput.readOnly = false;
      if (invitationNotice) invitationNotice.hidden = true;
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("invite");
        url.searchParams.delete("join");
        url.searchParams.delete("role");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      } catch (_) {}
    }

    function updateRoleFields() {
      const selected = form.querySelector('input[name="role"]:checked');
      const role = selected ? selected.value : "";
      const hasInvitation = Boolean(invitationTokenInput && invitationTokenInput.value);
      const isAdmin = role === "admin";
      const isJoining = role === "supervisor" || role === "employee";
      if (nameGroup) nameGroup.hidden = !isAdmin;
      if (codeGroup) codeGroup.hidden = !isJoining || hasInvitation;
      if (membershipMessageGroup) membershipMessageGroup.hidden = !isJoining;
      if (organizationName) organizationName.required = isAdmin;
      if (organizationCode) organizationCode.required = isJoining && !hasInvitation;
      if (invitationNotice && hasInvitation) invitationNotice.hidden = false;
      if (submit) submit.textContent = isAdmin ? "Create organization" : hasInvitation ? "Submit join request" : "Request to join";
    }

    roleInputs.forEach(input => input.addEventListener("change", updateRoleFields));
    updateRoleFields();

    async function prefillInvitationFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite");
      if (!invitationTokenInput) return;
      const loginView = getElement("login-view");
      const registerView = getElement("register-view");
      const forgotView = getElement("forgot-password-view");
      const organizationView = getElement("organization-view");
      const showRegistration = function () {
        if (loginView) loginView.hidden = true;
        if (registerView) registerView.hidden = false;
        if (forgotView) forgotView.hidden = true;
        if (organizationView) organizationView.hidden = true;
      };
      if (!token) {
        const joinCode = params.get("join");
        if (!joinCode || !organizationCode) return;
        organizationCode.value = joinCode;
        const requestedRole = ["supervisor", "employee"].includes(String(params.get("role") || "").toLowerCase())
          ? String(params.get("role")).toLowerCase()
          : "supervisor";
        roleInputs.forEach(input => { input.checked = input.value === requestedRole; input.disabled = false; });
        if (invitationNotice) {
          invitationNotice.hidden = false;
          invitationNotice.textContent = "Organization join code loaded. This creates a pending request; an Admin must approve it before you can sign in.";
        }
        showRegistration();
        updateRoleFields();
        return;
      }
      invitationTokenInput.value = token;
      if (invitationNotice) {
        invitationNotice.hidden = false;
        invitationNotice.textContent = "Checking this invitation link…";
      }
      showRegistration();
      updateRoleFields();

      try {
        const response = await window.CleanTrackApi.get("invitations/resolve?token=" + encodeURIComponent(token));
        const invite = response.invitation || {};
        if (emailInput) {
          emailInput.value = invite.email || "";
          emailInput.readOnly = true;
        }
        invitationRole = String(invite.role || "").toLowerCase();
        roleInputs.forEach(input => { input.checked = input.value === invitationRole; input.disabled = input.value !== invitationRole; });
        if (invitationNotice) invitationNotice.textContent =
          "Invitation for " + (invite.organization_name || "your organization") +
          " · Requested role: " + (invite.role || "not specified") +
          ". " + (response.message || "An Admin must approve the join request.");
        updateRoleFields();
      } catch (error) {
        if (invitationTokenInput) invitationTokenInput.value = "";
        invitationRole = "";
        roleInputs.forEach(input => { input.disabled = false; });
        if (emailInput) emailInput.readOnly = false;
        if (invitationNotice) {
          invitationNotice.hidden = false;
          invitationNotice.textContent = (error.message || "This invitation link could not be verified.") +
            " You can still request to join using an organization code.";
        }
        updateRoleFields();
      }
    }
    prefillInvitationFromUrl();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (message) {
        message.textContent = "";
        message.className = "form-message";
      }
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const role = String(data.get("role") || "").toLowerCase();
      if (!role) {
        if (message) {
          message.textContent = "Choose the role you are registering for.";
          message.className = "form-message error";
        }
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.textContent = role === "admin" ? "Creating organization…" : "Sending request…";
      }
      setLoading(true);
      try {
        const result = await auth.register({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          membership_message: data.get("membership_message"),
          password: data.get("password"),
          role,
          organization_name: data.get("organization_name"),
          organization_code: data.get("organization_code"),
          invitation_token: data.get("invitation_token"),
          accept_terms: data.get("accept_terms") === "on"
        });

        clearInvitationContext();
        if (result.user && result.membershipStatus !== "pending") {
          try { localStorage.setItem(setupKey(result.user, "pending"), "1"); } catch (_) {}
          showAuthenticatedLayout(result.user);
          maybeShowFirstSetup(result.user);
          navigation.setActivePage(navigation.getDefaultPage(result.user.role) || "home");
          if (message) message.textContent = "";
          form.reset();
          updateRoleFields();
          return;
        }

        if (message) {
          message.textContent = result.message || "Your request was submitted.";
          message.className = "form-message success";
        }
        form.reset();
        updateRoleFields();
      } catch (error) {
        if (message) {
          message.textContent = error.message || "Unable to create the account. Please check the details and try again.";
          message.className = "form-message error";
        }
      } finally {
        setLoading(false);
        if (submit) {
          submit.disabled = false;
          updateRoleFields();
        }
      }
    });
  }

  function bindLoginForm() {
    const form = getElement("login-form");
    if (!form) return;

    // Keep password-recovery form honest while email delivery/reset tokens are not configured.
    const recoveryForm = getElement("forgot-password-form");
    if (recoveryForm && recoveryForm.dataset.bound !== "true") {
      recoveryForm.dataset.bound = "true";
      recoveryForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const message = getElement("forgot-password-message");
        if (message) {
          message.textContent = "Password recovery by email is not configured yet. No reset email was sent. Please contact your organization Admin or CleanTrack support.";
          message.className = "form-message error";
        }
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearMessage();
      setLoading(true);

      const formData = new FormData(form);

      try {
        const user = await auth.login({
          email: formData.get("email"),
          password: formData.get("password")
        });

        state.started = true;
        showAuthenticatedLayout(user);
        showMessage("You are now signed in.", "success");
        maybeShowFirstSetup(user);
      } catch (error) {
        showMessage(
          error.message || "Unable to sign in. Please try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    });
  }



  async function start() {
    if (state.started) {
      return;
    }

    state.started = true;
    bindFooterHelp();
    bindNotificationsButton();
    if (!state.notificationPollingStarted) {
      state.notificationPollingStarted = true;
      window.setInterval(function () {
        refreshNotificationBadge();
        refreshAnnouncementBadge();
      }, 60000);
    }
    bindLoginForm();
    if (typeof bindRegistrationForm === "function") {
  bindRegistrationForm();
}
    bindLogoutButton();
    bindNavigation();

    setLoading(true);

    try {
      const user = await auth.restoreSession();

      if (user) {
        showAuthenticatedLayout(user);
      } else {
        showUnauthenticatedLayout();
      }
    } catch (error) {
      state.error = error.message;
      showUnauthenticatedLayout();
    } finally {
      setLoading(false);
      const splash = document.getElementById("cleantrack-launch-splash");
      if (splash) {
        window.setTimeout(function () {
          splash.classList.add("is-hidden");
          window.setTimeout(function () { splash.remove(); }, 260);
        }, 450);
      }
    }
  }

  window.CleanTrackApp = Object.freeze({
    start: start,
    renderPage: renderPage,
    showMessage: showMessage,
    getState: function () {
      return { ...state };
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();