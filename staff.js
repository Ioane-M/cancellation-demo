(() => {
'use strict';
const { esc, fmt, partOf, partName, noticeLabel, can, DAYS, TODAY_IDX, PARTS, SERVICES, NOTICES, CLINIC } = OS;
const $ = s => document.querySelector(s);
const ACCOUNTS = [
  { role: 'reception', name: 'Maria Huber', title: 'Reception', email: 'maria@linden-dental.example' },
  { role: 'dentist', name: 'Dr. Weiss', title: 'Dentist, clinical lead', email: 'weiss@linden-dental.example' },
  { role: 'owner', name: 'Dr. Okafor', title: 'Practice owner', email: 'okafor@linden-dental.example' },
];
const ROLE_LABEL = { reception: 'Reception', dentist: 'Dentist', owner: 'Owner' };
let session = null;
try { session = JSON.parse(sessionStorage.getItem('openslot-session')); } catch (e) { /* none */ }
const ui = { selected: null, filter: 'All', search: '', drawer: null, tools: false, addOpen: false, toast: null };
const role = () => session && session.role;
const S = () => OS.state();

function toast(msg) {
  ui.toast = msg; render();
  clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = null; render(); }, 2600);
}
const statusChip = s => ({
  done: '<span class="chip neutral">Done</span>', booked: '<span class="chip info">Booked</span>',
  cancelled: '<span class="chip warn">Finding replacement</span>', refilled: '<span class="chip ok">Refilled</span>', unfilled: '<span class="chip bad">Unfilled</span>',
}[s.status]);
const offerChip = st => ({ pending: '<span class="chip info">Waiting for reply</span>', accepted: '<span class="chip ok">Accepted</span>', declined: '<span class="chip bad">Declined</span>', expired: '<span class="chip neutral">Expired</span>' }[st]);

/* ---------- login ---------- */
function loginView() {
  return `<div class="login">
    <div class="login-card">
      <div class="login-brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M9 16a7 7 0 1 1 7 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg><span class="wordmark">Openslot</span></div>
      <h1>Sign in to your clinic</h1>
      <p class="muted">Cancelled appointments, refilled automatically from your waiting list.</p>
      <form id="login-form" autocomplete="off">
        <label for="email">Email</label><input id="email" type="email" value="maria@linden-dental.example" aria-label="Email">
        <label for="pw">Password</label><input id="pw" type="password" value="demo-password" aria-label="Password">
        <button class="btn primary block" type="submit">Sign in</button>
      </form>
      <div class="demo-accounts"><div class="section-title" style="padding-left:0">Demo accounts, pick a role</div>
        ${ACCOUNTS.map(a => `<button class="acct" data-action="login" data-role="${a.role}"><strong>${esc(a.name)}</strong><span>${a.title}</span></button>`).join('')}
      </div>
      <p class="note">Student project demo. Everything on this site is fictional. <a href="${OS.link('patient.html')}">Open the patient app</a></p>
    </div></div>`;
}

function syncChip() {
  const y = OS.sync();
  return y.online ? `<span class="sync live" title="Shared demo room. Changes show up live on every device with this room code.">● Live · room ${esc(y.room)}</span>`
    : `<span class="sync off" title="${esc(y.error || 'Not connected')}">○ This browser only · room ${esc(y.room)}</span>`;
}
function qrSvg(url) { try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 5, margin: 0, scalable: true }); } catch (e) { return ''; } }

