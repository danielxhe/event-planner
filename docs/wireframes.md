# Wireframes

**Owner:** danielxhe
**Last updated:** 2026-05-25
**Status:** Low-fidelity, ASCII — pre-build reference for the Notion + Forms MVP

---

## Why ASCII wireframes (for a PM portfolio)

High-fidelity Figma mockups are wasted effort for a Notion-templated product: the visual design is already fixed by Notion's UI, so what actually needs to be communicated is **layout, hierarchy, and which database properties surface where**. ASCII wireframes are a legitimate PM artifact for that job — they're cheap to produce, cheap to revise, version-controllable in the same repo as the PRD and schema, and they force the designer to think in terms of information architecture rather than color and type. Recruiters reading this repo can trace a single property (e.g. `Events.Estimated Headcount`) from the [PRD](PRD.md) → [schema](notion-schema.md) → the exact pixel on the screen where it appears. That traceability is the point.

Each wireframe below is annotated with (a) which Notion DB or property feeds it and (b) the design rationale in 1–3 lines.

---

## 1. Host: Event home page (Notion)

The main planning surface for a single event. Everything the host needs in one scroll.

```
+======================================================================+
|  < Back to Upcoming        Event Planner / Sarah's Birthday Dinner   |
+======================================================================+
|                                                                      |
|   [ COVER PHOTO — 1500x400, optional ]                               |
|                                                                      |
|   Sarah's Birthday Dinner                          [ * Upcoming ]    |
|   ----------------------------------------------------------------   |
|   Sat Jun 14, 2026 - 7:00 PM to 11:00 PM                             |
|   My apartment - 123 Mulberry St, Apt 4B  [ Map ]                    |
|   Dress: Smart Casual                                                |
|                                                                      |
|   "Low-key dinner for Sarah's 30th. Bring something to share."       |
|                                                                      |
+----------------------------------------------------------------------+
|  HEADCOUNT                                                           |
|  +--------------------------------------------------------------+    |
|  |  Confirmed: 14    Maybe: 6    No: 2    Pending: 3            |    |
|  |  Estimated: 17    [######################......]  17 / 25    |    |
|  +--------------------------------------------------------------+    |
|                                                                      |
|  DIETARY ROLL-UP (of 14 confirmed)                                   |
|  +--------------------------------------------------------------+    |
|  |  Vegetarian: 3   Vegan: 1   Gluten-Free: 2   Nut Allergy: 1  |    |
|  +--------------------------------------------------------------+    |
|                                                                      |
+----------------------------------------------------------------------+
|  GUESTS                                              [ + Add Guest ] |
|  +--------------------------------------------------------------+    |
|  | Name           RSVP    +1   Diet         Bringing            |    |
|  | -------------- ------- ---- ------------ ------------------- |    |
|  | Sarah Chen     Yes     0    -            Garlic bread        |    |
|  | Alex Park      Yes     1    Vegetarian   Caesar salad        |    |
|  | Jordan Liu     Maybe   0    Vegan        -                   |    |
|  | ...                                                          |    |
|  +--------------------------------------------------------------+    |
|  [linked DB view of Guests DB, filtered Events = this event]         |
|                                                                      |
+----------------------------------------------------------------------+
|  POTLUCK                              [ By Category v ] [ + Slot ]   |
|  +-------------+-------------+-------------+-------------+--------+  |
|  | APPETIZER   | MAIN        | SIDE        | DESSERT     | DRINKS |  |
|  +-------------+-------------+-------------+-------------+--------+  |
|  | * Cheese    | * Lasagna   | * Caesar    | * Birthday  | * Wine |  |
|  |   board     |   - Alex    |   salad     |   cake      |   - me |  |
|  |   - me      |             |   - Alex    |   - bakery  |        |  |
|  |             | o OPEN      |             |             | o OPEN |  |
|  | * Bread     |             | * Roasted   | o OPEN      |        |  |
|  |   - Sarah   |             |   veg       |             |        |  |
|  |             |             |   - Jordan  |             |        |  |
|  +-------------+-------------+-------------+-------------+--------+  |
|  Coverage: 8 / 12 slots claimed (67%)                                |
|                                                                      |
+----------------------------------------------------------------------+
|  SCHEDULE                                       [ Timeline view v ]  |
|  +--------------------------------------------------------------+    |
|  | 7:00 PM  +---------+ Arrival & drinks         (Daniel)       |    |
|  | 7:30 PM           +---------+ Toasts          (Sarah)        |    |
|  | 8:00 PM                  +-----------------+ Dinner (Daniel) |    |
|  | 9:30 PM                                   +-----+ Cake       |    |
|  | 10:00 PM                                        +-------+ Games |  |
|  +--------------------------------------------------------------+    |
|                                                                      |
+----------------------------------------------------------------------+
|  > BUDGET (disabled — toggle on in event settings)                   |
|     [ Enable budget tracking for this event ]                        |
+----------------------------------------------------------------------+
|                                                                      |
|  [ Share guest summary page ]  [ Copy Form link ]  [ Export .ics ]   |
+======================================================================+
```

