(function () {
  "use strict";
  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;

  const $ = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  };
  const button = (label, cls, handler) => {
    const node = $("button", cls || "ct-tc-button", label);
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  };
  const field = (label, control, hint) => {
    const node = $("label", "ct-tc-field");
    node.append($("span", "ct-tc-label", label), control);
    if (hint) node.appendChild($("small", "ct-tc-hint", hint));
    return node;
  };
  const input = (type, value, placeholder) => {
    const node = $("input", "ct-tc-control");
    node.type = type;
    node.value = value || "";
    if (placeholder) node.placeholder = placeholder;
    return node;
  };
  const area = (value, placeholder) => {
    const node = $("textarea", "ct-tc-control");
    node.rows = 5;
    node.maxLength = 12000;
    node.value = value || "";
    node.placeholder = placeholder || "";
    return node;
  };
  const select = (rows, value) => {
    const node = $("select", "ct-tc-control");
    rows.forEach(row => {
      const option = $("option", "", row[1]);
      option.value = String(row[0]);
      node.appendChild(option);
    });
    node.value = value == null ? "" : String(value);
    return node;
  };
  const errorText = error => error && error.message ? error.message : "Something went wrong. Please try again.";
  const prettyDate = value => {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" :
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  };
  const localDate = value => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const z = n => String(n).padStart(2, "0");
    return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())+"T"+z(d.getHours())+":"+z(d.getMinutes());
  };
  const statusName = value => ({published:"Published",draft:"Draft",scheduled:"Scheduled"}[value] || value || "Update");
  const speakTeamText = (text, profile) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      throw new Error("Speech playback is not supported by this browser.");
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text || ""));
    const dialect = profile && profile.dialect || "en-IN";
    const style = profile && profile.style || "professional";
    utterance.lang = dialect;
    const settings = {
      professional: { rate: 0.96, pitch: 1.0 },
      warm: { rate: 0.91, pitch: 1.08 },
      energetic: { rate: 1.06, pitch: 1.12 }
    }[style] || { rate: 0.96, pitch: 1.0 };
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    const voices = window.speechSynthesis.getVoices();
    const prefix = dialect.toLowerCase().split("-")[0];
    const preferred = voices.find(v => v.lang && v.lang.toLowerCase() === dialect.toLowerCase()) ||
      voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };

  async function render(container) {
    container.replaceChildren();
    const user = AUTH && AUTH.getCurrentUser ? AUTH.getCurrentUser() : null;
    if (!user || String(user.role || "").toLowerCase() !== "supervisor") {
      container.appendChild($("p", "ct-tc-muted", "The Supervisor Team Channel is not available to this account."));
      return;
    }

    const page = $("section", "ct-team-channel");
    const header = $("header", "ct-tc-header");
    const intro = $("div", "ct-tc-intro");
    intro.append($("p", "ct-tc-eyebrow", "SUPERVISOR · TEAM COMMUNICATION"),
      $("h1", "", "Team Channel"),
      $("p", "ct-tc-subtitle", "A focused space for your team’s instructions, updates and acknowledgements."));
    const headerActions = $("div", "ct-tc-header-actions");
    const historyButton = button("Announcement history", "ct-tc-button ct-tc-secondary", () => openHistory());
    const newPost = button("+ New announcement", "ct-tc-button ct-tc-primary", () => openComposer());
    const refresh = button("↻ Refresh", "ct-tc-button ct-tc-secondary", () => load());
    headerActions.append(historyButton, newPost, refresh);
    header.append(intro, headerActions);
    page.appendChild(header);

    const status = $("div", "ct-tc-status");
    status.hidden = true;
    status.setAttribute("role", "status");
    page.appendChild(status);

    const teamBar = $("section", "ct-tc-teambar");
    const teamIdentity = $("div", "ct-tc-team-identity");
    teamIdentity.append($("span", "ct-tc-team-icon", "♧"),
      $("div", "", ""));
    teamIdentity.lastChild.append($("span", "ct-tc-overline", "YOUR TEAM"),
      $("strong", "ct-tc-team-name", "Loading team…"));
    const teamMeta = $("div", "ct-tc-team-meta");
    teamBar.append(teamIdentity, teamMeta);
    page.appendChild(teamBar);

    const summary = $("div", "ct-tc-summary");
    const summaryValues = [
      ["updates", "0", "Published updates"],
      ["pinned", "0", "Pinned instructions"],
      ["ack", "0", "Awaiting acknowledgement"]
    ];
    const summaryNodes = {};
    summaryValues.forEach(([key, value, label]) => {
      const card = $("div", "ct-tc-summary-card");
      const number = $("strong", "", value);
      card.append(number, $("span", "", label));
      summary.appendChild(card);
      summaryNodes[key] = number;
    });
    page.appendChild(summary);

    const workspace = $("div", "ct-tc-workspace");
    const main = $("main", "ct-tc-main");
    const side = $("aside", "ct-tc-side");
    const feedHead = $("div", "ct-tc-feed-head");
    const feedTitle = $("div", "");
    feedTitle.append($("h2", "", "Team updates"), $("p", "ct-tc-muted", "Announcements published for your assigned team."));
    feedTitle.appendChild($("p", "ct-tc-muted", "The latest announcement is displayed here. Earlier posts are kept in the 7-day history."));
    feedHead.appendChild(feedTitle);
    const feed = $("div", "ct-tc-feed");
    main.append(feedHead, feed);

    const pinnedPanel = $("section", "ct-tc-side-panel");
    pinnedPanel.append($("div", "ct-tc-side-heading", "Pinned instructions"),
      $("p", "ct-tc-muted", "Important procedures and reminders kept within easy reach."));
    const pinnedList = $("div", "ct-tc-pinned-list");
    pinnedPanel.appendChild(pinnedList);
    const mediaPanel = $("section", "ct-tc-side-panel ct-tc-media-panel");
    mediaPanel.append($("div", "ct-tc-side-heading", "Announcement media"),
      $("p", "ct-tc-muted", "Photos and videos attached to the latest announcement appear here."));
    const mediaContent = $("div", "ct-tc-media-content");
    mediaPanel.appendChild(mediaContent);
    side.append(pinnedPanel, mediaPanel);
    workspace.append(main, side);
    page.appendChild(workspace);
    container.appendChild(page);

    const state = { items: [], teams: [], teamIds: new Set(), team: null, loading: false, mediaUrls: [] };
    function notify(message, isError) {
      status.textContent = message;
      status.className = "ct-tc-status " + (isError ? "is-error" : "is-success");
      status.hidden = false;
    }
    function visibleItems() {
      return state.items.filter(item =>
        item && item.audience_scope === "team" &&
        state.teamIds.has(String(item.team_id)) &&
        (["published","draft","scheduled"].includes(item.status))
      );
    }
    function isMine(item) { return Number(item.created_by_id) === Number(user.id); }
    function receiptState(item) {
      return item.my_receipt && item.my_receipt.state || (isMine(item) ? "issued" : "unread");
    }
    function currentAnnouncements() {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return visibleItems().filter(item => {
        if (item.status !== "published") return false;
        const published = new Date(item.published_at || item.created_at || 0).getTime();
        const expires = item.expires_at ? new Date(item.expires_at).getTime() : published + 7 * 24 * 60 * 60 * 1000;
        return Number.isFinite(published) && published >= cutoff && expires > Date.now();
      }).sort((a,b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
    }
    async function fetchMedia(file) {
      const base = window.CleanTrackConfig && window.CleanTrackConfig.apiBaseUrl || "";
      const path = String(file.download_url || "").replace(/^\/api\//, "/");
      const token = AUTH && AUTH.getAuthToken ? AUTH.getAuthToken() : "";
      const response = await fetch(base.replace(/\/$/, "") + path, { headers: token ? { Authorization: "Bearer " + token } : {}, credentials: "include" });
      if (!response.ok) throw new Error(response.status === 403 ? "You cannot access this media." : "Media could not be loaded.");
      return URL.createObjectURL(await response.blob());
    }
    async function renderMedia(item) {
      mediaContent.replaceChildren(); state.mediaUrls.forEach(url => URL.revokeObjectURL(url)); state.mediaUrls = [];
      const media = (item && item.attachments || []).filter(file => file.category === "image" || /^video\//i.test(file.content_type || file.mime_type || ""));
      if (!media.length) { mediaContent.appendChild($("div", "ct-tc-media-empty", "No photos or videos attached to the latest announcement.")); return; }
      let index = 0;
      const stage = $("div", "ct-tc-media-stage"), caption = $("div", "ct-tc-media-caption"), controls = $("div", "ct-tc-media-controls");
      const previous = button("‹", "ct-tc-icon-button", () => show(index - 1)), counter = $("span", "ct-tc-media-counter"), next = button("›", "ct-tc-icon-button", () => show(index + 1));
      controls.append(previous, counter, next); mediaContent.append(stage, caption, controls);
      async function show(nextIndex) {
        index = (nextIndex + media.length) % media.length; stage.replaceChildren($("div", "ct-tc-media-loading", "Loading media…"));
        caption.textContent = media[index].filename || "Announcement attachment"; counter.textContent = (index + 1) + " / " + media.length;
        previous.disabled = media.length < 2; next.disabled = media.length < 2;
        try {
          const url = await fetchMedia(media[index]); state.mediaUrls.push(url); stage.replaceChildren();
          const type = String(media[index].content_type || media[index].mime_type || "");
          if (type.startsWith("video/")) { const video = $("video", "ct-tc-media-player"); video.src = url; video.controls = true; video.playsInline = true; video.preload = "metadata"; stage.appendChild(video); }
          else { const img = $("img", "ct-tc-media-image"); img.src = url; img.alt = media[index].filename || "Announcement image"; stage.appendChild(img); }
        } catch (error) { stage.replaceChildren($("div", "ct-tc-media-empty", errorText(error))); }
      }
      await show(0);
    }
    function openHistory() {
      const dialog = $("dialog", "ct-tc-dialog ct-tc-history-dialog"), head = $("div", "ct-tc-dialog-head"), title = $("div", "");
      title.append($("p", "ct-tc-eyebrow", "TEAM CHANNEL · ARCHIVE"), $("h2", "", "Announcement history"), $("p", "ct-tc-muted", "Published announcements from the last 7 days. Older announcements expire automatically."));
      head.append(title, button("×", "ct-tc-icon-button", () => dialog.close()));
      const body = $("div", "ct-tc-history-list"), items = currentAnnouncements();
      if (!items.length) body.appendChild($("div", "ct-tc-empty", "No announcements in the last 7 days."));
      items.forEach(item => {
        const row = $("article", "ct-tc-history-item"), meta = $("div", "ct-tc-history-meta");
        meta.append($("span", "ct-tc-tag", prettyDate(item.published_at || item.created_at)), $("span", "ct-tc-history-expiry", "Expires " + prettyDate(item.expires_at || new Date(new Date(item.published_at || item.created_at).getTime() + 7*86400000).toISOString())));
        row.append(meta, $("h3", "", item.title), $("p", "ct-tc-message", item.message));
        const footer = $("div", "ct-tc-history-footer");
        footer.append($("span", "ct-tc-muted", "Posted by " + (item.created_by_name || "Team supervisor")), button("View announcement", "ct-tc-button ct-tc-secondary", () => { dialog.close(); renderSelectedAnnouncement(item); }));
        row.appendChild(footer); body.appendChild(row);
      });
      dialog.append(head, body); document.body.appendChild(dialog); dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
    }
    function renderSelectedAnnouncement(item) { feed.replaceChildren(renderCard(item)); renderMedia(item); }

    function renderPinned(items) {
      pinnedList.replaceChildren();
      const pinned = items.filter(item => item.is_pinned && item.status === "published");
      if (!pinned.length) {
        pinnedList.appendChild($("p", "ct-tc-muted", "No pinned instructions yet."));
        return;
      }
      pinned.slice(0, 6).forEach(item => {
        const row = button("", "ct-tc-pinned-item", () => {
          renderSelectedAnnouncement(item);
          feed.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        row.append($("strong", "", item.title), $("small", "", prettyDate(item.published_at || item.created_at)));
        pinnedList.appendChild(row);
      });
    }
    function renderCard(item) {
      const card = $("article", "ct-tc-card" + (item.is_pinned ? " is-pinned" : ""));
      card.dataset.announcementId = String(item.id);
      const top = $("div", "ct-tc-card-top");
      const tags = $("div", "ct-tc-tags");
      if (item.is_pinned) tags.appendChild($("span", "ct-tc-tag is-pinned", "Pinned instruction"));
      tags.appendChild($("span", "ct-tc-tag", statusName(item.status)));
      if (item.requires_acknowledgement) tags.appendChild($("span", "ct-tc-tag is-ack", "Acknowledgement required"));
      top.append(tags, $("span", "ct-tc-date", prettyDate(item.published_at || item.scheduled_at || item.created_at)));
      card.append(top, $("h3", "ct-tc-card-title", item.title), $("p", "ct-tc-message", item.message));
      const meta = $("div", "ct-tc-card-meta");
      meta.append($("span", "", "Posted by " + (item.created_by_name || "Team supervisor")),
        $("span", "", "Team: " + (item.team_name || "Assigned team")));
      card.appendChild(meta);

      if (item.attachments && item.attachments.length) {
        const attachments = $("div", "ct-tc-attachments");
        item.attachments.filter(file => file.category !== "image" && !/^video\//i.test(file.content_type || file.mime_type || "")).forEach(file => {
          const fetchAttachment = async () => {
            const base = window.CleanTrackConfig && window.CleanTrackConfig.apiBaseUrl || "";
            const path = String(file.download_url || "").replace(/^\/api\//, "/");
            const token = AUTH && AUTH.getAuthToken ? AUTH.getAuthToken() : "";
            const response = await fetch(base.replace(/\/$/, "") + path, {
              headers: token ? { Authorization: "Bearer " + token } : {},
              credentials: "include"
            });
            if (!response.ok) throw new Error(response.status === 403 ? "You cannot access this attachment." : "Attachment download failed.");
            return response;
          };
          if (file.category === "voice_profile") {
            const play = button("▶ Play synthetic voice", "ct-tc-button ct-tc-secondary", async () => {
              play.disabled = true;
              try {
                const response = await fetchAttachment();
                const profile = await response.json();
                speakTeamText(item.message, profile);
              } catch (error) { notify(errorText(error), true); }
              finally { play.disabled = false; }
            });
            attachments.appendChild(play);
          } else {
            const link = $("a", "ct-tc-attachment", "↧ " + (file.filename || "Attachment"));
            link.href = "#";
            link.addEventListener("click", async event => {
              event.preventDefault();
              try {
                const response = await fetchAttachment();
                const url = URL.createObjectURL(await response.blob());
                const download = $("a");
                download.href = url; download.download = file.filename || "team-channel-file";
                document.body.appendChild(download); download.click(); download.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1200);
              } catch (error) { notify(errorText(error), true); }
            });
            attachments.appendChild(link);
          }
          if (file.category === "voice" || /^audio\//i.test(file.content_type || file.mime_type || "")) {
            const audio = $("audio", "ct-tc-audio");
            audio.controls = true; audio.preload = "none";
            let audioUrl = "";
            audio.addEventListener("play", async () => {
              if (audioUrl || audio.dataset.loading === "true") return;
              audio.dataset.loading = "true";
              audio.pause();
              try {
                const base = window.CleanTrackConfig && window.CleanTrackConfig.apiBaseUrl || "";
                const path = String(file.download_url || "").replace(/^\/api\//, "/");
                const token = AUTH && AUTH.getAuthToken ? AUTH.getAuthToken() : "";
                const response = await fetch(base.replace(/\/$/, "") + path, {
                  headers: token ? { Authorization: "Bearer " + token } : {},
                  credentials: "include"
                });
                if (!response.ok) throw new Error(response.status === 403 ? "You cannot access this voice note." : "Voice note could not be loaded.");
                audioUrl = URL.createObjectURL(await response.blob());
                audio.src = audioUrl;
                await audio.play();
              } catch (error) { notify(errorText(error), true); }
              finally { delete audio.dataset.loading; }
            });
            audio.addEventListener("ended", () => {
              if (audioUrl) { URL.revokeObjectURL(audioUrl); audioUrl = ""; audio.removeAttribute("src"); audio.load(); }
            });
            attachments.appendChild(audio);
          }
        });
        card.appendChild(attachments);
      }
      const actions = $("div", "ct-tc-card-actions");
      const stateText = $("span", "ct-tc-receipt-state", receiptState(item) === "acknowledged" ? "✓ Acknowledged" : receiptState(item) === "read" ? "✓ Read" : isMine(item) ? "Published by you" : "Not yet acknowledged");
      actions.appendChild(stateText);
      if (item.can_acknowledge && receiptState(item) !== "acknowledged" && item.status === "published") {
        actions.appendChild(button("Acknowledge", "ct-tc-button ct-tc-primary", async () => {
          try { await API.post("announcements/" + item.id + "/acknowledge", {}); await load(); }
          catch (error) { notify(errorText(error), true); }
        }));
      }
      if (item.can_mark_read && !["read","acknowledged"].includes(receiptState(item)) && item.status === "published") {
        actions.appendChild(button("Mark as read", "ct-tc-button ct-tc-secondary", async () => {
          try { await API.post("announcements/" + item.id + "/read", {}); await load(); }
          catch (error) { notify(errorText(error), true); }
        }));
      }
      if (isMine(item)) {
        actions.appendChild(button(item.is_pinned ? "Unpin" : "Pin", "ct-tc-button ct-tc-secondary", async () => {
          try {
            await API.patch("announcements/" + item.id, {
              title: item.title, message: item.message, announcement_type: item.announcement_type || "announcement",
              audience_scope: "team", team_id: Number(item.team_id), severity: "info", status: item.status,
              is_pinned: !item.is_pinned, requires_acknowledgement: Boolean(item.requires_acknowledgement),
              scheduled_at: item.scheduled_at || null
            });
            await load();
          } catch (error) { notify(errorText(error), true); }
        }));
        if (item.status !== "published") {
          actions.appendChild(button("Edit", "ct-tc-button ct-tc-secondary", () => openComposer(item)));
          actions.appendChild(button("Delete", "ct-tc-button ct-tc-danger", async () => {
            if (!window.confirm("Delete this team announcement?")) return;
            try { await API.delete("announcements/" + item.id); await load(); }
            catch (error) { notify(errorText(error), true); }
          }));
        }
      }
      if (item.status === "published" && (isMine(item) || item.receipt_summary || item.can_review_receipts)) {
        actions.appendChild(button("View acknowledgements", "ct-tc-button ct-tc-secondary", () => showReceipts(item)));
      }
      card.appendChild(actions);
      if (item.receipt_summary) {
        card.appendChild($("p", "ct-tc-receipt-summary",
          (item.receipt_summary.read_count || 0) + " of " + (item.receipt_summary.recipient_count || 0) +
          " read · " + (item.receipt_summary.acknowledged_count || 0) + " acknowledged"));
      }
      return card;
    }
    function renderFeed() {
      const items = currentAnnouncements(); feed.replaceChildren();
      if (!items.length) {
        const empty = $("div", "ct-tc-empty");
        empty.append($("span", "ct-tc-empty-mark", "✦"), $("h3", "", "No current announcement"), $("p", "ct-tc-muted", "New announcements will appear here and remain available for seven days."));
        feed.appendChild(empty); renderMedia(null); return;
      }
      const latest = items[0]; feed.appendChild(renderCard(latest)); renderMedia(latest);
    }
    function renderAll() {
      const items = visibleItems();
      const published = items.filter(item => item.status === "published");
      summaryNodes.updates.textContent = String(published.length);
      summaryNodes.pinned.textContent = String(published.filter(item => item.is_pinned).length);
      summaryNodes.ack.textContent = String(published.filter(item => item.requires_acknowledgement && item.can_acknowledge && receiptState(item) !== "acknowledged").length);
      const names = state.teams.map(team => team.name).filter(Boolean);
      teamIdentity.querySelector(".ct-tc-team-name").textContent = names.length ? names.join(" · ") : "Assigned team";
      teamMeta.textContent = names.length ? names.length + (names.length === 1 ? " team assigned" : " teams assigned") : "No team assignment returned";
      renderPinned(items);
      renderFeed();
    }
    async function showReceipts(item) {
      try {
        const result = await API.get("announcements/" + item.id + "/receipts");
        const dialog = $("dialog", "ct-tc-dialog");
        const head = $("div", "ct-tc-dialog-head");
        head.append($("div", "", ""), button("Close", "ct-tc-icon-button", () => dialog.close()));
        head.firstChild.append($("p", "ct-tc-eyebrow", "TEAM ACKNOWLEDGEMENTS"), $("h2", "", item.title));
        const body = $("div", "ct-tc-receipts");
        const rows = result.receipts || [];
        body.appendChild($("p", "ct-tc-muted", rows.length + " team members tracked"));
        rows.forEach(row => {
          const line = $("div", "ct-tc-receipt-row");
          const person = $("div", "");
          person.append($("strong", "", row.user_name || row.email || "Team member"),
            $("small", "ct-tc-muted", row.role || "Staff"));
          const state = $("div", "ct-tc-receipt-status", row.acknowledged_at ? "Acknowledged" : row.read_at ? "Read" : "Unread");
          state.appendChild($("small", "ct-tc-muted", prettyDate(row.acknowledged_at || row.read_at)));
          line.append(person, state); body.appendChild(line);
        });
        if (!rows.length) body.appendChild($("p", "ct-tc-muted", "No acknowledgement records yet."));
        dialog.append(head, body);
        document.body.appendChild(dialog);
        dialog.addEventListener("close", () => dialog.remove(), { once: true });
        dialog.showModal();
      } catch (error) { notify(errorText(error), true); }
    }
    function openComposer(existing) {
      const editing = Boolean(existing);
      const dialog = $("dialog", "ct-tc-dialog ct-tc-compose-dialog");
      const head = $("div", "ct-tc-dialog-head");
      head.append($("div", "", ""), button("×", "ct-tc-icon-button", () => dialog.close()));
      head.firstChild.append($("p", "ct-tc-eyebrow", editing ? "UPDATE TEAM POST" : "NEW TEAM POST"),
        $("h2", "", editing ? "Edit announcement" : "Create announcement"));
      const form = $("form", "ct-tc-form");
      const title = input("text", existing && existing.title, "Give your update a clear title");
      title.maxLength = 200; title.required = true;
      const message = area(existing && existing.message, "Write the instruction, update or reminder. Keep the action and timing clear.");
      message.required = true;
      const publication = select([["published","Publish now"],["draft","Save as draft"],["scheduled","Schedule"]], existing && existing.status || "published");
      const schedule = input("datetime-local", localDate(existing && existing.scheduled_at));
      const teamSelect = select(state.teams.map(team => [team.id, team.name]), existing && existing.team_id || (state.teams[0] && state.teams[0].id));
      teamSelect.required = true;
      const pinned = $("input"); pinned.type = "checkbox"; pinned.checked = Boolean(existing && existing.is_pinned);
      const ack = $("input"); ack.type = "checkbox"; ack.checked = Boolean(existing && existing.requires_acknowledgement);
      const files = $("input", "ct-tc-control"); files.type = "file"; files.multiple = true;
      files.accept = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.doc,.docx,.txt,.csv";
      const voice = $("input", "ct-tc-control"); voice.type = "file"; voice.accept = "audio/*,.m4a,.mp3,.wav,.ogg,.webm";
      const recordPanel = $("div", "ct-tc-record-panel");
      const recordStatus = $("p", "ct-tc-muted", "Record a voice note, or use a synthetic voice instead.");
      let recorder = null, stream = null, chunks = [], recordedBlob = null, recordedFile = null, recordedPreviewUrl = "", discardRecording = false;
      const clearRecording = () => {
        if (recorder && recorder.state !== "inactive") { discardRecording = true; recorder.stop(); }
        if (stream) stream.getTracks().forEach(track => track.stop());
        stream = null; recorder = null; chunks = []; recordedBlob = null; recordedFile = null;
        if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
        recordedPreviewUrl = "";
        const preview = recordPanel.querySelector("audio");
        if (preview) preview.remove();
        recordStatus.textContent = "Recording removed. No voice recording will be attached.";
        start.disabled = false; stop.disabled = true; removeVoice.disabled = true;
        voice.value = "";
      };
      const start = button("● Record voice note", "ct-tc-button ct-tc-secondary", async () => {
        if (recordedFile) clearRecording();
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          recordStatus.textContent = "Voice recording is unavailable in this browser. You can still upload an audio file.";
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mime = ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type));
          recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
          chunks = [];
          recorder.addEventListener("dataavailable", event => { if (event.data && event.data.size) chunks.push(event.data); });
          recorder.addEventListener("stop", () => {
            if (discardRecording) { discardRecording = false; return; }
            recordedBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
            const ext = recordedBlob.type.includes("mp4") ? "m4a" : recordedBlob.type.includes("ogg") ? "ogg" : "webm";
            recordedFile = new File([recordedBlob], "team-voice-note-" + Date.now() + "." + ext, { type: recordedBlob.type });
            const preview = $("audio", "ct-tc-audio"); preview.controls = true;
            recordedPreviewUrl = URL.createObjectURL(recordedBlob); preview.src = recordedPreviewUrl;
            const oldPreview = recordPanel.querySelector("audio"); if (oldPreview) oldPreview.remove();
            recordPanel.appendChild(preview);
            recordStatus.textContent = "Voice recording ready. You can preview it or remove it before publishing.";
            start.disabled = false; stop.disabled = true; removeVoice.disabled = false;
            if (stream) stream.getTracks().forEach(track => track.stop());
            stream = null;
          }, { once: true });
          recorder.start();
          recordStatus.textContent = "Recording… select Stop when finished.";
          start.disabled = true; stop.disabled = false;
        } catch (error) {
          recordStatus.textContent = error && error.name === "NotAllowedError" ? "Microphone permission was denied." : "Could not access the microphone.";
          if (stream) stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      });
      const stop = button("■ Stop recording", "ct-tc-button ct-tc-secondary", () => {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      });
      const removeVoice = button("× Cancel voice", "ct-tc-button ct-tc-danger", clearRecording);
      removeVoice.disabled = true;
      stop.disabled = true;
      recordPanel.append(recordStatus, start, stop, removeVoice);

      const statusLine = $("p", "ct-tc-form-status");
      statusLine.hidden = true;
      const submit = $("button", "ct-tc-button ct-tc-primary", editing ? "Save changes" : "Publish update");
      submit.type = "submit";
      const cancel = button("Cancel", "ct-tc-button ct-tc-secondary", () => dialog.close());
      const checkbox = (label, control) => {
        const wrap = $("label", "ct-tc-check");
        wrap.append(control, $("span", "", label));
        return wrap;
      };
      const scheduleField = field("Publication time", schedule, "Only required when Schedule is selected.");
      const scheduleWrap = scheduleField;
      const teamField = field("Team", teamSelect, "Choose only a team assigned to your Supervisor account.");
      const formGrid = $("div", "ct-tc-form-grid");
      formGrid.append(field("Title", title), field("Message", message), teamField, field("Publish", publication), scheduleWrap);
      const options = $("div", "ct-tc-compose-options");
      options.append(checkbox("Pin as an important instruction", pinned), checkbox("Require staff acknowledgement", ack));

      const voiceMode = select([["none","No voice announcement"],["recorded","My recorded voice"],["synthetic","Synthetic voice"]], "none");
      const voiceDialect = select([
        ["en-IN","English · India"],["en-GB","English · UK"],["en-US","English · US"],
        ["hi-IN","Hindi · India"],["ur-PK","Urdu"],["ar-SA","Arabic"]
      ], "en-IN");
      const voiceStyle = select([["professional","Professional"],["warm","Warm"],["energetic","Energetic"]], "professional");
      const voicePreview = button("▶ Preview synthetic voice", "ct-tc-button ct-tc-secondary", () => {
        try { speakTeamText(message.value.trim() || title.value.trim() || "This is a preview of your team announcement.", { dialect: voiceDialect.value, style: voiceStyle.value }); }
        catch (error) { recordStatus.textContent = errorText(error); }
      });
      const syntheticPanel = $("div", "ct-tc-record-panel");
      syntheticPanel.append(field("Dialect", voiceDialect), field("Style", voiceStyle), voicePreview,
        $("small", "ct-tc-hint", "Uses the speech voices available on the listener’s device. Voice availability and accent vary by browser and operating system."));
      const voiceOptions = $("div", "ct-tc-compose-options");
      const voiceUploadField = field("Upload an audio recording", voice, "Optional: choose an existing audio file instead of recording.");
      voiceOptions.append(field("Voice for this announcement", voiceMode),
        field("Synthetic voice settings", syntheticPanel));
      const refreshVoiceMode = () => {
        const mode = voiceMode.value;
        recordPanel.hidden = mode !== "recorded";
        syntheticPanel.hidden = mode !== "synthetic";
        voiceUploadField.hidden = mode !== "recorded";
        if (mode !== "recorded" && stream) clearRecording();
        if (mode !== "synthetic") window.speechSynthesis && window.speechSynthesis.cancel();
      };
      voiceMode.addEventListener("change", refreshVoiceMode);
      refreshVoiceMode();
      form.append(formGrid, options, field("Documents and images", files, "Attach supporting files to this team announcement."),
        voiceOptions, voiceUploadField, recordPanel, statusLine);
      const actions = $("div", "ct-tc-dialog-actions");
      actions.append(cancel, submit);
      form.appendChild(actions);
      dialog.append(head, form);
      document.body.appendChild(dialog);
      dialog.addEventListener("close", () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (recordedPreviewUrl) URL.revokeObjectURL(recordedPreviewUrl);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        dialog.remove();
      }, { once: true });
      publication.addEventListener("change", () => { scheduleField.hidden = publication.value !== "scheduled"; });
      scheduleField.hidden = publication.value !== "scheduled";
      if (!state.teams.length) {
        submit.disabled = true;
        statusLine.textContent = "Your Supervisor account has no assigned team. Ask an Admin to confirm your team assignment.";
        statusLine.hidden = false;
      }
      form.addEventListener("submit", async event => {
        event.preventDefault();
        statusLine.hidden = true;
        if (!title.value.trim() || !message.value.trim()) {
          statusLine.textContent = "Enter a title and message before publishing.";
          statusLine.hidden = false; return;
        }
        if (publication.value === "scheduled" && (!schedule.value || new Date(schedule.value).getTime() <= Date.now())) {
          statusLine.textContent = "Choose a future publication date and time.";
          statusLine.hidden = false; return;
        }
        submit.disabled = true; submit.textContent = "Saving…";
        try {
          const payload = {
            title: title.value.trim(), message: message.value.trim(),
            announcement_type: "announcement", audience_scope: "team",
            severity: "info", team_id: Number(teamSelect.value),
            status: publication.value,
            scheduled_at: publication.value === "scheduled" ? new Date(schedule.value).toISOString() : null,
            is_pinned: pinned.checked, requires_acknowledgement: ack.checked,
            expires_at: publication.value === "scheduled"
              ? new Date(new Date(schedule.value).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
              : publication.value === "published" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
            escalate_to_admin: false, escalation_after_minutes: null
          };
          const result = editing ? await API.patch("announcements/" + existing.id, payload) : await API.post("announcements", payload);
          const saved = result.announcement;
          const uploads = [...files.files];
          if (voiceMode.value === "recorded") {
            if (recordedFile) uploads.push(recordedFile);
            else if (voice.files.length) uploads.push(...voice.files);
          } else if (voiceMode.value === "synthetic") {
            const profile = {
              dialect: voiceDialect.value,
              style: voiceStyle.value,
              engine: "browser-speech-synthesis"
            };
            uploads.push(new File([JSON.stringify(profile)], "team-voice-profile.json", { type: "application/json" }));
          }
          if (uploads.length) {
            const data = new FormData();
            uploads.forEach(file => data.append("files", file));
            await API.post("announcements/" + saved.id + "/attachments", data);
          }
          dialog.close();
          notify(editing ? "Team announcement updated." : "Team announcement published.", false);
          await load();
        } catch (error) {
          statusLine.textContent = errorText(error);
          statusLine.hidden = false;
          submit.disabled = false; submit.textContent = editing ? "Save changes" : "Publish update";
        }
      });
      dialog.showModal();
      title.focus();
    }
    async function load() {
      if (state.loading) return;
      state.loading = true;
      refresh.disabled = true; refresh.textContent = "Loading…";
      try {
        const [list, options] = await Promise.all([
          API.get("announcements"),
          API.get("announcements/options")
        ]);
        state.items = Array.isArray(list.announcements) ? list.announcements : [];
        state.teams = Array.isArray(options.teams) ? options.teams.filter(team => team && team.id != null) : [];
        state.teamIds = new Set(state.teams.map(team => String(team.id)));
        renderAll();
        if (!state.teams.length) notify("No team assignment was returned for your account. The channel is read-only until an Admin assigns your team.", true);
        else status.hidden = true;
      } catch (error) {
        feed.replaceChildren($("div", "ct-tc-empty", "Team Channel could not load from the server. No sample content has been added."));
        notify(errorText(error), true);
      } finally {
        state.loading = false;
        refresh.disabled = false; refresh.textContent = "↻ Refresh";
      }
    }
    await load();
  }

  window.MechnarSupervisorTeamChannel = Object.freeze({ render });
})();