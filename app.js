(() => {
'use strict';

/* ---------- constants and helpers ---------- */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TODAY_IDX = 1; // the demo runs on a Tuesday
const START_CLOCK = 9 * 60 + 10;
const CLINIC = 'Linden Dental Practice';
const PARTS = [
  { k: 'M', name: 'Morning', hours: '08:00 to 12:00' },
  { k: 'A', name: 'Afternoon', hours: '12:00 to 17:00' },
  { k: 'E', name: 'Evening', hours: '17:00 to 19:00' },
];
const SERVICES = ['Check-up', 'Hygiene', 'Filling', 'Root canal consult'];
const NOTICES = [
  { v: 30, l: '30 minutes' }, { v: 60, l: '1 hour' }, { v: 120, l: '2 hours' },
  { v: 240, l: '4 hours' }, { v: 1440, l: '1 day' },
];
const STAFF_MIN_PER_REFILL = 12; // demo assumption: minutes of phoning saved per refilled slot

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const partOf = m => (m < 720 ? 'M' : m < 1020 ? 'A' : 'E');
const partName = k => PARTS.find(p => p.k === k).name;
const noticeLabel = v => (NOTICES.find(n => n.v === v) || { l: v + ' min' }).l;
const parseAvail = s => s.split('|').map(d => ({ M: d.includes('M'), A: d.includes('A'), E: d.includes('E') }));
const first = n => n.split(' ')[0] + ' ' + n.split(' ')[1][0] + '.';
const $ = sel => document.querySelector(sel);

/* ---------- fictional data ---------- */
function seed() {
  const P = (id, name, services, wait, notice, av, flag, offers) =>
    ({ id, name, services, wait, notice, avail: parseAvail(av), flag, offers, status: 'waiting' });
  const patients = [
    P(1, 'Anna Berger', ['Check-up', 'Hygiene'], 41, 30, 'MA|MA|M|MA|M', false, 0),
    P(2, 'Luka Horvat', ['Check-up'], 63, 60, 'A|MA|A|A|A', true, 1),
    P(3, 'Mira Kovac', ['Hygiene'], 28, 30, 'MAE|MAE|MAE|MAE|MAE', false, 0),
    P(4, 'Jonas Eder', ['Filling'], 19, 120, 'M|MA|M|M|MA', false, 0),
    P(5, 'Sofia Marin', ['Check-up', 'Filling'], 55, 30, 'MA|M|MA|M|MA', false, 2),
    P(6, 'Tomas Novak', ['Hygiene', 'Check-up'], 12, 60, 'E|E|E|E|E', false, 0),
    P(7, 'Elif Demir', ['Root canal consult'], 34, 60, 'MA|MA|MA|MA|MA', true, 0),
    P(8, 'Paul Gruber', ['Filling'], 47, 30, 'A|A|A|A|A', false, 0),
    P(9, 'Nadia Haddad', ['Hygiene'], 23, 240, 'MA|MA|MA|MA|MA', false, 0),
    P(10, 'Felix Aigner', ['Check-up'], 8, 30, 'MAE|MAE|MAE|MAE|MAE', false, 0),
    P(11, 'Ines Pereira', ['Filling', 'Check-up'], 31, 60, 'M|M|M|M|M', false, 0),
    P(12, 'Marta Wolf', ['Hygiene'], 70, 30, 'MA|A|M|MA|A', false, 0),
    P(13, 'David Lang', ['Root canal consult'], 16, 120, 'A|MA|A|A|A', false, 0),
    P(14, 'Yusuf Aydin', ['Check-up'], 5, 30, 'M|M|MA|M|M', false, 0),
  ];
  const S = (id, start, service, who, doc, status) =>
    ({ id, start, service, who, doc, status: status || 'booked', cancelledAt: null, offer: null, declined: [], events: [], filledBy: null, filledAt: null });
  const slots = [
    S(1, 8 * 60, 'Check-up', 'Rita Gasser', 'Dr. Okafor', 'done'),
    S(2, 8 * 60 + 45, 'Hygiene', 'Emil Strasser', 'Dr. Weiss', 'done'),
    S(3, 9 * 60 + 40, 'Filling', 'Greta Moser', 'Dr. Weiss'),
    S(4, 10 * 60, 'Hygiene', 'Oskar Lindner', 'Dr. Okafor'),
    S(5, 11 * 60 + 15, 'Check-up', 'Hanna Roth', 'Dr. Weiss'),
    S(6, 13 * 60, 'Filling', 'Karl Steiner', 'Dr. Okafor'),
    S(7, 14 * 60 + 30, 'Root canal consult', 'Lena Fuchs', 'Dr. Weiss'),
    S(8, 16 * 60, 'Hygiene', 'Peter Huber', 'Dr. Okafor'),
  ];
  return {
    clock: START_CLOCK,
    patients, slots,
    rules: [
      { id: 'flag', on: true, title: 'Clinical flag first', desc: 'Patients flagged by a dentist as clinically urgent are offered a slot before everyone else. The flag is set by healthcare professionals, never by the software.' },
      { id: 'wait', on: true, title: 'Longest wait first', desc: 'Among the remaining patients, the one who has been on the waiting list the longest is offered the slot first.' },
      { id: 'fair', on: true, title: 'Fewest recent offers first', desc: 'Patients who have received fewer offers recently go first, so nobody is contacted over and over.' },
    ],
    log: [
      { time: 'Mon 16:12', slot: 'Hygiene 16:30', who: 'Mira Kovac', result: 'declined', mins: 6 },
      { time: 'Mon 16:20', slot: 'Hygiene 16:30', who: 'Marta Wolf', result: 'accepted', mins: 4 },
      { time: 'Mon 11:02', slot: 'Filling 11:30', who: 'Paul Gruber', result: 'no reply', mins: 15 },
      { time: 'Mon 11:18', slot: 'Filling 11:30', who: 'Jonas Eder', result: 'accepted', mins: 5 },
    ],
    stats: { cancelled: 6, refilled: 2, unfilled: 2, minutes: 2 * 74 },
    history: [
      { w: 'Wk 43', c: 19, r: 8 }, { w: 'Wk 44', c: 22, r: 12 }, { w: 'Wk 45', c: 17, r: 9 }, { w: 'Wk 46', c: 21, r: 11 },
    ],
    selected: null, filter: 'All', search: '', drawer: null,
  };
}
let state = seed();

/* ---------- matching ---------- */
function candidatesFor(slot) {
  const notice = slot.start - state.clock;
  const list = state.patients
    .filter(p => p.status === 'waiting' && !slot.declined.includes(p.id))
    .map(p => {
      const checks = {
        service: p.services.includes(slot.service),
        avail: p.avail[TODAY_IDX][partOf(slot.start)],
        notice: p.notice <= notice,
      };
      return { p, checks, eligible: checks.service && checks.avail && checks.notice };
    });
  const order = state.rules.filter(r => r.on);
  const cmp = (a, b) => {
    for (const r of order) {
      let d = 0;
      if (r.id === 'flag') d = (b.p.flag ? 1 : 0) - (a.p.flag ? 1 : 0);
      if (r.id === 'wait') d = b.p.wait - a.p.wait;
      if (r.id === 'fair') d = a.p.offers - b.p.offers;
      if (d) return d;
    }
    return a.p.name.localeCompare(b.p.name);
  };
  return {
    notice,
    eligible: list.filter(x => x.eligible).sort(cmp),
    out: list.filter(x => !x.eligible && x.checks.service),
  };
}

/* ---------- actions ---------- */
const slotById = id => state.slots.find(s => s.id === +id);
const patientById = id => state.patients.find(p => p.id === +id);
const ev = (slot, text) => slot.events.push({ t: fmt(state.clock), text });

function cancel(id) {
  const s = slotById(id);
  s.status = 'cancelled'; s.cancelledAt = state.clock;
  state.stats.cancelled++;
  ev(s, 'Reception logged the cancellation');
  state.selected = s.id;
}
function sendOffer(id, pid) {
  const s = slotById(id), p = patientById(pid);
  state.clock += 1;
  s.offer = { pid: p.id, sentAt: state.clock };
  ev(s, 'Offer sent to ' + p.name + ' by SMS');
}
function reply(id, type) {
  const s = slotById(id), p = patientById(s.offer.pid);
  state.clock += type === 'yes' ? 3 : type === 'no' ? 2 : 15;
  const mins = state.clock - s.offer.sentAt;
  if (type === 'yes' && state.clock < s.start) {
    s.status = 'refilled'; s.filledBy = p.name; s.filledAt = state.clock; s.offer = null;
    p.status = 'booked';
    state.stats.refilled++; state.stats.minutes += state.clock - s.cancelledAt;
    ev(s, p.name + ' replied YES. Slot booked');
    state.log.unshift({ time: 'Tue ' + fmt(state.clock), slot: s.service + ' ' + fmt(s.start), who: p.name, result: 'accepted', mins });
    return;
  }
  const label = type === 'none' ? 'no reply' : 'declined';
  p.offers++; s.declined.push(p.id); s.offer = null;
  ev(s, type === 'none' ? p.name + ' did not reply, offer expired' : p.name + ' replied ' + (type === 'yes' ? 'YES too late' : 'NO'));
  state.log.unshift({ time: 'Tue ' + fmt(state.clock), slot: s.service + ' ' + fmt(s.start), who: p.name, result: label, mins });
  if (!candidatesFor(s).eligible.length) closeUnfilled(id);
}
function closeUnfilled(id) {
  const s = slotById(id);
  if (s.status !== 'cancelled') return;
  s.status = 'unfilled'; s.offer = null;
  state.stats.unfilled++;
  ev(s, 'No eligible patient left. Slot stays unfilled');
}

/* ---------- views ---------- */
const statusChip = s => ({
  done: '<span class="chip neutral">Done</span>',
  booked: '<span class="chip info">Booked</span>',
  cancelled: '<span class="chip warn">Cancelled</span>',
  refilled: '<span class="chip ok">Refilled</span>',
  unfilled: '<span class="chip bad">Unfilled</span>',
}[s.status]);

function viewToday() {
  const rows = state.slots.map(s => {
    const sel = state.selected === s.id;
    const clickable = ['cancelled', 'refilled', 'unfilled'].includes(s.status);
    const who = s.status === 'refilled' ? `${esc(s.filledBy)} <span class="dim">(was ${esc(s.who)})</span>` : esc(s.who);
    const action = s.status === 'booked' && s.start > state.clock
      ? `<button class="btn small danger" data-action="cancel" data-slot="${s.id}">Cancel</button>`
      : clickable ? `<button class="btn small" data-action="select" data-slot="${s.id}">View</button>` : '';
    return `<tr class="${sel ? 'row-sel' : ''}">
      <td class="time">${fmt(s.start)}</td><td>${esc(s.service)}</td><td>${esc(s.doc)}</td>
      <td>${who}</td><td>${statusChip(s)}</td><td class="num">${action}</td></tr>`;
  }).join('');
  return `
  <div class="page-head"><div>
    <h1>Today, Tuesday 17 November</h1>
    <p>Cancel a booked appointment to see how Openslot finds a replacement from the waiting list. The patient replies are simulated.</p>
  </div></div>
  <div class="split">
    <section class="card" aria-label="Appointments">
      <div class="card-head"><h2>Appointments</h2><span class="dim">${state.slots.filter(s => s.status === 'booked' && s.start > state.clock).length} still booked</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Time</th><th>Service</th><th>Practitioner</th><th>Patient</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>
    </section>
    <aside class="panel" aria-label="Slot recovery">${panel()}</aside>
  </div>`;
}

function panel() {
  const s = state.selected && slotById(state.selected);
  if (!s) return `<div class="card empty"><h3>No cancelled slot selected</h3><p>Press Cancel on a booked appointment. Openslot then ranks the waiting-list patients who can really take the slot.</p></div>`;
  const head = `<div class="card-head"><h2>${esc(s.service)} at ${fmt(s.start)}</h2>${statusChip(s)}</div>
    <div class="slot-summary">
      <div class="kv"><span>Practitioner</span><strong>${esc(s.doc)}</strong></div>
      <div class="kv"><span>Time until slot</span><strong>${Math.max(0, s.start - state.clock)} min</strong></div>
      <div class="kv"><span>Day part</span><strong>${partName(partOf(s.start))}</strong></div>
    </div>`;
  const timeline = `<div class="section-title">Activity</div><ul class="timeline">${s.events.map(e => `<li><span class="t">${e.t}</span><span>${esc(e.text)}</span></li>`).join('')}</ul>`;

  if (s.status === 'refilled') {
    return `<div class="card">${head}<div class="banner ok">Refilled by ${esc(s.filledBy)} in ${s.filledAt - s.cancelledAt} minutes. Reception only had to log the cancellation.</div>${timeline}</div>`;
  }
  if (s.status === 'unfilled') {
    return `<div class="card">${head}<div class="banner bad">This slot stays unfilled. Nobody on the waiting list was available, with enough notice, for this service.</div>${timeline}</div>`;
  }
  if (s.offer) {
    const p = patientById(s.offer.pid);
    const text = `${CLINIC}: a ${s.service} slot is free today at ${fmt(s.start)} with ${s.doc}. Reply YES to take it or NO to decline. Offer valid for 15 minutes.`;
    return `<div class="card">${head}
      <div class="phone-wrap"><div class="phone"><div class="phone-notch"></div><div class="phone-screen">
        <div class="phone-from">SMS to ${esc(p.name)}</div><div class="sms">${esc(text)}</div></div></div></div>
      <div class="banner info">Waiting for ${esc(p.name)}. Simulate what the patient does:</div>
      <div class="panel-actions">
        <button class="btn primary" data-action="reply" data-slot="${s.id}" data-type="yes">Patient replies YES</button>
        <button class="btn" data-action="reply" data-slot="${s.id}" data-type="no">Replies NO</button>
        <button class="btn" data-action="reply" data-slot="${s.id}" data-type="none">No reply (15 min)</button>
      </div>${timeline}</div>`;
  }
  const c = candidatesFor(s);
  const top = c.eligible[0];
  const card = (x, i) => `<div class="cand"><div class="rank">${i + 1}</div><div>
      <div class="cand-name">${esc(x.p.name)}${x.p.flag ? '<span class="chip warn">Clinical flag</span>' : ''}</div>
      <div class="cand-meta">Waiting ${x.p.wait} days · ${x.p.offers} recent offer${x.p.offers === 1 ? '' : 's'}</div>
      <div class="checks"><span class="chip ok">Wants ${esc(s.service)}</span><span class="chip ok">Free ${DAYS[TODAY_IDX]} ${partName(partOf(s.start)).toLowerCase()}</span><span class="chip ok">Needs ${noticeLabel(x.p.notice)}</span></div></div></div>`;
  const out = x => `<div class="cand out"><div class="rank">–</div><div>
      <div class="cand-name">${esc(x.p.name)}</div>
      <div class="checks">${x.checks.avail ? '' : `<span class="chip bad">Not free ${DAYS[TODAY_IDX]} ${partName(partOf(s.start)).toLowerCase()}</span>`}${x.checks.notice ? '' : `<span class="chip bad">Needs ${noticeLabel(x.p.notice)}, only ${Math.max(0, c.notice)} min left</span>`}</div></div></div>`;
  return `<div class="card">${head}
    <div class="section-title">Eligible patients, ranked by your rules (${c.eligible.length})</div>
    ${c.eligible.length ? c.eligible.map(card).join('') : '<div class="banner bad">No patient can take this slot with the time left.</div>'}
    <div class="panel-actions">
      ${top ? `<button class="btn primary" data-action="offer" data-slot="${s.id}" data-p="${top.p.id}">Send offer to ${esc(top.p.name)}</button>` : ''}
      <button class="btn" data-action="unfilled" data-slot="${s.id}">${top ? 'Leave unfilled' : 'Close as unfilled'}</button>
    </div>
    ${c.out.length ? `<div class="section-title">Not eligible (${c.out.length})</div>${c.out.map(out).join('')}` : ''}${timeline}</div>`;
}

function waitingRows() {
  const q = state.search.trim().toLowerCase();
  return state.patients
    .filter(p => p.status === 'waiting')
    .filter(p => state.filter === 'All' || p.services.includes(state.filter))
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => b.wait - a.wait)
    .map(p => {
      const mini = p.avail.map(d => `<i class="${d.M || d.A || d.E ? 'on' : ''}" title=""></i>`).join('');
      return `<tr class="clickable" data-action="open-patient" data-p="${p.id}" tabindex="0">
        <td><strong>${esc(p.name)}</strong></td><td>${p.services.map(esc).join(', ')}</td>
        <td class="num">${p.wait} days</td>
        <td><span class="mini" aria-label="Days with availability">${mini}</span></td>
        <td>${noticeLabel(p.notice)}</td>
        <td>${p.flag ? '<span class="chip warn">Clinical flag</span>' : '<span class="dim">None</span>'}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="dim">No patients match.</td></tr>';
}
function viewWaiting() {
  const filters = ['All', ...SERVICES].map(f => `<button type="button" data-action="filter" data-s="${esc(f)}" aria-pressed="${state.filter === f}">${esc(f)}</button>`).join('');
  return `
  <div class="page-head"><div><h1>Waiting list</h1>
    <p>Everyone who wants an earlier appointment. Select a patient to see or change when they can really attend.</p></div></div>
  <section class="card">
    <div class="toolbar"><div class="seg" role="group" aria-label="Filter by service">${filters}</div>
      <input type="search" id="search" placeholder="Search by name" aria-label="Search by name" value="${esc(state.search)}"></div>
    <div class="table-wrap"><table>
      <thead><tr><th>Patient</th><th>Wants</th><th class="num">Waiting</th><th>Days available<br><span class="mini-legend">Mon to Fri</span></th><th>Notice needed</th><th>Clinical flag</th></tr></thead>
      <tbody id="wl-body">${waitingRows()}</tbody></table></div>
  </section>`;
}

function drawer() {
  const p = state.drawer && patientById(state.drawer);
  if (!p) return '';
  const head = ['<div></div>', ...DAYS.map(d => `<div class="h">${d}</div>`)].join('');
  const body = PARTS.map(pt => `<div class="r">${pt.name}<small>${pt.hours}</small></div>` + DAYS.map((d, i) =>
    `<button type="button" data-action="toggle-avail" data-d="${i}" data-k="${pt.k}" aria-pressed="${p.avail[i][pt.k]}" aria-label="${d} ${pt.name}">${p.avail[i][pt.k] ? 'Yes' : '–'}</button>`).join('')).join('');
  return `<div class="scrim" data-action="close-drawer"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Availability profile of ${esc(p.name)}">
    <div class="drawer-head"><div><h2>${esc(p.name)}</h2><p class="dim">Wants ${p.services.map(esc).join(', ')} · waiting ${p.wait} days</p></div>
      <button class="btn ghost small" data-action="close-drawer" aria-label="Close">Close</button></div>
    <div class="drawer-body">
      <div class="section-title" style="padding-left:0">Availability profile</div>
      <div class="avail" role="group" aria-label="Availability">${head}${body}</div>
      <div class="field"><label for="notice">Notice the patient needs</label>
        <select id="notice" data-change="notice">${NOTICES.map(n => `<option value="${n.v}" ${n.v === p.notice ? 'selected' : ''}>${n.l}</option>`).join('')}</select></div>
      <p class="note">${p.flag ? 'Clinical flag set by Dr. Weiss on 9 Nov. It can only be changed by a healthcare professional.' : 'No clinical flag.'}</p>
      <p class="note">In the real product the patient fills this in once, in their own profile. Changes here are used the next time a slot is cancelled.</p>
    </div>
    <div class="drawer-foot"><button class="btn primary" data-action="close-drawer">Done</button></div>
  </aside>`;
}

function viewRules() {
  const rules = state.rules.map((r, i) => `<div class="rule ${r.on ? '' : 'off'}">
    <div class="n">${i + 1}</div><div><h3>${esc(r.title)}</h3><p>${esc(r.desc)}</p></div>
    <div class="rule-ctrl">
      <button class="btn small" data-action="move-rule" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">Up</button>
      <button class="btn small" data-action="move-rule" data-i="${i}" data-dir="1" ${i === state.rules.length - 1 ? 'disabled' : ''} aria-label="Move down">Down</button>
      <label class="switch"><input type="checkbox" data-change="rule" data-i="${i}" ${r.on ? 'checked' : ''} aria-label="Rule enabled"><span></span></label>
    </div></div>`).join('');
  return `
  <div class="page-head"><div><h1>Allocation rules</h1>
    <p>These rules decide who is offered a freed slot first. The clinic approves them. Openslot only applies them, it never decides medical priority.</p></div>
    <span class="chip brand">Approved by Dr. Weiss, clinical lead, 4 Nov 2026</span></div>
  <div class="two-col">
    <section class="card"><div class="card-head"><h2>Priority order</h2><span class="dim">Applied top to bottom</span></div>${rules}</section>
    <section class="card"><div class="card-head"><h2>Always required</h2></div>
      <ul class="fixed-list">
        <li><span class="tick">✓</span><div><strong>Same service</strong><br><span class="dim">The patient is waiting for this treatment.</span></div></li>
        <li><span class="tick">✓</span><div><strong>Really available</strong><br><span class="dim">The patient marked this day and part of the day as possible.</span></div></li>
        <li><span class="tick">✓</span><div><strong>Enough notice</strong><br><span class="dim">The time left is at least the notice the patient asked for.</span></div></li>
      </ul>
      <p class="note" style="padding:0 18px 18px">Change the order here, then go to Today and cancel a slot to see a different patient come first.</p></section>
  </div>`;
}

function viewRecovery() {
  const st = state.stats;
  const rate = st.cancelled ? Math.round(100 * st.refilled / st.cancelled) : 0;
  const avg = st.refilled ? Math.round(st.minutes / st.refilled) : 0;
  const saved = st.refilled * STAFF_MIN_PER_REFILL;
  const kpi = (l, v, s) => `<div class="card kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></div>`;
  const weeks = [...state.history, { w: 'Wk 47', c: st.cancelled, r: st.refilled, live: true }];
  const bw = 54, gap = 34, H = 220, left = 44, W = left + weeks.length * (bw + gap);
  const bars = weeks.map((x, i) => {
    const pct = x.c ? x.r / x.c : 0, h = Math.round(pct * (H - 40)), bx = left + i * (bw + gap) + gap / 2, by = H - h;
    return `<rect x="${bx}" y="${by}" width="${bw}" height="${h}" rx="4" fill="${x.live ? '#0b6e68' : '#9cc9c5'}"/>
      <text x="${bx + bw / 2}" y="${by - 8}" text-anchor="middle" font-size="13" font-weight="600" fill="#17212b">${Math.round(pct * 100)}%</text>
      <text x="${bx + bw / 2}" y="${H + 20}" text-anchor="middle" font-size="12" fill="#5f6b78">${x.w}${x.live ? ' (live)' : ''}</text>`;
  }).join('');
  const grid = [0, 50, 100].map(v => { const y = H - Math.round(v / 100 * (H - 40)); return `<line x1="${left - 6}" x2="${W}" y1="${y}" y2="${y}" stroke="#e2e6ea"/><text x="${left - 12}" y="${y + 4}" text-anchor="end" font-size="11" fill="#5f6b78">${v}%</text>`; }).join('');
  const logRows = state.log.slice(0, 10).map(l => `<tr><td class="dim">${esc(l.time)}</td><td>${esc(l.slot)}</td><td>${esc(l.who)}</td>
    <td><span class="chip ${l.result === 'accepted' ? 'ok' : l.result === 'declined' ? 'bad' : 'neutral'}">${l.result}</span></td><td class="num">${l.mins} min</td></tr>`).join('');
  return `
  <div class="page-head"><div><h1>Recovery</h1>
    <p>How many cancelled slots the clinic got back. Earlier weeks are sample data. This week updates as you play with the demo.</p></div></div>
  <div class="kpis">
    ${kpi('Cancelled slots', st.cancelled, 'this week')}
    ${kpi('Refilled', st.refilled, 'this week')}
    ${kpi('Recovery rate', rate + '%', 'refilled of cancelled')}
    ${kpi('Time to refill', avg ? avg + ' min' : 'n/a', 'average, cancellation to booking')}
    ${kpi('Unfilled', st.unfilled, 'lost appointment slots')}
    ${kpi('Staff time saved', Math.floor(saved / 60) + ' h ' + (saved % 60) + ' min', 'demo estimate, ' + STAFF_MIN_PER_REFILL + ' min per refill')}
  </div>
  <div class="two-col even">
    <section class="card"><div class="card-head"><h2>Recovery rate by week</h2></div>
      <div class="chart"><svg viewBox="0 0 ${W} ${H + 34}" role="img" aria-label="Recovery rate by week">${grid}${bars}</svg></div></section>
    <section class="card"><div class="card-head"><h2>Offer log</h2></div>
      <div class="table-wrap"><table class="log"><thead><tr><th>When</th><th>Slot</th><th>Patient</th><th>Result</th><th class="num">Reply</th></tr></thead><tbody>${logRows}</tbody></table></div></section>
  </div>`;
}

/* ---------- router and render ---------- */
const ROUTES = { today: viewToday, waiting: viewWaiting, rules: viewRules, recovery: viewRecovery };
function route() { return (location.hash.replace('#/', '') || 'today'); }
function render() {
  const r = ROUTES[route()] ? route() : 'today';
  $('#main').innerHTML = ROUTES[r]();
  document.querySelectorAll('.nav a').forEach(a => { if (a.dataset.route === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('#drawer-root').innerHTML = drawer();
  $('#clock').textContent = 'Tue 17 Nov, ' + fmt(state.clock);
}
window.addEventListener('hashchange', () => { state.drawer = null; render(); window.scrollTo(0, 0); });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const a = b.dataset.action, d = b.dataset;
  if (a === 'cancel') cancel(d.slot);
  else if (a === 'select') state.selected = +d.slot;
  else if (a === 'offer') sendOffer(d.slot, d.p);
  else if (a === 'reply') reply(d.slot, d.type);
  else if (a === 'unfilled') closeUnfilled(d.slot);
  else if (a === 'filter') state.filter = d.s;
  else if (a === 'open-patient') state.drawer = +d.p;
  else if (a === 'close-drawer') state.drawer = null;
  else if (a === 'toggle-avail') { const p = patientById(state.drawer); p.avail[+d.d][d.k] = !p.avail[+d.d][d.k]; }
  else if (a === 'move-rule') { const i = +d.i, j = i + +d.dir, r = state.rules; [r[i], r[j]] = [r[j], r[i]]; }
  render();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.drawer) { state.drawer = null; render(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-action="open-patient"]')) { e.preventDefault(); state.drawer = +e.target.dataset.p; render(); }
});
document.addEventListener('change', e => {
  const c = e.target.dataset.change;
  if (c === 'rule') { state.rules[+e.target.dataset.i].on = e.target.checked; render(); }
  if (c === 'notice') { patientById(state.drawer).notice = +e.target.value; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'search') { state.search = e.target.value; $('#wl-body').innerHTML = waitingRows(); }
});
$('#reset').addEventListener('click', () => { state = seed(); location.hash = '#/today'; render(); });
render();
})();
