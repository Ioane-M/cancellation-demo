# Openslot (cancellation-demo)

A working demo of **Openslot**, a cancellation recovery product for independent clinics. When a patient cancels, Openslot finds a replacement from the waiting list, texts them an offer and fills the slot. Built for the MKI group project (Group 5, WU Vienna).

**Everything is fictional. No real patients, no real SMS, no data leaves your browser.**

## Two apps, one shared state
- `index.html` is the **clinic app**. Sign in as Reception, Dentist or Owner.
- `patient.html` is the **patient app**. Pick a demo patient. Open it in a second window or on a second tab.
- Both read and write the same data (browser storage), so a change in one window shows up live in the other, like a real backend.

## Try the full loop (about 2 minutes)
1. Open the clinic app, sign in as **Reception**.
2. In another window open the patient app and pick **Oskar Lindner** (appointment today 10:00). Press **Cancel appointment**.
3. Back in the clinic app, Openslot has picked the best waiting patient and sent an SMS offer. The panel shows who is next and why.
4. In a third window open the patient app as **Anna Berger**. Open the offer and press **Take this appointment**.
5. The clinic schedule turns the slot green. Check **Recovery** and the **Audit log**.
6. To see an unanswered offer, use **Demo tools, Move 15 min forward**. The offer expires and the next patient is contacted automatically.

## What is in the clinic app
- **Today**: schedule per practitioner with a live "now" line, cancellation by reception, live offer status, the SMS text, ranked next-in-line patients with the reason.
- **Waiting list**: add patients (with SMS consent), edit availability, clinical flag (dentist only), remove.
- **Messages**: every SMS Openslot sends.
- **Allocation rules**: priority order, only a dentist can change it. The approval is shown.
- **Recovery**: recovery rate, time to refill, unfilled slots, staff time saved (demo assumption), weekly chart.
- **Settings (owner)**: automatic offers on or off, offer validity, cut-off before the slot starts, SMS template with live preview.
- **Audit log** (dentist, owner): who did what and when, CSV download.

## What is in the patient app
Offer page (the link in the SMS), countdown, accept or decline, cancel own appointment, availability profile, SMS inbox, privacy page with consent, data download and leave-the-list.

## Run locally
No build step: open `index.html`, or run `python3 -m http.server` in this folder.

## Deploy on Vercel
Import the repo on vercel.com, framework preset **Other**, leave build command and output directory empty, deploy. Suggested project name `openslot-demo`.

## Honest limits of the demo
- No real backend or SMS: state lives in `localStorage`, sync works between windows of the same browser. A real product needs a server database, an SMS gateway, authentication, and a data processing agreement with each clinic.
- Matching is deliberately simple: service, availability, notice, then the clinic rules.
- Numbers on the Recovery page for earlier weeks are sample data. "Staff time saved" assumes 12 minutes of phoning per refilled slot.
