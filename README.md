# Event Planner

A lightweight planning workspace for hosts of small private gatherings (5–50 guests). Built as a Notion template + Google Form intake layer, with a GitHub Pages landing site as the public front door.

This repo is the **PM artifact home** for the project. The actual app lives in Notion; this repo holds the requirements docs, schema, roadmap, prioritization, and metrics that the app was designed against.

---

## Why this exists

People throwing dinners, birthdays, BBQs, and game nights for 5–50 guests coordinate across 3–5 disconnected tools (group chat, spreadsheet, notes app, texts). Information gets lost, duplicated, or forgotten. Existing event tools over-solve (Eventbrite, Partiful, built for ticketed/public events) or under-solve (group chats, plain spreadsheets, no structure).

This project is a lightweight, structured planning hub for the **private host**, and a portfolio piece demonstrating product thinking, scope discipline, and end-to-end execution from problem statement to working pilot.

---

## Live app

🔗 *Notion workspace link (to be added once template is published)*
🔗 GitHub Pages landing site: [https://danielxhe.github.io/event-planner](https://danielxhe.github.io/event-planner)
🔗 Live demo event page: [https://danielxhe.github.io/event-planner/event.html?event=test-dinner-party](https://danielxhe.github.io/event-planner/event.html?event=test-dinner-party)

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Planning hub | Notion (5 linked databases) | Relations + rollups give auto headcount, dietary roll-ups, past-events library "for free" |
| Guest intake | Google Form → Google Sheet | Guests don't need a Notion account; universally familiar |
| Sync (MVP) | Manual copy from Sheet to Notion | Acceptable friction for v1 |
| Sync (V2) | Zapier / Make.com free tier | Auto-pushes form responses into Notion DBs |
| Reminders | Google Apps Script trigger | Day-before reminder email to confirmed guests |
| Public front door | GitHub Pages static site | Free, version-controlled, links to live Notion |

---

## Documentation

| Doc | What's in it |
|---|---|
| [PRD](docs/PRD.md) | Problem, users, scope, solution overview, success metrics, risks |
| [Notion Schema](docs/notion-schema.md) | The 5 databases, their properties, relations, and rollups |
| [Roadmap](docs/roadmap.md) | Now / Next / Later, plus explicit "won't-do" |
| [Prioritization](docs/prioritization.md) | MoSCoW matrix for every feature |
| [Metrics](docs/metrics.md) | North-star, activation, retention, and guardrail metrics |
| [Personas + Journey Maps](docs/personas.md) | Three personas (host / co-organizer / guest) with end-to-end journey tables |
| [Wireframes](docs/wireframes.md) | Low-fi ASCII wireframes of all 6 key screens |
| [Google Form Template](docs/google-form-template.md) | Field-by-field spec for the guest RSVP form |
| [Retro Template](docs/retro-template.md) | Post-event retrospective template (fill out after each pilot) |

**Operational scripts**

- [`scripts/reminder.gs`](scripts/reminder.gs): Google Apps Script for day-before email reminders

*Coming soon: post-pilot retro write-up.*

---

## Public event pages

Notion's public-share pages are too plain for the guest-facing view, so the repo ships a polished static page that reads from a single JSON file.

- **URL pattern:** `event.html?event=<slug>`
- **Live demo:** [https://danielxhe.github.io/event-planner/event.html?event=test-dinner-party](https://danielxhe.github.io/event-planner/event.html?event=test-dinner-party)
- **Data source:** [`data/events.json`](data/events.json) — one object per event in the `events` array

### Add a new event

1. Open [`data/events.json`](data/events.json)
2. Copy the existing event object and edit the fields (pick a unique `slug`)
3. Commit and push to `main`
4. GitHub Pages auto-redeploys in roughly a minute
5. Share the URL: `https://danielxhe.github.io/event-planner/event.html?event=<your-slug>`

No build step, no framework. The page is pure HTML, CSS, and vanilla JS, so the host can edit one file and ship.

---

## Project status

🟢 **Concept & scope locked** (2026-05-25)
⏳ **MVP build in progress**: Notion workspace + Form + landing page
⏳ **First real-world pilot** (pending MVP completion)
⏳ **Post-pilot retro** (pending pilot)
⏳ **V2 features**: opt-in budget tracker, day-before reminder, Form auto-sync

See [roadmap](docs/roadmap.md) for full milestone list.

---

## For recruiters

This project is structured to demonstrate:

- **Problem framing** → see PRD §1–2
- **Scope discipline** → see PRD §4 (explicit out-of-scope) and prioritization MoSCoW
- **System design thinking** → see Notion schema (5 linked databases with relations, rollups, formulas)
- **Measurement** → see metrics doc (north-star + guardrails)
- **Iteration plan** → see roadmap (Now/Next/Later, plus retro-driven V2)
- **End-to-end ownership** → planned: real pilots with written retros

---

*Maintained by [@danielxhe](https://github.com/danielxhe).*
