(() => {
'use strict';
const { esc, fmt, partOf, partName, noticeLabel, DAYS, PARTS, NOTICES, CLINIC } = OS;
const $ = s => document.querySelector(s);
const S = () => OS.state();
let pid = null;
try { pid = +sessionStorage.getItem('openslot-patient') || null; } catch (e) { /* none */ }
const t0 = Date.now();
const skeleton = () => OS.sync().connecting && Date.now() - t0 < 2500;
setTimeout(() => render(), 2600);
const ui = { menu: null, toast: null, tools: false, confirm: null, joinAvail: DAYS.map(() => ({ M: true, A: false, E: false })) };
const asParam = new URLSearchParams(location.search).get('as');
if (asParam && /^\d+$/.test(asParam)) { pid = +asParam; try { sessionStorage.setItem('openslot-patient', pid); } catch (e) { /* ignore */ } }
const me = () => pid && OS.patientById(pid);
function toast(msg) { ui.toast = msg; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = null; render(); }, 2400); }
const route = () => (location.hash.replace('#/', '') || 'home');
const myOffers = () => { const out = []; S().slots.forEach(s => s.offers.forEach(o => { if (o.pid === pid) out.push({ s, o }); })); return out.sort((a, b) => b.o.sentAt - a.o.sentAt); };

function loginView() {
  const waiting = S().patients.filter(p => p.wl && p.wl.status !== 'removed');
  const holders = S().patients.filter(p => !p.wl);
  const btn = p => `<button class="acct" data-action="login" data-p="${p.id}"><strong>${esc(p.name)}</strong><span>${p.wl ? 'Wants an earlier ' + esc(p.wl.services[0].toLowerCase()) : 'Appointment today ' + (S().slots.find(s => s.patientId === p.id) ? fmt(S().slots.find(s => s.patientId === p.id).start) : '')}</span></button>`;
  return `<div class="pt-wrap"><div class="pt-login"><div class="login-brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M9 16a7 7 0 1 1 7 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg><span class="wordmark">Openslot</span></div>
    <h1>Your appointments at ${CLINIC}</h1><p class="muted">Get offered earlier appointments by SMS. In the real product you open the app from the link in your SMS. In this demo, pick a patient.</p>
    <form id="phone-form" class="pt-card" novalidate><label for="ph">Mobile number</label><input id="ph" type="tel" placeholder="+43 660 1234567" autocomplete="tel"><p class="form-err" id="ph-err" role="alert" hidden></p>
      <button class="btn primary big" type="submit" style="margin-top:10px;width:100%">Send me a sign-in link</button></form>
    <form id="new-form" class="pt-card"><h3>New here?</h3><p class="dim">Create an account to join the waiting list.</p><label for="nn">Your name</label><input id="nn" required placeholder="Full name" autocomplete="name">
      <label class="check consent"><input type="checkbox" id="nc" required> I agree that the clinic may send me appointment offers by SMS. I can withdraw this at any time.</label>
      <button class="btn big" type="submit" style="margin-top:10px;width:100%">Create account</button></form>
    <details class="demo-access"><summary>Demo access</summary><p class="note" style="margin-top:8px">A student project with fictional patients. Pick one to sign in.</p>
      <div class="section-title" style="padding-left:0">Waiting for an earlier appointment</div>${waiting.slice(0, 6).map(btn).join('')}
      <div class="section-title" style="padding-left:0">Has an appointment today (can cancel it)</div>${holders.slice(0, 6).map(btn).join('')}
      <p class="note"><a href="${OS.link('index.html')}">Open the clinic app</a></p></details></div></div>`;
}

