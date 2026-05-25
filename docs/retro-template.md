# Post-Event Retrospective — Template

**How to use:** After each real event, duplicate this page in Notion (or copy-paste into a new page under the Event's row in the Events DB). Fill in every field. Aim to complete within **7 days of the event** — that's the threshold from [`metrics.md`](./metrics.md) (Retro completion rate target = 100%).

Each numeric field references back to a target in `metrics.md` so the retro doubles as a per-event scorecard. Leave a field blank only if it genuinely doesn't apply — don't skip just because the answer is uncomfortable. The whole point is the negative space.

---

## 1. Event metadata

| Field | Value |
|---|---|
| Event name | |
| Date | |
| Venue | |
| Event type | (dinner / birthday / BBQ / game night / other) |
| Guests invited | |
| Guests confirmed (RSVP = Yes) | |
| Guests attended (actual headcount) | |
| Co-organizers | |
| Budget enabled? | Yes / No |

---

## 2. Quantitative results

Pull numbers from Notion (RSVP counts, potluck coverage rollup) and self-report the rest. Each row cross-references the target in [`metrics.md`](./metrics.md).

| Metric | Target (per `metrics.md`) | This event | Pass / Miss | Why |
|---|---|---|---|---|
| Planning hours (invite-send → guests arrive) | < 2 hrs (10–20 guests) / < 3 hrs (20–50) | | | |
| Event setup time (template duplicate → Form sent) | < 30 min | | | |
| RSVP response rate (responded / invited) | > 85% | | | |
| Potluck coverage (claimed slots / total slots) | > 90% | | | |
| Dietary surprises (allergens discovered on the day) | 0 | | | |
| Texts/DMs bypassing the Form | < 30% of RSVPs | | | |
| Co-organizer edits in Notion | ≥ 1 | | | |

**Calculation cheats:**
- Planning hours: best to log as you go (running tally in phone notes). Reconstructing after the fact under-counts by ~30%.
- RSVP response rate: `(Yes + No + Maybe) / Invited`. "No response" counts as a miss.
- Potluck coverage: visible directly on the Event page (`Potluck Coverage` rollup).
- Texts bypassing Form: count from your message threads — anyone who texted "I'm in" instead of using the link.

---

## 3. Qualitative — What worked

3–5 bullets. Be specific (a name, a moment, a number).

-
-
-

## 4. Qualitative — What broke

3–5 bullets. Same specificity rule. Don't soften — this is where the next event gets better.

-
-
-

## 5. Surprises (good or bad)

Things you didn't predict. Often the most valuable section because surprises drive roadmap changes.

-
-

## 6. What I'd change in V2 (or for next event)

Concrete change → which doc to update. Examples:
- "Reminder should go at 8am not 9am — people checked email before work" → `scripts/reminder.gs` trigger time
- "Need a `Bringing-utensils?` field on the Form" → `docs/google-form-template.md` §4
- "Potluck dropdown went stale — auto-sync moved up from V3 to V2" → `docs/roadmap.md`

| Change | Where to update |
|---|---|
| | |
| | |
| | |

---

## 7. Feedback collected from guests / co-organizers

Verbatim quotes when you can — interpret in the next section, not here.

| Source | Channel (text / day-of comment / post-event thanks reply) | Quote |
|---|---|---|
| | | |
| | | |

**Interpretation:** what pattern do these quotes point at?

---

## 8. Decisions made for next event

Lock these in **now** so they don't drift. One sentence each.

- [ ]
- [ ]
- [ ]

---

## 9. Guests DB tag updates

Things you learned about specific guests that should persist into their `Guests.Notes` field — this is what makes the persistent Guests DB pay off over time (V3 thesis in `roadmap.md`).

| Guest | Notion `Notes` to add | Update `Dietary Restrictions`? |
|---|---|---|
| | e.g. "Always brings amazing dessert — slot them in that category first." | No |
| | e.g. "Vegetarian — was missed on the invite. Update Dietary." | Add `Vegetarian` |
| | e.g. "Reliable — third Yes-and-shows in a row." | No |
| | e.g. "Two consecutive no-shows after confirming. Flag." | No |

Also update on the Guest's record:
- [ ] `Reliability` formula will recompute automatically once you mark this event's RSVPs in Notion. Verify it's reasonable.
- [ ] `Events Attended` relation: confirm everyone who showed up is linked from the Event row.

---

## 10. Roadmap impact

Anything from this retro that should move on the [`roadmap.md`](./roadmap.md)?

- Promote from V3 → V2? →
- Add to backlog? →
- Cut from scope (it didn't matter)? →

---

## 11. Portfolio snippet (for danielxhe)

One paragraph (3–5 sentences) you could paste into a portfolio writeup. Frame it as: *what hypothesis you tested, what the data said, what you'd ship differently next time.* This is the "Retro published" milestone from `roadmap.md` — both the artifact and the proof you closed the loop.

>
>
>
