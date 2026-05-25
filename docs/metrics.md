# Success Metrics & KPIs

## North Star

**Hours the host spends on logistics per event** — from sending the first invite to the moment guests arrive.

This is the metric that ties directly to the core problem (cognitive load on the host). Everything else is a contributing factor or guardrail.

| Phase | Baseline (chat + spreadsheet) | Target (this app) |
|---|---|---|
| Per event, 10–20 guests | ~5 hours | < 2 hours |
| Per event, 20–50 guests | ~8 hours | < 3 hours |

Measured by host self-report in the retro template.

---

## Activation metrics (single-event)

| Metric | Definition | Target |
|---|---|---|
| Event setup time | Minutes from template duplication → Form sent to first guest | < 30 min |
| RSVP response rate | % of invited guests who set Yes/No/Maybe before event date | > 85% |
| Potluck coverage | % of host-defined slots claimed before event date | > 90% |
| Dietary surprises | # of allergens/restrictions discovered at the event itself | 0 |

---

## Retention / longitudinal metrics (across events)

These prove the app gets *more valuable* the more you use it — the V3 thesis.

| Metric | Definition | Target after 3 events |
|---|---|---|
| Repeat-host rate | Does the host plan their next event with the app? | 100% (self) |
| Guest re-invite latency | Median days between guest's 1st and 2nd invite | < 90 days (proves the Guests DB is being used) |
| Retro completion rate | % of past events with ≥1 retro note within 7 days | 100% |
| Library views | # of times host opens a past-event page before planning a new one | > 1 per new event (proves library value) |

---

## Guardrail / negative metrics

Things we **don't** want to optimize but must monitor — they catch regressions where a nice metric hides a bad UX.

| Metric | Watch for | Action threshold |
|---|---|---|
| Texts to host bypassing the Form | Guests still using SMS for RSVP | If > 30% of RSVPs come via text, invite copy needs rework |
| Co-organizer drop-off | Co-organizers added but never edit | If 0 edits across 2 events, the permission model isn't being used; investigate |
| Notion page load slowness | Event page takes > 3 sec to load | Schema bloat — split databases or archive Past events |

---

## How metrics get collected (MVP — no analytics tooling)

- **Self-report in retro template:** planning hours, dietary surprises, qualitative notes
- **Counted from Notion data:** RSVP rate, potluck coverage, retro completion
- **Counted from Google Form responses:** response rate, response latency
- **Manual count from invite copy comparisons:** texts bypassing Form (host notes this in retro)

Lightweight is correct for the portfolio stage. Adding analytics (Plausible, PostHog) is V3 territory and would be over-instrumentation for a 1-host pilot.