function offerCard(s, o, full) {
  const left = Math.max(0, o.expiresAt - S().clock);
  if (o.state === 'accepted') return `<div class="pt-card ok"><div class="success"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="26"/><path d="M16 29l8 8 16-17"/></svg><h3>You are booked</h3></div><p style="text-align:center">${esc(s.service)} today at <strong>${fmt(s.start)}</strong> with ${esc(s.doc)}. See you soon.</p>
    <div class="pt-actions"><button class="btn big" data-action="ics" data-s="${s.id}">Add to calendar</button></div></div>`;
  if (o.state === 'declined') return `<div class="pt-card"><h3>You declined this offer</h3><p class="dim">${esc(s.service)} at ${fmt(s.start)}. You stay on the waiting list.</p></div>`;
  if (o.state === 'expired') return `<div class="pt-card"><h3>This offer expired</h3><p class="dim">${esc(s.service)} at ${fmt(s.start)} was offered to the next patient. You stay on the waiting list.</p></div>`;
  return `<div class="pt-card offer"><span class="chip info">Earlier appointment available</span><h3>${esc(s.service)} today at ${fmt(s.start)}</h3>
    <p>with ${esc(s.doc)} at ${CLINIC}, ${s.dur} minutes.</p><div class="countdown"><span>Time left to answer</span><strong>${left} min</strong></div><div class="progress ${left <= 5 ? 'urgent' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${o.expiresAt - o.sentAt}" aria-valuenow="${left}"><i style="width:${Math.max(0, Math.min(100, Math.round(100 * left / Math.max(1, o.expiresAt - o.sentAt))))}%"></i></div>
    <div class="pt-actions"><button class="btn primary big" data-action="accept" data-o="${o.id}">Take this appointment</button><button class="btn big" data-action="decline" data-o="${o.id}">No thanks</button></div>
    <p class="note">If you take it, your later appointment (${esc(me().current || 'none')}) is released for other patients.</p></div>`;
}

