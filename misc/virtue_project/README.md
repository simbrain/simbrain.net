# Virtue project (pilot)

A side project under `misc/`; see [../README.md](../README.md). A tracker for the virtue pilot. Participants start any number of virtue tracks (Respect, Open-mindedness, Courage, Curiosity), each with its own mascot, and log entries that grow a picture: a trail, forest, garden, or night sky. The home page shows every track with its progress. Planning notes are in `ROC_Adriana_Grant/FallVirtueTheory/VirtueSessions_3_Fall.txt`.

## Files

- `index.html`: page shell.
- `tracks.js`: the tracks, their prompts and options, and the weekly goal and milestone spacing. Edit this to change wording.
- `themes.js`: the picture themes, their vocabulary (steps and camps, trees and groves, ...), and how each draws an entry.
- `app.js`: pages, routing, background saving, and the picture. `API_URL` at the top points to the backend.
- `style.css`: styles, with a dark variant.
- `backend.txt`: the Apps Script backend, which reads and writes the Google Sheet.
- `local_backend.js`: runs `backend.txt` in the browser against a fake sheet, for local testing.

## How it works

All data is in a Google Sheet with three tabs: Users, Tracks, and Entries. The nickname is the login, so a participant can use any device. The browser remembers which nickname is signed in, the chosen theme, and any entries still waiting to be saved. "I'm new" refuses a nickname that is taken, and "Log back in" refuses one that doesn't exist, so two people can't end up sharing trails by accident. There is no password, and the page says so.

Each entry row has the track, kind, assignment (Respect only), description, words, and the optional design note.

## Design decisions

Running notes on choices made during the pilot, newest last.

- **Metaphor.** A trail climbing upward, with a camp every 10 steps and a summit every 30. Chosen over a forest, garden, or night sky. Milestones are where rewards (e.g. otter pops) can attach.
- **Tracks.** One per virtue, each with its own mascot: Respect (Resilience) 🐢, Open-mindedness 🦉, Courage 🦁, Curiosity 🐈. Offered in that order. Participants can start as many as they like, and the Trailhead shows them all with progress.
- **Entries.** Each entry has a kind (from a short per-track list), a description, and a handful of words that appear on the trail. Respect also asks which assignment, with a "not yet" option drawn as an open circle. No demerits.
- **Weekly goal.** A few times per week, shown as 3 dots.
- **Design feedback.** Every entry ends with an optional "thoughts on the design of the app" box, since this is a pilot.
- **Storage.** A Google Sheet via Apps Script, so the team can read everything and participants can switch devices. Browser-only storage and a write-only Google Form were considered and rejected for those reasons.
- **Sign-in.** Nickname only, no password, with a notice that it isn't secure. Separate "I'm new" and "Log back in" buttons prevent two people from sharing a nickname by accident. A cohort code was dropped as unnecessary for now.
- **Navigation.** Each page has its own address (`#/trail/courage`), so breadcrumbs and the browser's Back button work.
- **Instant saving.** Saves to the Sheet take 1–3 seconds, so new entries and tracks show at once and are sent in the background. A status in the header shows Saving, Saved, or Not saved yet. Unsent items are kept in the browser and retried, and the backend ignores a repeat of an entry it already has.
- **Themes.** Trail, Forest, Garden, and Night sky, chosen at the bottom of the page and remembered per device. Same data, different picture and vocabulary. This revises the earlier trail-only choice. The app was renamed from Virtue Trails to Virtue Project to fit.
- **Home page.** No headings. Started tracks show progress and a Log button; the rest show a Start button.
- **Weekly goal wording.** "1 this week (goal: 3 a week)". The goal is per week and unrelated to the month between sessions.

## Setting up the backend

1. Create a Google Sheet (ideally in a UC Merced account).
2. In the Sheet, open **Extensions → Apps Script**. Replace the contents of `Code.gs` with `backend.txt`.
3. Select `setup` and click **Run**, authorizing when asked. This creates the three tabs.
4. Click **Deploy → New deployment**, choose type **Web app**, set **Execute as** to *Me* and **Who has access** to *Anyone*, and deploy. Copy the web app URL (ending in `/exec`).
5. Paste that URL into `API_URL` at the top of `app.js`.

After editing the script later, use **Deploy → Manage deployments → Edit → New version** so the same URL serves the new code.

## Local testing

With `API_URL` empty, or with `?local=1` added to the URL, the app runs `backend.txt` in the browser against a fake sheet kept in localStorage. From the repo root:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/misc/virtue_project/.