**Rationale & DB mapping:** Header pulls from `Events.Event Name / Status / Date & Time / Venue / Dress Code / Description`. Headcount bar = `Events.Estimated Headcount` formula (`Confirmed + Maybe × 0.5`) over the host-set ceiling. Dietary roll-up = aggregation across `Guests.Dietary Restrictions` filtered to RSVP=Yes. Potluck section uses the `By Category` board view of Potluck Items DB (a Notion linked view, filtered to this event). Schedule uses the `Timeline` view of Schedule DB. Budget is **collapsed by default** because the PRD scopes it as V2/opt-in (`Events.Budget Enabled` checkbox) — collapsing it keeps the cognitive surface clean for the 70%+ of events that won't use it.

---

## 2. Host: Library view (past events gallery)

Notion gallery view of Events DB, filtered to `Status = Past`, sorted by Date desc.

```
+======================================================================+
|  Event Planner / Library                                             |
|  Filter: Status = Past   Sort: Date desc       [ Gallery view v ]    |
+======================================================================+
|                                                                      |
|  +------------------+  +------------------+  +------------------+    |
|  | [   cover img  ] |  | [   cover img  ] |  | [   cover img  ] |    |
|  |                  |  |                  |  |                  |    |
|  | Friendsgiving    |  | Halloween Bash   |  | Game Night #4    |    |
|  | Nov 23, 2025     |  | Oct 31, 2025     |  | Oct 12, 2025     |    |
|  | 18 guests        |  | 24 guests        |  |  9 guests        |    |
|  |                  |  |                  |  |                  |    |
|  | "Turkey was dry  |  | "Costume contest |  | "Catan ran long; |    |
|  |  next time brine |  |  was a hit; next |  |  pre-pick games  |    |
|  |  48 hrs..."      |  |  year do prizes" |  |  next time"      |    |
|  +------------------+  +------------------+  +------------------+    |
|                                                                      |
|  +------------------+  +------------------+  +------------------+    |
|  | [   cover img  ] |  | [   cover img  ] |  | [   cover img  ] |    |
|  | BBQ Labor Day    |  | June Pool Party  |  | Mei Birthday     |    |
|  | Sep 1, 2025      |  | Jun 21, 2025     |  | May 3, 2025      |    |
|  | 32 guests        |  | 22 guests        |  | 15 guests        |    |
|  | "Ran out of ice  |  | "Sunscreen at    |  | "Cake too small  |    |
|  |  by 4pm — buy 3x"|  |  door — keep"    |  |  for 15 — 2x"    |    |
|  +------------------+  +------------------+  +------------------+    |
|                                                                      |
|                          [ Load more... ]                            |
+======================================================================+
```

**Rationale & DB mapping:** Each card pulls `Events.Cover Photo` (Files), `Event Name` (Title), `Date & Time`, `Confirmed Count` (rollup → "guests" number), and the first ~80 chars of `Retro Notes`. Library is roadmapped as V3 in the PRD but the schema already supports it "for free" because `Status=Past` is just a filter on the master Events DB — no new tables needed. Retro snippet on the card is the recall hook: a host scanning their library should remember each event in 2 seconds.

---

## 3. Host: Upcoming events dashboard (workspace home)

The first page the host lands on when they open the workspace.