function joinCard() {
  const head = ['<div></div>', ...DAYS.map(d => `<div class="h">${d}</div>`)].join('');
  const body = PARTS.map(pt => `<div class="r">${pt.name}<small>${pt.hours}</small></div>` + DAYS.map((d, i) => `<button type="button" data-action="jt" data-d="${i}" data-k="${pt.k}" aria-pressed="${ui.joinAvail[i][pt.k]}" aria-label="${d} ${pt.name}">${ui.joinAvail[i][pt.k] ? 'Yes' : '–'}</button>`).join('')).join('');
  return `<section class="pt-card"><h3>Get an earlier appointment</h3><p class="dim">Tell us what you need and when you can come. When a slot frees up that fits, we text you.</p>
    <form id="join-form"><fieldset><legend>Treatment</legend>${OS.SERVICES.map((sv, i) => `<label class="check"><input type="checkbox" name="svc" value="${esc(sv)}" ${i === 0 ? 'checked' : ''}> ${esc(sv)}</label>`).join('')}</fieldset>
      <div class="avail" role="group" aria-label="Availability" style="margin:12px 0">${head}${body}</div>
      <div class="field" style="margin-top:0"><label for="jn">How much notice do you need?</label><select id="jn">${NOTICES.map(n => `<option value="${n.v}" ${n.v === 60 ? 'selected' : ''}>${n.l}</option>`).join('')}</select></div>
      <label class="check consent"><input type="checkbox" id="jc" required> I agree to receive offers by SMS.</label>
      <button class="btn primary big" type="submit" style="margin-top:12px;width:100%">Join the list</button></form></section>`;
}
function homeView() {
  const p = me(), offers = myOffers(), pend = offers.filter(x => x.o.state === 'pending');
  const slot = S().slots.find(s => s.patientId === p.id);
  let h = `<h1 class="pt-h">Hello ${esc(p.name.split(' ')[0])}</h1>`;
  pend.forEach(x => { h += offerCard(x.s, x.o); });
  const accepted = offers.find(x => x.o.state === 'accepted');
  if (accepted) h += offerCard(accepted.s, accepted.o);
  if (p.appt && S().slots.find(s => s.id === p.appt) && !(accepted && p.appt === accepted.s.id)) {
    const s = S().slots.find(s => s.id === p.appt);
    h += `<section class="pt-card"><span class="chip ${s.status === 'refilled' ? 'ok' : 'info'}">${s.status === 'refilled' ? 'Moved earlier' : 'Booked'}</span><h3>${esc(s.service)} today at ${fmt(s.start)}</h3><p>with ${esc(s.doc)}, ${s.dur} minutes</p>
      ${s.status === 'booked' && s.start > S().clock ? '<button class="btn danger" data-action="cancel-ask">Cancel appointment</button><p class="note">If you cancel, the clinic can offer your slot to someone who is waiting. Thank you for letting us know early.</p>' : ''}</section>`;
  } else if (slot && slot.status !== 'booked') {
    h += `<section class="pt-card"><span class="chip neutral">Cancelled</span><h3>${esc(slot.service)} at ${fmt(slot.start)}</h3><p class="dim">You cancelled this appointment. We sent you a confirmation by SMS. Please call the clinic to book a new one.</p></section>`;
  }
  if (p.wl && p.wl.status === 'waiting') {
    h += `<section class="pt-card"><h3>Earlier appointment</h3><p>You are on the list for <strong>${p.wl.services.map(esc).join(', ')}</strong> since ${p.wl.wait} days.</p>
      <p class="dim">Current appointment: ${esc(p.current)}</p><div class="kv"><span>You told us you can come on</span><div class="days">${p.wl.avail.map((d, i) => `<span class="${d.M || d.A || d.E ? 'on' : ''}">${DAYS[i]}</span>`).join('')}</div></div>
      <a class="btn" href="#/availability">Change when I can come</a></section>`;
  } else if (p.wl && p.wl.status === 'booked' && !accepted) {
    h += `<section class="pt-card ok"><h3>You moved to an earlier appointment</h3><p>Your later appointment was released.</p></section>`;
  } else if (p.wl && p.wl.status === 'removed') {
    h += `<section class="pt-card"><h3>You left the waiting list</h3><p class="dim">You will not receive offers anymore.</p></section>`;
  }
  if ((!p.wl || p.wl.status === 'removed') && !p.appt && !S().slots.some(s => s.patientId === p.id)) h += joinCard();
  const hist = offers.filter(x => x.o.state !== 'pending' && x.o.state !== 'accepted');
  if (hist.length) h += `<div class="section-title" style="padding-left:2px">Earlier offers</div>` + hist.map(x => offerCard(x.s, x.o)).join('');
  return h;
}
function availabilityView() {
  const p = me(); if (!p.wl) return '<div class="pt-card"><h3>No waiting list</h3><p class="dim">You are not on an earlier-appointment list.</p></div>';
  const head = ['<div></div>', ...DAYS.map(d => `<div class="h">${d}</div>`)].join('');
  const body = PARTS.map(pt => `<div class="r">${pt.name}<small>${pt.hours}</small></div>` + DAYS.map((d, i) => `<button type="button" data-action="toggle" data-d="${i}" data-k="${pt.k}" aria-pressed="${p.wl.avail[i][pt.k]}" aria-label="${d} ${pt.name}">${p.wl.avail[i][pt.k] ? 'Yes' : '–'}</button>`).join('')).join('');
  return `<h1 class="pt-h">When can you come?</h1><p class="muted">Tell us once. The clinic only offers you slots that fit. Changes are saved straight away.</p>
    <section class="pt-card"><div class="avail" role="group" aria-label="Availability">${head}${body}</div>
    <div class="field"><label for="notice">How much notice do you need?</label><select id="notice" data-change="notice">${NOTICES.map(n => `<option value="${n.v}" ${n.v === p.wl.notice ? 'selected' : ''}>${n.l}</option>`).join('')}</select></div></section>`;
}
function messagesView() {
  const msgs = S().outbox.filter(m => m.pid === pid).reverse();
  return `<h1 class="pt-h">Messages</h1><p class="muted">This is what your phone would show. In the real product these arrive as SMS.</p>` + (msgs.length ? msgs.map(m => `<div class="sms-row"><span class="dim">${esc(m.time)}</span><div class="sms">${esc(m.text)}</div>${m.link ? `<a class="btn small" href="#/${m.link}">Open offer</a>` : ''}</div>`).join('') : '<div class="pt-card"><p class="dim">No messages yet.</p></div>');
}
function privacyView() {
  const p = me();
  return `<h1 class="pt-h">Privacy</h1>
    <section class="pt-card"><label class="switch-row"><span class="switch"><input type="checkbox" data-change="consent" ${p.consent.sms ? 'checked' : ''}><span></span></span><span><strong>Offers by SMS</strong><br><span class="dim">Consent given ${esc(p.consent.at)}. Switch off and you get no more offers.</span></span></label></section>
    <section class="pt-card"><h3>What we store</h3><ul class="plain"><li>Your name and phone number</li><li>The treatment you wait for</li><li>When you can come and how much notice you need</li><li>Offers we sent you and your answers</li></ul>
      <div class="pt-actions"><button class="btn" data-action="download">Download my data</button>${p.wl && p.wl.status === 'waiting' ? '<button class="btn danger" data-action="leave">Leave the waiting list</button>' : ''}</div></section>
    <p class="note">Demo only. Real retention periods and legal texts would be set with the clinic.</p>`;
}
function offerPage(id) {
  const found = (() => { for (const s of S().slots) { const o = s.offers.find(x => x.id === +id); if (o) return { s, o }; } return null; })();
  if (!found) return '<div class="pt-card"><h3>Offer not found</h3></div>';
  const owner = OS.patientById(found.o.pid);
  if (owner.id !== pid) return `<div class="pt-card"><h3>This offer is for ${esc(owner.name)}</h3><p class="dim">You are signed in as ${esc(me().name)}.</p><button class="btn primary" data-action="login" data-p="${owner.id}" data-go="offer/${id}">Open as ${esc(owner.name)}</button></div>`;
  return `<h1 class="pt-h">Appointment offer</h1>${offerCard(found.s, found.o)}`;
}

