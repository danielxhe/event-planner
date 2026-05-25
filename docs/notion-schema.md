# Notion Database Schema

The app is built from **5 linked Notion databases** plus a top-level workspace page. Each database is a Notion table; properties below map directly to columns. Relations are the magic — they auto-link records across databases.

## Workspace structure

```
Event Planner (workspace page)
├── 📋 Events DB              (master table — one row per event)
├── 👥 Guests DB              (one row per unique person, persists across events)
├── 🍽️  Potluck Items DB     (one row per slot per event)
├── 🕐 Schedule DB            (one row per agenda item per event)
└── 💰 Budget Items DB        (optional — only created for events with budget enabled)
```

---

## 1. Events DB (master)

| Property | Type | Notes |
|---|---|---|
| Event Name | Title | "Sarah's Birthday Dinner" |
| Status | Select | `Planning` / `Upcoming` / `Past` / `Cancelled` |
| Date & Time | Date (with time, end date) | Start + end timestamps |
| Venue Name | Text | "My apartment" / "Riverside Park Pavilion 3" |
| Venue Address | Text | Google Maps auto-link when pasted |
| Venue Map | URL | Manual paste of Google Maps link |
| Description | Text | Free-form blurb for guests |
| Dress Code | Select | `Casual` / `Smart Casual` / `Themed` / `Formal` |
| Host | Person | The Notion user organizing |
| Co-Organizers | Person (multi) | Other Notion users with edit rights |
| Guests | Relation → Guests DB | Multi — who's invited |
| Potluck Items | Relation → Potluck DB | Auto-populated when items added |
| Schedule | Relation → Schedule DB | Auto-populated when agenda items added |
| Budget Enabled | Checkbox | Triggers visibility of Budget rollups |
| Budget Items | Relation → Budget DB | Only used if checkbox above is true |
| Confirmed Count | Rollup | Count of related Guests where RSVP = Yes |
| Maybe Count | Rollup | Count where RSVP = Maybe |
| Estimated Headcount | Formula | `Confirmed + (Maybe × 0.5)` |
| Potluck Coverage | Rollup | % of potluck slots claimed |
| Total Budget Actual | Rollup | Sum of Budget Items.Actual (if enabled) |
| Cover Photo | Files | One image for the event card |
| Retro Notes | Text | Filled in post-event ("what worked, what didn't") |
| Created | Created time | Auto |

**Views to create:**
- `Upcoming` — filter Status = Upcoming, sort by Date asc, gallery view with Cover Photo
- `Planning` — filter Status = Planning, table view
- `Library` — filter Status = Past, sort by Date desc, gallery view (the "past events library")
- `Calendar` — calendar view by Date

---

## 2. Guests DB (persistent across events)

| Property | Type | Notes |
|---|---|---|
| Name | Title | Full name |
| Email | Email | For RSVP form pre-fill + reminders |
| Phone | Phone | Optional |
| Dietary Restrictions | Multi-select | `Vegetarian` / `Vegan` / `Gluten-Free` / `Nut Allergy` / `Dairy-Free` / `Halal` / `Kosher` / `Other` |
| Dietary Notes | Text | Free-form for "Other" details |
| Plus-Ones Allowed | Number | Default 0 |
| Events Attended | Relation → Events DB | Multi |
| Last Event | Rollup | Most recent event date — shows who you haven't seen in a while |
| Total Events | Rollup | Count of Events Attended |
| Reliability | Formula | `(Yes RSVPs / Total Invites) × 100` — soft "do they show up?" score |
| Notes | Text | "Always brings amazing dessert", "Brings dog" |

**Why persistent:** Guest profile memory is a V3 feature, but having the DB ready means you get it for free once you've planned 2-3 events.

---

## 3. Potluck Items DB

| Property | Type | Notes |
|---|---|---|
| Item Name | Title | "Garlic bread" or blank if unclaimed |
| Event | Relation → Events DB | Which event this slot is for |
| Category | Select | `Appetizer` / `Main` / `Side` / `Dessert` / `Drinks` / `Supplies` |
| Claimed By | Relation → Guests DB | Empty = slot open |
| Status | Formula | `if(empty(Claimed By), "🟡 Open", "✅ Claimed")` |
| Serves | Number | "Serves how many" — helps host see coverage |
| Dietary Tags | Multi-select | Same options as Guests.Dietary Restrictions |
| Notes | Text | "Bring serving spoon", "Needs fridge space" |

**How it works:** Host creates ~N empty slots per category. Guests claim via Google Form → Apps Script writes to the Sheet → you copy claimed rows into Notion (or use a Notion form in 2024+ for native intake).

**Views:**
- `By Category` — board view grouped by Category
- `Open Slots` — filter Status = Open
- `My Event` — filter by current event (link from Event page)

---

## 4. Schedule DB

| Property | Type | Notes |
|---|---|---|
| Activity | Title | "Arrival & drinks" / "Dinner served" / "Games" |
| Event | Relation → Events DB | |
| Start Time | Date (with time) | |
| Duration (min) | Number | |
| End Time | Formula | `dateAdd(Start Time, Duration, "minutes")` |
| Owner | Person | Who's running this segment (host or co-organizer) |
| Notes | Text | Setup requirements, equipment needed |
| Status | Select | `Planned` / `In Progress` / `Done` — useful on event day |

**Views:**
- `Timeline` — timeline view by Start Time (Notion's Gantt-style view)
- `Day-of` — table sorted by Start Time, for the host to follow on event day

---

## 5. Budget Items DB (OPTIONAL — opt-in per event)

Only relevant if `Events.Budget Enabled = true`.

| Property | Type | Notes |
|---|---|---|
| Item | Title | "Cake from Bakery X" |
| Event | Relation → Events DB | |
| Category | Select | `Food` / `Drinks` / `Venue` / `Decorations` / `Supplies` / `Entertainment` / `Other` |
| Estimated | Number ($) | Pre-event guess |
| Actual | Number ($) | Post-purchase actual |
| Variance | Formula | `Actual - Estimated` |
| Paid By | Person | Who fronted the cost |
| Reimbursed | Checkbox | Track if settled |
| Receipt | Files | Photo/PDF |

**Rollups on Events DB:** sum of Estimated, sum of Actual, % over/under budget.

---

## Guest-facing Google Form (intake layer)

One Form per event, linked from the Event page in Notion. Fields:

| Field | Type | Maps to |
|---|---|---|
| Your name | Short answer | Guests.Name (match or create) |
| Email | Email | Guests.Email |
| Are you coming? | Multiple choice (Yes/No/Maybe) | Sets RSVP status on Event-Guest relation |
| Bringing a +1? | Yes/No → conditional name field | |
| Dietary restrictions | Checkboxes | Guests.Dietary Restrictions |
| What will you bring? | Dropdown of open potluck slots | Claims a Potluck Items row |
| Custom item name | Short answer (if "Other" selected) | Potluck.Item Name |

Form responses land in a Google Sheet. Host copies new rows into Notion daily (MVP) or sets up Zapier/Make.com to sync automatically (V2).

---

## Setup order (for building in Notion)

1. Create workspace page "Event Planner"
2. Create **Guests DB** first (other DBs reference it)
3. Create **Events DB** with relation to Guests
4. Create **Potluck DB** with relations to Events + Guests
5. Create **Schedule DB** with relation to Events
6. Create **Budget DB** with relation to Events
7. Go back to Events DB and add all the rollup formulas
8. Create the views listed under each DB
9. On each Event page, add linked views of Potluck/Schedule/Budget filtered to that event

**Time estimate:** 2-3 focused hours to build, another 1-2 to polish views.
