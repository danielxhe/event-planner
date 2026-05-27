# PRD V1.1: Potluck Category Balance

**Status:** Shipped 2026-05-27
**Author:** Daniel He
**Reviewers:** —
**Release:** V1.1 (post-V2.0 baseline)
**Target real event:** Surprise Birthday Party, 2026-06-06

---

## 1. Problem

Hosts using the V2 guest site have no way to steer the potluck toward a balanced selection. Two failure modes have already shown up in user conversations and in the dogfood event:

- **Lopsided menus.** Eight guests claim "I'll bring something" and five of them bring desserts. The host realizes the night before that nobody is bringing a main, and panics.
- **Wrong magnitudes.** A guest claims "a bag of chips" for 30 people. The dish exists in the system, the host sees a green checkmark, but the actual serving count falls short by 25.

V2.0 had a flat list of items grouped by category, with a single "Serves" number that hosts had to set manually and that guests never saw. Nothing in the UI tied dish count to attendees, and nothing nudged guests toward underclaimed categories.

## 2. Users

| User | Job to be done | Today |
|---|---|---|
| Host | "Make sure we have enough of each thing without micromanaging guests." | Cross-checks Notion manually, texts specific friends |
| Guest | "Help out without bringing something redundant." | Skims the list, picks whatever sounds easy |

## 3. Success metrics

| Metric | Target | Why |
|---|---|---|
| Claim coverage % at T-24hr | ≥80% of target servings across all 5 categories | Catches the "lopsided menu" failure before the host has to text |
| Post-event host survey ("did you have the right amount of food?") | "Yes" or "Mostly" | Validates that ratios are calibrated correctly |
| Guests using "Add a dish" vs. claiming an existing item | ≥30% of claims are new-dish-add | If everyone only claims pre-seeded items, the host is still doing the work |

Caveat: V1.1 ships against one real event (n=1). Metrics get baselined post-2026-06-06 and the ratios get re-tuned for V1.2.

## 4. Solution

### 4.1 Target servings per category

Each event has a target serving count per category. Two sources, in order:

1. **Host override.** Five new Number fields on the Events Notion DB: `Target Servings Appetizer`, `_Main`, `_Side`, `_Dessert`, `_Drinks`. Host sets these directly in Notion if they want non-default ratios for an unusual event.
2. **Headcount-derived default.** If the host override is unset, compute `Target Headcount × ratio` where ratios are:

| Category | Ratio | Source |
|---|---|---|
| Appetizers | 2.5 servings/guest | Standard catering rule, scaled down from 4.0 cocktail-party assumption for sit-down format |
| Mains | 1.0 servings/guest | One portion per person |
| Sides | 1.0 servings/guest | Pairs 1:1 with mains |
| Desserts | 0.75 servings/guest | Roughly 3 of 4 guests take dessert |
| Drinks | 2.0 servings/guest | Two drinks per person, average |

If both sources are null, the category renders as "—" with no dots. This keeps the UI honest — we don't fake "covered" status when we have no data to compare against.

Supplies is intentionally excluded from the ratio system. It has no per-guest scaling logic and lives in a separate section below the dot list.

### 4.2 Guest-side UI

Old: 6 category sections, items as cards, claim button per item.

New: collapsible row per category, sorted by gap size descending, with:
- Category label (plural)
- 5-dot progress indicator (filled emerald, empty slate)
- Status text: `needs N` (amber), `covered` (emerald), or `—` (slate)
- Tap to expand, see items and claim, or add a new dish

Underclaimed categories float to the top automatically. A header line above the list names the top 2 most-needed: "Hosts could use more: Desserts, Appetizers." No hard blocking on covered categories — guests can still pile onto a covered category if they want.

### 4.3 Servings input on add-dish

When a guest taps "Add a [main]" inside an expanded category, the form has:
- Dish name (free text)
- Servings field, pre-filled with a category-typical default (Appetizer 8, Main 6, Side 6, Dessert 8, Drinks 12)
- Quick-tap chips (e.g., for Mains: 4 / 6 / 8 / 12) and a manual entry input
- Live impact line: "Fills 8 of the 12 dessert servings still needed."

The default and chips absorb 90% of the friction. The manual input is there for precision.

### 4.4 Surprise-event semantics

Existing V2.0 rule: guest list section is hidden when `Is Surprise = true`. V1.1 extends this: claimer names on potluck items are replaced with a generic "✅ Claimed" pill. Otherwise the potluck section discloses who is attending through the back door.

## 5. Decisions log

Things considered and deliberately deferred or rejected:

| Decision | Choice | Rationale |
|---|---|---|
| Should hosts edit targets in the app UI? | No, edit in Notion for V1.1 | Notion is already the source of truth; building a host-side editor is V1.2 scope |
| Hard block on covered categories? | No, soft warning only | Hosts said they want extras if guests are motivated; over-prep is recoverable, under-prep is not |
| Dietary-weighted category targets (e.g., vegetarian mains separately)? | Defer to V1.2 | n=1 dogfood event doesn't have enough dietary diversity to validate this |
| Auto-recompute targets when RSVP count changes? | No, `Target Headcount` is the host-managed proxy | Avoids surprise target drift between when a host plans and when guests arrive |
| Use `serves: null` items as 0 in math? | No, fall back to `DEFAULTS_PER_DISH[category]` | A host-added item without a Serves value is more likely "I forgot to set this" than "this serves nobody" |
| Suggestions Log integration | Not in V1.1 | Smart Potluck is a separate workstream (V2.1 with Claude API) |

## 6. Out of scope

- Photo-proof "I brought this" confirmations
- T-48hr reminder automation for unclaimed dishes
- Host-side analytics dashboard beyond what already exists
- Dietary-weighted ratios
- Multi-event ratio learning (V1.2 after we have ≥3 events of post-event data)
- Partiful API integration (this V1.1 is a Partiful extension in positioning, not in code — guests still bounce between Partiful for RSVP and this app for potluck)

## 7. Risks

| Risk | Mitigation |
|---|---|
| Default ratios are wrong for this host's style | Host override on Events DB exists; can be tuned per-event |
| Guest enters wildly off servings count | Quick-chip presets pull guesses toward sane values; manual input still available for power users |
| Live impact line creates anxiety ("you only filled 1 of 12, keep going") | Worded as helpful coverage info, not pressure; "extras welcome" message on covered categories |
| 5-dot resolution is too coarse for small events | Acceptable; dots are a glance metric not a precise gauge. Status text shows exact `needs N` |

## 8. Post-launch validation plan

1. Day after the 2026-06-06 event, send the host a 3-question survey: did you have enough food / which categories were over- or under-prepped / did the live impact line change what you brought (host opinion on guest behavior).
2. Manually log post-party actual servings consumed per category in the Suggestions Log (using the V2.1 schema).
3. If 2+ categories were off by >25%, re-tune ratios before V1.2 ships.

## 9. References

- V2 spec: `D:\event-planner-app\v2\SPEC.md`
- IDs reference: `D:\event-planner-app\v2\IDS.md`
- Feature commit: `9f46957` ("Add category-balance feature: dot UI, target servings, guest-add")
- Categories lib: `src/lib/categories.ts`
- Guest UI: `src/components/PotluckList.tsx`
- API route: `src/app/api/potluck/add/route.ts`
