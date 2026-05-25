# Feature Prioritization — MoSCoW

Standard PM artifact showing scope discipline. Each feature is tagged Must / Should / Could / Won't and given a one-line rationale.

| Feature | Tier | Rationale |
|---|---|---|
| Event creation (name, date, venue, description, dress code) | **Must** | Without this there is no app |
| Guest list with RSVP states | **Must** | Headcount is the #1 job-to-be-done |
| Potluck signup with category + dietary tags | **Must** | The differentiator vs. plain RSVP tools |
| Auto headcount + serving calculator | **Must** | Removes the manual math the host hates |
| Run-of-show schedule | **Must** | Single shared agenda eliminates "what's next?" texts |
| Co-organizer edit permissions | **Must** | User explicitly required this in scoping |
| Read-only guest-facing summary page | **Must** | Guests are tertiary users but a critical UX surface |
| **Optional** budget tracker (per-event toggle) | **Should** | User-flagged as opt-in; valuable but not universal |
| Day-before reminder email (1 day) | **Should** | High UX lift, low build cost via Apps Script |
| Activity poll via Form | **Should** | Solves "what should we do?" pre-event |
| Venue checklist | **Should** | Useful, but power-user-skewed |
| Dietary restriction auto roll-up | **Should** | Falls out of the schema almost for free |
| Auto-sync Form → Notion (Zapier) | **Should** | Removes the only manual step in MVP |
| Past-events library with photos | **Could** | Adds longitudinal value; schema supports it already |
| Persistent guest profile memory | **Could** | Free once schema exists; surface in V3 |
| Weather forecast for outdoor events | **Could** | Nice to have; low marginal user benefit |
| QR check-in | **Could** | Cool demo, niche use case |
| "Pair guests" suggestion | **Could** | Speculative; needs guest interest tags first |
| Payment splitting | **Won't** | Venmo/Splitwise own this category |
| Native mobile app | **Won't** | Notion mobile is sufficient |
| Ticketing / paid events | **Won't** | Eventbrite/Partiful own this category |
| Public discoverable events | **Won't** | Privacy-by-default is core to the value prop |
| Calendar integration beyond `.ics` export | **Won't** | Power users can self-import |

---

## Why MoSCoW (and not RICE)

- **MoSCoW** is right when scope is being negotiated against fixed time (portfolio-stage project, no real users yet to score Reach)
- **RICE** becomes more useful in V2+ when we have pilot data (actual Reach numbers from event pilots, Confidence from real-world feedback)

A RICE matrix will be added after the first pilot when there's data to populate the columns honestly.
