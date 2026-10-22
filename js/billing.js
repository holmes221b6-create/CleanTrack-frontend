/* CleanTrack Billing — organisation subscription page. */
(function () {
  "use strict";
  const api = window.CleanTrackApi;
  if (!api) throw new Error("CleanTrackApi must load before billing.js.");
  const state = { data: null, interval: "monthly", busy: false };
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date = v => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); };
  const days = v => v ? Math.max(0, Math.ceil((new Date(v).getTime()-Date.now())/86400000)) : 0;
  function statusText(s) { return ({free:"Free plan",trialing:"Premium trial",active:"Premium",past_due:"Payment needs attention",cancelled:"Cancelled",expired:"Trial ended"}[s] || s || "Free plan"); }
  function busy(button, value, label) {
    if (!button) return;
    if (value) { button.dataset.oldLabel = button.textContent; button.disabled = true; button.textContent = label; }
    else { button.disabled = false; if (button.dataset.oldLabel) button.textContent = button.dataset.oldLabel; delete button.dataset.oldLabel; }
  }
  function showError(root, message) {
    root.innerHTML = '<section class="ct-billing"><header class="ct-billing-hero"><div><p class="ct-billing-eyebrow">ORGANISATION PLAN</p><h2>Billing &amp; subscription</h2><p>Manage your organisation’s CleanTrack subscription.</p></div></header><div class="ct-billing-alert error" role="alert">'+esc(message || "Billing information could not be loaded.")+'</div><button type="button" class="ct-billing-btn" data-retry>Try again</button></section>';
    root.querySelector("[data-retry]")?.addEventListener("click", () => load(root));
  }
  function render(root) {
    const d=state.data, s=d.subscription||{}, p=d.provider||{}, e=d.entitlements||{};
    const trial=s.status==="trialing", active=s.status==="active", premium=trial||active, used=Boolean(s.trial_used);
    const left=days(s.trial_ends_at), missing=p.missing_fields||[];
    const org=d.organization?.name||"Your organisation";
    const entNote=e.enforcement_status==="foundation_only" ? "Subscription state is checked server-side. Existing feature endpoints have not yet been restricted by plan." : "";
    root.innerHTML = `
    <section class="ct-billing">
      <header class="ct-billing-hero"><div><p class="ct-billing-eyebrow">ORGANISATION PLAN</p><h2>Billing &amp; subscription</h2><p>One subscription for ${esc(org)}. Manage your plan, trial and billing details in one place.</p></div><span class="ct-billing-hero-icon" aria-hidden="true">$</span></header>
      <section class="ct-billing-current"><div class="ct-billing-current-top"><div><p class="ct-billing-eyebrow">CURRENT SUBSCRIPTION</p><h3>${premium?"CleanTrack Premium":"CleanTrack Free"}</h3><p class="ct-billing-muted">${esc(statusText(s.status))} · applies to the whole organisation</p></div><span class="ct-billing-status ${premium?"is-premium":""}">${esc(statusText(s.status))}</span></div>
      ${trial?(s.trial_ends_at?'<div class="ct-billing-trial"><div><strong>'+left+' day'+(left===1?"":"s")+' remaining</strong><p>Your 14-day Premium trial ends on '+esc(date(s.trial_ends_at))+'. No automatic charge is scheduled.</p></div><div class="ct-billing-trial-track"><span style="width:'+Math.max(0,Math.min(100,((14-left)/14)*100))+'%"></span></div></div>':'<div class="ct-billing-alert error" role="alert"><strong>Trial status needs verification.</strong> The server marks this organisation as trialing but did not provide an end date. Refresh Billing; if this remains, the saved subscription record needs checking.</div>'):""}
      ${active?'<p class="ct-billing-muted">Premium is marked active in CleanTrack. Provider-backed payments are not connected yet.</p>':""}
      ${entNote?'<p class="ct-billing-note">'+esc(entNote)+'</p>':""}</section>
      <section class="ct-billing-section"><div class="ct-billing-section-head"><div><h3>Choose your plan</h3><p class="ct-billing-muted">Final prices are not set yet; this page will not charge you.</p></div><div class="ct-billing-interval" role="group" aria-label="Billing frequency"><button type="button" data-interval="monthly" class="${state.interval==="monthly"?"is-selected":""}" aria-pressed="${state.interval==="monthly"}">Monthly</button><button type="button" data-interval="annual" class="${state.interval==="annual"?"is-selected":""}" aria-pressed="${state.interval==="annual"}">Annual</button></div></div>
      <div class="ct-billing-plans">
        <article class="ct-billing-plan"><div class="ct-billing-plan-top"><div><span class="ct-billing-plan-kicker">STARTER</span><h4>Free</h4></div><span class="ct-billing-plan-label">Available</span></div><p class="ct-billing-price">Free <span>/ no subscription charge</span></p><p class="ct-billing-muted">Core CleanTrack workspace for organisations getting started.</p><ul><li>Core operations workflow</li><li>Organisation locations and zones</li><li>Standard operational records</li></ul><button type="button" class="ct-billing-btn secondary" disabled>${s.status==="free"||s.status==="expired"?"Current plan":"Free plan"}</button></article>
        <article class="ct-billing-plan premium"><div class="ct-billing-plan-top"><div><span class="ct-billing-plan-kicker">FOR GROWING TEAMS</span><h4>Premium</h4></div><span class="ct-billing-plan-label">14-day trial</span></div><p class="ct-billing-price">Price to be announced</p><p class="ct-billing-muted">${state.interval==="annual"?"Annual":"Monthly"} billing selected. Paid checkout stays disabled until pricing and Razorpay tests are approved.</p><ul><li>Planned advanced reporting</li><li>Planned extended audit history</li><li>Planned integrations and premium support</li></ul><button type="button" class="ct-billing-btn primary" data-trial ${(used||trial||active||state.busy)?"disabled":""}>${trial?"Premium trial running":active?"Premium active":used?"Trial already used":"Start 14-day Premium trial"}</button>${!used&&!premium?'<p class="ct-billing-small">No payment is taken to start this trial. The trial does not automatically charge you.</p>':""}<button type="button" class="ct-billing-btn quiet" data-payment-info>Paid checkout status</button></article>
      </div><p class="ct-billing-note">Premium feature descriptions are planned inclusions, not a claim that every feature is already fully implemented or plan-gated.</p></section>
      <section class="ct-billing-section"><div class="ct-billing-section-head"><div><h3>Billing details</h3><p class="ct-billing-muted">Required before a new 14-day Premium trial can start. GSTIN is optional. Saving these details does not make a payment.</p></div></div><form class="ct-billing-form" id="ct-billing-form">
        <label><span>Billing contact name <em class="ct-billing-required">Required</em></span><input name="billing_contact_name" maxlength="120" autocomplete="name" required value="${esc(s.billing_contact_name||"")}"></label>
        <label><span>Billing email <em class="ct-billing-required">Required</em></span><input name="billing_email" type="email" maxlength="254" autocomplete="email" required value="${esc(s.billing_email||"")}"></label>
        <label><span>Legal / organisation name <em class="ct-billing-required">Required</em></span><input name="billing_legal_name" maxlength="180" required value="${esc(s.billing_legal_name||"")}"></label>
        <label><span>GSTIN (optional)</span><input name="billing_gstin" maxlength="15" autocapitalize="characters" placeholder="15-character GSTIN" value="${esc(s.billing_gstin||"")}"></label>
        <label class="wide"><span>Billing address <em class="ct-billing-required">Required</em></span><textarea name="billing_address" rows="3" maxlength="3000" autocomplete="street-address" required>${esc(s.billing_address||"")}</textarea></label>
        <div class="ct-billing-form-actions"><button class="ct-billing-btn primary" type="submit" ${state.busy?"disabled":""}>Save billing details</button><span class="ct-billing-form-message" role="status" aria-live="polite"></span></div>
      </form></section>
      <section class="ct-billing-section"><div class="ct-billing-section-head"><div><h3>Payment methods</h3><p class="ct-billing-muted">Choose how your organisation plans to pay when paid subscriptions are enabled.</p></div><span class="ct-billing-status">Checkout not enabled</span></div>
      <div class="ct-billing-methods">
        <article class="ct-billing-method"><span class="ct-billing-method-icon" aria-hidden="true">↔</span><div><strong>Bank transfer / net banking</strong><p>Banking payments for an organisation subscription.</p></div><span class="ct-billing-method-state">Coming soon</span></article>
        <article class="ct-billing-method"><span class="ct-billing-method-icon" aria-hidden="true">₹</span><div><strong>UPI</strong><p>UPI payment from a supported Indian bank or app.</p></div><span class="ct-billing-method-state">Coming soon</span></article>
        <article class="ct-billing-method"><span class="ct-billing-method-icon" aria-hidden="true">P</span><div><strong>PayPal</strong><p>International payment option, subject to merchant and subscription support.</p></div><span class="ct-billing-method-state">Coming soon</span></article>
      </div><p class="ct-billing-note">These methods are displayed as planned options only. No payment can be initiated or recorded from this page yet.</p></section>
      <section class="ct-billing-section"><div class="ct-billing-section-head"><div><h3>Invoices &amp; billing history</h3><p class="ct-billing-muted">Receipts appear here after provider-backed payments and invoice retrieval are connected.</p></div></div><div class="ct-billing-empty"><span aria-hidden="true">▤</span><strong>No invoices yet</strong><p>No provider-backed invoices are available yet. No invoice has been fabricated.</p></div></section>
      <section class="ct-billing-section"><div class="ct-billing-section-head"><div><h3>Payment integration</h3><p class="ct-billing-muted">Razorpay is the proposed provider for Indian recurring subscriptions.</p></div><span class="ct-billing-status">Setup required</span></div><div class="ct-billing-provider"><div><strong>Razorpay</strong><p>${esc(p.credentials_complete?"Credentials appear present, but checkout remains disabled until the payment flow and test transactions are verified.":"Razorpay checkout is not ready. Server credentials and monthly/annual plan IDs must be configured before payment testing.")}</p></div><ul>${missing.map(x=>"<li>"+esc(x.replaceAll("_"," "))+"</li>").join("")||"<li>Credentials present; integration still requires verification</li>"}</ul></div><p class="ct-billing-note">Paid checkout, automatic renewals, paid-plan activation and real invoices are not enabled. This page will not attempt a payment.</p></section>
      <div class="ct-billing-feedback" role="status" aria-live="polite"></div>
    </section>`;
    root.querySelectorAll("[data-interval]").forEach(b=>b.addEventListener("click",()=>{state.interval=b.dataset.interval;render(root);}));
    root.querySelector("[data-trial]")?.addEventListener("click",async function(){
      const button=this; const feedback=root.querySelector(".ct-billing-feedback"); state.busy=true; busy(button,true,"Starting trial…"); feedback.textContent="";
      try { const form=root.querySelector("#ct-billing-form"); const payload={}; ["billing_contact_name","billing_email","billing_legal_name","billing_address","billing_gstin"].forEach(k=>payload[k]=String(new FormData(form).get(k)||"").trim()); const missing=["billing_contact_name","billing_email","billing_legal_name","billing_address"].filter(k=>!payload[k]); if(missing.length){state.busy=false;render(root);const f=root.querySelector(".ct-billing-feedback");f.textContent="Before starting your trial, complete and save the required billing contact, email, legal/organisation name and billing address.";root.querySelector("#ct-billing-form")?.scrollIntoView?.({behavior:"smooth",block:"center"});return;} await api.patch("billing/billing-details",payload); await api.post("billing/trial/start",{billing_interval:state.interval}); state.data=await api.get("billing/current"); state.busy=false; render(root); root.querySelector(".ct-billing-feedback").textContent="Your 14-day Premium trial has started."; }
      catch(err) { state.busy=false; const msg=err.message||"The trial could not be started."; try{state.data=await api.get("billing/current");render(root);}catch(_){} const f=root.querySelector(".ct-billing-feedback");if(f)f.textContent=msg; }
    });
    root.querySelector("[data-payment-info]")?.addEventListener("click",()=>{root.querySelector(".ct-billing-feedback").textContent="Paid checkout is deliberately disabled until Razorpay credentials, monthly and annual plan IDs, webhook lifecycle handling, and test transactions are verified.";});
    root.querySelector("#ct-billing-form")?.addEventListener("submit",async function(ev){
      ev.preventDefault(); const form=this, button=form.querySelector('button[type="submit"]'), msg=form.querySelector(".ct-billing-form-message"), payload={};
      ["billing_contact_name","billing_email","billing_legal_name","billing_address","billing_gstin"].forEach(k=>payload[k]=String(new FormData(form).get(k)||"").trim());
      state.busy=true;busy(button,true,"Saving…");msg.textContent="";
      try{await api.patch("billing/billing-details",payload);state.data=await api.get("billing/current");state.busy=false;render(root);root.querySelector(".ct-billing-form-message").textContent="Billing details saved.";}
      catch(err){state.busy=false;busy(button,false,"Save billing details");msg.textContent=err.message||"Could not save billing details.";}
    });
  }
  async function load(root) {
    root.innerHTML='<section class="ct-billing"><header class="ct-billing-hero"><div><p class="ct-billing-eyebrow">ORGANISATION PLAN</p><h2>Billing &amp; subscription</h2><p>Loading your organisation’s subscription…</p></div></header><div class="ct-billing-loading" role="status">Loading billing details…</div></section>';
    try{state.data=await api.get("billing/current");render(root);}catch(e){showError(root,e.message||"Billing information could not be loaded.");}
  }
  window.CleanTrackBilling=Object.freeze({render:load});
})();
