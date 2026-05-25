# PRD: Event Planner

**Owner:** danielxhe
**Status:** v1.0, MVP scope locked 2026-05-25
**Last updated:** 2026-05-25

---

## 1. Problem

People who host small gatherings (5–50 guests) coordinate across 3–5 disconnected tools: a group chat for invites, a spreadsheet for potluck, a notes app for the schedule, texts for dietary restrictions. Information gets lost, duplicated, or forgotten. The host bears all the cognitive load.

Existing tools either over-solve (Eventbrite, Partiful are built for ticketed/public events) or under-solve (group chats and plain spreadsheets have no structure). There's no lightweight, structured planning hub for the private host throwing a dinner, birthday, BBQ, or game night.

## 2. Target users

**Primary:** The recurring private host. Throws 3+ gatherings per year, cares about guests' experience, currently coordinates via group chat plus memory.

**Secondary:** Co-organizers helping the primary host (partner, roommate, friend).

**Tertiary:** Guests, who need a single source of truth for *when, where, what to bring, what to wear*.

## 3. Jobs to be done

| Persona | Job | Current pain |
|---|---|---|
| Host | "Help me track who's coming so I know how much food to make" | Counting RSVPs across SMS, DMs, replies |
| Host | "Make sure potluck doesn't end up as 6 desserts and no mains" | Manually nagging guests, redundant brings |
| Host | "Remember who's vegetarian/allergic without re-asking every event" | Re-asking the same people every gathering |
| Co-organizer | "Let me update the plan without bugging the host" | Single-owner Google Doc; merge conflicts |
| Guest | "Tell me one place to check the address, time, and what I said I'd bring" | Scrolling through chat history |

## 4. Scope

### In scope (MVP)
- Event creation with date/time, venue, description, dress code
- Guest list + RSVP tracking (Yes / No / Maybe / No response)
- Potluck signup with categories, claims, dietary tags
- Auto headcount + serving calculator
- Run-of-show schedule
- Co-organizer edit permissions
- Read-only guest-facing summary page

### In scope (V2, should-have)
- **Budget tracker, optional per event** (off by default; toggle on per event)
- Activity poll / voting (via Google Form)
- Venue checklist (parking, accessibility, weather backup)
- **Auto-reminder email day before event** (1 day, not 3)
- Dietary-restriction auto roll-up across confirmed guests

### Backlog (V3)
- Past-events library with photos + retro notes
- Persistent guest profile memory across events
- Weather forecast for outdoor events
- QR code for arrival check-in

### Explicitly out of scope
- **Payment splitting** (Venmo, Splitwise, and Zelle already own this)
- **Native mobile app** (Notion mobile app is sufficient; no compelling reason to fragment)
- **Ticketing / paid events** (Eventbrite/Partiful own this; private gatherings rarely sell tickets)
- **Calendar integration beyond `.ics` export** (power users can self-import)

## 5. Solution overview

A **Notion-based workspace** (templated) where the host plans the event and a **Google Form** where guests RSVP and claim potluck slots. Form responses sync to a Google Sheet that the host copies into Notion (MVP) or auto-syncs via Zapier (V2).

**Why Notion:** the host is the heaviest user; Notion's databases, relations, and rollups give us auto headcount, dietary roll-ups, and a past-events library essentially for free. Co-organizers get edit access via Notion's native sharing.

**Why Google Forms for guests:** guests should not need a Notion account. Forms are universally familiar, free, and the data lands in a Sheet that's easy to embed back into the host's Notion page.

**Front door:** a GitHub Pages static landing page with screenshots, a "Use this template" link, and a link to the live demo Notion workspace.

## 6. Success metrics

| Metric | Definition | Target (after 3 real events) |
|---|---|---|
| **Planning time** | Hours host spends on logistics from invite-send to event-day | < 2 hours per event (baseline ~5 hrs via chat/sheets) |
| **RSVP response rate** | % of invited guests who respond Yes/No/Maybe | > 85% by event date |
| **Potluck coverage** | % of host-defined slots claimed before event | > 90% |
| **Dietary surprises** | Allergens/restrictions discovered at the event itself | 0 |
| **Post-event retro filled** | Host writes ≥1 retro note within 7 days | 100% (drives library value) |
| **Co-organizer edits** | # of edits made by non-host users | ≥ 1 per event (proves multi-user value) |

## 7. Risks & assumptions

- **Risk:** Notion learning curve for non-technical hosts. **Mitigation:** ship a "Duplicate this template" link + 2-minute Loom walkthrough.
- **Risk:** Manual Form→Notion copy is friction. **Mitigation:** acceptable for MVP; automate in V2 via Zapier free tier (100 tasks/mo covers most users).
- **Risk:** Guests ignore the Form and just text the host. **Mitigation:** invite copy emphasizes "RSVP via this link only; texts won't be tracked"; reminder includes Form link.
- **Assumption:** Hosts have Gmail (for Form + reminder Apps Script). Likely true for ~90% of US users.

## 8. Open questions

- Should reminder email also go to declined guests with a "we'll miss you" note, or only confirmed? (Default: confirmed only.)
- For the past-events library, should retro notes be guest-visible or host-only? (Default: host-only; consider opt-in sharing in V3.)
- Should co-organizers be able to delete events, or only edit? (Default: edit-only; only host can delete.)
