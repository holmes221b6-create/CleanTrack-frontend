(function () {
  "use strict";

  const API = window.CleanTrackApi;
  const AUTH = window.CleanTrackAuth;

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function button(label, cls, fn) {
    const node = el("button", cls || "ct-inv-button", label);
    node.type = "button";
    node.addEventListener("click", fn);
    return node;
  }
  function date(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    const pref = window.CleanTrackPreferences;
    return pref && pref.formatDate
      ? pref.formatDate(parsed)
      : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(parsed);
  }
  function statusClass(value) {
    return "ct-inv-status ct-inv-status--" + String(value || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }
  function showMessage(root, message, type) {
    const notice = root.querySelector("[data-inv-notice]");
    if (!notice) return;
    notice.textContent = message || "";
    notice.className = "ct-inv-notice" + (type ? " is-" + type : "");
    notice.hidden = !message;
  }
  async function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const temp = el("textarea");
    temp.value = value;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const copied = document.execCommand("copy");
    temp.remove();
    if (!copied) throw new Error("Your browser blocked copying. Please copy the invitation text manually.");
  }
  function organizationJoinUrl(code) {
    const url = new URL("/", window.location.origin);
    url.searchParams.set("join", code);
    url.searchParams.set("role", "employee");
    return url.href;
  }
  function shareMessage(code, url, organizationName) {
    const org = organizationName ? " to join " + organizationName : " to join our organization";
    return "You're invited" + org + " on CleanTrack. Open this link to request access: " + url +
      " Organization code: " + code + ". An organization Admin must approve your request before access is granted.";
  }
  async function shareInvitation(root, code, orgName, shareButton) {
    if (!code) {
      showMessage(root, "The organization code is not available yet. Refresh and try again.", "error");
      return;
    }
    const url = organizationJoinUrl(code);
    const text = shareMessage(code, url, orgName);
    const payload = { title: "Join " + (orgName || "our organization") + " on CleanTrack", text, url };
    shareButton.disabled = true;
    const oldLabel = shareButton.textContent;
    shareButton.textContent = "Opening share options…";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        showMessage(root, "Share options closed. CleanTrack does not send messages on your behalf.", "success");
      } else {
        await copyText(text);
        showMessage(root, "Your invitation message was copied. Paste it into WhatsApp, SMS, or any other messaging app.", "success");
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        // The user dismissed the system share sheet. Nothing was sent.
      } else {
        showMessage(root, error && error.message ? error.message : "Could not open sharing. Try again or copy the invitation from your browser.", "error");
      }
    } finally {
      shareButton.disabled = false;
      shareButton.textContent = oldLabel;
    }
  }

  function render(root) {
    root.replaceChildren();
    const user = AUTH && AUTH.getCurrentUser ? AUTH.getCurrentUser() : null;
    if (!user || String(user.role || "").toLowerCase() !== "admin") {
      root.appendChild(el("p", "ct-inv-muted", "Invitations and membership approvals are available to organization Admins only."));
      return;
    }

    const page = el("section", "ct-invitations-page");
    const header = el("header", "ct-inv-header");
    const intro = el("div");
    intro.append(
      el("p", "ct-inv-eyebrow", "ORGANIZATION ACCESS"),
      el("h1", "", "Invitations"),
      el("p", "ct-inv-muted", "Share one organization invite through your device's share sheet. Choose WhatsApp, SMS, or another available app there. People still need Admin approval before they can access CleanTrack.")
    );
    header.append(intro, button("Refresh", "ct-inv-button", () => load(page, false)));
    page.appendChild(header);

    const notice = el("div", "ct-inv-notice");
    notice.dataset.invNotice = "true";
    notice.hidden = true;
    notice.setAttribute("role", "status");
    page.appendChild(notice);

    const shareCard = el("section", "ct-inv-card");
    const shareHead = el("div", "ct-inv-card-head");
    const shareIntro = el("div");
    shareIntro.append(
      el("h2", "", "Share an organization invitation"),
      el("p", "ct-inv-muted", "No recipient email is required. Tap Share invitation to open the device's native sharing panel and choose any supported app. If native sharing is unavailable, the invitation message is copied so you can paste it into your preferred app.")
    );
    shareHead.appendChild(shareIntro);
    shareCard.appendChild(shareHead);

    const orgDetails = el("p", "ct-inv-muted", "Loading organization details…");
    const codeRow = el("div", "ct-inv-code-row");
    const codeValue = el("code", "ct-inv-code", "Loading organization code…");
    codeRow.appendChild(codeValue);
    shareCard.append(orgDetails, codeRow);
    const shareActions = el("div", "ct-inv-actions");
    const shareBtn = button("Share invitation", "ct-inv-button ct-inv-button--primary", () => shareInvitation(page, codeValue.dataset.value || "", codeValue.dataset.orgName || "", shareBtn));
    shareActions.appendChild(shareBtn);
    shareCard.appendChild(shareActions);
    page.appendChild(shareCard);

    const requestsCard = el("section", "ct-inv-card");
    const requestsHeader = el("div", "ct-inv-card-head");
    const requestsIntro = el("div");
    requestsIntro.append(
      el("h2", "", "Join requests"),
      el("p", "ct-inv-muted", "These are real membership requests from the organization's database. Review applicant details before approving or rejecting. Sharing an invite never grants access automatically.")
    );
    requestsHeader.appendChild(requestsIntro);
    requestsCard.appendChild(requestsHeader);

    const reqToolbar = el("div", "ct-inv-toolbar");
    const reqTabs = el("div", "ct-inv-tabs");
    reqTabs.setAttribute("role", "tablist");
    reqTabs.setAttribute("aria-label", "Membership request status");
    const reqSearch = el("input", "ct-inv-input");
    reqSearch.type = "search";
    reqSearch.placeholder = "Search by name, email, role, or phone";
    reqSearch.setAttribute("aria-label", "Search membership requests");
    reqToolbar.append(reqTabs, reqSearch);
    requestsCard.appendChild(reqToolbar);
    const requestList = el("div", "ct-inv-list");
    requestList.dataset.requestList = "true";
    requestsCard.appendChild(requestList);
    page.appendChild(requestsCard);

    let requests = [];
    let activeStatus = "pending";
    const statuses = ["pending", "approved", "rejected"];

    function buildTabs(counts) {
      reqTabs.replaceChildren();
      statuses.forEach(status => {
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        const tab = button(label + " " + (counts[status] || 0), "ct-inv-tab" + (activeStatus === status ? " is-active" : ""), () => {
          activeStatus = status;
          renderRequests();
        });
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", activeStatus === status ? "true" : "false");
        reqTabs.appendChild(tab);
      });
    }

    function renderRequests() {
      const counts = { pending: 0, approved: 0, rejected: 0 };
      requests.forEach(request => { if (counts[request.status] !== undefined) counts[request.status]++; });
      buildTabs(counts);
      requestList.replaceChildren();
      const needle = reqSearch.value.trim().toLowerCase();
      const rows = requests.filter(request => request.status === activeStatus).filter(request => {
        const applicant = request.applicant || {};
        return [applicant.full_name, applicant.name, applicant.email, applicant.phone, request.requested_role, request.message, request.review_message]
          .some(value => String(value || "").toLowerCase().includes(needle));
      });
      if (!rows.length) {
        requestList.appendChild(el("div", "ct-inv-empty", activeStatus === "pending"
          ? "No pending join requests. New requests will appear here after someone uses your shared organization link."
          : "No " + activeStatus + " join requests are recorded for this organization."));
        return;
      }
      rows.forEach(request => {
        const applicant = request.applicant || {};
        const item = el("article", "ct-inv-request");
        const main = el("div", "ct-inv-request-main");
        const identity = el("div", "ct-inv-request-identity");
        identity.append(
          el("h3", "", applicant.full_name || applicant.name || "Applicant name unavailable"),
          el("p", "ct-inv-muted", applicant.email || "Email unavailable")
        );
        main.append(identity, el("span", statusClass(request.status), request.status));
        item.appendChild(main);

        const meta = el("div", "ct-inv-meta");
        [
          ["Requested role", request.requested_role || "Not recorded"],
          ["Phone", applicant.phone || "Not provided"],
          ["Requested", date(request.created_at)],
          ["Account status", applicant.account_status || "Not available"]
        ].forEach(([label, value]) => {
          const field = el("div", "ct-inv-meta-item");
          field.append(el("span", "", label), el("strong", "", value));
          meta.appendChild(field);
        });
        item.appendChild(meta);

        const details = el("details", "ct-inv-details");
        const summary = el("summary", "", "Review submitted information");
        const body = el("div", "ct-inv-details-body");
        body.append(
          el("p", "", "Applicant: " + (applicant.full_name || applicant.name || "—")),
          el("p", "", "Email: " + (applicant.email || "—")),
          el("p", "", "Phone: " + (applicant.phone || "Not provided")),
          el("p", "", "Role requested: " + (request.requested_role || "—")),
          el("p", "", "Request date: " + date(request.created_at))
        );
        if (request.message) body.appendChild(el("p", "", "Applicant message: " + request.message));
        if (request.review_message) body.appendChild(el("p", "", "Review note: " + request.review_message));
        if (request.reviewer) body.appendChild(el("p", "", "Reviewed by: " + (request.reviewer.name || request.reviewer.email || "Admin")));
        if (request.reviewed_at) body.appendChild(el("p", "", "Reviewed: " + date(request.reviewed_at)));
        details.append(summary, body);
        item.appendChild(details);

        if (request.status === "pending") {
          const approvalBox = el("div", "ct-inv-approval-email");
          approvalBox.append(
            el("h4", "", "Approval email to the new member"),
            el("p", "ct-inv-muted", "Edit the message sent to " + (applicant.email || "the applicant") + ". Personalization placeholders: {name}, {organization}, {role}, {email}.")
          );
          const emailBody = el("textarea", "ct-inv-input ct-inv-approval-email-body");
          emailBody.rows = 6;
          emailBody.maxLength = 10000;
          emailBody.setAttribute("aria-label", "Editable membership approval email");
          emailBody.value = "Hello {name},\n\nGood news! Your request to join {organization} on CleanTrack has been approved. Your account is now active, and you can sign in using {email}.\n\nApproved role: {role}\nOrganization: {organization}\n\nWelcome aboard!\n{organization} Admin team";
          approvalBox.appendChild(emailBody);
          const actions = el("div", "ct-inv-actions");
          actions.append(
            button("Approve & send email", "ct-inv-button ct-inv-button--primary", async () => {
              if (!confirm("Approve " + (applicant.full_name || applicant.email || "this applicant") + " and email the approval message?")) return;
              await reviewRequest(page, request.id, "approve", "", emailBody.value);
            }),
            button("Reject request", "ct-inv-button ct-inv-button--danger", async () => {
              const reason = prompt("Optional rejection reason (recorded in the audit trail):", "");
              if (reason === null) return;
              await reviewRequest(page, request.id, "reject", reason.trim(), "");
            })
          );
          approvalBox.appendChild(actions);
          item.appendChild(approvalBox);
        }
        requestList.appendChild(item);
      });
    }

    async function reviewRequest(root, id, decision, reviewMessage, approvalEmailMessage) {
      try {
        const result = await API.post("membership/requests/" + id + "/review", { decision, review_message: reviewMessage, approval_email_message: approvalEmailMessage || "" });
        showMessage(root, result.message || "Membership request updated.", result.email_sent === false ? "error" : "success");
        await load(root, false);
      } catch (error) {
        showMessage(root, error.message || "Could not review membership request.", "error");
      }
    }

    reqSearch.addEventListener("input", renderRequests);

    async function load(root, firstLoad) {
      if (firstLoad) showMessage(root, "Loading organization details and access requests…");
      try {
        const [organizationResponse, requestsResponse] = await Promise.all([
          API.get("organizations/current"),
          API.get("membership/requests?status=all")
        ]);
        const organization = organizationResponse.organization || {};
        const code = organization.code || organization.organization_code || "";
        codeValue.textContent = code || "Organization code unavailable";
        codeValue.dataset.value = code;
        codeValue.dataset.orgName = organization.name || "";
        orgDetails.textContent = organization.name
          ? "Invite people to request membership in " + organization.name + ". An Admin reviews every request."
          : "Invite people to request membership in your organization. An Admin reviews every request.";
        requests = Array.isArray(requestsResponse.membership_requests) ? requestsResponse.membership_requests : [];
        renderRequests();
        if (firstLoad) showMessage(root, "Organization details and membership requests loaded.", "success");
        else showMessage(root, "Membership requests refreshed.", "info");
      } catch (error) {
        if (firstLoad) requestList.replaceChildren(el("div", "ct-inv-error", error.message || "Could not load access requests."));
        showMessage(root, error.message || "Could not load organization access records. Check your connection and permissions.", "error");
      }
    }

    root.appendChild(page);
    load(page, true);
  }

  window.CleanTrackInvitations = Object.freeze({ render });
})();