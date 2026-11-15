/* Openslot demo core: shared by the staff app (index.html) and the patient app (patient.html).
   State lives in localStorage, so two windows stay in sync like a real backend would.
   All data is fictional. No messages are sent anywhere. */
window.OS = (() => {
'use strict';
const KEY = 'openslot-demo-v2';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TODAY_IDX = 1;
const PARTS = [
  { k: 'M', name: 'Morning', hours: '08:00 to 12:00' },
  { k: 'A', name: 'Afternoon', hours: '12:00 to 17:00' },
  { k: 'E', name: 'Evening', hours: '17:00 to 19:00' },
];
const SERVICES = ['Check-up', 'Hygiene', 'Filling', 'Root canal consult'];
const DURATION = { 'Check-up': 30, 'Hygiene': 45, 'Filling': 60, 'Root canal consult': 45 };
const NOTICES = [{ v: 30, l: '30 minutes' }, { v: 60, l: '1 hour' }, { v: 120, l: '2 hours' }, { v: 240, l: '4 hours' }, { v: 1440, l: '1 day' }];
const CLINIC = 'Linden Dental Practice';
const STAFF_MIN_PER_REFILL = 12;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const partOf = m => (m < 720 ? 'M' : m < 1020 ? 'A' : 'E');
const partName = k => PARTS.find(p => p.k === k).name;
const noticeLabel = v => (NOTICES.find(n => n.v === v) || { l: v + ' min' }).l;
const parseAvail = s => s.split('|').map(d => ({ M: d.includes('M'), A: d.includes('A'), E: d.includes('E') }));

/* ---------- seed ---------- */
function seed() {
  const W = (id, name, services, wait, notice, av, flag, offers, current) => ({
    id, name, phone: '+43 660 ••• ' + String(100 + id * 7).slice(-3), consent: { sms: true, at: '2026-09-' + String(10 + id).padStart(2, '0') },
    appt: null, current,
    wl: { services, wait, notice, avail: parseAvail(av), flag, offers, status: 'waiting' },
  });
  const B = (id, name, slotId) => ({ id, name, phone: '+43 660 ••• ' + String(100 + id * 7).slice(-3), consent: { sms: true, at: '2026-08-' + String(id - 10).padStart(2, '0') }, appt: slotId, current: null, wl: null });
  const patients = [
    W(1, 'Anna Berger', ['Check-up', 'Hygiene'], 41, 30, 'MA|MA|M|MA|M', false, 0, 'Tue 24 Nov, 15:30'),
    W(2, 'Luka Horvat', ['Check-up'], 63, 60, 'A|MA|A|A|A', true, 1, 'Mon 30 Nov, 14:00'),
    W(3, 'Mira Kovac', ['Hygiene'], 28, 30, 'MAE|MAE|MAE|MAE|MAE', false, 0, 'Thu 26 Nov, 17:15'),
    W(4, 'Jonas Eder', ['Filling'], 19, 120, 'M|MA|M|M|MA', false, 0, 'Fri 27 Nov, 09:00'),
    W(5, 'Sofia Marin', ['Check-up', 'Filling'], 55, 30, 'MA|M|MA|M|MA', false, 2, 'Wed 2 Dec, 10:30'),
    W(6, 'Tomas Novak', ['Hygiene', 'Check-up'], 12, 60, 'E|E|E|E|E', false, 0, 'Tue 1 Dec, 17:30'),
    W(7, 'Elif Demir', ['Root canal consult'], 34, 60, 'MA|MA|MA|MA|MA', true, 0, 'Mon 23 Nov, 16:00'),
    W(8, 'Paul Gruber', ['Filling'], 47, 30, 'A|A|A|A|A', false, 0, 'Thu 3 Dec, 13:30'),
    W(9, 'Nadia Haddad', ['Hygiene'], 23, 240, 'MA|MA|MA|MA|MA', false, 0, 'Fri 4 Dec, 11:00'),
    W(10, 'Felix Aigner', ['Check-up'], 8, 30, 'MAE|MAE|MAE|MAE|MAE', false, 0, 'Wed 25 Nov, 12:30'),
    W(11, 'Ines Pereira', ['Filling', 'Check-up'], 31, 60, 'M|M|M|M|M', false, 0, 'Mon 7 Dec, 09:30'),
    W(12, 'Marta Wolf', ['Hygiene'], 70, 30, 'MA|A|M|MA|A', false, 0, 'Tue 8 Dec, 14:45'),
    W(13, 'David Lang', ['Root canal consult'], 16, 120, 'A|MA|A|A|A', false, 0, 'Thu 10 Dec, 15:00'),
    W(14, 'Yusuf Aydin', ['Check-up'], 5, 30, 'M|M|MA|M|M', false, 0, 'Fri 11 Dec, 08:30'),
    B(21, 'Greta Moser', 3), B(22, 'Oskar Lindner', 4), B(23, 'Hanna Roth', 5), B(24, 'Karl Steiner', 6), B(25, 'Lena Fuchs', 7), B(26, 'Peter Huber', 8),
    B(27, 'Rita Gasser', 1), B(28, 'Emil Strasser', 2),
  ];
  const S = (id, start, service, doc, pid, status) => ({
    id, start, dur: DURATION[service], service, doc, patientId: pid, status: status || 'booked',
    cancelledAt: null, cancelledBy: null, reason: null, offers: [], filledBy: null, filledAt: null,
  });
  return {
    v: 2, clock: 9 * 60 + 10, nextId: 100,
    patients,
    slots: [S(1, 480, 'Check-up', 'Dr. Okafor', 27, 'done'), S(2, 525, 'Hygiene', 'Dr. Weiss', 28, 'done'),
      S(3, 580, 'Filling', 'Dr. Weiss', 21), S(4, 600, 'Hygiene', 'Dr. Okafor', 22), S(5, 675, 'Check-up', 'Dr. Weiss', 23),
      S(6, 780, 'Filling', 'Dr. Okafor', 24), S(7, 870, 'Root canal consult', 'Dr. Weiss', 25), S(8, 960, 'Hygiene', 'Dr. Okafor', 26)],
    rules: [
      { id: 'flag', on: true, title: 'Clinical flag first', desc: 'Patients flagged by a dentist as clinically urgent are offered a slot before everyone else. The flag is set by healthcare professionals, never by the software.' },
      { id: 'wait', on: true, title: 'Longest wait first', desc: 'Among the remaining patients, the one who has been on the waiting list the longest is offered the slot first.' },
      { id: 'fair', on: true, title: 'Fewest recent offers first', desc: 'Patients who have received fewer offers recently go first, so nobody is contacted over and over.' },
    ],
    approval: { by: 'Dr. Weiss', at: '4 Nov 2026' },
    settings: { autoOffer: true, expiry: 15, cutoff: 20, template: '{clinic}: a {service} slot is free today at {time} with {doctor}. Open {link} to take it or decline. Offer valid for {minutes} minutes.' },
    outbox: [], audit: [{ t: '09:10', actor: 'System', action: 'Demo day started' }],
    base: { cancelled: 6, refilled: 2, unfilled: 2, minutes: 148 },
    history: [{ w: 'Wk 43', c: 19, r: 8 }, { w: 'Wk 44', c: 22, r: 12 }, { w: 'Wk 45', c: 17, r: 9 }, { w: 'Wk 46', c: 21, r: 11 }],
    seedLog: [
      { time: 'Mon 16:12', slot: 'Hygiene 16:30', who: 'Mira Kovac', result: 'declined', mins: 6 },
      { time: 'Mon 16:20', slot: 'Hygiene 16:30', who: 'Marta Wolf', result: 'accepted', mins: 4 },
      { time: 'Mon 11:02', slot: 'Filling 11:30', who: 'Paul Gruber', result: 'expired', mins: 15 },
      { time: 'Mon 11:18', slot: 'Filling 11:30', who: 'Jonas Eder', result: 'accepted', mins: 5 },
    ],
  };
}

/* ---------- storage and sync ---------- */
const listeners = [];
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 2 ? s : null; } catch (e) { return null; } }
let S = load() || seed();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked, demo keeps working in memory */ } }
function changed() { listeners.forEach(f => f()); }
window.addEventListener('storage', e => { if (e.key === KEY) { S = load() || S; changed(); } });
function mutate(fn) { const fresh = load(); if (fresh) S = fresh; const r = fn(S); processExpiries(); save(); changed(); return r; }
const state = () => S;
const onChange = f => listeners.push(f);
const slotById = id => S.slots.find(s => s.id === +id);
const patientById = id => S.patients.find(p => p.id === +id);
const uid = () => S.nextId++;
const log = (actor, action) => S.audit.push({ t: fmt(S.clock), actor, action });