```
+======================================================================+
|  Event Planner                                       danielxhe       |
+======================================================================+
|                                                                      |
|   Hi Daniel. You have 3 events coming up.                            |
|                                                                      |
|   +----------------------------------------------------------------+ |
|   |                  [ + Create new event ]                        | |
|   +----------------------------------------------------------------+ |
|                                                                      |
|   UPCOMING                                          [ See all > ]    |
|   +------------------+  +------------------+  +------------------+   |
|   | [ cover ]        |  | [ cover ]        |  | [ cover ]        |   |
|   | Sarah's B-day    |  | Game Night #5    |  | Summer BBQ       |   |
|   | Sat Jun 14       |  | Fri Jun 27       |  | Sat Jul 4        |   |
|   | 7:00 PM          |  | 8:00 PM          |  | 2:00 PM          |   |
|   | 17 / 25 confirm  |  |  6 / 10 confirm  |  | 12 / 40 confirm  |   |
|   | Potluck 67%      |  | Potluck 30%      |  | Potluck 10%      |   |
|   | [ Open >]        |  | [ Open >]        |  | [ Open >]        |   |
|   +------------------+  +------------------+  +------------------+   |
|                                                                      |
|   RECENT GUESTS (added in last 30 days)                              |
|   +--------------------------------------------------------------+   |
|   | Mei Tanaka       added Jun 2     1 event       Vegetarian    |   |
|   | Chris Okafor     added Jun 1     1 event       -             |   |
|   | Priya Sharma     added May 28    2 events      Vegan, GF     |   |
|   | Ben Walsh        added May 24    1 event       Nut Allergy   |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
|   ALERTS                                                             |
|   +--------------------------------------------------------------+   |
|   |  ! 3 new Vegan guests this month — check potluck coverage    |   |
|   |  ! Sarah's Birthday: 3 guests still haven't RSVP'd           |   |
|   |  ! Game Night #5: 7 potluck slots still open                 |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
|   +--------------------------------------------------------------+   |
|   |  [ Library (past events) ]    [ All guests ]    [ Settings ] |   |
|   +--------------------------------------------------------------+   |
+======================================================================+
```

**Rationale & DB mapping:** Top 3 cards = `Upcoming` view of Events DB, sorted by `Date & Time` asc, limit 3. Each card surfaces `Confirmed Count`, the host-set ceiling, and `Potluck Coverage` rollup — the two numbers that drive host action. Recent Guests pulls from Guests DB filtered by `Created > now() - 30d`. Alerts are computed surfaces, not a new DB: dietary alert = count of new Guests with non-empty `Dietary Restrictions` in last 30d; RSVP alert = guests with no response within N days of an upcoming event; potluck alert = events under 60% coverage within 14 days. The Create button is the dominant CTA above the fold because event creation is the activation event.

---

## 4. Guest: Read-only event summary page (Notion public share)

What guests see when the host shares the event link. Notion's `Share to web` with edit disabled. Critically: **no guest list, no budget**.

