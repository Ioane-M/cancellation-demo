# Openslot (cancellation-demo)

Clickable demo of **Openslot**, a cancellation recovery tool for independent clinics. Built for the MKI group project (Group 5, WU Vienna). **All data is fictional. No real patients, no real SMS.**

## What the demo shows
- **Today**: cancel a booked appointment and watch Openslot rank the waiting-list patients who can really take the slot (same service, available at that time, enough notice, clinic rules). Send a simulated SMS offer and simulate the reply.
- **Waiting list**: patients and their availability profiles (click a row to edit).
- **Allocation rules**: the clinic-approved priority order. Change it and cancel a slot again to see another patient come first.
- **Recovery**: recovery rate, time to refill, unfilled slots, staff time saved (demo assumptions, earlier weeks are sample data).

## Run locally
No build step. Open `index.html`, or run `python3 -m http.server` in this folder.

## Deploy on Vercel
1. vercel.com, Add New, Project, import this GitHub repo.
2. Framework preset: Other. Leave build command and output directory empty.
3. Deploy. Suggested project name: `openslot-demo`.

## Notes
- Plain HTML, CSS and JavaScript. No backend, no database, no tracking.
- The demo clock starts at Tuesday 09:10 and moves forward as you act.
- Product map and BPMN process live in the course repo (`A3-Group5-Part9`).
