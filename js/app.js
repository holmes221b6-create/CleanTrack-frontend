
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
        master.gain.exponentialRampToValueAtTime(0.42, now + 0.12);
        master.gain.setValueAtTime(0.31, now + 0.42);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 3.05);

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-20, now);
        compressor.knee.setValueAtTime(18, now);
        compressor.ratio.setValueAtTime(4, now);
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
        lowGain.gain.exponentialRampToValueAtTime(0.55, now + 0.16);
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
          gain.gain.exponentialRampToValueAtTime(i === 2 ? 0.15 : 0.22, now + 0.18 + i * 0.04);
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
        breathGain.gain.exponentialRampToValueAtTime(0.21, now + 0.38);
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
        wet.gain.setValueAtTime(0.29, now);
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
    if (!user) return;
    const steps = setupSteps(user.role);
    let index = Math.max(0, Math.min(Number(startIndex) || 0, steps.length - 1));
    const overlay = document.createElement("div");
    overlay.className = "ct-setup-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ct-setup-title");
    const style = document.createElement("style");
    style.textContent = ".ct-setup-overlay{position:fixed;inset:0;z-index:999990;background:#0009;display:flex;align-items:center;justify-content:center;padding:18px;font-family:inherit}.ct-setup-card{width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--surface,#202329);color:var(--text,#f3f4f6);border:1px solid var(--border,#3a3d44);border-radius:26px;padding:clamp(22px,4vw,38px);box-shadow:0 24px 90px #0005}.ct-setup-mark{width:58px;height:58px;margin:0 auto 18px;border-radius:18px;display:grid;place-items:center;background:#173c2c;color:#6ee7a4;font-size:27px}.ct-setup-card h2{text-align:center;margin:0 0 8px;font-size:26px}.ct-setup-intro{text-align:center;opacity:.8;line-height:1.5;margin:0 auto 18px}.ct-setup-progress{display:flex;justify-content:center;gap:7px;margin:18px}.ct-setup-dot{width:9px;height:9px;border-radius:50%;background:#59615f}.ct-setup-dot.active{background:#25b56a}.ct-setup-step{border:1px solid var(--border,#3a3d44);border-radius:16px;padding:18px;margin:20px 0}.ct-setup-step p{opacity:.86;line-height:1.6}.ct-setup-actions{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-top:22px}.ct-setup-actions button{border-radius:12px;padding:12px 18px;border:1px solid var(--border,#41454e);background:transparent;color:inherit;font:inherit;font-weight:650;cursor:pointer}.ct-setup-actions .primary{background:#16a34a;border-color:#16a34a;color:white;flex:1}.ct-setup-meta{text-align:center;opacity:.65;font-size:13px}.ct-setup-language{display:flex;justify-content:center}.ct-setup-language select{background:var(--surface,#202329);color:inherit;border:1px solid var(--border,#41454e);padding:8px 12px;border-radius:10px}.ct-tour-focus{position:relative!important;z-index:999989!important;outline:3px solid #43e58b!important;outline-offset:5px!important;box-shadow:0 0 0 8px #22c55e35,0 0 28px #22c55e50!important;scroll-margin:110px;animation:ct-tour-pulse 1.8s ease-in-out infinite}@keyframes ct-tour-pulse{0%,100%{outline-offset:4px}50%{outline-offset:8px}}.ct-tour-coach{position:fixed;z-index:999999;right:22px;bottom:22px;display:flex;align-items:flex-start;gap:12px;width:min(490px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:var(--surface,#202329);color:var(--text,#f3f4f6);border:1px solid #27c96b;border-radius:22px;padding:16px;box-shadow:0 22px 75px #000a;animation:ct-tour-arrive .28s ease-out}.ct-tour-avatar{flex:0 0 48px;width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(145deg,#1c9b61,#124a35);color:#fff;font-size:25px;font-weight:850;box-shadow:inset 0 0 0 2px #ffffff28}.ct-tour-speech{min-width:0;flex:1}.ct-tour-kicker{font-size:10px!important;letter-spacing:.15em;font-weight:800;opacity:.72;margin:0 0 5px!important}.ct-tour-coach h3{margin:0 0 8px;font-size:19px}.ct-tour-coach p{line-height:1.5;margin:7px 0}.ct-tour-status{font-size:12px;opacity:.68}.ct-tour-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.ct-tour-coach button{border-radius:10px;padding:10px 12px;border:1px solid var(--border,#41454e);background:transparent;color:inherit;font:inherit;cursor:pointer}.ct-tour-coach .primary{background:#16a34a;color:white;border-color:#16a34a;font-weight:750}@keyframes ct-tour-arrive{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@media(max-width:600px){.ct-tour-coach{right:10px;bottom:10px;width:calc(100vw - 20px);padding:13px}.ct-tour-avatar{width:40px;height:40px;flex-basis:40px;border-radius:13px}}.ct-shadow-mark{position:relative;background:radial-gradient(ellipse at 50% 70%,#0b6570 0%,#08131d 52%,#05080d 100%);border:1px solid #18d6d0;box-shadow:0 0 24px #00d9d044;overflow:hidden}.ct-shadow-glow{position:absolute;inset:7px 9px 2px;border-radius:48% 48% 18% 18%;background:linear-gradient(145deg,#182d42,#03060b 68%);clip-path:polygon(50% 0,100% 38%,84% 100%,16% 100%,0 38%)}.ct-shadow-hood{position:absolute;inset:12px 13px 10px;background:linear-gradient(135deg,#101e2d,#020407 70%);clip-path:polygon(50% 0,100% 48%,82% 100%,18% 100%,0 48%);border-bottom:1px solid #1de9e0}.ct-shadow-hood i{position:absolute;top:55%;width:6px;height:3px;background:#47fff4;box-shadow:0 0 7px #00f6ff;border-radius:50%}.ct-shadow-hood i:first-child{left:22%}.ct-shadow-hood i:nth-child(2){right:22%}.ct-tour-coach{position:fixed;inset:0;z-index:999999;width:100vw;height:100vh;max-height:none;overflow:visible;display:block;pointer-events:none;background:transparent;border:0;border-radius:0;padding:0;box-shadow:none;animation:none;color:#f3f7fa}.ct-tour-avatar{position:fixed;left:3vw;bottom:0;width:min(34vw,490px);height:min(83vh,790px);display:flex;align-items:flex-end;justify-content:center;overflow:visible;background:radial-gradient(ellipse at 50% 85%,#087b8044 0%,#06101b00 70%);border:0;box-shadow:none;pointer-events:none;transition:opacity .22s ease,transform .22s ease}.ct-shadow-character{position:relative;display:block;width:min(31vw,440px);height:min(79vh,740px);filter:drop-shadow(0 0 28px #00e5df24) drop-shadow(0 22px 32px #000);animation:ct-shadow-hover 4.2s ease-in-out infinite;transform-origin:bottom center}.ct-shadow-cloak{position:absolute;inset:108px 0 0;background:linear-gradient(100deg,#17212d 0%,#070a11 19%,#010204 48%,#080d13 76%,#16303a 100%);clip-path:polygon(50% 0,64% 5%,73% 12%,82% 10%,88% 23%,94% 38%,100% 100%,0 100%,6% 38%,12% 23%,18% 10%,27% 12%,36% 5%);border-top:2px solid #17434a;box-shadow:inset 0 22px 35px #000}.ct-shadow-cloak:before{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,transparent 18%,#14202c 24%,transparent 30%,transparent 68%,#182a33 76%,transparent 82%),linear-gradient(180deg,#010204 0%,#03070c 48%,#000 100%);clip-path:polygon(50% 0,58% 12%,53% 100%,47% 100%,42% 12%);opacity:.95}.ct-shadow-cloak:after{content:\"\";position:absolute;left:16%;right:16%;top:10%;height:32%;background:linear-gradient(180deg,#05080d,#000);clip-path:polygon(0 0,22% 18%,50% 100%,78% 18%,100% 0,83% 64%,50% 100%,17% 64%);filter:drop-shadow(0 0 8px #00b9bd22)}.ct-shadow-hood{position:absolute;top:12px;left:50%;width:clamp(100px,12vw,156px);height:142px;transform:translateX(-50%);border-radius:0;background:linear-gradient(110deg,#293441 0%,#10151e 19%,#030407 54%,#090f16 76%,#27343d 100%);clip-path:polygon(50% 0,59% 12%,72% 3%,77% 18%,94% 25%,100% 48%,86% 63%,79% 100%,21% 100%,14% 63%,0 48%,6% 25%,23% 18%,28% 3%,41% 12%);border:0;box-shadow:0 0 0 1px #18343a,0 0 24px #00e5df20;isolation:isolate}.ct-shadow-hood:before{content:\"\";position:absolute;inset:22% 13% 4%;background:radial-gradient(ellipse at 50% 32%,#111923 0%,#020306 57%,#000 100%);clip-path:polygon(50% 0,100% 28%,81% 100%,19% 100%,0 28%);z-index:-1}.ct-shadow-hood:after{content:\"\";position:absolute;inset:0;background:linear-gradient(135deg,#7a899022,transparent 28%,transparent 72%,#70f7ed12);clip-path:polygon(50% 0,59% 12%,72% 3%,77% 18%,94% 25%,100% 48%,86% 63%,79% 100%,21% 100%,14% 63%,0 48%,6% 25%,23% 18%,28% 3%,41% 12%);pointer-events:none}.ct-shadow-eyes{position:absolute;top:82px;left:50%;width:76px;height:15px;transform:translateX(-50%) rotate(-5deg);background:linear-gradient(90deg,transparent 0%,#fffbf0 14%,#d9ffff 28%,#00f6ff 40%,transparent 47%,transparent 53%,#00f6ff 60%,#d9ffff 72%,#fffbf0 86%,transparent 100%);clip-path:polygon(0 20%,42% 0,50% 42%,58% 0,100% 20%,78% 100%,58% 70%,50% 100%,42% 70%,22% 100%);filter:drop-shadow(0 0 5px #8fffff) drop-shadow(0 0 15px #00f6ff);animation:ct-shadow-gaze 5s ease-in-out infinite}.ct-shadow-core{position:absolute;top:117px;left:50%;width:34px;height:42px;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 0%,#8fffff66 0%,#00dce522 30%,transparent 72%);filter:blur(5px);opacity:.65}.ct-shadow-character:before{content:\"\";position:absolute;z-index:2;top:0;left:50%;width:clamp(126px,15vw,190px);height:92px;transform:translateX(-50%);background:linear-gradient(110deg,#111a24,#020306 42%,#17222c 70%,#030406);clip-path:polygon(50% 0,56% 18%,65% 4%,69% 25%,82% 12%,83% 33%,100% 44%,83% 56%,73% 49%,68% 76%,59% 64%,50% 100%,41% 64%,32% 76%,27% 49%,17% 56%,0 44%,17% 33%,18% 12%,31% 25%,35% 4%,44% 18%);filter:drop-shadow(0 0 9px #00d9dc24)}.ct-shadow-character:after{content:\"\";position:absolute;z-index:3;top:132px;left:50%;width:clamp(100px,12vw,145px);height:24px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,#020306 20%,#020306 80%,transparent);clip-path:polygon(0 0,34% 28%,50% 0,66% 28%,100% 0,80% 100%,20% 100%);opacity:.9}@keyframes ct-shadow-gaze{0%,42%,48%,100%{opacity:1;filter:drop-shadow(0 0 5px #8fffff) drop-shadow(0 0 15px #00f6ff)}45%{opacity:.42;filter:drop-shadow(0 0 2px #8fffff)}}.ct-tour-avatar:before,.ct-tour-avatar:after{content:none}.ct-tour-coach:before{content:none}.ct-tour-speech{position:fixed;left:35vw;top:25vh;width:min(40vw,650px);max-height:70vh;overflow:auto;pointer-events:auto;padding:24px 30px;background:linear-gradient(145deg,#06131d,#03070d);border:3px solid #21e6d0;border-radius:28px;box-shadow:0 20px 75px #000b,0 0 28px #00e5df22}.ct-tour-speech:before{content:\"\";position:absolute;left:-18px;top:42%;width:28px;height:28px;background:#06131d;border-left:3px solid #21e6d0;border-bottom:3px solid #21e6d0;transform:rotate(45deg)}.ct-tour-speech>*{position:relative}.ct-tour-actions button,.ct-tour-coach button{pointer-events:auto}.ct-tour-coach .ct-shadow-sound-toggle{border-color:#20dcd2;color:#8cfaf2}.ct-tour-coach .ct-shadow-sound-toggle[aria-pressed=false]{opacity:.68}.ct-tour-character-away .ct-tour-avatar{opacity:0;transform:translateX(-22px) scale(.97)}.ct-tour-character-away .ct-tour-speech{left:50%;top:20vh;transform:translateX(-50%);width:min(560px,calc(100vw - 32px))}.ct-tour-coach h3{font-size:21px}.ct-tour-coach p{font-size:14px}.ct-tour-actions button{font-size:13px}@keyframes ct-shadow-hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@media(max-width:700px){.ct-tour-avatar{left:0;width:38vw;height:48vh}.ct-shadow-character{width:38vw;height:46vh;transform:scale(.8);transform-origin:bottom center}.ct-tour-speech{left:31vw;top:18vh;width:calc(69vw - 16px);max-height:65vh;padding:16px;border-width:2px;border-radius:20px}.ct-tour-speech:before{left:-13px;width:20px;height:20px;border-width:2px}.ct-tour-coach h3{font-size:17px}.ct-tour-coach p{font-size:13px}.ct-tour-actions button{padding:8px 9px;font-size:12px}.ct-tour-character-away .ct-tour-speech{left:50%;top:18vh;width:calc(100vw - 28px)}}.ct-tour-kicker:after{content:' · SHADOW’S FIELD GUIDE';color:#38e9e0}.ct-tour-coach .primary{background:#0aaea6;border-color:#20dcd2;color:#031014}@keyframes ct-shadow-breathe{0%,100%{filter:drop-shadow(0 0 3px #00d9d0)}50%{filter:drop-shadow(0 0 9px #00d9d0)}}.ct-shadow-mark,.ct-tour-avatar:after{animation:ct-shadow-breathe 2.8s ease-in-out infinite}.ct-tour-avatar{background:radial-gradient(ellipse at 52% 78%,#650b13a8 0%,#2a050b70 32%,#05030600 72%)!important}.ct-shadow-character{filter:drop-shadow(0 0 18px #e000182e) drop-shadow(0 0 48px #8d000b36) drop-shadow(0 22px 32px #000)!important}.ct-shadow-cloak{inset:122px 0 0!important;background:linear-gradient(100deg,#16090e 0%,#080609 24%,#010102 49%,#090508 76%,#21070c 100%)!important;clip-path:polygon(50% 0,63% 5%,72% 10%,82% 8%,89% 22%,94% 37%,100% 100%,0 100%,6% 37%,11% 22%,18% 8%,28% 10%,37% 5%)!important;border-top:1px solid #3d1018!important}.ct-shadow-cloak:before{background:linear-gradient(90deg,transparent 15%,#210910 25%,transparent 32%,transparent 67%,#230910 78%,transparent 86%),linear-gradient(180deg,#030204 0%,#050306 52%,#000 100%)!important}.ct-shadow-cloak:after{background:linear-gradient(180deg,#0a0508,#000)!important;filter:drop-shadow(0 0 10px #b0001522)!important}.ct-shadow-hood{top:18px!important;width:clamp(112px,13vw,166px)!important;height:178px!important;background:linear-gradient(110deg,#201218 0%,#0c080d 22%,#010102 55%,#10070c 79%,#281019 100%)!important;clip-path:polygon(50% 0,58% 12%,67% 4%,71% 18%,80% 8%,83% 25%,96% 31%,100% 48%,88% 61%,81% 100%,19% 100%,12% 61%,0 48%,4% 31%,17% 25%,20% 8%,29% 18%,33% 4%,42% 12%)!important;box-shadow:0 0 0 1px #321019,0 0 28px #a0001726!important}.ct-shadow-hood:before{inset:25% 13% 2%!important;background:radial-gradient(ellipse at 50% 36%,#020102 0%,#000 70%)!important;clip-path:polygon(50% 0,100% 25%,82% 100%,18% 100%,0 25%)!important}.ct-shadow-hood:after{background:linear-gradient(135deg,#9d24301a,transparent 28%,transparent 70%,#c21b2c12)!important}.ct-shadow-eyes{top:104px!important;width:86px!important;height:18px!important;transform:translateX(-50%) rotate(-2deg)!important;background:linear-gradient(90deg,transparent 0%,#4d0008 8%,#b20a1b 20%,#ff2437 32%,#ff9b9f 43%,transparent 48%,transparent 52%,#ff9b9f 57%,#ff2437 68%,#b20a1b 80%,#4d0008 92%,transparent 100%)!important;clip-path:polygon(0 12%,38% 20%,50% 0,62% 20%,100% 12%,80% 76%,61% 63%,50% 100%,39% 63%,20% 76%)!important;filter:drop-shadow(0 0 5px #ff1d35) drop-shadow(0 0 15px #d0001b)!important;animation:ct-shadow-gaze 6s ease-in-out infinite!important}.ct-shadow-core{top:139px!important;width:38px!important;height:54px!important;background:radial-gradient(ellipse at 50% 0%,#b5091b4a 0%,#6d061b22 32%,transparent 72%)!important;opacity:.8!important}.ct-shadow-character:before{top:0!important;width:clamp(142px,16vw,205px)!important;height:112px!important;background:linear-gradient(110deg,#21131a,#030203 42%,#1b0b11 70%,#030203)!important;clip-path:polygon(50% 0,55% 17%,63% 3%,67% 20%,78% 9%,81% 27%,100% 39%,84% 51%,76% 47%,69% 72%,59% 62%,50% 100%,41% 62%,31% 72%,24% 47%,16% 51%,0 39%,19% 27%,22% 9%,33% 20%,37% 3%,45% 17%)!important;filter:drop-shadow(0 0 12px #a0001826)!important}.ct-shadow-character:after{top:155px!important;width:clamp(108px,13vw,154px)!important;height:30px!important;background:linear-gradient(90deg,transparent,#010102 18%,#010102 82%,transparent)!important;clip-path:polygon(0 0,34% 25%,50% 0,66% 25%,100% 0,80% 100%,20% 100%)!important}@keyframes ct-shadow-gaze{0%,42%,48%,100%{opacity:1;filter:drop-shadow(0 0 5px #ff6670) drop-shadow(0 0 16px #d0001b)}45%{opacity:.58;filter:drop-shadow(0 0 2px #ff6670)}}.ct-shadow-eyes{top:111px!important;left:50%!important;width:78px!important;height:24px!important;transform:translateX(-50%)!important;background:none!important;clip-path:none!important;filter:none!important;animation:none!important;z-index:5!important}.ct-shadow-eyes:before,.ct-shadow-eyes:after{content:\"\";position:absolute;top:5px;width:27px;height:11px;background:linear-gradient(180deg,#ff9a9f 0%,#ff2339 36%,#a00016 100%);clip-path:polygon(0 18%,100% 0,78% 100%,20% 82%);filter:drop-shadow(0 0 4px #ff2339) drop-shadow(0 0 10px #e00020)}.ct-shadow-eyes:before{left:3px;transform:rotate(5deg)}.ct-shadow-eyes:after{right:3px;transform:scaleX(-1) rotate(5deg)}";
    const card = document.createElement("section");
    card.className = "ct-setup-card";
    const mark = document.createElement("div"); mark.className = "ct-setup-mark ct-shadow-mark"; mark.setAttribute("aria-label","Shadow, your CleanTrack guide"); mark.innerHTML = '<span class="ct-shadow-glow"></span><span class="ct-shadow-hood"><i></i><i></i></span>';
    const title = document.createElement("h2"); title.id = "ct-setup-title"; title.textContent = "Learn CleanTrack by doing";
    const intro = document.createElement("p"); intro.className = "ct-setup-intro"; intro.textContent = "I’m Shadow, your CleanTrack guide. I’ll lead you through your workspace, reveal what each important control does, and guide you as you try things yourself. You’re in control — skip or replay any lesson.";
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
      const topic = step[3] || page;
      const menu = document.getElementById("workspace-navigation");
      const pageItem = menu && Array.from(menu.querySelectorAll("[data-page]")).find(function(el){return el.getAttribute("data-page")===page;});
      const heading = document.getElementById("page-title");
      const pageTitle = (heading && heading.textContent || step[0] || "").trim();
      const candidates = {
        organisation: /organisation settings|organization settings|edit organisation|edit organization|organisation details|organization details/i,
        location: /import location|add location|create location|upload floor plan|import map|add map/i,
        zone: /create zone|add zone|import zones|new zone/i,
        team: /invite member|invite employee|add member|add employee|team member|create team/i,
        operation: /create operation|new operation|create task|new task|start work/i,
        report: /generate report|create report|export report|analytics/i,
        review: /review|approve|logs|activity history/i,
        workspace: /workspace|today|my desk|dashboard/i,
        person: /personnel|team member|employee/i,
        site: /site|location|zone/i,
        message: /send message|new message|team channel|announcement/i,
        desk: /my desk|today|dashboard/i,
        task: /my work|my tasks|assigned work|view task|open operation/i,
        start: /start work|start operation|mark complete|complete work|submit/i,
        history: /work history|history|completed work/i,
        announcement: /announcement|notification/i,
        settings: /profile|preferences|settings/i
      };
      const pattern = candidates[topic];
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
      const avatar = document.createElement("div"); avatar.className = "ct-tour-avatar"; avatar.setAttribute("aria-label","Shadow, the CleanTrack guide"); avatar.setAttribute("role","img"); avatar.innerHTML = '<span class="ct-shadow-character"><i class="ct-shadow-cloak"></i><i class="ct-shadow-hood"></i><i class="ct-shadow-eyes"></i><i class="ct-shadow-core"></i></span>';
      const speech = document.createElement("div"); speech.className = "ct-tour-speech";
      const kicker = document.createElement("p"); kicker.className = "ct-tour-kicker"; kicker.textContent = "YOUR CLEANTRACK GUIDE · SHADOW";
      const h = document.createElement("h3"); h.textContent = (index===0 ? "Shadow here." : index===steps.length-1 ? "Final mission: " : "Next stop: ") + step[0];
      const p = document.createElement("p");
      p.textContent = target && target !== pageItem && target !== heading
        ? "Welcome to your mission! You're on " + (pageTitle || step[0]) + ". " + step[1] + " I've highlighted " + ((target.innerText || target.textContent || target.getAttribute("aria-label") || "the relevant control").trim().replace(/\\s+/g," ").slice(0,90)) + ". Click it to explore the real feature. You can back out safely; don't confirm or save anything you don't intend to change."
        : "Mission briefing: " + step[1] + " I couldn't identify one specific action button on this screen, so explore the highlighted page area and continue when you're ready. You can skip or replay this lesson anytime.";
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
      // A short, quiet arrival chime accompanies Shadow; it is generated locally.
      playShadowArrivalSound(false);
      // Shadow's full character is present for the lesson briefing, then steps away
      // as soon as the user interacts with the app so the real workspace stays clear.
      const hideCharacterOnWorkspaceAction = function(event){
        if(!coach.isConnected || coach.contains(event.target)) return;
        coach.classList.add("ct-tour-character-away");
      };
      document.addEventListener("click",hideCharacterOnWorkspaceAction,true);
      const cleanCharacterListener = function(){
        document.removeEventListener("click",hideCharacterOnWorkspaceAction,true);
      };
      const coachObserver = new MutationObserver(function(){
        if(!coach.isConnected){cleanCharacterListener();coachObserver.disconnect();}
      });
      coachObserver.observe(document.body,{childList:true,subtree:true});
      if(target && target !== pageItem && target !== heading){
        target.addEventListener("click",function onGuideTargetClick(){
          target.removeEventListener("click",onGuideTargetClick);
          if(!coach.isConnected) return;
          coach.classList.add("ct-tour-character-away");
          p.textContent = "Nice — you tried the real control. Take a moment to look at what opened. Shadow will stay here to guide you, while the character steps aside so you can focus on the page. When you're ready, choose Next lesson. Don't save anything unless you mean to.";
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