```
+======================================================================+
|  shared via Notion                                       danielxhe   |
+======================================================================+
|                                                                      |
|   [ COVER PHOTO ]                                                    |
|                                                                      |
|   Sarah's Birthday Dinner                                            |
|   ----------------------------------------------------------------   |
|   Sat Jun 14, 2026 - 7:00 PM to 11:00 PM                             |
|   My apartment - 123 Mulberry St, Apt 4B    [ Open in Maps ]         |
|   Dress: Smart Casual                                                |
|                                                                      |
|   "Low-key dinner for Sarah's 30th. Bring something to share."       |
|                                                                      |
+----------------------------------------------------------------------+
|   RSVP / SIGN UP FOR POTLUCK                                         |
|                                                                      |
|         +------------------------------------------+                 |
|         |   >>>  RSVP via this form  <<<           |                 |
|         |   forms.gle/abc123xyz                    |                 |
|         +------------------------------------------+                 |
|                                                                      |
+----------------------------------------------------------------------+
|   SCHEDULE                                                           |
|   +--------------------------------------------------------------+   |
|   |  7:00 PM   Arrival & drinks                                  |   |
|   |  7:30 PM   Toasts                                            |   |
|   |  8:00 PM   Dinner served                                     |   |
|   |  9:30 PM   Cake                                              |   |
|   | 10:00 PM   Games                                             |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+----------------------------------------------------------------------+
|   POTLUCK — WHAT PEOPLE ARE BRINGING                                 |
|   +--------------------------------------------------------------+   |
|   |  APPETIZER                                                   |   |
|   |    Cheese board       -  Daniel                              |   |
|   |    Bread              -  Sarah                               |   |
|   |                                                              |   |
|   |  MAIN                                                        |   |
|   |    Lasagna (veg)      -  Alex                                |   |
|   |    OPEN SLOT          -  >>> claim via form                  |   |
|   |                                                              |   |
|   |  SIDE                                                        |   |
|   |    Caesar salad       -  Alex                                |   |
|   |    Roasted veg        -  Jordan                              |   |
|   |                                                              |   |
|   |  DESSERT                                                     |   |
|   |    Birthday cake      -  (host - bakery)                     |   |
|   |    OPEN SLOT                                                 |   |
|   |                                                              |   |
|   |  DRINKS                                                      |   |
|   |    Wine               -  Daniel                              |   |
|   |    OPEN SLOT                                                 |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+----------------------------------------------------------------------+
|   YOUR CLAIM (if you've RSVP'd):                                     |
|   +--------------------------------------------------------------+   |
|   |  You're bringing: Caesar salad (Side)                        |   |
|   |  Change? Re-submit the form above with your same email.      |   |
|   +--------------------------------------------------------------+   |
|                                                                      |
+======================================================================+
```

**Rationale & DB mapping:** Built as a Notion sub-page with `Share to web` enabled, edit off. The page embeds the **same** Potluck linked view as the host page but with `Claimed By` shown as text only (no editing), and `Guests` linked view is **omitted entirely** — guest list is host-only per the PRD's privacy stance for private gatherings. Schedule shows `Activity` and `Start Time` only — `Owner` and `Notes` are operational and irrelevant to guests. The "Your claim" block is aspirational for V2 (requires identifying the viewer); for MVP it's just a static reminder line ("check the form receipt in your email"). Budget is never shown.

---

## 5. Guest: Google Form

Single-page form (multi-section enabled for the conditional `+1` name field).

```
+======================================================================+
|  Sarah's Birthday Dinner - RSVP                                      |
|  Sat Jun 14, 2026 - 7:00 PM - My apartment                           |
|                                                                      |
|  *Required                                                           |
+======================================================================+
|                                                                      |
|  Your name *                                                         |
|  +--------------------------------------------------------------+    |
|  | _________________________________________________________     |   |
|  +--------------------------------------------------------------+    |
|                                                                      |
|  Email *                                                             |
|  +--------------------------------------------------------------+    |
|  | _________________________________________________________     |   |
|  +--------------------------------------------------------------+    |
|                                                                      |
|  Are you coming? *                                                   |
|    ( ) Yes, I'll be there                                            |
|    ( ) Maybe                                                         |
|    ( ) No, sorry                                                     |
|                                                                      |
|  Bringing a +1?                                                      |
|    ( ) No                                                            |
|    ( ) Yes  -->  [conditional: opens "+1 name" field below]          |
|                                                                      |
|     +1's name                                                        |
|     +-----------------------------------------------------------+    |
|     | _________________________________________________________ |    |
|     +-----------------------------------------------------------+    |
|                                                                      |
|  Any dietary restrictions? (check all that apply)                    |
|    [ ] Vegetarian                                                    |
|    [ ] Vegan                                                         |
|    [ ] Gluten-Free                                                   |
|    [ ] Nut Allergy                                                   |
|    [ ] Dairy-Free                                                    |
|    [ ] Halal                                                         |
|    [ ] Kosher                                                        |
|    [ ] Other  -->  [conditional: "Tell us more" text field]          |
|                                                                      |
|  What will you bring? (pick one open slot)                           |
|  +--------------------------------------------------------------+    |
|  | [ Select an open potluck slot      v ]                       |    |
|  |                                                              |    |
|  |    Appetizer: Cheese board (OPEN)                            |    |
|  |    Main:       Lasagna (OPEN)                                |    |
|  |    Side:       Roasted vegetables (OPEN)                     |    |
|  |    Dessert:    Cookies (OPEN)                                |    |
|  |    Drinks:     Beer/seltzer (OPEN)                           |    |
|  |    Supplies:   Plates & napkins (OPEN)                       |    |
|  |    Other (write in below)                                    |    |
|  |    Nothing - I'll just show up                               |    |
|  +--------------------------------------------------------------+    |
|                                                                      |
|  If "Other", what are you bringing?                                  |
|  +--------------------------------------------------------------+    |
|  | _________________________________________________________     |   |
|  +--------------------------------------------------------------+    |
|                                                                      |
|                                                  [ Submit ]          |
+======================================================================+
```

