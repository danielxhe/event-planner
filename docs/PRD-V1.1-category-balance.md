# PRD V1.1: Category Balance

**Product:** Spread, a Partiful companion for potluck coordination
**Status:** Shipped 2026-05-27
**Last updated:** 2026-06-01 (Spread rename; superseded sections signposted; see §10)
**Author:** Daniel He
**Reviewers:** —
**Release:** V1.1 (post-V2.0 baseline)
**Target real event:** Surprise Birthday Party, 2026-06-06

Spread is a companion app that closes the potluck-coordination gap in Partiful. Guests RSVP in Partiful as usual; everything dish-related happens in Spread. V1.0 shipped a flat list of items grouped by category. V1.1, documented here, ties dish counts to live RSVP headcount so hosts stop having to text guests "we need more mains."

---

## 1. Problem

Hosts using the Spread guest site have no way to steer the potluck toward a balanced selection. Two failure modes have already shown up in user conversations and in the dogfood event:

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

Each event has a target serving count per category, resolved in this order:

1. **Explicit host target.** A host can set a fixed per-category target (originally five Number fields on the Events DB: `Target Servings Appetizer`, `_Main`, `_Side`, `_Dessert`, `_Drinks`). When set, it wins outright, for an unusual event that should not scale with headcount.
2. **Headcount-scaled default.** Otherwise, compute `estimated headcount × per-guest ratio`. Estimated headcount is derived live from RSVPs: confirmed Yes plus their plus-ones, plus half-weight for Maybes, i.e. `(Yes + plus-ones) + 0.5 × (Maybe + their plus-ones)`. Below 2 responses that estimate is not yet meaningful, so it falls back to the host's `Target Headcount`, and below that to no target. Per-guest ratios:

| Category | Ratio | Source |
|---|---|---|
| Appetizers | 2.5 servings/guest | Standard catering rule, scaled down from 4.0 cocktail-party assumption for sit-down format |
| Mains | 1.0 servings/guest | One portion per person |
| Sides | 1.0 servings/guest | Pairs 1:1 with mains |
| Desserts | 0.75 servings/guest | Roughly 3 of 4 guests take dessert |
| Drinks | 2.0 servings/guest | Two drinks per person, average |

If neither a target nor a usable headcount exists, the category renders as "—" with no dots. This keeps the UI honest: we don't fake "covered" status when we have nothing to compare against.

Supplies is intentionally excluded from the ratio system. It has no per-guest scaling logic and lives in a separate section below the dot list.

### 4.2 Guest-side UI

Old: 6 category sections, items as cards, claim button per item.

New: collapsible row per category, sorted by gap size descending, with:
- Category label (plural)
- 5-dot progress indicator (filled emerald, empty slate)
- Status text: `needs N` (amber), `covered` (emerald), or `—` (slate)
- Tap to expand, see items and claim, or add a new dish

Underclaimed categories float to the top automatically. A header line above the list names the top 2 most-needed: "Hosts could use more: Desserts, Appetizers." No hard blocking on covered categories. Guests can still pile onto a covered category if they want.

### 4.3 Servings input on add-dish

When a guest taps "Add a [main]" inside an expanded category, the form has:
- Dish name (free text)
- Servings field, pre-filled with a category-typical default (Appetizer 8, Main 6, Side 6, Dessert 8, Drinks 12)
- Quick-tap chips (e.g., for Mains: 4 / 6 / 8 / 12) and a manual entry input
- Live impact line: "Fills 8 of the 12 dessert servings still needed."

The default and chips absorb 90% of the friction. The manual input is there for precision.

### 4.4 Surprise-event semantics

> **Note:** This section describes the V1.1-shipped behavior. The surprise rule was simplified after V1.1. See §10 entry 2 for the current behavior.

Existing V2.0 rule: guest list section is hidden when `Is Surprise = true`. V1.1 extends this: claimer names on potluck items are replaced with a generic "✅ Claimed" pill. Otherwise the potluck section discloses who is attending through the back door.

## 5. Decisions log

Things considered and deliberately deferred or rejected:

| Decision | Choice | Rationale |
|---|---|---|
| Should hosts edit targets in the app UI? | No, edit in Notion for V1.1 *(superseded — see §10 entry 1)* | Notion is already the source of truth; building a host-side editor is V1.2 scope |
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
- Partiful API integration. V1.1 positions Spread as a Partiful companion through editorial framing only; guests still bounce between Partiful for RSVP and Spread for potluck.

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

- V2 spec: [`v2/SPEC.md`](https://github.com/danielxhe/event-planner/blob/main/v2/SPEC.md)
- IDs reference: [`v2/IDS.md`](https://github.com/danielxhe/event-planner/blob/main/v2/IDS.md)
- Feature commit: [`9f46957`](https://github.com/danielxhe/event-planner/commit/9f46957) ("Add category-balance feature: dot UI, target servings, guest-add")
- Categories lib: [`src/lib/categories.ts`](https://github.com/danielxhe/event-planner/blob/main/v2/web/src/lib/categories.ts)
- Guest UI: [`src/components/PotluckList.tsx`](https://github.com/danielxhe/event-planner/blob/main/v2/web/src/components/PotluckList.tsx)
- API route: [`src/app/api/potluck/add/route.ts`](https://github.com/danielxhe/event-planner/blob/main/v2/web/src/app/api/potluck/add/route.ts)

---

## 10. Changes since V1.1 shipped

Logged here so this PRD stays accurate as the product moved on, without rewriting the V1.1 record above.

- **Host-side category editing (supersedes the §5 decision).** §5 deferred an in-app target/category editor to V1.2. It has since been built: hosts now edit categories and targets directly in the dashboard, instead of only in Notion.
- **Surprise semantics simplified (supersedes §4.4).** §4.4 hid the guest list and masked claimer names when `Is Surprise = true`. That conflated two concerns. Surprise now does one thing: it shows guests a "keep it a secret" reminder. That reminder is what actually keeps the surprise from leaking. The guest list is always visible, and claimer-name privacy moved to its own independent `Hide Claimer Names` toggle.
- **Spread rename (2026-06-01).** The product was previously referred to internally as the Partiful Potluck Extension. It is now Spread. References in this PRD have been updated; the historical reasoning and decisions log are unchanged.