/* ---------- permissions ---------- */
const PERMS = {
  reception: ['cancel', 'offer', 'waitlist-edit', 'messages'],
  dentist: ['cancel', 'offer', 'waitlist-edit', 'messages', 'flag', 'rules', 'audit'],
  owner: ['cancel', 'offer', 'waitlist-edit', 'messages', 'settings', 'audit'],
};
const can = (role, a) => (PERMS[role] || []).includes(a);

/* ---------- matching ---------- */
function candidates(slot) {
  const notice = slot.start - S.clock;
  const tried = slot.offers.map(o => o.pid);
  const list = S.patients.filter(p => p.wl && p.wl.status === 'waiting' && !tried.includes(p.id)).map(p => {
    const checks = {
      service: p.wl.services.includes(slot.service),
      avail: p.wl.avail[TODAY_IDX][partOf(slot.start)],
      notice: p.wl.notice <= notice,
    };
    return { p, checks, eligible: checks.service && checks.avail && checks.notice };
  });
  const order = S.rules.filter(r => r.on);
  const cmp = (a, b) => {
    for (const r of order) {
      let d = 0;
      if (r.id === 'flag') d = (b.p.wl.flag ? 1 : 0) - (a.p.wl.flag ? 1 : 0);
      if (r.id === 'wait') d = b.p.wl.wait - a.p.wl.wait;
      if (r.id === 'fair') d = a.p.wl.offers - b.p.wl.offers;
      if (d) return d;
    }
    return a.p.name.localeCompare(b.p.name);
  };
  return { notice, eligible: list.filter(x => x.eligible).sort(cmp), out: list.filter(x => !x.eligible && x.checks.service) };
}
const pendingOffer = slot => slot.offers.find(o => o.state === 'pending');