function syncChip() {
  const y = OS.sync();
  if (y.connecting) return '<span class="sync wait">Connecting</span>';
  return y.online ? `<span class="sync live" title="Shared demo room">Live · room ${esc(y.room)}</span>` : '<span class="sync off">This browser only</span>';
}
function popover(p) {
  if (ui.menu === 'demo') return `<div class="pop-scrim" data-action="menu-close"></div><div class="popover" role="menu" aria-label="Demo menu">
    <div class="pop-head"><strong>Demo</strong><span class="chip warn">Fictional data</span></div>
    <div class="pop-row"><span>Demo clock</span><strong>Tue 17 Nov, ${fmt(S().clock)}</strong></div>
    <div class="pop-row"><span>Shared room</span>${syncChip()}</div>
    <button class="pop-item" role="menuitem" data-action="tools">Demo tools</button>
    <a class="pop-item" role="menuitem" href="${OS.link('index.html')}" target="_blank" rel="noopener">Open the clinic app</a>
    <p class="pop-note">Student project demo. Everything here is fictional and nothing is sent to anyone.</p></div>`;
  return `<div class="pop-scrim" data-action="menu-close"></div><div class="popover" role="menu" aria-label="Account menu">
    <div class="pop-head"><span class="avatar" aria-hidden="true">${esc(p.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span><div><strong>${esc(p.name)}</strong><br><span class="dim">${esc(p.phone)}</span></div></div>
    <div class="pop-row col"><span>Appearance</span><div class="seg" role="group" aria-label="Theme">${['auto', 'light', 'dark'].map(t => `<button type="button" data-action="theme" data-t="${t}" aria-pressed="${OS.theme.get() === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
    <div class="pop-row col"><span>Accent colour</span><div class="seg" role="group" aria-label="Accent colour">${['blue', 'teal'].map(t => `<button type="button" data-action="accent" data-t="${t}" aria-pressed="${OS.accent.get() === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
    <a class="pop-item" role="menuitem" href="#/privacy" data-action="menu-close">Privacy and my data</a>
    <button class="pop-item danger" role="menuitem" data-action="logout">Sign out</button></div>`;
}
function render() {
  const app = $('#app');
  if (!pid || !me()) { app.innerHTML = loginView(); return; }
  const r = route(), parts = r.split('/');
  let body;
  if (parts[0] === 'offer') body = offerPage(parts[1]); else if (parts[0] === 'availability') body = availabilityView(); else if (parts[0] === 'messages') body = messagesView(); else if (parts[0] === 'privacy') body = privacyView(); else body = homeView();
  const p = me(), unread = S().outbox.filter(m => m.pid === pid).length;
  const tab = (k, l, d) => `<a href="#/${k}" ${(parts[0] === k || (k === 'home' && !['availability', 'messages', 'privacy'].includes(parts[0]))) ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>${l}</a>`;
  app.innerHTML = `<div class="pt-wrap"><header class="pt-top"><div class="brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M9 16a7 7 0 1 1 7 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg><span class="wordmark">Openslot</span></div>
    <div class="topbar-right"><button class="icon-btn" data-action="menu" data-m="demo" aria-label="Demo menu" aria-haspopup="menu" aria-expanded="${ui.menu === 'demo'}" title="Demo menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/></svg></button>
      <button class="avatar-btn" data-action="menu" data-m="user" aria-label="Account menu" aria-haspopup="menu" aria-expanded="${ui.menu === 'user'}"><span class="avatar" aria-hidden="true">${esc(p.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span></button></div></header>
    ${(!OS.sync().online && !OS.sync().connecting) ? '<div class="offline-banner" role="status">Working in this browser only right now.</div>' : ''}<main id="main" class="pt-main">${skeleton() ? '<div class="skeleton"></div><div class="skeleton" style="height:140px"></div>' : body}</main>
    <nav class="pt-tabs" aria-label="Main">${tab('home', 'Home', 'M3 11l9-8 9 8v10H3z')}${p.wl ? tab('availability', 'Availability', 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4') : ''}${tab('messages', 'Messages' + (unread ? ' (' + unread + ')' : ''), 'M4 5h16v11H8l-4 4z')}${tab('privacy', 'Privacy', 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z')}</nav></div>
    ${ui.menu ? popover(p) : ''}
    ${ui.confirm ? `<div class="scrim" data-action="confirm-no"></div><div class="modal" role="dialog" aria-modal="true"><h2>Cancel your appointment?</h2><div class="field" style="margin-top:8px"><label for="reason">Reason (optional)</label><select id="reason"><option>Feeling unwell</option><option>Schedule conflict</option><option>No longer needed</option><option>Other</option></select></div>
      <div class="modal-foot"><button class="btn" data-action="confirm-no">Keep it</button><button class="btn danger" data-action="confirm-yes">Cancel appointment</button></div></div>` : ''}
    ${ui.tools ? `<div class="scrim" data-action="tools"></div><aside class="drawer small"><div class="drawer-head"><div><h2>Demo tools</h2><p class="dim">Clock: Tue 17 Nov, ${fmt(S().clock)}</p></div><button class="btn ghost small" data-action="tools">Close</button></div><div class="drawer-body"><div class="tool-row"><button class="btn" data-action="advance" data-m="5">+5 min</button><button class="btn" data-action="advance" data-m="15">+15 min</button></div><p class="note">Move the clock to let an offer expire.</p><a class="btn block" style="text-align:center;text-decoration:none" href="${OS.link('index.html')}" target="_blank" rel="noopener">Open the clinic app</a><button class="btn danger block" style="margin-top:8px" data-action="reset">Reset all demo data</button></div></aside>` : ''}
    ${ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''}`;
}
OS.onChange(render);
window.addEventListener('hashchange', () => { ui.menu = null; render(); window.scrollTo(0, 0); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return; const a = b.dataset.action, d = b.dataset;
  const name = me() ? me().name + ' (patient app)' : '';
  if (a === 'login') { pid = +d.p; sessionStorage.setItem('openslot-patient', pid); location.hash = '#/' + (d.go || 'home'); }
  else if (a === 'logout') { ui.menu = null; pid = null; sessionStorage.removeItem('openslot-patient'); location.hash = '#/home'; }
  else if (a === 'accept' || a === 'decline') {
    const res = OS.respond(d.o, a, name);
    if (!res.ok) toast(res.why); else toast(a === 'accept' ? 'You are booked. See you soon.' : 'Thanks, you stay on the list.');
    return;
  }
  else if (a === 'cancel-ask') ui.confirm = true;
  else if (a === 'confirm-no') ui.confirm = null;
  else if (a === 'confirm-yes') { const slotId = me().appt, reason = ($('#reason') || {}).value; ui.confirm = null; OS.cancel(slotId, 'patient', reason, name); toast('Appointment cancelled'); return; }
  else if (a === 'toggle') { OS.update(st => { const p = OS.patientById(pid); p.wl.avail[+d.d][d.k] = !p.wl.avail[+d.d][d.k]; st.audit.push({ t: fmt(st.clock), actor: name, action: 'Updated own availability' }); }); toast('Saved'); return; }
  else if (a === 'leave') { OS.update(st => { const p = OS.patientById(pid); p.wl.status = 'removed'; st.audit.push({ t: fmt(st.clock), actor: name, action: 'Left the waiting list' }); }); toast('You left the waiting list'); return; }
  else if (a === 'download') { const p = me(), data = { name: p.name, phone: p.phone, consent: p.consent, waitingList: p.wl, offers: myOffers().map(x => ({ slot: x.s.service + ' ' + fmt(x.s.start), state: x.o.state })) }, blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'my-openslot-data.json'; l.click(); }
  else if (a === 'jt') { ui.joinAvail[+d.d][d.k] = !ui.joinAvail[+d.d][d.k]; }
  else if (a === 'menu') ui.menu = ui.menu === d.m ? null : d.m;
  else if (a === 'menu-close') ui.menu = null;
  else if (a === 'tools') { ui.tools = !ui.tools; ui.menu = null; }
  else if (a === 'theme') OS.theme.set(d.t);
  else if (a === 'accent') OS.accent.set(d.t);
  else if (a === 'ics') { const sl = OS.slotById(d.s), blob = new Blob([OS.ics(sl)], { type: 'text/calendar' }), l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'appointment.ics'; l.click(); }
  else if (a === 'advance') { OS.advance(+d.m); return; }
  else if (a === 'reset') { OS.reset(); ui.tools = false; toast('Demo data reset'); return; }
  render();
});
document.addEventListener('change', e => {
  const c = e.target.dataset.change; if (!c) return;
  OS.update(st => { const p = OS.patientById(pid), name = p.name + ' (patient app)';
    if (c === 'notice') { p.wl.notice = +e.target.value; st.audit.push({ t: fmt(st.clock), actor: name, action: 'Updated own notice needed' }); }
    if (c === 'consent') { p.consent.sms = e.target.checked; st.audit.push({ t: fmt(st.clock), actor: name, action: 'SMS consent ' + (e.target.checked ? 'given' : 'withdrawn') }); if (!e.target.checked && p.wl) p.wl.status = 'removed'; } });
  toast('Saved');
});
document.addEventListener('submit', e => {
  if (e.target.id === 'phone-form') {
    e.preventDefault(); const v = $('#ph').value.replace(/\D/g, ''), err = $('#ph-err');
    err.textContent = v.length < 8 ? 'Enter your mobile number.' : 'In this demo no real SMS is sent. Open Demo access below and pick a patient.'; err.hidden = false; return;
  }
  if (e.target.id === 'new-form') {
    e.preventDefault(); const name = $('#nn').value.trim(); if (!name) return;
    OS.update(st => { const id = st.nextId++; pid = id; st.patients.push({ id, name, phone: '+43 660 ••• ' + String(100 + id).slice(-3), consent: { sms: true, at: 'today' }, appt: null, current: null, wl: null }); st.audit.push({ t: fmt(st.clock), actor: name + ' (patient app)', action: 'Created an account and gave SMS consent' }); });
    try { sessionStorage.setItem('openslot-patient', pid); } catch (err) { /* ignore */ } location.hash = '#/home'; toast('Welcome, ' + name.split(' ')[0]); render();
  }
  if (e.target.id === 'join-form') {
    e.preventDefault(); const svc = [...document.querySelectorAll('input[name=svc]:checked')].map(x => x.value); if (!svc.length) { toast('Pick at least one treatment'); return; }
    OS.update(st => { const q = OS.patientById(pid); q.wl = { services: svc, wait: 0, notice: +$('#jn').value, avail: ui.joinAvail.map(x => ({ ...x })), flag: false, offers: 0, status: 'waiting' }; q.current = q.current || 'Tue 8 Dec, 10:00'; q.consent = { sms: true, at: 'today' }; st.audit.push({ t: fmt(st.clock), actor: q.name + ' (patient app)', action: 'Joined the waiting list for ' + svc.join(', ') + ' with SMS consent' }); });
    toast('You are on the list');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { ui.confirm = null; ui.tools = false; ui.menu = null; render(); } });
if (!location.hash) location.hash = '#/home';
render();
})();