/* ---------- shell ---------- */
function shell(body, route) {
  const nav = [['today', 'Today', 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4'], ['waiting', 'Waiting list', 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
    ['messages', 'Messages', 'M4 5h16v11H8l-4 4z'], ['rules', 'Allocation rules', 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12'], ['recovery', 'Recovery', 'M4 20V10M10 20V4M16 20v-7M22 20H2']];
  if (can(role(), 'audit')) nav.push(['audit', 'Audit log', 'M9 3h6l4 4v14H5V3zM9 12h6M9 16h6']);
  if (can(role(), 'settings')) nav.push(['settings', 'Settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2 1-2 3-2-1M5 12l-2-1 2-3 2 1M12 3l1 2h-2zM12 21l-1-2h2z']);
  const st = OS.stats();
  return `<a class="skip" href="#main">Skip to content</a>
  <header class="topbar">
    <div class="brand"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="currentColor"/><path d="M9 16a7 7 0 1 1 7 7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>
      <span class="wordmark">Openslot</span><span class="divider" aria-hidden="true"></span><span class="clinic">${CLINIC} <span class="muted">Vienna</span></span></div>
    <div class="topbar-right"><span class="clock">Tue 17 Nov, ${fmt(S().clock)}</span>${syncChip()}<span class="demo-tag">Demo with fake data</span>
      <button class="btn small" data-action="tools">Demo tools</button>
      <div class="user"><span class="avatar" aria-hidden="true">${esc(session.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</span><div class="user-t"><strong>${esc(session.name)}</strong><span>${ROLE_LABEL[role()]}</span></div>
      <button class="btn ghost small" data-action="logout">Sign out</button></div></div>
  </header>
  <div class="shell"><nav class="nav" aria-label="Main">
    ${nav.map(([k, l, d]) => `<a href="#/${k}" ${k === route ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>${l}${k === 'today' && st.open ? `<span class="badge">${st.open}</span>` : ''}</a>`).join('')}
    <p class="nav-note">Student project demo. No real patients, no real messages are sent.</p></nav>
    <main id="main" tabindex="-1">${body}</main></div>
  ${ui.drawer ? drawer() : ''}${ui.addOpen ? addModal() : ''}${ui.tools ? tools() : ''}
  ${ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : ''}`;
}

/* ---------- today ---------- */
const PX = 1.5, T0 = 480, T1 = 17 * 60;
function schedule() {
  const slots = S().slots, docs = ['Dr. Weiss', 'Dr. Okafor'], H = (T1 - T0) * PX;
  const hours = []; for (let h = 8; h <= 17; h++) hours.push(h);
  const cols = docs.map(d => `<div class="sched-col"><div class="sched-head">${d}</div><div class="sched-body" style="height:${H}px">
    ${hours.map(h => `<div class="hline" style="top:${(h * 60 - T0) * PX}px"></div>`).join('')}
    ${slots.filter(s => s.doc === d).map(s => {
      const p = OS.patientById(s.patientId), po = OS.pendingOffer(s), sel = ui.selected === s.id;
      const who = s.status === 'refilled' ? OS.patientById(s.filledBy).name : p.name;
      const sub = esc(s.service) + (s.status === 'cancelled' ? (po ? ', offer sent to ' + OS.patientById(po.pid).name.split(' ')[0] : ', needs attention') : s.status === 'refilled' ? ', refilled' : s.status === 'unfilled' ? ', unfilled' : s.status === 'done' ? ', done' : '');
      return `<button class="blk ${s.status} ${po ? 'pending' : ''} ${sel ? 'sel' : ''}" style="top:${(s.start - T0) * PX}px;height:${s.dur * PX - 3}px" data-action="select" data-slot="${s.id}" aria-label="${fmt(s.start)} ${esc(s.service)} ${esc(who)}">
        <span class="blk-t">${fmt(s.start)}</span><span class="blk-main"><span class="blk-n">${esc(who)}</span><span class="blk-s">${sub}</span></span></button>`;
    }).join('')}
    ${S().clock >= T0 && S().clock <= T1 ? `<div class="nowline" style="top:${(S().clock - T0) * PX}px"></div>` : ''}
  </div></div>`).join('');
  return `<div class="sched"><div class="sched-axis"><div class="sched-head">&nbsp;</div><div class="sched-body" style="height:${H}px">${hours.map(h => `<span style="top:${(h * 60 - T0) * PX - 7}px">${String(h).padStart(2, '0')}:00</span>`).join('')}${S().clock >= T0 && S().clock <= T1 ? `<span class="nowpill" style="top:${(S().clock - T0) * PX - 8}px">${fmt(S().clock)}</span>` : ''}</div></div>${cols}</div>`;
}
function viewToday() {
  const st = OS.stats(), pend = S().slots.filter(s => OS.pendingOffer(s)).length;
  const tile = (l, v, cls) => `<div class="card tile ${cls || ''}"><span>${l}</span><strong>${v}</strong></div>`;
  const att = S().slots.filter(s => s.status === 'cancelled' && !OS.pendingOffer(s)).length;
  return `<div class="page-head"><div><h1>Today, Tuesday 17 November</h1>
    <p>Select an appointment. Cancel it on behalf of a patient, or open the patient app in another window and let the patient cancel. Openslot then looks for a replacement.</p></div></div>
    <div class="tiles">${tile('Open cancellations', st.open, st.open ? 'hot' : '')}${tile('Offers waiting for a reply', pend)}${tile('Refilled today', S().slots.filter(s => s.status === 'refilled').length)}${tile('Unfilled today', S().slots.filter(s => s.status === 'unfilled').length)}</div>
    ${att && !S().settings.autoOffer ? `<div class="banner warn">${att} cancelled slot${att > 1 ? 's' : ''} need a staff decision. Automatic offers are switched off in Settings.</div>` : ''}
    <div class="split"><section class="card sched-card" aria-label="Schedule"><div class="card-head"><h2>Schedule</h2><span class="dim">08:00 to 17:00</span></div>${schedule()}</section>
    <aside class="panel" aria-label="Appointment details">${panel()}</aside></div>`;
}
function offersTimeline(s) {
  if (!s.offers.length) return '';
  return `<div class="section-title">Offers for this slot</div><ul class="offers">${s.offers.map(o => {
    const p = OS.patientById(o.pid), left = o.expiresAt - S().clock;
    return `<li><div><strong>${esc(p.name)}</strong><span class="dim"> sent ${fmt(o.sentAt)}</span></div><div>${offerChip(o.state)}${o.state === 'pending' ? `<span class="dim"> expires ${fmt(o.expiresAt)}${left > 0 ? ', ' + left + ' min left' : ''}</span>` : ''}</div></li>`;
  }).join('')}</ul>`;
}
function panel() {
  const s = ui.selected && OS.slotById(ui.selected);
  if (!s) return `<div class="card empty"><h3>Select an appointment</h3><p>Click a block in the schedule to see the patient, cancel it, or follow how Openslot refills it.</p></div>`;
  const p = OS.patientById(s.patientId);
  const head = `<div class="card-head"><h2>${esc(s.service)} at ${fmt(s.start)}</h2>${statusChip(s)}</div>
    <div class="slot-summary"><div class="kv"><span>Practitioner</span><strong>${esc(s.doc)}</strong></div><div class="kv"><span>Duration</span><strong>${s.dur} min</strong></div><div class="kv"><span>Time until start</span><strong>${Math.max(0, s.start - S().clock)} min</strong></div></div>`;
  if (s.status === 'done') return `<div class="card">${head}<div class="card-body"><p><strong>${esc(p.name)}</strong> was treated. Nothing to do.</p></div></div>`;
  if (s.status === 'booked') {
    return `<div class="card">${head}<div class="card-body">
      <div class="kv" style="margin-bottom:14px"><span>Patient</span><strong>${esc(p.name)}</strong><span class="dim">${esc(p.phone)} · SMS consent given ${esc(p.consent.at)}</span></div>
      ${can(role(), 'cancel') ? `<div class="field" style="margin-top:0"><label for="reason">Reason for cancelling</label>
        <select id="reason"><option>Patient called</option><option>Patient is ill</option><option>Patient cannot make it</option><option>Practitioner unavailable</option></select></div>
        <button class="btn danger block" style="margin-top:14px" data-action="cancel" data-slot="${s.id}">Cancel appointment and find a replacement</button>
        <p class="note">Patients can also cancel in their own app. Open <a href="${OS.link('patient.html')}" target="_blank" rel="noopener">the patient app</a> as ${esc(p.name)} to try it.</p>` : '<p class="note">Your role cannot cancel appointments.</p>'}</div></div>`;
  }
  if (s.status === 'refilled') {
    const f = OS.patientById(s.filledBy);
    return `<div class="card">${head}<div class="banner ok">Refilled by ${esc(f.name)} in ${s.filledAt - s.cancelledAt} minutes. Nobody had to phone around.</div><div class="card-body" style="padding-top:0"><p class="dim">Originally booked for ${esc(p.name)}, cancelled ${s.cancelledBy === 'patient' ? 'by the patient in the app' : 'by reception'}${s.reason ? ' (' + esc(s.reason) + ')' : ''}.</p></div>${offersTimeline(s)}</div>`;
  }
  if (s.status === 'unfilled') return `<div class="card">${head}<div class="banner bad">This slot stays unfilled. No patient on the waiting list could take it with the time left.</div>${offersTimeline(s)}</div>`;
  /* cancelled: live recovery */
  const po = OS.pendingOffer(s), c = OS.candidates(s), manual = !S().settings.autoOffer;
  const msg = po && S().outbox.slice().reverse().find(m => m.link === 'offer/' + po.id);
  const cand = (x, i) => `<div class="cand"><div class="rank">${i + 1}</div><div><div class="cand-name">${esc(x.p.name)}${x.p.wl.flag ? '<span class="chip warn">Clinical flag</span>' : ''}</div>
    <div class="cand-meta">Waiting ${x.p.wl.wait} days · ${x.p.wl.offers} recent offer${x.p.wl.offers === 1 ? '' : 's'}</div>
    <div class="checks"><span class="chip ok">Wants ${esc(s.service)}</span><span class="chip ok">Free ${DAYS[TODAY_IDX]} ${partName(partOf(s.start)).toLowerCase()}</span><span class="chip ok">Needs ${noticeLabel(x.p.wl.notice)}</span></div>
    ${can(role(), 'offer') && !po ? `<button class="btn small" style="margin-top:8px" data-action="offer" data-slot="${s.id}" data-p="${x.p.id}">Offer now</button>` : ''}</div></div>`;
  const out = x => `<div class="cand out"><div class="rank">–</div><div><div class="cand-name">${esc(x.p.name)}</div><div class="checks">${x.checks.avail ? '' : `<span class="chip bad">Not free ${DAYS[TODAY_IDX]} ${partName(partOf(s.start)).toLowerCase()}</span>`}${x.checks.notice ? '' : `<span class="chip bad">Needs ${noticeLabel(x.p.wl.notice)}, only ${Math.max(0, c.notice)} min left</span>`}</div></div></div>`;
  return `<div class="card">${head}
    <div class="banner ${po ? 'info' : 'warn'}">${po ? `Offer sent to ${esc(OS.patientById(po.pid).name)}. Waiting for the reply, expires ${fmt(po.expiresAt)}.` : manual ? 'Automation is off. Choose who to offer this slot to.' : 'Openslot is choosing the next patient.'}</div>
    ${msg ? `<div class="sms-peek"><span class="dim">SMS sent to ${esc(OS.patientById(po.pid).phone)} at ${esc(msg.time)}</span><div class="sms">${esc(msg.text)}</div></div>` : ''}
    ${offersTimeline(s)}
    <div class="section-title">Next in line, ranked by the clinic rules (${c.eligible.length})</div>
    ${c.eligible.length ? c.eligible.map(cand).join('') : '<div class="card-body dim">Nobody else is eligible.</div>'}
    ${c.out.length ? `<div class="section-title">Not eligible (${c.out.length})</div>${c.out.map(out).join('')}` : ''}
    ${po ? '' : `<div class="panel-actions"><button class="btn" data-action="unfilled" data-slot="${s.id}">Close as unfilled</button></div>`}</div>`;
}

/* ---------- waiting list ---------- */
function waitRows() {
  const q = ui.search.trim().toLowerCase();
  return S().patients.filter(p => p.wl && p.wl.status !== 'removed')
    .filter(p => ui.filter === 'All' || p.wl.services.includes(ui.filter)).filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => (a.wl.status === 'waiting' ? 0 : 1) - (b.wl.status === 'waiting' ? 0 : 1) || b.wl.wait - a.wl.wait)
    .map(p => `<tr class="clickable" data-action="open-patient" data-p="${p.id}" tabindex="0"><td><strong>${esc(p.name)}</strong></td><td>${p.wl.services.map(esc).join(', ')}</td><td class="num">${p.wl.wait} days</td>
      <td class="hide-sm"><span class="mini">${p.wl.avail.map(d => `<i class="${d.M || d.A || d.E ? 'on' : ''}"></i>`).join('')}</span></td><td class="hide-sm">${noticeLabel(p.wl.notice)}</td>
      <td class="hide-sm">${p.wl.flag ? '<span class="chip warn">Clinical flag</span>' : '<span class="dim">None</span>'}</td><td>${p.wl.status === 'waiting' ? '<span class="chip info">Waiting</span>' : '<span class="chip ok">Moved earlier</span>'}</td></tr>`).join('') || '<tr><td colspan="7" class="dim">No patients match.</td></tr>';
}
function viewWaiting() {
  const filters = ['All', ...SERVICES].map(f => `<button type="button" data-action="filter" data-s="${esc(f)}" aria-pressed="${ui.filter === f}">${esc(f)}</button>`).join('');
  return `<div class="page-head"><div><h1>Waiting list</h1><p>Patients who want an earlier appointment. They keep their current booking until they accept an offer.</p></div>
    ${can(role(), 'waitlist-edit') ? '<button class="btn primary" data-action="add-open">Add patient</button>' : ''}</div>
    <section class="card"><div class="toolbar"><div class="seg" role="group" aria-label="Filter by service">${filters}</div>
    <input type="search" id="search" placeholder="Search by name" aria-label="Search by name" value="${esc(ui.search)}"></div>
    <div class="table-wrap"><table><thead><tr><th>Patient</th><th>Wants</th><th class="num">Waiting</th><th class="hide-sm">Days free</th><th class="hide-sm">Notice needed</th><th class="hide-sm">Clinical flag</th><th>Status</th></tr></thead><tbody id="wl-body">${waitRows()}</tbody></table></div></section>`;
}
function availGrid(p, editable, attr) {
  const head = ['<div></div>', ...DAYS.map(d => `<div class="h">${d}</div>`)].join('');
  const body = PARTS.map(pt => `<div class="r">${pt.name}<small>${pt.hours}</small></div>` + DAYS.map((d, i) =>
    `<button type="button" ${editable ? `data-action="${attr}" data-d="${i}" data-k="${pt.k}"` : 'disabled'} aria-pressed="${p.wl.avail[i][pt.k]}" aria-label="${d} ${pt.name}">${p.wl.avail[i][pt.k] ? 'Yes' : '–'}</button>`).join('')).join('');
  return `<div class="avail" role="group" aria-label="Availability">${head}${body}</div>`;
}
function drawer() {
  const p = OS.patientById(ui.drawer); if (!p || !p.wl) return '';
  const edit = can(role(), 'waitlist-edit');
  return `<div class="scrim" data-action="close-drawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
    <div class="drawer-head"><div><h2>${esc(p.name)}</h2><p class="dim">${esc(p.phone)} · Wants ${p.wl.services.map(esc).join(', ')} · waiting ${p.wl.wait} days</p></div><button class="btn ghost small" data-action="close-drawer">Close</button></div>
    <div class="drawer-body">
      <div class="kv"><span>Current appointment</span><strong>${esc(p.current)}</strong></div>
      <div class="section-title" style="padding-left:0">Availability profile</div>${availGrid(p, edit, 'toggle-avail')}
      <div class="field"><label for="notice">Notice the patient needs</label><select id="notice" data-change="notice" ${edit ? '' : 'disabled'}>${NOTICES.map(n => `<option value="${n.v}" ${n.v === p.wl.notice ? 'selected' : ''}>${n.l}</option>`).join('')}</select></div>
      <div class="field"><label>Clinical flag</label>
        <label class="switch-row"><span class="switch"><input type="checkbox" data-change="flag" ${p.wl.flag ? 'checked' : ''} ${can(role(), 'flag') ? '' : 'disabled'}><span></span></span><span>${p.wl.flag ? 'Flagged as clinically urgent' : 'No clinical flag'}</span></label>
        ${can(role(), 'flag') ? '' : '<p class="note" style="margin-top:6px">Only a dentist can set or remove the clinical flag.</p>'}</div>
      <p class="note">SMS consent given ${esc(p.consent.at)}. The patient manages availability and consent in the patient app.</p>
    </div>
    <div class="drawer-foot">${edit ? '<button class="btn danger" data-action="remove-patient">Remove from waiting list</button>' : ''}<button class="btn primary" data-action="close-drawer">Done</button></div></aside>`;
}
function addModal() {
  return `<div class="scrim" data-action="add-close"></div><div class="modal" role="dialog" aria-modal="true" aria-label="Add patient">
    <h2>Add patient to the waiting list</h2>
    <form id="add-form"><label for="add-name">Full name</label><input id="add-name" required placeholder="For example Clara Neumann">
      <fieldset><legend>Treatment wanted</legend>${SERVICES.map((sv, i) => `<label class="check"><input type="checkbox" name="svc" value="${esc(sv)}" ${i === 0 ? 'checked' : ''}> ${esc(sv)}</label>`).join('')}</fieldset>
      <label for="add-notice">Notice needed</label><select id="add-notice">${NOTICES.map(n => `<option value="${n.v}" ${n.v === 60 ? 'selected' : ''}>${n.l}</option>`).join('')}</select>
      <label class="check consent"><input type="checkbox" id="add-consent" required> The patient agreed to receive appointment offers by SMS (consent is stored with date).</label>
      <div class="modal-foot"><button type="button" class="btn" data-action="add-close">Cancel</button><button class="btn primary" type="submit">Add patient</button></div></form></div>`;
}

/* ---------- messages, rules, recovery, settings, audit ---------- */
function viewMessages() {
  const rows = S().outbox.slice().reverse().map(m => { const p = OS.patientById(m.pid); return `<tr><td class="dim nowrap">Tue ${esc(m.time)}</td><td class="nowrap"><strong>${esc(p.name)}</strong><br><span class="dim">${esc(p.phone)}</span></td><td class="hide-sm"><span class="chip ${m.kind === 'offer' ? 'info' : 'neutral'}">${m.kind === 'offer' ? 'Offer' : 'Confirmation'}</span></td><td>${esc(m.text)}</td></tr>`; }).join('');
  return `<div class="page-head"><div><h1>Messages</h1><p>Every SMS Openslot sends. In the real product these go out through an SMS gateway. In this demo they appear in the patient app, so open it in a second window.</p></div><a class="btn" href="${OS.link('patient.html')}" target="_blank" rel="noopener">Open patient app</a></div>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Sent</th><th>To</th><th class="hide-sm">Type</th><th>Message</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="empty">No messages yet. Cancel an appointment on the Today page.</td></tr>'}</tbody></table></div></section>`;
}
function viewRules() {
  const edit = can(role(), 'rules');
  const rules = S().rules.map((r, i) => `<div class="rule ${r.on ? '' : 'off'}"><div class="n">${i + 1}</div><div><h3>${esc(r.title)}</h3><p>${esc(r.desc)}</p></div>
    <div class="rule-ctrl"><button class="btn small" data-action="move-rule" data-i="${i}" data-dir="-1" ${!edit || i === 0 ? 'disabled' : ''}>Up</button><button class="btn small" data-action="move-rule" data-i="${i}" data-dir="1" ${!edit || i === S().rules.length - 1 ? 'disabled' : ''}>Down</button>
    <label class="switch"><input type="checkbox" data-change="rule" data-i="${i}" ${r.on ? 'checked' : ''} ${edit ? '' : 'disabled'} aria-label="Rule enabled"><span></span></label></div></div>`).join('');
  return `<div class="page-head"><div><h1>Allocation rules</h1><p>These rules decide who is offered a freed slot first. Openslot only applies them. It never decides medical priority.</p></div>
    <span class="chip brand">Approved by ${esc(S().approval.by)}, ${esc(S().approval.at)}</span></div>
  ${edit ? '' : '<div class="banner info">Only a dentist can change the rules. You can read them and see their effect on the Today page.</div>'}
  <div class="two-col"><section class="card"><div class="card-head"><h2>Priority order</h2><span class="dim">Applied top to bottom</span></div>${rules}</section>
  <section class="card"><div class="card-head"><h2>Always required</h2></div><ul class="fixed-list">
    <li><span class="tick">✓</span><div><strong>Same service</strong><br><span class="dim">The patient is waiting for this treatment.</span></div></li>
    <li><span class="tick">✓</span><div><strong>Really available</strong><br><span class="dim">The patient marked this day and part of the day as possible.</span></div></li>
    <li><span class="tick">✓</span><div><strong>Enough notice</strong><br><span class="dim">The time left is at least the notice the patient asked for.</span></div></li></ul></section></div>`;
}
function viewRecovery() {
  const st = OS.stats(), kpi = (l, v, s) => `<div class="card kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></div>`;
  const weeks = [...S().history, { w: 'Wk 47', c: st.cancelled, r: st.refilled, live: true }];
  const bw = 54, gap = 34, H = 220, left = 44, W = left + weeks.length * (bw + gap);
  const bars = weeks.map((x, i) => { const pct = x.c ? x.r / x.c : 0, h = Math.round(pct * (H - 40)), bx = left + i * (bw + gap) + gap / 2, by = H - h;
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${h}" rx="4" fill="${x.live ? '#0b6e68' : '#9cc9c5'}"/><text x="${bx + bw / 2}" y="${by - 8}" text-anchor="middle" font-size="13" font-weight="600" fill="#17212b">${Math.round(pct * 100)}%</text><text x="${bx + bw / 2}" y="${H + 20}" text-anchor="middle" font-size="12" fill="#5f6b78">${x.w}${x.live ? ' (live)' : ''}</text>`; }).join('');
  const grid = [0, 50, 100].map(v => { const y = H - Math.round(v / 100 * (H - 40)); return `<line x1="${left - 6}" x2="${W}" y1="${y}" y2="${y}" stroke="#e2e6ea"/><text x="${left - 12}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f6b78">${v}%</text>`; }).join('');
  const rows = OS.offerLog().slice(0, 10).map(l => `<tr><td class="dim">${esc(l.time)}</td><td>${esc(l.slot)}</td><td>${esc(l.who)}</td><td><span class="chip ${l.result === 'accepted' ? 'ok' : l.result === 'declined' ? 'bad' : 'neutral'}">${l.result}</span></td><td class="num">${l.mins} min</td></tr>`).join('');
  return `<div class="page-head"><div><h1>Recovery</h1><p>How many cancelled slots the clinic got back. Earlier weeks are sample data. This week updates live.</p></div></div>
  <div class="kpis">${kpi('Cancelled slots', st.cancelled, 'this week')}${kpi('Refilled', st.refilled, 'this week')}${kpi('Recovery rate', st.rate + '%', 'refilled of cancelled')}${kpi('Time to refill', st.avg ? st.avg + ' min' : 'n/a', 'average, cancellation to booking')}${kpi('Unfilled', st.unfilled, 'lost appointment slots')}${kpi('Staff time saved', Math.floor(st.saved / 60) + ' h ' + (st.saved % 60) + ' min', 'demo estimate, ' + OS.STAFF_MIN_PER_REFILL + ' min per refill')}</div>
  <div class="two-col even"><section class="card"><div class="card-head"><h2>Recovery rate by week</h2></div><div class="chart"><svg viewBox="0 0 ${W} ${H + 34}" role="img" aria-label="Recovery rate by week">${grid}${bars}</svg></div></section>
  <section class="card"><div class="card-head"><h2>Offer log</h2></div><div class="table-wrap"><table class="log"><thead><tr><th>When</th><th>Slot</th><th>Patient</th><th>Result</th><th class="num">Reply</th></tr></thead><tbody>${rows}</tbody></table></div></section></div>`;
}
function viewSettings() {
  const s = S().settings, ex = OS.slotById(4);
  return `<div class="page-head"><div><h1>Settings</h1><p>Practice owner only. These settings change how Openslot behaves for the whole clinic.</p></div></div>
  <div class="two-col"><section class="card"><div class="card-head"><h2>Offers</h2></div><div class="card-body form">
    <label class="switch-row"><span class="switch"><input type="checkbox" data-change="auto" ${s.autoOffer ? 'checked' : ''}><span></span></span><span><strong>Send offers automatically</strong><br><span class="dim">Openslot contacts the next patient by itself. Staff can step in at any time. Switch off to confirm every offer by hand.</span></span></label>
    <div class="field"><label for="expiry">Offer is valid for</label><select id="expiry" data-change="expiry">${[10, 15, 20, 30].map(v => `<option value="${v}" ${v === s.expiry ? 'selected' : ''}>${v} minutes</option>`).join('')}</select></div>
    <div class="field"><label for="cutoff">Stop offering a slot when it starts in less than</label><select id="cutoff" data-change="cutoff">${[10, 20, 30, 60].map(v => `<option value="${v}" ${v === s.cutoff ? 'selected' : ''}>${v} minutes</option>`).join('')}</select></div></div></section>
  <section class="card"><div class="card-head"><h2>SMS text</h2></div><div class="card-body form">
    <label for="tpl">Message template</label><textarea id="tpl" rows="5" data-change="tpl">${esc(s.template)}</textarea>
    <p class="note">Variables: {clinic} {service} {time} {doctor} {link} {minutes}</p>
    <div class="section-title" style="padding-left:0">Preview</div><div class="sms">${esc(s.template.replace('{clinic}', CLINIC).replace('{service}', ex.service).replace('{time}', fmt(ex.start)).replace('{doctor}', ex.doc).replace('{link}', 'openslot.app/o/123').replace('{minutes}', s.expiry))}</div></div></section></div>
  <section class="card" style="margin-top:20px"><div class="card-head"><h2>Data protection</h2></div><div class="card-body"><ul class="plain">
    <li>Offers are only sent to patients who gave SMS consent. The date of consent is stored.</li>
    <li>Only the data needed to match slots is stored: name, phone, treatment, availability.</li>
    <li>Patients can download their data and leave the waiting list in their own app.</li>
    <li>Every action is written to the audit log.</li></ul>
    <p class="note">Planned for the real product, not implemented in this demo: encryption at rest, a data processing agreement with the clinic, and a retention period.</p></div></section>`;
}
function viewAudit() {
  const rows = S().audit.slice().reverse().map(a => `<tr><td class="dim nowrap">Tue ${esc(a.t)}</td><td class="nowrap">${esc(a.actor)}</td><td>${esc(a.action)}</td></tr>`).join('');
  return `<div class="page-head"><div><h1>Audit log</h1><p>Who did what and when. Offers, answers, cancellations and settings changes.</p></div><button class="btn" data-action="csv">Download CSV</button></div>
  <section class="card"><div class="table-wrap"><table><thead><tr><th>Time</th><th>Who</th><th>What</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
function tools() {
  const s4 = OS.slotById(4);
  return `<div class="scrim" data-action="tools"></div><aside class="drawer small" role="dialog" aria-label="Demo tools"><div class="drawer-head"><div><h2>Demo tools</h2><p class="dim">Only for presenting. Not part of the product.</p></div><button class="btn ghost small" data-action="tools">Close</button></div>
  <div class="drawer-body"><div class="kv"><span>Demo clock</span><strong>Tue 17 Nov, ${fmt(S().clock)}</strong></div>
    <div class="tool-row"><button class="btn" data-action="advance" data-m="5">Move 5 min forward</button><button class="btn" data-action="advance" data-m="15">Move 15 min forward</button></div>
    <p class="note">Offers expire when the clock passes their time. Moving the clock is how you show an unanswered offer.</p>
    <div class="section-title" style="padding-left:0">Show it on a phone</div>
    <div class="qr-box"><div class="qr">${qrSvg(OS.link('patient.html'))}</div><div><strong>Scan to open the patient app</strong><p class="note" style="margin-top:4px">Same room, so phone and laptop stay in sync. Room code <strong>${esc(OS.room())}</strong>.</p>
      <p class="note" style="word-break:break-all">${esc(OS.link('patient.html'))}</p></div></div>
    <button class="btn block" style="margin-top:8px" data-action="new-room">Start a fresh demo room</button>
    <div class="section-title" style="padding-left:0">Shortcuts</div>
    <button class="btn block" data-action="sim-cancel" ${s4.status === 'booked' ? '' : 'disabled'}>Oskar Lindner cancels his 10:00 slot in the patient app</button>
    <a class="btn block" style="margin-top:8px;text-align:center;text-decoration:none" href="${OS.link('patient.html')}" target="_blank" rel="noopener">Open the patient app in a new window</a>
    <button class="btn danger block" style="margin-top:8px" data-action="reset">Reset all demo data</button></div></aside>`;
}

/* ---------- render ---------- */
const ROUTES = { today: viewToday, waiting: viewWaiting, messages: viewMessages, rules: viewRules, recovery: viewRecovery, settings: viewSettings, audit: viewAudit };
const route = () => (location.hash.replace('#/', '') || 'today');
function render() {
  const app = $('#app');
  if (!session) { app.innerHTML = loginView(); return; }
  let r = ROUTES[route()] ? route() : 'today';
  if (r === 'settings' && !can(role(), 'settings')) r = 'today';
  if (r === 'audit' && !can(role(), 'audit')) r = 'today';
  const active = document.activeElement, keep = active && active.id === 'search' ? active.selectionStart : null;
  app.innerHTML = shell(ROUTES[r](), r);
  if (keep !== null) { const el = $('#search'); if (el) { el.focus(); el.setSelectionRange(keep, keep); } }
}
OS.onChange(render);
window.addEventListener('hashchange', () => { ui.drawer = null; render(); window.scrollTo(0, 0); });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const a = b.dataset.action, d = b.dataset, who = session ? session.name + ' (' + ROLE_LABEL[role()] + ')' : '';
  if (a === 'login') { const acct = ACCOUNTS.find(x => x.role === d.role); session = acct; sessionStorage.setItem('openslot-session', JSON.stringify(acct)); location.hash = '#/today'; }
  else if (a === 'logout') { session = null; sessionStorage.removeItem('openslot-session'); }
  else if (a === 'select') ui.selected = +d.slot;
  else if (a === 'cancel') { const reason = ($('#reason') || {}).value; OS.cancel(d.slot, 'reception', reason, who); return; }
  else if (a === 'offer') { OS.offer(d.slot, d.p, who); return; }
  else if (a === 'unfilled') { OS.update(st => { const s = OS.slotById(d.slot); if (s.status === 'cancelled') { s.status = 'unfilled'; st.audit.push({ t: fmt(st.clock), actor: who, action: `Closed ${s.service} at ${fmt(s.start)} as unfilled` }); } }); return; }
  else if (a === 'filter') ui.filter = d.s;
  else if (a === 'open-patient') ui.drawer = +d.p;
  else if (a === 'close-drawer') ui.drawer = null;
  else if (a === 'toggle-avail') { OS.update(st => { const p = OS.patientById(ui.drawer); p.wl.avail[+d.d][d.k] = !p.wl.avail[+d.d][d.k]; st.audit.push({ t: fmt(st.clock), actor: who, action: `Changed availability of ${p.name}` }); }); return; }
  else if (a === 'remove-patient') { OS.update(st => { const p = OS.patientById(ui.drawer); p.wl.status = 'removed'; st.audit.push({ t: fmt(st.clock), actor: who, action: `Removed ${p.name} from the waiting list` }); }); ui.drawer = null; toast('Patient removed from the waiting list'); return; }
  else if (a === 'add-open') ui.addOpen = true;
  else if (a === 'add-close') ui.addOpen = false;
  else if (a === 'move-rule') { OS.update(st => { const i = +d.i, j = i + +d.dir; [st.rules[i], st.rules[j]] = [st.rules[j], st.rules[i]]; st.approval = { by: session.name, at: 'just now' }; st.audit.push({ t: fmt(st.clock), actor: who, action: 'Changed the order of allocation rules' }); }); return; }
  else if (a === 'tools') ui.tools = !ui.tools;
  else if (a === 'new-room') { OS.newRoom(); return; }
  else if (a === 'advance') { OS.advance(+d.m); return; }
  else if (a === 'sim-cancel') { OS.cancel(4, 'patient', 'Feeling unwell', 'Oskar Lindner (patient app)'); ui.tools = false; ui.selected = 4; location.hash = '#/today'; render(); return; }
  else if (a === 'reset') { OS.reset(); ui.selected = null; ui.drawer = null; ui.tools = false; toast('Demo data reset'); return; }
  else if (a === 'csv') { const blob = new Blob([OS.csvAudit()], { type: 'text/csv' }), l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'openslot-audit-log.csv'; l.click(); }
  render();
});
document.addEventListener('submit', e => {
  if (e.target.id === 'login-form') { e.preventDefault(); const acct = ACCOUNTS.find(x => x.email === $('#email').value.trim()) || ACCOUNTS[0]; session = acct; sessionStorage.setItem('openslot-session', JSON.stringify(acct)); location.hash = '#/today'; render(); }
  if (e.target.id === 'add-form') {
    e.preventDefault();
    const name = $('#add-name').value.trim(), svc = [...document.querySelectorAll('input[name=svc]:checked')].map(x => x.value);
    if (!name || !svc.length) return;
    OS.update(st => { const id = st.nextId++; st.patients.push({ id, name, phone: '+43 660 ••• ' + String(100 + id).slice(-3), consent: { sms: true, at: 'today' }, appt: null, current: 'Tue 8 Dec, 10:00',
      wl: { services: svc, wait: 0, notice: +$('#add-notice').value, avail: Array.from({ length: 5 }, () => ({ M: true, A: false, E: false })), flag: false, offers: 0, status: 'waiting' } });
      st.audit.push({ t: fmt(st.clock), actor: session.name + ' (' + ROLE_LABEL[role()] + ')', action: `Added ${name} to the waiting list with SMS consent` }); });
    ui.addOpen = false; toast(name + ' added to the waiting list');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { ui.drawer = null; ui.addOpen = false; ui.tools = false; render(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-action="open-patient"]')) { e.preventDefault(); ui.drawer = +e.target.dataset.p; render(); }
});
document.addEventListener('change', e => {
  const c = e.target.dataset.change, who = session ? session.name + ' (' + ROLE_LABEL[role()] + ')' : '';
  if (!c) return;
  OS.update(st => {
    const log = t => st.audit.push({ t: fmt(st.clock), actor: who, action: t });
    if (c === 'rule') { st.rules[+e.target.dataset.i].on = e.target.checked; st.approval = { by: session.name, at: 'just now' }; log('Switched an allocation rule ' + (e.target.checked ? 'on' : 'off')); }
    if (c === 'notice') { const p = OS.patientById(ui.drawer); p.wl.notice = +e.target.value; log('Changed notice needed for ' + p.name); }
    if (c === 'flag') { const p = OS.patientById(ui.drawer); p.wl.flag = e.target.checked; log((e.target.checked ? 'Set' : 'Removed') + ' the clinical flag for ' + p.name); }
    if (c === 'auto') { st.settings.autoOffer = e.target.checked; log('Automatic offers switched ' + (e.target.checked ? 'on' : 'off')); }
    if (c === 'expiry') { st.settings.expiry = +e.target.value; log('Offer validity set to ' + e.target.value + ' minutes'); }
    if (c === 'cutoff') { st.settings.cutoff = +e.target.value; log('Offer cut-off set to ' + e.target.value + ' minutes'); }
    if (c === 'tpl') { st.settings.template = e.target.value; log('SMS template changed'); }
  });
});
document.addEventListener('input', e => { if (e.target.id === 'search') { ui.search = e.target.value; $('#wl-body').innerHTML = waitRows(); } });
if (!location.hash) location.hash = '#/today';
render();
})();