/* ---------- messages ---------- */
function renderTemplate(slot, link) {
  return S.settings.template
    .replace('{clinic}', CLINIC).replace('{service}', slot.service).replace('{time}', fmt(slot.start))
    .replace('{doctor}', slot.doc).replace('{link}', link).replace('{minutes}', S.settings.expiry);
}
function sms(pid, kind, text, link) { S.outbox.push({ id: uid(), pid, time: fmt(S.clock), kind, text, link: link || null }); }

/* ---------- actions (call inside mutate) ---------- */
function doCancel(slotId, by, reason, actor) {
  const s = slotById(slotId);
  if (!s || s.status !== 'booked') return;
  s.status = 'cancelled'; s.cancelledAt = S.clock; s.cancelledBy = by; s.reason = reason || null;
  const p = patientById(s.patientId); if (p) p.appt = null;
  log(actor, `Cancellation logged for ${s.service} at ${fmt(s.start)} (${by === 'patient' ? 'by the patient in the app' : 'by reception'}${reason ? ', reason: ' + reason : ''})`);
  if (p) sms(p.id, 'confirm', `${CLINIC}: your ${s.service} appointment today at ${fmt(s.start)} was cancelled. You can book a new one in the app.`);
  if (S.settings.autoOffer) offerNext(s, 'Openslot');
}
function offerNext(slot, actor) {
  if (slot.status !== 'cancelled' || pendingOffer(slot)) return;
  if (slot.start - S.clock < S.settings.cutoff) return closeUnfilled(slot, 'Too close to the start time (offers stop ' + S.settings.cutoff + ' min before)');
  const c = candidates(slot);
  if (!c.eligible.length) return closeUnfilled(slot, 'No eligible patient left');
  doOffer(slot, c.eligible[0].p.id, actor);
}
function doOffer(slot, pid, actor) {
  if (slot.status !== 'cancelled' || pendingOffer(slot)) return;
  const p = patientById(pid), o = { id: uid(), pid: p.id, sentAt: S.clock, expiresAt: Math.min(S.clock + S.settings.expiry, slot.start), state: 'pending', respondedAt: null };
  slot.offers.push(o);
  const link = 'openslot.app/o/' + o.id;
  sms(p.id, 'offer', renderTemplate(slot, link), 'offer/' + o.id);
  log(actor, `Offer for ${slot.service} at ${fmt(slot.start)} sent to ${p.name} by SMS`);
}
function closeUnfilled(slot, why) {
  if (slot.status !== 'cancelled') return;
  slot.status = 'unfilled';
  log('Openslot', `${slot.service} at ${fmt(slot.start)} stays unfilled. ${why}`);
}
function doRespond(offerId, answer, actor) {
  for (const slot of S.slots) {
    const o = slot.offers.find(x => x.id === +offerId);
    if (!o) continue;
    const p = patientById(o.pid);
    if (o.state === 'pending') S.clock += 2; // reading and answering takes a moment
    if (o.state !== 'pending') return { ok: false, why: o.state === 'expired' ? 'This offer has expired.' : 'You already answered this offer.' };
    if (S.clock >= o.expiresAt) { o.state = 'expired'; return { ok: false, why: 'This offer has expired.' }; }
    o.respondedAt = S.clock;
    if (answer === 'accept') {
      o.state = 'accepted'; slot.status = 'refilled'; slot.filledBy = p.id; slot.filledAt = S.clock;
      p.wl.status = 'booked'; p.appt = slot.id;
      sms(p.id, 'confirm', `${CLINIC}: you are booked for ${slot.service} today at ${fmt(slot.start)} with ${slot.doc}. Your later appointment (${p.current}) was released.`);
      log(actor, `${p.name} accepted the offer for ${slot.service} at ${fmt(slot.start)}. Slot refilled`);
    } else {
      o.state = 'declined'; p.wl.offers++;
      log(actor, `${p.name} declined the offer for ${slot.service} at ${fmt(slot.start)}`);
      if (S.settings.autoOffer) offerNext(slot, 'Openslot');
    }
    return { ok: true, slot, offer: o };
  }
  return { ok: false, why: 'Offer not found.' };
}
function processExpiries() {
  for (const slot of S.slots) {
    for (const o of slot.offers) {
      if (o.state === 'pending' && S.clock >= o.expiresAt) {
        o.state = 'expired'; patientById(o.pid).wl.offers++;
        log('Openslot', `Offer to ${patientById(o.pid).name} expired without a reply`);
        if (S.settings.autoOffer) offerNext(slot, 'Openslot');
      }
    }
    if (slot.status === 'cancelled' && !pendingOffer(slot) && S.clock >= slot.start) closeUnfilled(slot, 'The slot start time has passed');
  }
}