**Rationale & DB mapping:** Field order mirrors the host's mental model (who → coming? → diet → bring) so the Sheet export columns align 1:1 with Notion DB writes. The potluck dropdown is the **only** part that requires manual host upkeep — host updates the dropdown options as slots get claimed, OR (V2) an Apps Script regenerates options nightly from open Potluck rows. "Nothing — I'll just show up" is an explicit option because forcing a claim is bad UX and skews potluck coverage stats. The dietary "Other" conditional captures edge cases (e.g. "low-FODMAP", "shellfish allergy") without bloating the multi-select.

---

## 6. Host: Day-of run-of-show view (phone)

A focused Notion page the host pulls up on their phone *during* the event. Narrow width, big tap targets, only what matters in the moment.

```
+================================+
|  < Back     Sarah's B-day      |
|             Sat Jun 14 - LIVE  |
+================================+
|                                |
|  HEADCOUNT                     |
|  +--------------------------+  |
|  |  Confirmed:  17          |  |
|  |  Arrived:    12  [ +1 ]  |  |
|  |              -------     |  |
|  |  Waiting on: 5           |  |
|  +--------------------------+  |
|                                |
|  DIETARY (active prep)         |
|  +--------------------------+  |
|  |  Vegetarian:  3          |  |
|  |    > Alex, Jordan, Mei   |  |
|  |  Vegan:       1          |  |
|  |    > Priya               |  |
|  |  Gluten-Free: 2          |  |
|  |    > Sarah, Ben          |  |
|  |  Nut Allergy: 1 *** !    |  |
|  |    > Ben (severe)        |  |
|  +--------------------------+  |
|                                |
|  RUN OF SHOW                   |
|  +--------------------------+  |
|  | 7:00  Arrival & drinks   |  |
|  |       [ Done v ]         |  |
|  +--------------------------+  |
|  | 7:30  Toasts (Sarah)     |  |
|  |       [ In Progress v ]  |  |
|  +--------------------------+  |
|  | 8:00  Dinner served      |  |
|  |       [ Planned v ]      |  |
|  +--------------------------+  |
|  | 9:30  Cake               |  |
|  |       [ Planned v ]      |  |
|  +--------------------------+  |
|  | 10:00 Games              |  |
|  |       [ Planned v ]      |  |
|  +--------------------------+  |
|                                |
|  [ Open potluck checklist ]    |
|                                |
+================================+
```

**Rationale & DB mapping:** This is the `Day-of` view of Schedule DB (table sorted by `Start Time`) with `Status` exposed as a quick-toggle select. Headcount Arrived counter is a host-local manual increment — kept off the schema because tracking arrivals server-side is overkill for 5–50 guests and adds friction (the host would have to find each guest by name). Dietary block expands `Guests.Name` per restriction tag so the host glances once and knows which plate goes where — the "Nut Allergy: severe" flag pulls from `Guests.Dietary Notes`. Page width is intentionally narrow (mobile-first) because every host opens this on their phone, one-handed, while juggling a tray.

---

## Open design questions

- **Q1:** Should the guest summary page (#4) show first names only, or hide claimer identity entirely? *Default: first name only — social accountability nudges follow-through.*
- **Q2:** Should the day-of view (#6) auto-advance schedule status by clock time, or stay manual? *Default: manual — clock-based advance fires false "Done" states when toasts run long.*
- **Q3:** Should "Arrived" counter on #6 write back to the Guests DB as an event attendance record? *Default: no for MVP; revisit when V3 persistent guest profiles ship.*
