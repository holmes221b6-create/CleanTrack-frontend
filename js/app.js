
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
    // Organisation avatars never replace the global OMNIX product identity.
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
    const workspaceElement = getElement("workspace-view");
    setVisible(getElement("auth-view"), false);
    if (workspaceElement) {
      workspaceElement.classList.remove("mn-workspace-entering");
      workspaceElement.setAttribute("aria-busy", "true");
    }
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
      // setActivePage dispatches synchronously. renderPage installs its loading
      // frame before the workspace becomes visible, avoiding a blank first frame.
      navigation.setActivePage(defaultPage);
    }
    if (workspaceElement) {
      setVisible(workspaceElement, true);
      workspaceElement.classList.add("mn-workspace-entering");
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          workspaceElement.classList.remove("mn-workspace-entering");
          workspaceElement.removeAttribute("aria-busy");
        });
      });
    }
    showWelcomeBackIfNeeded(user);
    window.setTimeout(function(){ showShadowFeatureAnnouncement(user); }, 520);
  }
  
  

  // Add a release entry here whenever a user-visible CleanTrack feature/control is shipped.
  // Each account sees each release once; bump the id for a genuinely new or materially changed feature.
  const SHADOW_FEATURE_RELEASES = [
    {
      id: "notification-promotional-email-settings-2026-10-v1",
      title: "You control promotional emails now",
      message: "A new option has been added in Settings → Notifications: “Promotional emails and product updates.” Turn it on if you want CleanTrack feature news, product updates and offers. Turn it off whenever you prefer not to receive promotional email. Save your notification settings to keep your choice."
    },
  ];

  function showShadowFeatureAnnouncement(user) {
    if (!user || !SHADOW_FEATURE_RELEASES.length) return;
    const identity = String(user.id || user.email || user.name || "user").trim().toLowerCase();
    const key = "cleantrack.shadow.feature-releases." + identity;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(key) || "[]"); if (!Array.isArray(seen)) seen = []; } catch (_) { seen = []; }
    const release = SHADOW_FEATURE_RELEASES.find(function(item) { return item && item.id && !seen.includes(item.id); });
    if (!release) return;
    // Setup Guide and welcome-back have priority. Retry after they close so a new
    // feature notice is queued instead of silently skipped during the overlay race.
    if (document.querySelector(".ct-shadow-welcome-back,.ct-shadow-feature-announcement,.ct-tour-coach")) {
      if (!window.__cleanTrackShadowReleaseRetry) window.__cleanTrackShadowReleaseRetry = 0;
      if (window.__cleanTrackShadowReleaseRetry < 30) {
        window.__cleanTrackShadowReleaseRetry += 1;
        window.setTimeout(function(){ showShadowFeatureAnnouncement(user); }, 1000);
      } else {
        window.__cleanTrackShadowReleaseRetry = 0;
      }
      return;
    }
    window.__cleanTrackShadowReleaseRetry = 0;

    const style = document.createElement("style");
    style.dataset.cleanTrackShadowRelease = "true";
    style.textContent = `
      .ct-shadow-feature-announcement{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100vh!important;max-height:none!important;overflow:hidden!important;display:block!important;background:radial-gradient(ellipse at 20% 65%,#12142a66,transparent 52%),#020207ed!important;border:0!important;border-radius:0!important;padding:0!important;margin:0!important;box-shadow:none!important;color:#f8f7ff!important;pointer-events:none!important;font-family:inherit}
      .ct-shadow-feature-announcement .ct-tour-avatar{position:absolute!important;left:2vw!important;bottom:0!important;width:min(39vw,550px)!important;height:min(91vh,900px)!important;display:flex!important;align-items:flex-end!important;justify-content:center!important;overflow:visible!important;background:radial-gradient(ellipse at 50% 82%,#4a1c7b55,transparent 68%)!important;border:0!important;border-radius:0!important;box-shadow:none!important;pointer-events:none!important}
      .ct-shadow-feature-announcement .ct-shadow-reference-image{position:relative!important;display:block!important;width:auto!important;height:min(91vh,900px)!important;max-width:min(39vw,550px)!important;object-fit:contain!important;object-position:center bottom!important;filter:none!important;animation:none!important}
      .ct-shadow-feature-announcement .ct-tour-speech{position:fixed!important;left:clamp(340px,39vw,620px)!important;right:5vw!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;width:auto!important;max-width:700px!important;max-height:78vh!important;overflow:auto!important;pointer-events:auto!important;padding:clamp(22px,3vw,38px)!important;background:radial-gradient(ellipse at 15% 0%,#211634,#0a0912 65%,#05050a)!important;border:1px solid #8053a9!important;border-radius:34px 34px 34px 14px!important;box-shadow:0 24px 90px #000d,0 0 35px #702bb933!important;clip-path:none!important}
      .ct-shadow-feature-announcement .ct-tour-speech:before{content:""!important;position:absolute!important;left:-17px!important;top:48%!important;width:28px!important;height:28px!important;background:#130d20!important;border-left:1px solid #8053a9!important;border-bottom:1px solid #8053a9!important;transform:rotate(28deg) skew(-8deg)!important}
      .ct-shadow-feature-announcement .ct-tour-speech:after{content:""!important;position:absolute!important;inset:7px!important;border:1px solid #c6a5e51c!important;border-radius:27px 27px 27px 10px!important;pointer-events:none!important}
      .ct-shadow-feature-announcement .ct-tour-speech>*{position:relative!important;z-index:1!important}
      .ct-shadow-feature-announcement .ct-tour-kicker{font-size:11px!important;letter-spacing:.16em!important;color:#d3a8ff!important;font-weight:800!important}
      .ct-shadow-feature-announcement h3{font-size:clamp(23px,2.2vw,34px)!important;line-height:1.15!important;margin:0 0 14px!important;color:#fff!important}
      .ct-shadow-feature-announcement .ct-tour-speech p{font-size:clamp(15px,1.2vw,18px)!important;line-height:1.65!important;color:#e9e2f4!important}
      .ct-shadow-feature-announcement .ct-tour-status{font-size:13px!important;color:#b5a7c7!important}
      .ct-shadow-feature-announcement .ct-tour-actions{display:flex!important;gap:10px!important;justify-content:flex-end!important;margin-top:22px!important}
      .ct-shadow-feature-announcement button{pointer-events:auto!important;cursor:pointer!important;border-radius:12px!important;padding:12px 19px!important;border:1px solid #554568!important;background:#17111f!important;color:#f8f4ff!important;font:inherit!important}
      .ct-shadow-feature-announcement button.primary{background:#6b2caa!important;border-color:#a66be8!important;color:#fff!important;font-weight:750!important}
      @keyframes ct-shadow-release-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @media(max-width:700px){.ct-shadow-feature-announcement .ct-tour-avatar{left:-5vw!important;width:47vw!important;height:58vh!important;opacity:.9!important}.ct-shadow-feature-announcement .ct-shadow-reference-image{width:46vw!important;height:56vh!important}.ct-shadow-feature-announcement .ct-shadow-hood{width:clamp(95px,25vw,145px)!important;height:130px!important}.ct-shadow-feature-announcement .ct-shadow-eyes{top:62px!important;width:110px!important;height:32px!important}.ct-shadow-feature-announcement .ct-shadow-cloak{inset:85px 0 0!important}.ct-shadow-feature-announcement .ct-tour-speech{left:8vw!important;right:8vw!important;top:8vh!important;bottom:auto!important;transform:none!important;max-height:72vh!important;padding:20px!important}.ct-shadow-feature-announcement .ct-tour-avatar{z-index:0!important}.ct-shadow-feature-announcement .ct-tour-speech{z-index:2!important}}
    `;
    document.head.appendChild(style);

    const coach = document.createElement("aside");
    coach.className = "ct-tour-coach ct-shadow-feature-announcement";
    coach.setAttribute("role", "dialog");
    coach.setAttribute("aria-modal", "true");
    coach.setAttribute("aria-live", "polite");
    const avatar = document.createElement("div");
    avatar.className = "ct-tour-avatar";
    avatar.setAttribute("aria-label", "Shadow, the CleanTrack guide");
    avatar.setAttribute("role", "img");
    const shadowImage = document.createElement("img");
    shadowImage.className = "ct-shadow-reference-image";
    shadowImage.src = "https://raw.githubusercontent.com/holmes221b6-create/CleanTrack-frontend/main/assets/shadow-character-imu.svg?v=1";
    shadowImage.alt = "Shadow";
    shadowImage.draggable = false;
    avatar.appendChild(shadowImage);
    const speech = document.createElement("div"); speech.className = "ct-tour-speech";
    const kicker = document.createElement("p"); kicker.className = "ct-tour-kicker"; kicker.textContent = "NEW IN CLEANTRACK · SHADOW";
    const heading = document.createElement("h3"); heading.textContent = release.title;
    const message = document.createElement("p"); message.textContent = release.message;
    const status = document.createElement("p"); status.className = "ct-tour-status"; status.textContent = "A new feature has arrived. I'll show you what's changed before you continue.";
    const actions = document.createElement("div"); actions.className = "ct-tour-actions";
    const later = document.createElement("button"); later.textContent = "Maybe later";
    later.addEventListener("click", function() { try { seen.push(release.id); localStorage.setItem(key, JSON.stringify(seen)); } catch (_) {} coach.remove(); style.remove(); });
    const show = document.createElement("button"); show.className = "primary"; show.textContent = "Got it";
    show.addEventListener("click", function() { try { seen.push(release.id); localStorage.setItem(key, JSON.stringify(seen)); } catch (_) {} coach.remove(); style.remove(); });
    actions.append(later, show); speech.append(kicker, heading, message, status, actions); coach.append(avatar, speech);
    document.body.appendChild(coach);
    playShadowArrivalSound(true);
    show.focus();
    coach.addEventListener("keydown", function(event) { if (event.key === "Escape") { event.preventDefault(); later.click(); } });
  }

  function showWelcomeBackIfNeeded(user) {
    if (!user) return;
    const identity = String(user.id || user.email || user.name || "user").trim().toLowerCase();
    const key = "cleantrack.shadow.last-seen." + identity;
    const now = Date.now();
    let previous = 0;
    try { previous = Number(localStorage.getItem(key) || 0); } catch (_) {}
    try { localStorage.setItem(key, String(now)); } catch (_) {}
    if (!previous || now - previous < 7 * 24 * 60 * 60 * 1000 || document.querySelector(".ct-shadow-welcome-back")) return;

    const name = String(user.name || user.full_name || user.email || "there").trim();
    const overlay = document.createElement("div");
    overlay.className = "ct-setup-overlay ct-shadow-welcome-back";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ct-shadow-welcome-title");
    const style = document.createElement("style");
    style.textContent = ".ct-shadow-welcome-back{z-index:1000002!important;background:radial-gradient(ellipse at 20% 55%,#11163b88 0%,#020207f2 68%)!important;pointer-events:auto!important}.ct-shadow-welcome-card{width:min(680px,100%);max-height:90vh;overflow:auto;padding:clamp(24px,5vw,42px);border:1px solid #49416b;border-radius:24px;background:linear-gradient(145deg,#10111bfa,#030306fc);color:#f4f3fb;box-shadow:0 25px 100px #000c,0 0 45px #26235b44;text-align:left;pointer-events:auto!important;position:relative;z-index:2}.ct-shadow-welcome-card h2{font-size:clamp(25px,4vw,36px);line-height:1.15;margin:0 0 14px}.ct-shadow-welcome-card p{font-size:16px;line-height:1.7;color:#d1d0e0}.ct-shadow-welcome-card .ct-welcome-kicker{color:#ff799e;text-transform:uppercase;letter-spacing:.16em;font-size:11px;font-weight:800}.ct-shadow-welcome-card button{display:block;margin:22px 0 0 auto;padding:12px 22px;border:1px solid #8a3158;border-radius:12px;background:linear-gradient(100deg,#8c123a,#54132f);color:#fff;font:inherit;font-weight:750;cursor:pointer;min-height:46px;pointer-events:auto!important;position:relative;z-index:3}";
    const card = document.createElement("section"); card.className = "ct-shadow-welcome-card";
    const kicker = document.createElement("div"); kicker.className = "ct-welcome-kicker"; kicker.textContent = "Shadow · CleanTrack";
    const heading = document.createElement("h2"); heading.id = "ct-shadow-welcome-title"; heading.textContent = "Well, look who’s back, " + name + ".";
    const first = document.createElement("p"); first.textContent = "It’s been a while. A lot can happen in CleanTrack while you’re away — new activities, completed work, pending reviews, and changes across your team may have built up since your last visit.";
    const second = document.createElement("p"); second.textContent = "Before you jump in, take a moment to catch your bearings. I’ll help you find your way around and point you toward what matters. Let’s see what’s changed.";
    const button = document.createElement("button"); button.type = "button"; button.textContent = "All right, let’s go"; button.addEventListener("click", function(){ overlay.remove(); if(style.isConnected) style.remove(); window.setTimeout(function(){ showShadowFeatureAnnouncement(user); }, 120); });
    card.append(kicker,heading,first,second,button); overlay.append(style,card); document.body.appendChild(overlay); button.focus();
    overlay.addEventListener("keydown",function(event){if(event.key==="Escape"){event.preventDefault();overlay.remove();if(style.isConnected)style.remove();}});
  }

  function setupKey(user, suffix) { return "cleantrack.setup." + suffix + "." + String(user && (user.id || user.email) || "unknown").toLowerCase(); }
  function setupSteps(role) {
    // Every lesson uses a real navigation route available to that role.
    const steps = {
      admin: [
        ["Your organisation","Meet the workspace controls. Organisation Settings is where you maintain the organisation details used across CleanTrack.","org-settings","organisation"],
        ["Locations & maps","Locations are real work sites. Open a location to see its map or floor plan and connect the areas your organisation operates in.","locations","location"],
        ["Zones","Zones are the specific operational areas inside a location. Learn how they connect to locations instead of treating them as separate sites.","zones","zone"],
        ["Your people","Staff, teams and invitations help you bring the right people into the workspace and assign appropriate access.","teams","team"],
        ["Plan the work","Operations describe the work to be done. Learn where to create an operation and how assigned work is tracked.","operations","operation"],
        ["Review completed work","Logs and reviews help you check what actually happened, evidence submitted and items awaiting a decision.","reviews","review"],
        ["Reports & insights","Use Analytics to compare performance and Reports to prepare an exportable report for a specific purpose.","reports","report"]
      ],
      supervisor: [
        ["Your workspace","Start with your workspace to see the information and work available to your role.","workspace","workspace"],
        ["Your people","Personnel and team tools help you understand who is assigned and who needs support.","personnel","person"],
        ["Assigned operations","Open Operations Management to follow work and schedules relevant to your team.","operations","operation"],
        ["Review submissions","Use the review queue to inspect completed work and follow up on items needing attention.","reviews","review"],
        ["Sites & zones","Sites and Zones help you understand where your team is expected to work.","sites","site"],
        ["Team communication","Use your team channel to keep work-related updates in one place.","team-channel","message"]
      ],
      employee: [
        ["Welcome to your desk","Your desk is the starting point for updates and the next things to pay attention to.","my-desk","desk"],
        ["Your assigned work","My Work shows the operations assigned to you. Open an item to read its instructions before starting.","my-tasks","task"],
        ["Complete work carefully","Follow the operation instructions and use the available start or completion controls only when you are ready to do the work.","my-tasks","start"],
        ["Keep your work history","Work History helps you revisit completed work and understand its recorded status.","my-history","history"],
        ["Announcements & updates","Check announcements for workplace updates and guidance from your organisation.","announcements","announcement"],
        ["Your preferences","Settings lets you review available profile and notification preferences.","settings","settings"]
      ]
    };
    return steps[String(role || "").toLowerCase()] || steps.employee;
  }
  // Shadow's arrival sound: an original, locally generated eerie vocal-like sting.
  // Layered filtered noise, detuned tones, and a short synthetic reverb create an
  // uncanny, veiled presence without using a copied character recording.
  function shadowSoundEnabled() {
    try { return localStorage.getItem("cleantrack.shadow.sound") !== "off"; }
    catch (_) { return true; }
  }
  function setShadowSoundEnabled(enabled) {
    try { localStorage.setItem("cleantrack.shadow.sound", enabled ? "on" : "off"); } catch (_) {}
  }
  function playShadowArrivalSound(force) {
    if (!force && !shadowSoundEnabled()) return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    let context;
    try {
      context = new AudioContextClass();
      const play = function () {
        const now = context.currentTime;
        const master = context.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(1.65, now + 0.08);
        master.gain.setValueAtTime(1.15, now + 0.42);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 3.45);

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-30, now);
        compressor.knee.setValueAtTime(18, now);
        compressor.ratio.setValueAtTime(8, now);
        compressor.attack.setValueAtTime(0.008, now);
        compressor.release.setValueAtTime(0.35, now);
        master.connect(compressor);
        compressor.connect(context.destination);

        // Low, slowly descending presence.
        const low = context.createOscillator();
        const lowGain = context.createGain();
        low.type = "triangle";
        low.frequency.setValueAtTime(118, now);
        low.frequency.exponentialRampToValueAtTime(43, now + 2.35);
        lowGain.gain.setValueAtTime(0.0001, now);
        lowGain.gain.exponentialRampToValueAtTime(1.35, now + 0.12);
        lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.7);
        low.connect(lowGain);
        lowGain.connect(master);
        low.start(now);
        low.stop(now + 2.75);

        // Detuned, ambiguous vocal-like resonances rather than a plain buzzy tone.
        [172, 176.5, 258].forEach(function (frequency, i) {
          const osc = context.createOscillator();
          const gain = context.createGain();
          const formant = context.createBiquadFilter();
          osc.type = i === 2 ? "sawtooth" : "sine";
          osc.frequency.setValueAtTime(frequency, now + 0.04);
          osc.frequency.exponentialRampToValueAtTime(frequency * (i === 1 ? 0.68 : 0.74), now + 2.0);
          formant.type = "bandpass";
          formant.frequency.setValueAtTime(i === 2 ? 680 : 390 + i * 125, now);
          formant.Q.setValueAtTime(i === 2 ? 3.8 : 2.2, now);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(i === 2 ? 0.42 : 0.55, now + 0.12 + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.35);
          osc.connect(formant);
          formant.connect(gain);
          gain.connect(master);
          osc.start(now + i * 0.025);
          osc.stop(now + 2.42);
        });

        // Breath/whisper texture, shaped into a short rising-and-falling spectral swell.
        const noiseLength = Math.ceil(context.sampleRate * 2.55);
        const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseLength; i++) {
          const fadeIn = Math.min(1, i / (context.sampleRate * 0.14));
          const fadeOut = Math.max(0, 1 - i / noiseLength);
          noiseData[i] = (Math.random() * 2 - 1) * fadeIn * fadeOut;
        }
        const noise = context.createBufferSource();
        const breathFilter = context.createBiquadFilter();
        const breathGain = context.createGain();
        const breathPan = context.createStereoPanner ? context.createStereoPanner() : null;
        noise.buffer = noiseBuffer;
        breathFilter.type = "bandpass";
        breathFilter.frequency.setValueAtTime(1250, now + 0.08);
        breathFilter.frequency.exponentialRampToValueAtTime(520, now + 1.75);
        breathFilter.Q.setValueAtTime(0.85, now);
        breathGain.gain.setValueAtTime(0.0001, now);
        breathGain.gain.exponentialRampToValueAtTime(0.36, now + 0.32);
        breathGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
        noise.connect(breathFilter);
        breathFilter.connect(breathGain);
        if (breathPan) {
          breathPan.pan.setValueAtTime(-0.18, now);
          breathPan.pan.linearRampToValueAtTime(0.18, now + 1.35);
          breathGain.connect(breathPan);
          breathPan.connect(master);
        } else {
          breathGain.connect(master);
        }
        noise.start(now + 0.06);
        noise.stop(now + 2.58);

        // Short synthetic reverb tail.
        const reverbLength = Math.floor(context.sampleRate * 1.55);
        const impulse = context.createBuffer(2, reverbLength, context.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const samples = impulse.getChannelData(channel);
          for (let i = 0; i < reverbLength; i++) {
            samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 2.8);
          }
        }
        const convolver = context.createConvolver();
        const wet = context.createGain();
        convolver.buffer = impulse;
        wet.gain.setValueAtTime(0.44, now);
        master.connect(convolver);
        convolver.connect(wet);
        wet.connect(compressor);

        window.setTimeout(function () {
          if (context && context.state !== "closed") context.close().catch(function () {});
        }, 3650);
      };
      if (context.state === "suspended") {
        context.resume().then(play).catch(function () { context.close().catch(function () {}); });
      } else play();
      return true;
    } catch (_) {
      if (context && context.state !== "closed") context.close().catch(function () {});
      return false;
    }
  }
  function showSetupGuide(user, startIndex) {
    if (!user || !window.CleanTrackNavigation) return;
    const role = String(user.role || "employee").toLowerCase();
    const pages = window.CleanTrackNavigation.getMenu(role);
    if (!pages.length) return;
    let index = Math.max(0, Math.min(Number(startIndex) || 0, pages.length - 1));
    let panel = null;
    let mountedPage = "";
    const descriptions = {
      home: ["Organisation home","Your organisation’s starting point. Use this page to orient yourself and reach the main areas available to your role."],
      dashboard: ["Organisation dashboard","A high-level view of organisation activity and operational status. Review the available summaries before opening the detailed pages."],
      staff: ["Staff directory","Manage the people who have access to the organisation. Review staff records and use the available personnel actions."],
      personnel: ["Personnel","Review the staff relevant to your supervisory role, their details and the personnel actions available on this page."],
      invitations: ["Invitations","Manage invitations and the joining process for people being added to the organisation."],
      teams: ["Teams","Organise staff into teams and review the team information and controls available to your role."],
      inventory: ["Inventory","Manage assets, procurement, stock, locations, transfers, requests, maintenance and inventory reporting."],
      locations: ["Locations","Manage the organisation’s physical sites and the location details used by operational workflows."],
      zones: ["Zones","Define and maintain operational areas within locations so work can be associated with the correct place."],
      operations: ["Operations","Review and manage operational work, assignments, schedules and the work controls available to your role."],
      reviews: ["Logs and review queue","Inspect submitted work records, review their details and take the available follow-up or decision actions."],
      analytics: ["Analytics","Explore the operational metrics and visual summaries available to your organisation."],
      reports: ["Reports","Prepare and export reports using the reporting options available on this page."],
      announcements: ["Announcements and alerts","Read organisation updates and review the announcement or alert controls available to your role."],
      audit: ["Audit trail and activity","Review recorded activity and the history available for your account or organisation."],
      settings: ["Settings","Review your profile, preferences, and the settings that are available to your account."],
      "org-settings": ["Organisation settings","Maintain organisation-level details and configuration exposed to administrators."],
      billing: ["Billing","Review the organisation’s billing information and available billing controls."],
      meetings: ["Meetings","View and manage meeting information and the meeting actions available to your role."],
      inspections: ["Inspections and quality","Use the inspection and quality workflows available to your role, including any templates, schedules or reports shown here."],
      workspace: ["My workspace","Your supervisory starting point. Review the work overview and the workspace information relevant to your team."],
      incidents: ["Incidents and issues","Review reported incidents, urgent issues and their recorded status, then use the available follow-up actions."],
      handovers: ["Shift handover","Review and record shift handover information using the controls available on this page."],
      sites: ["Sites and zones","Review the sites and operational areas relevant to your team."],
      "team-channel": ["Team channel","Read and send work-related team updates using the communication controls available here."],
      performance: ["Performance arena","Review the team performance information and comparisons presented on this page."],
      "performance-analysis": ["Performance analysis","Explore the performance analysis available to your role and the evidence behind the displayed results."],
      "my-desk": ["My desk","Your personal starting point for assigned work, updates and information requiring your attention."],
      "my-tasks": ["My work","Review the operations assigned to you, open an item to read its instructions and use its available work controls."],
      "my-history": ["Work history","Revisit completed work and review the recorded status and details available for each item."],
      "incident-reports": ["Incident reports","Submit and review incident information using the reporting controls available to staff."],
      announcements: ["Announcements","Read updates published by your organisation and check for information relevant to your work."],
      skills: ["My skills","Review the skills information and any skill-related actions available to your account."]
    };
    function clearPanel(){ if(panel && panel.isConnected) panel.remove(); panel=null; }
    function describeCurrentPage(){
      const page = pages[index];
      const content = document.getElementById("page-content");
      if(!content) return;
      const pageId = page.id;
      const copy = descriptions[pageId] || [page.label, "This page contains the "+page.label.toLowerCase()+" tools available to your role. Review the visible sections and controls to understand the actions supported here."];
      const headings = Array.from(content.querySelectorAll("h1,h2,h3,h4,[role='heading']"))
        .filter(el=>el.offsetParent!==null && !el.closest(".ct-page-guide"))
        .map(el=>(el.innerText||el.textContent||"").trim()).filter(Boolean);
      const controls = Array.from(content.querySelectorAll("button,[role='button'],input[type='button'],input[type='submit']"))
        .filter(el=>el.offsetParent!==null && !el.disabled && !el.closest(".ct-page-guide"))
        .map(el=>(el.innerText||el.value||el.getAttribute("aria-label")||el.title||"").trim())
        .filter(Boolean);
      panel=document.createElement("section");
      panel.className="ct-page-guide";
      panel.setAttribute("aria-label","Page guide");
      panel.innerHTML='<div class="ct-page-guide-top"><div><span class="ct-page-guide-kicker">MECHNAR PAGE GUIDE · '+(index+1)+' / '+pages.length+'</span><h2></h2><p class="ct-page-guide-description"></p></div><button type="button" class="ct-page-guide-close" aria-label="Close page guide" title="Close guide">×</button></div><div class="ct-page-guide-details"></div><div class="ct-page-guide-footer"><button type="button" class="ct-page-guide-prev">Previous page</button><span class="ct-page-guide-count"></span><button type="button" class="ct-page-guide-next">Next page</button></div>';
      panel.querySelector("h2").textContent=copy[0];
      panel.querySelector(".ct-page-guide-description").textContent=copy[1];
      const details=panel.querySelector(".ct-page-guide-details");
      const sections=document.createElement("div");
      sections.className="ct-page-guide-section";
      const sh=document.createElement("h3");sh.textContent="What’s on this page";
      const sp=document.createElement("p");
      sp.textContent=headings.length ? headings.slice(0,12).join(" · ") : "The page is still loading its content, or it has no visible section headings.";
      sections.append(sh,sp);
      const actions=document.createElement("div");actions.className="ct-page-guide-section";
      const ah=document.createElement("h3");ah.textContent="Available actions";
      const ap=document.createElement("p");
      ap.textContent=controls.length ? Array.from(new Set(controls)).slice(0,14).join(" · ") : "No active page actions are currently visible.";
      actions.append(ah,ap);
      details.append(sections,actions);
      panel.querySelector(".ct-page-guide-count").textContent=page.label+" · "+(index+1)+" of "+pages.length;
      panel.querySelector(".ct-page-guide-prev").disabled=index===0;
      panel.querySelector(".ct-page-guide-next").textContent=index===pages.length-1?"Finish":"Next page";
      panel.querySelector(".ct-page-guide-close").addEventListener("click",clearPanel);
      panel.querySelector(".ct-page-guide-prev").addEventListener("click",()=>move(-1));
      panel.querySelector(".ct-page-guide-next").addEventListener("click",()=>index===pages.length-1?clearPanel():move(1));
      const styleId="ct-page-guide-style";
      if(!document.getElementById(styleId)){
        const style=document.createElement("style");style.id=styleId;
        style.textContent=".ct-page-guide{position:relative;z-index:4;width:100%;margin:0 0 22px;padding:20px 22px;border:1px solid var(--border,#393442);border-left:3px solid #8e70c8;border-radius:12px;background:var(--surface,#17171d);color:var(--text,#f4f1f8);box-sizing:border-box}.ct-page-guide-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.ct-page-guide-kicker{font-size:10px;letter-spacing:.14em;font-weight:800;color:#b49ade}.ct-page-guide h2{font-size:19px;margin:6px 0}.ct-page-guide-description{margin:0;line-height:1.55;opacity:.82;max-width:900px}.ct-page-guide-close{flex:0 0 34px;width:34px;height:34px;border:1px solid var(--border,#454052);border-radius:8px;background:transparent;color:inherit;font-size:22px;cursor:pointer}.ct-page-guide-details{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.ct-page-guide-section{min-width:0;padding:12px 14px;border:1px solid var(--border,#34313c);border-radius:9px}.ct-page-guide-section h3{font-size:12px;margin:0 0 7px}.ct-page-guide-section p{font-size:12px;line-height:1.55;margin:0;opacity:.76;overflow-wrap:anywhere}.ct-page-guide-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:15px}.ct-page-guide-footer button{padding:9px 13px;border:1px solid var(--border,#454052);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}.ct-page-guide-footer button:disabled{opacity:.35;cursor:default}.ct-page-guide-footer .ct-page-guide-next{background:#f1eff5;color:#17131d;border-color:#f1eff5;font-weight:700}.ct-page-guide-count{font-size:11px;opacity:.62;text-align:center}@media(max-width:700px){.ct-page-guide{padding:15px}.ct-page-guide-details{grid-template-columns:1fr}.ct-page-guide-footer{flex-wrap:wrap}.ct-page-guide-count{order:3;width:100%}}";
        document.head.appendChild(style);
      }
      content.insertBefore(panel,content.firstChild);
      mountedPage=pageId;
    }
    function move(delta){
      const nextIndex=Math.max(0,Math.min(pages.length-1,index+delta));
      if(nextIndex===index)return;
      index=nextIndex;
      const moved=window.CleanTrackNavigation.setActivePage(pages[index].id);
      if(!moved)return;
      clearPanel();
      window.setTimeout(describeCurrentPage,420);
    }
    const selected=pages[index];
    const active=window.CleanTrackNavigation.getActivePage();
    if(active===selected.id){describeCurrentPage();return;}
    if(!window.CleanTrackNavigation.setActivePage(selected.id))return;
    window.setTimeout(describeCurrentPage,420);
  }
  function maybeShowFirstSetup(user){try{if(user&&localStorage.getItem(setupKey(user,"pending"))==="1"&&localStorage.getItem(setupKey(user,"completed"))!=="1")window.setTimeout(function(){showSetupGuide(user)},80)}catch(_){}}
  window.CleanTrackSetupGuide = Object.freeze({ open: function(){ const user = auth.getCurrentUser(); if (user) showSetupGuide(user); } });
  function showUnauthenticatedLayout() {
    // Do not let a late startup callback return an authenticated user to auth.
    const signedInUser = auth.getCurrentUser && auth.getCurrentUser();
    if (signedInUser) {
      showAuthenticatedLayout(signedInUser);
      return;
    }
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

  let pageFrameObserver = null;
  let pageFrameNode = null;
  let pageRenderSequence = 0;

  function beginInstantPageFrame(container, pageId) {
    if (pageFrameObserver) {
      pageFrameObserver.disconnect();
      pageFrameObserver = null;
    }
    if (pageFrameNode) pageFrameNode.remove();
    pageFrameNode = null;
    const sequence = ++pageRenderSequence;

    // Teams intentionally retains its existing loading-first experience.
    if (pageId === "teams") return sequence;

    const frame = document.createElement("section");
    frame.className = "mn-instant-page-frame";
    frame.setAttribute("aria-label", "Opening page");
    frame.setAttribute("aria-busy", "true");
    frame.innerHTML = '<div class="mn-frame-heading"><i></i><b></b></div>' +
      '<div class="mn-frame-toolbar"><i></i><i></i><i></i></div>' +
      '<div class="mn-frame-metrics"><i></i><i></i><i></i><i></i></div>' +
      '<div class="mn-frame-content"><i></i><i></i><i></i></div>';
    container.appendChild(frame);
    pageFrameNode = frame;

    // Remove the frame as soon as the real page starts rendering. For modules
    // that fetch before rendering, it remains visible instead of a blank page.
    pageFrameObserver = new MutationObserver(function() {
      if (sequence !== pageRenderSequence) return;
      const hasRealContent = Array.from(container.children).some(node => node !== frame);
      if (hasRealContent) {
        frame.remove();
        if (pageFrameObserver) pageFrameObserver.disconnect();
        pageFrameObserver = null;
        pageFrameNode = null;
      }
    });
    pageFrameObserver.observe(container, { childList: true });
    return sequence;
  }

  let personnelOverlay = null;
  let personnelOpenToken = 0;
  let personnelPreviousPage = null;

  function closePersonnelOverlay() {
    personnelOpenToken++;
    if (personnelOverlay) personnelOverlay.remove();
    personnelOverlay = null;
    const previous = personnelPreviousPage || "workspace";
    personnelPreviousPage = null;
    if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage(previous);
  }

  async function openPersonnelOverlay() {
    if (personnelOverlay) personnelOverlay.remove();
    const token = ++personnelOpenToken;
    const overlay = document.createElement("section");
    overlay.id = "mechnar-personnel-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Personnel");
    overlay.innerHTML = '<header class="mn-personnel-top"><span>Personnel</span><button type="button" class="mn-personnel-close" aria-label="Close Personnel" title="Close">×</button></header><div class="mn-personnel-loading" role="status" aria-live="polite"><span class="mn-personnel-spinner" aria-hidden="true"></span><strong>Working on it</strong><small>Opening Personnel</small></div><div class="mn-personnel-content" hidden></div>';
    const style = document.createElement("style");
    style.dataset.mechnarPersonnelOverlay = "true";
    style.textContent = '#mechnar-personnel-overlay{position:fixed!important;inset:0!important;z-index:2147483001!important;display:flex!important;flex-direction:column!important;width:100vw!important;height:100dvh!important;min-width:0!important;min-height:0!important;background:var(--app-bg,#0b0a0e)!important;color:var(--text-primary,#f4f0f8)!important;overflow:hidden!important}#mechnar-personnel-overlay .mn-personnel-top{height:54px;min-height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:1px solid var(--border-color,rgba(160,140,190,.22));background:var(--surface-1,#111015);font-size:15px;font-weight:650}#mechnar-personnel-overlay .mn-personnel-close{width:38px;height:38px;border:1px solid var(--border-color,rgba(160,140,190,.3));border-radius:9px;background:transparent;color:inherit;font-size:27px;line-height:1;cursor:pointer}#mechnar-personnel-overlay .mn-personnel-loading{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}#mechnar-personnel-overlay .mn-personnel-spinner{width:42px;height:42px;border:3px solid rgba(174,151,220,.2);border-top-color:#a98be8;border-right-color:#8060bd;border-radius:50%;animation:mnPersonnelSpin .82s linear infinite}#mechnar-personnel-overlay .mn-personnel-loading strong{font-size:15px;font-weight:600}#mechnar-personnel-overlay .mn-personnel-loading small{font-size:12px;opacity:.65}#mechnar-personnel-overlay .mn-personnel-content{display:block;flex:1 1 auto;min-width:0;min-height:0;width:100%;height:calc(100% - 54px);overflow:auto;padding:0}#mechnar-personnel-overlay .mn-personnel-content[hidden]{display:none!important}#mechnar-personnel-overlay .mn-personnel-content>*{max-width:none!important}@keyframes mnPersonnelSpin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#mechnar-personnel-overlay .mn-personnel-spinner{animation-duration:2.4s}}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    personnelOverlay = overlay;
    overlay.querySelector(".mn-personnel-close").addEventListener("click", closePersonnelOverlay);
    const onEscape = event => { if (event.key === "Escape" && personnelOverlay === overlay) closePersonnelOverlay(); };
    overlay.addEventListener("keydown", onEscape);
    window.setTimeout(async () => {
      if (token !== personnelOpenToken || personnelOverlay !== overlay) return;
      const loading = overlay.querySelector(".mn-personnel-loading");
      const content = overlay.querySelector(".mn-personnel-content");
      loading.remove();
      content.hidden = false;
      try {
        if (window.MechnarPersonnel && typeof window.MechnarPersonnel.render === "function") {
          await window.MechnarPersonnel.render(content);
        } else {
          content.textContent = "Personnel could not load. Refresh the application and try again.";
        }
      } catch (error) {
        content.textContent = "Personnel could not load. Refresh the application and try again.";
        console.error("Personnel panel failed to load:", error);
      }
      if (token === personnelOpenToken && personnelOverlay === overlay) overlay.querySelector(".mn-personnel-close").focus();
    }, 0);
  }

  let performanceArenaOverlay = null;
  let performanceArenaOpenToken = 0;
  let performanceArenaPreviousPage = null;

  function closePerformanceArenaOverlay() {
    performanceArenaOpenToken++;
    if (performanceArenaOverlay) performanceArenaOverlay.remove();
    performanceArenaOverlay = null;
    const previous = performanceArenaPreviousPage || "workspace";
    performanceArenaPreviousPage = null;
    if (window.CleanTrackNavigation) window.CleanTrackNavigation.setActivePage(previous);
  }

  async function openPerformanceArenaOverlay() {
    if (performanceArenaOverlay) performanceArenaOverlay.remove();
    const token = ++performanceArenaOpenToken;
    const overlay = document.createElement("section");
    overlay.id = "mechnar-performance-arena-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Performance Arena");
    overlay.innerHTML = '<header class="pa-fullscreen-top"><span class="pa-fullscreen-brand">Performance Arena</span><button type="button" class="pa-fullscreen-close" aria-label="Back to global pages" title="Back to global pages">×</button></header><div class="pa-fullscreen-loading" role="status" aria-live="polite"><span class="pa-fullscreen-spinner" aria-hidden="true"></span><strong>Working on it</strong><small>Opening Performance Arena</small></div><div class="pa-fullscreen-content" hidden></div>';
    document.body.appendChild(overlay);
    performanceArenaOverlay = overlay;
    overlay.querySelector(".pa-fullscreen-close").addEventListener("click", closePerformanceArenaOverlay);
    const onEscape = event => { if (event.key === "Escape" && performanceArenaOverlay === overlay) closePerformanceArenaOverlay(); };
    overlay.addEventListener("keydown", onEscape);
    window.setTimeout(() => {
      if (token !== performanceArenaOpenToken || performanceArenaOverlay !== overlay) return;
      const loading = overlay.querySelector(".pa-fullscreen-loading");
      const content = overlay.querySelector(".pa-fullscreen-content");
      loading.remove();
      content.hidden = false;
      if (window.MechnarPerformanceArena && typeof window.MechnarPerformanceArena.render === "function") {
        window.MechnarPerformanceArena.render(content);
      } else {
        content.textContent = "Performance Arena could not load. Refresh the application and try again.";
      }
      overlay.querySelector(".pa-fullscreen-close").focus();
    }, 1800);
  }

  // Keep recently visited workspaces mounted off-screen. Returning to a page
  // restores its live DOM, form state, scroll position and event handlers
  // instead of rebuilding the workspace and repeating its API requests.
  const pageViewCache = new Map();
  const pageScrollCache = new Map();
  const PAGE_VIEW_CACHE_LIMIT = 12;

  function cacheCurrentPage(pageId, pageContent) {
    if (!pageId || !pageContent || !pageContent.childNodes.length) return;
    const fragment = document.createDocumentFragment();
    while (pageContent.firstChild) fragment.appendChild(pageContent.firstChild);
    pageViewCache.delete(pageId);
    pageViewCache.set(pageId, fragment);
    pageScrollCache.set(pageId, {
      windowY: window.scrollY || 0,
      contentTop: pageContent.scrollTop || 0
    });
    while (pageViewCache.size > PAGE_VIEW_CACHE_LIMIT) {
      const oldest = pageViewCache.keys().next().value;
      pageViewCache.delete(oldest);
      pageScrollCache.delete(oldest);
    }
  }

  async function renderPage(pageId) {
    const previousPage = state.currentPage;
    if (pageId === "personnel" && String(auth.getCurrentUser()?.role || "").toLowerCase() === "supervisor") {
      if (previousPage && previousPage !== "personnel") personnelPreviousPage = previousPage;
      state.currentPage = pageId;
      const menuElement = getElement("workspace-navigation");
      if (menuElement && window.CleanTrackNavigation) window.CleanTrackNavigation.renderMenu(menuElement);
      if (window.CleanTrackPreferences) window.CleanTrackPreferences.applyTheme();
      openPersonnelOverlay();
      return;
    }
    if (pageId !== "personnel" && personnelOverlay) {
      personnelOverlay.remove();
      personnelOverlay = null;
      personnelOpenToken++;
      personnelPreviousPage = null;
    }
    if (pageId === "performance" && String(auth.getCurrentUser()?.role || "").toLowerCase() === "supervisor") {
      if (previousPage && previousPage !== "performance") performanceArenaPreviousPage = previousPage;
      state.currentPage = pageId;
      const menuElement = getElement("workspace-navigation");
      if (menuElement && window.CleanTrackNavigation) window.CleanTrackNavigation.renderMenu(menuElement);
      if (window.CleanTrackPreferences) window.CleanTrackPreferences.applyTheme();
      openPerformanceArenaOverlay();
      return;
    }
    if (pageId !== "performance" && performanceArenaOverlay) {
      performanceArenaOverlay.remove();
      performanceArenaOverlay = null;
      performanceArenaOpenToken++;
      performanceArenaPreviousPage = null;
    }
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

    // Save the workspace being left before changing the visible page.
    if (previousPage && previousPage !== pageId) {
      const supervisorRole = String(user?.role || "").toLowerCase() === "supervisor";
      const isOverlayRoute = supervisorRole && ["personnel", "performance"].includes(previousPage);
      if (!isOverlayRoute) cacheCurrentPage(previousPage, pageContent);
    }

    // Restore previously opened workspaces instantly without re-running
    // their render functions or their initial API requests.
    const cachedView = pageViewCache.get(pageId);
    if (cachedView) {
      pageViewCache.delete(pageId);
      pageContent.replaceChildren(cachedView);
      const savedScroll = pageScrollCache.get(pageId);
      requestAnimationFrame(() => {
        if (savedScroll) {
          window.scrollTo(0, savedScroll.windowY);
          pageContent.scrollTop = savedScroll.contentTop;
        }
      });
      if (window.CleanTrackPreferences) window.CleanTrackPreferences.applyTheme();
      return;
    }

    pageContent.replaceChildren();
    beginInstantPageFrame(pageContent, pageId);
    // Re-apply the signed-in user's display preference as routes change.
    if (window.CleanTrackPreferences) window.CleanTrackPreferences.applyTheme();

    if (pageId === "performance-analysis" && String(user?.role || "").toLowerCase() === "supervisor") {
      if (window.MechnarPerformanceAnalysis && typeof window.MechnarPerformanceAnalysis.render === "function") {
        await window.MechnarPerformanceAnalysis.render(pageContent);
      } else {
        pageContent.textContent = "Performance Analysis could not load. Refresh the application and try again.";
      }
      return;
    }

    if (pageId === "meetings" && ["admin","supervisor","staff","employee"].includes(String(user?.role || "").toLowerCase())) {
      if (window.MechnarMeetings && typeof window.MechnarMeetings.render === "function") {
        await window.MechnarMeetings.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Meetings could not load. Refresh the page and try again." }));
      }
      return;
    }

    if (pageId === "reviews" && String(user?.role || "").toLowerCase() === "supervisor") {
      if (window.MechnarSupervisorReviewQueue && typeof window.MechnarSupervisorReviewQueue.render === "function") {
        await window.MechnarSupervisorReviewQueue.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Supervisor Review Queue could not load. Refresh the page and try again."
        }));
      }
      return;
    }

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
    if (["staff", "employee"].includes(String(user?.role || "").toLowerCase()) && pageId === "incident-reports") {
      if (window.MechnarStaffIncidents && typeof window.MechnarStaffIncidents.render === "function") {
        window.MechnarStaffIncidents.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Staff incident reporting could not load. Refresh the page and try again." }));
      }
      return;
    }

    if (pageId === "inspections" && ["staff", "employee"].includes(String(user?.role || "").toLowerCase())) {
      if (window.MechnarQualityInspections) await window.MechnarQualityInspections.render(pageContent, "staff");
      else pageContent.textContent = "Team Leader inspections could not load. Refresh the page and try again.";
      return;
    }
    if (pageId === "inspections" && String(user?.role || "").toLowerCase() === "admin") {
      if (window.MechnarQualityInspections) await window.MechnarQualityInspections.render(pageContent, "admin");
      else pageContent.textContent = "Quality reports could not load. Refresh the page and try again.";
      return;
    }
    if (pageId === "inspections" && String(user?.role || "").toLowerCase() === "supervisor") {
      if (window.MechnarQualityInspections) await window.MechnarQualityInspections.render(pageContent, "supervisor");
      else pageContent.textContent = "Inspections & Quality could not load. Refresh the page and try again.";
      return;
    }

    if (String(user?.role || "").toLowerCase() === "supervisor" && ["incidents", "handovers"].includes(pageId)) {
      if (window.MechnarSupervisorRecords && typeof window.MechnarSupervisorRecords.render === "function") {
        await window.MechnarSupervisorRecords.render(pageContent, pageId);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "This Supervisor module could not load. Refresh the page and try again." }));
      }
      return;
    }

    // Supervisor My Workspace is rendered from the live, team-scoped backend endpoint.
    if (String(user?.role || "").toLowerCase() === "supervisor" && pageId === "workspace") {
      if (window.MechnarSupervisorWorkspace && typeof window.MechnarSupervisorWorkspace.render === "function") {
        await window.MechnarSupervisorWorkspace.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Supervisor workspace could not load. Refresh and try again." }));
      }
      return;
    }

    if (String(user?.role || "").toLowerCase() === "supervisor" && pageId === "personnel") {
      if (window.MechnarPersonnel && typeof window.MechnarPersonnel.render === "function") {
        await window.MechnarPersonnel.render(pageContent);
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Personnel could not load. Refresh and try again." }));
      }
      return;
    }

    if (String(user?.role || "").toLowerCase() === "supervisor" && pageId === "performance") {
      if (window.MechnarPerformanceArena && typeof window.MechnarPerformanceArena.render === "function") {
        window.MechnarPerformanceArena.render(pageContent);
      } else {
        pageContent.textContent = "Performance Arena could not load. Refresh the application and try again.";
      }
      return;
    }

    if (String(user?.role || "").toLowerCase() === "supervisor" && pageId === "sites") {
      if (window.MechnarSupervisorSitesZones && typeof window.MechnarSupervisorSitesZones.render === "function") {
        await window.MechnarSupervisorSitesZones.render(pageContent);
      } else {
        pageContent.textContent = "Sites & Zones could not load. Refresh the page and try again.";
      }
      return;
    }

    if (String(user?.role || "").toLowerCase() === "supervisor" &&
        ["reviews", "performance"].includes(pageId)) {
      const descriptions = {
        personnel: ["Personnel", "Manage staff belonging to your assigned team, including profiles and work assignments."],
        teams: ["Teams", "Manage your own team and view other organization teams in read-only mode. Other teams' employee records and private operations remain inaccessible."],
        reviews: ["Review Queue", "Inspect submitted work and completion evidence, then approve or reject submissions with a recorded reason."],
        sites: ["Sites & Zones", "View the locations, floors and zones assigned to your team. Management actions will follow your permissions."],
        performance: ["Performance Arena", "View your team's position, an overall team ranking and separate rankings by performance measure. Comparisons will account for workload and operation difficulty."],
        reports: ["Reports", "Generate and access reports limited to your own team's authorized data."]
      };
      const details = descriptions[pageId];
      const heading = document.createElement("h1");
      heading.textContent = details[0];
      const description = document.createElement("p");
      description.textContent = details[1];
      description.style.cssText = "max-width:780px;line-height:1.7;opacity:.84;";
      const notice = document.createElement("section");
      notice.style.cssText = "margin-top:22px;padding:20px 22px;border:1px solid var(--border,#343944);border-radius:15px;background:var(--surface,#171a21);max-width:900px;";
      const noticeTitle = document.createElement("h2");
      noticeTitle.textContent = "Page structure added";
      const noticeText = document.createElement("p");
      noticeText.textContent = "The page is in the Supervisor workspace. Its data, controls and workflows will be implemented in the next feature stage.";
      noticeText.style.cssText = "line-height:1.65;opacity:.82;";
      notice.append(noticeTitle, noticeText);
      pageContent.append(heading, description, notice);
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

    if (pageId === "team-channel") {
      const role = String(user?.role || "").toLowerCase();
      if (role === "supervisor") {
        if (window.MechnarSupervisorTeamChannel && typeof window.MechnarSupervisorTeamChannel.render === "function") {
          await window.MechnarSupervisorTeamChannel.render(pageContent);
        } else {
          pageContent.appendChild(Object.assign(document.createElement("p"), {
            textContent: "Team Channel could not load. Refresh and try again."
          }));
        }
      } else if (role === "employee") {
        if (window.CleanTrackAnnouncements && typeof window.CleanTrackAnnouncements.render === "function") {
          await window.CleanTrackAnnouncements.render(pageContent, "team-channel");
          if (window.MechnarOrgTools?.renderTeamPolicy) {
            const policySection = document.createElement("section");
            policySection.className = "ct-staff-team-policy";
            await window.MechnarOrgTools.renderTeamPolicy(policySection, true);
            pageContent.appendChild(policySection);
          }
        } else {
          pageContent.appendChild(Object.assign(document.createElement("p"), {
            textContent: "Team Channel could not load. Refresh and try again."
          }));
        }
      } else {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "The Team Channel is not available to this role."
        }));
      }
      return;
    }

    if (pageId === "announcements") {
      if (!["admin", "employee"].includes(String(user?.role || "").toLowerCase())) {
        pageContent.appendChild(Object.assign(document.createElement("p"), {
          textContent: "Announcements are not available to this role."
        }));
        return;
      }
      if (window.CleanTrackAnnouncements && typeof window.CleanTrackAnnouncements.render === "function") {
        await window.CleanTrackAnnouncements.render(pageContent, "announcements");
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
      if (!["admin", "supervisor"].includes(String(user?.role || "").toLowerCase())) {
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
      const userName = user?.name || user?.email || "there";
      const greetingKey = "mechnar.workspace-greeting-shown." + String(user?.id ?? user?.email ?? "current").toLowerCase();
      let showWorkspaceGreeting = false;
      try {
        showWorkspaceGreeting = sessionStorage.getItem(greetingKey) !== "1";
        if (showWorkspaceGreeting) sessionStorage.setItem(greetingKey, "1");
      } catch (_) { showWorkspaceGreeting = true; }
      if (showWorkspaceGreeting) {
        const intro = document.createElement("p");
        intro.textContent = `Welcome back, ${userName}.`;
        intro.className = "workspace-login-greeting";
        pageContent.appendChild(intro);
      }

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
      try {
        const role = String(user?.role || "").toLowerCase();
        if (role !== "admin" && role !== "supervisor") {
          const message = document.createElement("p");
          message.textContent = "Teams is available to Admin and Supervisor users.";
          pageContent.appendChild(message);
          return;
        }

        // Teams renders as its own full-screen workspace. Await its complete
        // role-specific render before dismissing the "Working on it" screen.
        if (window.CleanTrackTeams &&
            typeof window.CleanTrackTeams.render === "function") {
          await window.CleanTrackTeams.render(pageContent);
        } else {
          const message = document.createElement("p");
          message.textContent =
            "The Teams module has not loaded. Check the teams.js script path.";
          pageContent.appendChild(message);
        }
      } finally {
        window.dispatchEvent(new CustomEvent("mechnar:teams-ready"));
      }
      return;
    }

    if (pageId === "inventory") {
      const tools = window.MechnarOrgTools;
      if (!tools?.renderInventory) {
        pageContent.appendChild(Object.assign(document.createElement("p"), { textContent: "Inventory could not load. Refresh the page and try again." }));
        return;
      }
      await tools.renderInventory(pageContent);
      return;
    }

    const message = document.createElement("p");
    message.className = "page-placeholder";
    message.textContent =
      "This section will be connected as its feature is implemented.";
    pageContent.appendChild(message);
  }

  
  function setNotificationBellMotion(button, active) {
    if (!button) return;
    // CSS owns the visual treatment: a stationary bell with a vertical shimmer.
    // Never apply Web Animations or inline transforms here; those caused ringing.
    if (active) button.classList.add("has-unopened-notifications");
    else button.classList.remove("has-unopened-notifications");
    button.style.removeProperty("animation");
    button.style.removeProperty("filter");
    const icon = button.querySelector(".notification-bell-icon");
    const svg = icon && icon.querySelector("svg");
    [icon, svg].filter(Boolean).forEach(function (node) {
      ["animation", "transform", "transform-origin", "transform-box"].forEach(function (name) {
        node.style.removeProperty(name);
      });
    });
    const badge = getElement("notification-count");
    if (badge) badge.style.removeProperty("animation");
  }

  async function refreshNotificationBadge() {
    const badge = getElement("notification-count");
    if (!badge || !window.CleanTrackApi || !auth.isAuthenticated()) return;
    try {
      const data = await window.CleanTrackApi.get("notifications");
      const rows = Array.isArray(data.notifications) ? data.notifications : [];
      const unreadRows = rows.filter(item => item.is_read === false && item.id != null);
      const count = Number(data.unread_count ?? unreadRows.length);
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count <= 0;
      const notificationButton = getElement("notifications-button");
      if (notificationButton) {
        notificationButton.dataset.notificationUnreadCount = String(count);
        let acknowledged = [];
        try { acknowledged = JSON.parse(notificationButton.dataset.notificationAcknowledgedIds || "[]"); } catch (_) {}
        const acknowledgedIds = new Set(acknowledged.map(String));
        const hasNewUnread = unreadRows.some(item => !acknowledgedIds.has(String(item.id))) || (count > 0 && unreadRows.length === 0 && notificationButton.dataset.notificationPanelOpen !== "true");
        const panelIsOpen = notificationButton.dataset.notificationPanelOpen === "true";
        setNotificationBellMotion(notificationButton, hasNewUnread && !panelIsOpen);
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
      // Stop the bell immediately when the user opens the notification panel.
      // The unread state itself is not changed by opening the panel.
      button.dataset.notificationPanelOpen = "true";
      setNotificationBellMotion(button, false);
      // Acknowledge exact unread notification IDs, not the count.
      try {
        const current = await window.CleanTrackApi.get("notifications");
        const currentRows = Array.isArray(current.notifications) ? current.notifications : [];
        const ids = currentRows.filter(item => !item.is_read && item.id != null).map(item => String(item.id)).slice(0, 300);
        button.dataset.notificationAcknowledgedIds = JSON.stringify(ids);
      } catch (_) {}
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
      if (dialog.dataset.notificationCloseBound !== "true") {
        dialog.dataset.notificationCloseBound = "true";
        dialog.addEventListener("close", function () {
          button.dataset.notificationPanelOpen = "false";
          refreshNotificationBadge();
        });
      }
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
        try {
          const user = auth.getCurrentUser?.();
          const greetingKey = "mechnar.workspace-greeting-shown." + String(user?.id ?? user?.email ?? "current").toLowerCase();
          sessionStorage.removeItem(greetingKey);
        } catch (_) {}
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

function bindAvatarEditProfile() {
  if (window.__cleanTrackAvatarEditProfileBound) return;
  window.__cleanTrackAvatarEditProfileBound = true;

  const menu = getElement("profile-menu");
  const menuButton = getElement("profile-menu-button");

  function closeMenu() {
    if (menu) menu.hidden = true;
    if (menuButton) menuButton.setAttribute("aria-expanded", "false");
  }
  function openOrCloseMenu(event) {
    if (!menu || !menuButton) return;
    event.preventDefault();
    event.stopPropagation();
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuButton.setAttribute("aria-expanded", opening ? "true" : "false");
  }
  async function openEditProfile(event) {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    // Settings renders the Account panel by default; set the explicit hash before
    // navigating so the account owner lands directly on their editable profile.
    try { window.history.replaceState(null, "", "#settings-account"); } catch (_) {
      window.location.hash = "settings-account";
    }
    const nav = window.CleanTrackNavigation || navigation;
    if (!nav || typeof nav.setActivePage !== "function" || !nav.setActivePage("settings")) {
      window.location.hash = "settings-account";
      return;
    }
    window.setTimeout(function () {
      const settings = document.querySelector(".ct-settings-page");
      const accountPanel = settings && settings.querySelector('[data-settings-panel="account"]');
      if (accountPanel) {
        accountPanel.hidden = false;
        settings.querySelectorAll("[data-settings-panel]").forEach(function (panel) {
          if (panel !== accountPanel) panel.hidden = true;
        });
        settings.querySelectorAll("[data-settings-nav]").forEach(function (item) {
          const active = item.dataset.settingsNav === "account";
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-current", active ? "page" : "false");
        });
      }
    }, 0);
  }

  if (menuButton) menuButton.addEventListener("click", openOrCloseMenu);
  document.addEventListener("click", function(event) {
    const editButton = event.target.closest('[data-action="edit-profile"]');
    if (editButton) {
      openEditProfile(event);
      return;
    }
    if (menu && menuButton && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") closeMenu();
  });
}

function bindNavigation() {
  // App startup can run again after authentication transitions. Bind navigation
  // handlers only once so a single Settings click cannot trigger duplicate renders.
  if (window.__cleanTrackNavigationBound) return;
  window.__cleanTrackNavigationBound = true;
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
      const isJoining = role === "supervisor" || role === "staff" || role === "employee";
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
        const requestedRoleRaw = String(params.get("role") || "").toLowerCase();
        const requestedRole = requestedRoleRaw === "employee" ? "staff" :
          (["supervisor", "staff"].includes(requestedRoleRaw) ? requestedRoleRaw : "supervisor");
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

    // Two-stage recovery: request emailed code, then validate code and set a new password.
    const recoveryForm = getElement("forgot-password-form");
    if (recoveryForm && recoveryForm.dataset.bound !== "true") {
      recoveryForm.dataset.bound = "true";
      let recoveryStage = "request";
      recoveryForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const message = getElement("forgot-password-message");
        const submit = getElement("forgot-password-submit");
        const email = String(getElement("forgot-password-email")?.value || "").trim().toLowerCase();
        const codeField = getElement("reset-code-field");
        const newField = getElement("reset-new-password-field");
        const confirmField = getElement("reset-confirm-password-field");
        const codeInput = getElement("forgot-password-code");
        const newPasswordInput = getElement("forgot-password-new-password");
        const confirmPasswordInput = getElement("forgot-password-confirm-password");
        const setMessage = (text, kind) => {
          if (message) { message.textContent = text; message.className = "form-message " + (kind || ""); }
        };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setMessage("Enter a valid registered email address.", "error");
          return;
        }
        if (submit) { submit.disabled = true; submit.textContent = recoveryStage === "request" ? "Sending code…" : "Resetting password…"; }
        try {
          if (recoveryStage === "request") {
            await window.CleanTrackApi.post("auth/forgot-password", { email });
            recoveryStage = "reset";
            if (codeField) codeField.hidden = false;
            if (newField) newField.hidden = false;
            if (confirmField) confirmField.hidden = false;
            if (codeInput) { codeInput.required = true; codeInput.focus(); }
            if (newPasswordInput) newPasswordInput.required = true;
            if (confirmPasswordInput) confirmPasswordInput.required = true;
            if (submit) submit.textContent = "Reset password";
            setMessage("If an account exists for that email, a reset code has been sent. Check your inbox and spam folder. The code expires in 10 minutes.", "success");
          } else {
            const code = String(codeInput?.value || "").trim();
            const newPassword = String(newPasswordInput?.value || "");
            const confirmPassword = String(confirmPasswordInput?.value || "");
            if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code sent to your email.");
            if (newPassword.length < 8 || newPassword.length > 128) throw new Error("Your new password must be 8 to 128 characters.");
            if (newPassword !== confirmPassword) throw new Error("The passwords do not match.");
            const result = await window.CleanTrackApi.post("auth/reset-password", {
              email, code, new_password: newPassword
            });
            setMessage(result.message || "Password updated. You can now sign in.", "success");
            recoveryForm.reset();
            recoveryStage = "request";
            [codeField, newField, confirmField].forEach(el => { if (el) el.hidden = true; });
            [codeInput, newPasswordInput, confirmPasswordInput].forEach(el => { if (el) el.required = false; });
            if (submit) submit.textContent = "Send reset code";
            window.setTimeout(() => {
              const back = document.querySelector('[data-view="login"]');
              if (back) back.click();
            }, 1800);
          }
        } catch (error) {
          setMessage(error.message || "Password recovery failed. Please try again.", "error");
        } finally {
          if (submit) submit.disabled = false;
          if (submit && recoveryStage === "request") submit.textContent = "Send reset code";
          else if (submit && recoveryStage === "reset") submit.textContent = "Reset password";
        }
      });
    }

    if (form.dataset.loginBound === "true") return;
    form.dataset.loginBound = "true";
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
        try {
          const greetingIdentity = String(user?.id ?? user?.email ?? "current").toLowerCase();
          sessionStorage.setItem("mechnar.workspace-greeting-pending." + greetingIdentity, "1");
          sessionStorage.removeItem("mechnar.workspace-greeting-shown." + greetingIdentity);
        } catch (_) {}
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
      }, 30000);
    }
    bindLoginForm();
    if (typeof bindRegistrationForm === "function") {
  bindRegistrationForm();
}
    bindLogoutButton();
    bindNavigation();
    bindAvatarEditProfile();

    // Resolve authentication behind the interactive title screen. Entry is
    // user-controlled: tap/click anywhere or press Enter.
    const splash = document.getElementById("cleantrack-launch-splash");
    let launchUser = null, launchReady = false, launchRequested = false, launchDelayElapsed = false;
    let launchEntryPending = false;
    const finishLaunch = function () {
      if (!splash || !splash.isConnected || !launchReady || !launchDelayElapsed) return;

      // Prepare the correct destination UNDER the splash before fading it.
      // Otherwise the default auth markup is exposed during the 520ms exit
      // transition, causing a login-page flash before the authenticated app.
      if (launchUser) {
        try {
          const greetingIdentity = String(launchUser?.id ?? launchUser?.email ?? "current").toLowerCase();
          sessionStorage.setItem("mechnar.workspace-greeting-pending." + greetingIdentity, "1");
          sessionStorage.removeItem("mechnar.workspace-greeting-shown." + greetingIdentity);
        } catch (_) {}
        showAuthenticatedLayout(launchUser);
      } else {
        showUnauthenticatedLayout();
      }

      splash.classList.add("ct-launch-exiting");
      window.setTimeout(function () {
        splash.remove();
      }, 520);
    };
    // Create audio only after a real user gesture. Some browsers keep an
    // AudioContext created during page load permanently suspended on first play.
    let launchAudioContext = null;
    const playLaunchChime = function () {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!launchAudioContext || launchAudioContext.state === "closed") {
          launchAudioContext = new AudioContextClass({ latencyHint: "interactive" });
        }
        const context = launchAudioContext;
        const play = function () {
          // Do not wait for state === running: that check was dropping the
          // first tap's sound while resume() was still resolving. Nodes can be
          // scheduled on the suspended audio clock and play as it resumes.
          const now = context.currentTime;
          const master = context.createGain();
          const compressor = context.createDynamicsCompressor();
          master.gain.setValueAtTime(0.24, now);
          master.gain.setTargetAtTime(0.0001, now + 1.05, 0.24);
          compressor.threshold.setValueAtTime(-20, now);
          compressor.knee.setValueAtTime(18, now);
          compressor.ratio.setValueAtTime(4, now);
          master.connect(compressor);
          compressor.connect(context.destination);
          [
            { hz: 174.61, delay: 0, duration: 1.20, level: 0.22, type: "sine" },
            { hz: 261.63, delay: 0, duration: 1.05, level: 0.13, type: "sine" },
            { hz: 349.23, delay: 0, duration: 0.90, level: 0.075, type: "triangle" },
            { hz: 233.08, delay: 0, duration: 0.85, level: 0.045, type: "sine" }
          ].forEach(function (tone) {
            const oscillator = context.createOscillator();
            const envelope = context.createGain();
            const startAt = now + tone.delay;
            oscillator.type = tone.type;
            oscillator.frequency.setValueAtTime(tone.hz, startAt);
            envelope.gain.setValueAtTime(0.0001, startAt);
            envelope.gain.exponentialRampToValueAtTime(tone.level, startAt + 0.006);
            envelope.gain.setTargetAtTime(0.0001, startAt + tone.duration * 0.55, 0.22);
            oscillator.connect(envelope);
            envelope.connect(master);
            oscillator.start(startAt);
            oscillator.stop(startAt + tone.duration);
          });
          window.setTimeout(function () {
            try { master.disconnect(); compressor.disconnect(); } catch (_) {}
          }, 1900);
        };
        // Schedule the sound synchronously inside pointerdown/keydown.
        // If the context is suspended, the nodes wait on its audio clock and
        // begin as soon as resume() is accepted; we do not wait for its promise.
        if (context.state !== "running") {
          const resumeResult = context.resume();
          if (resumeResult && typeof resumeResult.catch === "function") {
            resumeResult.catch(function (error) {
              console.warn("MECHNAR launch audio could not resume:", error);
            });
          }
        }
        play();
      } catch (error) {
        console.warn("MECHNAR launch audio is unavailable:", error);
      }
    };
    const enterApplication = function () {
      if (launchEntryPending || !splash || !splash.isConnected) return;
      // Do not allow the icon-only intro to be skipped; entry begins on the animated title screen.
      if (!splash.classList.contains("ct-launch-title-active")) return;
      launchEntryPending = true;
      splash.classList.add("ct-launch-preparing");
      const beginButton = splash.querySelector(".ct-launch-begin");
      if (beginButton) {
        beginButton.textContent = "PREPARING MECHNAR";
        beginButton.setAttribute("aria-label", "Preparing MECHNAR");
      }
      window.setTimeout(function () {
        if (!splash.isConnected) return;
        launchDelayElapsed = true;
        launchRequested = true;
        finishLaunch();
      }, 3200);
    };
    if (splash) {
      // Pointer-down fires at the instant the finger/mouse touches the title screen,
      // rather than waiting for the later click event after release.
      splash.addEventListener("pointerdown", function (event) {
        if (event.isPrimary !== false && event.button !== 2) { playLaunchChime(); enterApplication(); }
      }, { passive: true });
      // Keep a click fallback for assistive technology that synthesizes clicks.
      splash.addEventListener("click", function (event) {
        if (event.detail === 0) { playLaunchChime(); enterApplication(); }
      });
      splash.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); playLaunchChime(); enterApplication(); }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.altKey && !event.ctrlKey && !event.metaKey && splash.isConnected) {
          event.preventDefault();
          playLaunchChime();
          enterApplication();
        }
      });
    }
    setLoading(false);
    try {
      const restoredUser = await auth.restoreSession();
      launchUser = (auth.getCurrentUser && auth.getCurrentUser()) || restoredUser || null;
    } catch (error) {
      state.error = error.message;
      launchUser = null;
    } finally {
      launchReady = true;
      if (launchRequested && launchDelayElapsed) finishLaunch();
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