/* ---------- derived numbers ---------- */
function stats() {
  const c = S.slots.filter(s => s.cancelledAt != null), r = c.filter(s => s.status === 'refilled'), u = c.filter(s => s.status === 'unfilled');
  const b = S.base;
  const refilled = b.refilled + r.length, cancelled = b.cancelled + c.length;
  const minutes = b.minutes + r.reduce((a, s) => a + (s.filledAt - s.cancelledAt), 0);
  return { cancelled, refilled, unfilled: b.unfilled + u.length, open: c.filter(s => s.status === 'cancelled').length, minutes, avg: refilled ? Math.round(minutes / refilled) : 0, rate: cancelled ? Math.round(100 * refilled / cancelled) : 0, saved: refilled * STAFF_MIN_PER_REFILL };
}
function offerLog() {
  const live = [];
  S.slots.forEach(s => s.offers.forEach(o => { if (o.state !== 'pending') live.push({ time: 'Tue ' + fmt(o.respondedAt != null ? o.respondedAt : o.expiresAt), slot: s.service + ' ' + fmt(s.start), who: patientById(o.pid).name, result: o.state === 'accepted' ? 'accepted' : o.state, mins: (o.respondedAt != null ? o.respondedAt : o.expiresAt) - o.sentAt, sort: o.respondedAt != null ? o.respondedAt : o.expiresAt }); }));
  live.sort((a, b) => b.sort - a.sort);
  return [...live, ...S.seedLog];
}

/* ---------- public api ---------- */
const api = {
  DAYS, TODAY_IDX, PARTS, SERVICES, NOTICES, CLINIC, STAFF_MIN_PER_REFILL, DURATION,
  esc, fmt, partOf, partName, noticeLabel, can,
  state, onChange, slotById, patientById, candidates, pendingOffer, stats, offerLog,
  cancel: (id, by, reason, actor) => mutate(() => doCancel(id, by, reason, actor)),
  offer: (id, pid, actor) => mutate(() => doOffer(slotById(id), pid, actor)),
  respond: (offerId, answer, actor) => mutate(() => doRespond(offerId, answer, actor)),
  advance: min => mutate(() => { S.clock += min; log('Demo tools', `Clock moved forward ${min} min`); }),
  update: fn => mutate(fn),
  reset: () => { S = seed(); save(); changed(); },
  csvAudit: () => 'time,actor,action\n' + S.audit.map(a => [a.t, a.actor, '"' + a.action.replace(/"/g, '""') + '"'].join(',')).join('\n'),
};
return api;
})();
