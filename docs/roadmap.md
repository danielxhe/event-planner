# Roadmap

Organized as **Now / Next / Later** instead of dated quarters, which is appropriate for a portfolio-stage project where calendar dates would be fiction.

---

## Now (MVP, 2 to 3 weeks of focused part-time work)

**Goal:** Host can plan a real event end-to-end in Notion + Google Form.

- [ ] Build the 5 Notion databases per `docs/notion-schema.md`
- [ ] Create master Event template page with embedded linked views
- [ ] Build the guest RSVP Google Form (one-per-event template)
- [ ] Wire Form responses into Google Sheet
- [ ] Document the "copy Sheet rows into Notion" workflow (manual sync, MVP-acceptable)
- [ ] Build the GitHub Pages landing site (single HTML page)
- [ ] Pilot with one real gathering: full lifecycle, retro included

**Exit criteria:** One real event planned + executed + retro written. RSVP response rate measured. Time-to-plan measured.

---

## Next (V2, ~2 weeks)

**Goal:** Reduce host effort, add optional power features.

- [ ] **Budget tracker** as opt-in checkbox per event (database already exists, just unhide rollups when enabled)
- [ ] **Day-before reminder email** via Google Apps Script trigger on the Sheet (1 day before, not 3, per user spec)
- [ ] Activity poll via Google Form (multi-select with "vote for top 3")
- [ ] Venue checklist template (parking, accessibility, weather backup, on-site supplies)
- [ ] Auto dietary-restriction roll-up on event page
- [ ] Zapier/Make integration to auto-sync Form to Notion (eliminate manual copy)

**Exit criteria:** Pilot 2 more events using V2 features. Measure reduction in manual sync time.

---

## Later (V3 backlog, prioritize after V2 pilots)

**Goal:** Longitudinal value. Make the app *more* useful the more you use it.

- Past-events library with photos + retro notes (gallery view of Events DB filtered to Status=Past)
- Persistent guest profiles (already in schema; surface "you haven't invited X in 6 months" on home dashboard)
- Weather forecast pull for outdoor events (Apps Script + free weather API)
- QR code for arrival check-in (host-side scanner marks guests as "arrived")
- "Pair guests" suggestion based on shared interests (requires guest tags in Guest DB)

---

## Won't-do (explicit cuts)

These appear here, not in backlog, because **explicit non-goals are a PM artifact in themselves**. They show focus.

- Payment splitting (Venmo/Splitwise own this category)
- Native mobile app (Notion mobile is sufficient)
- Ticketing / paid events (Eventbrite/Partiful own this)
- Public discoverable events (privacy-by-default is core to the value prop)
- AI-generated event suggestions (fun demo, but doesn't solve the actual job-to-be-done)

---

## Recruiter-facing milestones

Use these as portfolio "chapter markers":

1. ✅ **Concept & scope locked** (2026-05-25): PRD, schema, roadmap shipped
2. ⏳ **MVP built**: Notion workspace + Form + landing page live
3. ⏳ **First real-world pilot**: one event run end-to-end
4. ⏳ **Retro published**: post-mortem with quant + qual findings
5. ⏳ **V2 shipped**: opt-in budget + reminders + auto-sync
6. ⏳ **3-event cohort study**: 3 events run, metrics reported, learnings synthesized
