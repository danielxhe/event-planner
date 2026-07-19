# Spread: A Partiful Companion for Potlucks
## Case Study, V1.1

**Author:** Daniel He
**Last updated:** 2026-07-18
**Status:** V1.1 shipped 2026-05-27. First real-event launch 2026-06-06. V3 (research-grounded rebuild + live AI suggester) built 2026-07-18 — see §9.

---

## TL;DR

Spread is a small companion app that closes the potluck-coordination gap in Partiful. Guests RSVP in Partiful as usual; everything dish-related happens in Spread. V1.1 introduced Category Balance, a feature that scales per-category serving targets to live RSVP headcount so hosts stop having to text guests "we need more mains." Built on Notion as the backend with a Next.js guest site, the first version shipped in 5 days for a real surprise birthday with 15 guests. The Phase 1 manual stub plus logging approach is designed to generate eval data before the Phase 2 Claude API ships, so the AI feature has ground truth to be measured against.

---

## 1. The gap

Partiful is good at RSVPs. Clean guest experience, easy to share, mobile-first. The product correctly stops where Eventbrite-style overengineering would start.

What it does not handle is potluck coordination. If a guest wants to bring something, the standard workflow is a group text thread or a separately shared Google Doc. Two failure modes show up consistently:

- **Lopsided menus.** Eight guests volunteer to bring something and five of them bring desserts. The host realizes the night before that nobody is bringing a main course and starts cold-texting friends.
- **Wrong magnitudes.** A guest claims "a bag of chips" for 30 people. The dish exists on the list, the host sees a green checkmark, and the actual serving count falls short by 25.

I hit both of these planning a real surprise birthday for 15 people. The host (me) was the bottleneck. The party still happened. The coordination tax could have been zero.

Spread exists to remove that tax. The hypothesis: if guests can see live category coverage and a host can set sensible defaults, the host stops being the central node and the potluck self-organizes.

## 2. Decisions before code

Three locked decisions shaped the whole build.

**Stack: Notion backend + Next.js guest site.** V1 was Notion-only. It hit a hard ceiling fast: Notion can't render linked views via API, public pages aren't mobile-grade, and the hero feature (AI dish suggestions) had nowhere to live. V2 split the stack so Notion stays the host's planning workspace and source of truth, while Next.js on Vercel becomes the guest experience. The host already knows Notion. Guests should never see it.

**Surprise events are first-class, not an afterthought.** The very first real event was a surprise birthday. Building surprise semantics into V2 from the beginning (UUID slugs, hidden guest list, "keep it a secret" guest banner, no public-sharing affordance) was cheaper than retrofitting. This decision affected the schema, the auth model, and the guest UI.

**Smart Potluck phases in.** The hero feature is an AI dish suggester, but the V2.0 release ships a manual stub instead of an LLM call. The host plays the AI: they enter their own suggestions through the dashboard, and every suggestion + every guest acceptance + every post-party "what actually got brought" is logged. After a few events the log becomes the eval set the Phase 2 Claude API gets measured against. This phased approach was deliberate. More on it below.

## 3. V1 in 5 days

V1 shipped from spec to deployed Next.js app in 5 days, in time for the 2026-06-01 invite-send deadline for a 2026-06-06 surprise birthday. The forcing function was a real event, not a marketing target.

What shipped:

- 5 Notion databases (Events, Guests, RSVPs, Potluck Items, Suggestions Log) with consistent property naming and rollups
- 13 typed API routes covering RSVP, claim, unclaim, host event management, potluck CRUD, and suggestion logging
- A guest event page (`/e/[slug]`) with hero, RSVP form, potluck grid, and dietary aggregate
- A host dashboard (`/host/[secret]/[slug]`) with roster, potluck management, and the Smart Potluck stub
- Phone-number deduplication so a returning guest is recognized across events without a login flow
- A documented day-of fallback plan in case Vercel, the Notion API, or my own code falls over during party week

What deliberately did not ship:

- T-48hr reminder automation (host can DM guests manually)
- Authentication beyond a secret URL slug (fine for a personal portfolio project; would not survive a multi-tenant production)
- Photo upload, calendar export, comments, custom domain

The cut list is documented in the SPEC. Every "no" was tied to a reason.

## 4. V1.1 Category Balance

V1 used a flat list of potluck items grouped by category, with a single Serves number the host set manually and guests never saw. Nothing tied dish count to attendees and nothing nudged guests toward underclaimed categories. The two failure modes from the gap analysis (lopsided menus, wrong magnitudes) were both still possible.

V1.1 fixed this. Three pieces:

**Target servings per category, derived from live RSVPs.** Estimated headcount is computed as `(Yes + plus-ones) + 0.5 × (Maybe + their plus-ones)`. Per-category ratios are baked into the code (2.5 appetizers per guest, 1.0 mains, 1.0 sides, 0.75 desserts, 2.0 drinks), sourced from standard catering guidance with one scaling adjustment for sit-down format. The host can override per-event by setting explicit numbers in Notion. If no host override and no usable RSVP count, the category renders blank rather than faking a number.

**Guest-side dot UI.** Each category collapses to a row with a 5-dot progress indicator and a status label ("needs 3", "covered", or "—"). Underclaimed categories float to the top automatically. A header line above the list names the top 2 most-needed categories. No hard blocks: a guest can still pile into a covered category if they want, because over-prep is recoverable and under-prep is not.

**Servings input on add-dish.** When a guest adds a new item, the form pre-fills a category-typical default (Appetizer 8, Main 6, etc.) and offers quick-tap chips. A live impact line previews the effect: "Fills 8 of the 12 dessert servings still needed." The defaults absorb 90% of the friction; manual input stays available for precision.

The full feature spec, success metrics, decisions log, and risks live in the PRD.

## 5. The phased AI roadmap

The hero feature is the Smart Potluck dish suggester. V2.0 ships a manual stub. V2.1 ships the real Claude API call. The phasing is deliberate and it's the part of this project I most want to talk about in interviews.

The default critique of an AI feature in 2026 is "it's just an LLM wrapper anyone could ship in an afternoon." The defense runs through the eval surface around the wrapper. Build it before the LLM call ships and the wrapper becomes a measurable product.

Phase 1 (V2.0, the version that runs the 6/6 launch) provides a "Generate suggestions" UI on the host dashboard. Clicking it opens a modal where the host enters their own suggested items: category, dish name, dietary tags, serves, rationale. The input snapshot (confirmed count, dietary aggregate, current claims by category, target headcount) is logged alongside the host's suggestions. After the party, the host fills in what guests actually brought and which suggestions hit. Over a few events the log becomes a real eval dataset: precision and recall on dietary conflicts, category-balance match rate, host accept rate.

Phase 2 (V2.1) swaps the modal for a server-side call to Claude with the exact same input and output contract and the exact same logging. Same eval surface. All Phase 1 data carries forward unchanged.

The interview answer goes: "I designed Phase 1 to gather an eval set with real dietary-conflict cases before any LLM call shipped. Phase 2 was scored against that rubric and I can show you specific cases where it failed and what I learned." That answer is different in kind from "I wrapped an API call in a button."

This is the structural decision I'm most proud of in the project. It moves the AI feature from a vibes demo to a measurable product, and it does so cheaply, by treating the manual version as data collection.

## 6. 6/6 launch

> **To be filled in after the 2026-06-06 event.**

The launch is the first real measurement. The metrics being captured:

- RSVP response rate and time-to-RSVP
- Potluck claim rate at party start (target: ≥80% of target servings across all 5 categories by T-24hr)
- Dietary conflicts caught vs missed (with manual post-event audit)
- Smart Potluck Phase 1 acceptance rate (% of host's own suggestions that guests claimed)
- Day-of friction points (qualitative log)
- App uptime during the invite window

Post-event, this section gets a real table and a "what worked, what did not" subsection. The PRD includes a documented post-launch validation plan, including a 3-question host survey and a manual log of actual servings consumed per category.

If 2 or more categories are off by more than 25%, the per-guest ratios get re-tuned before V1.2 ships.

## 7. What's next

**V1.2** (post-launch): re-tune ratios based on real consumption data; ship dietary-weighted category targets if the n=1 launch plus 1-2 more events justify it; add T-48hr reminder automation for unclaimed dishes.

**V2.1**: replace the Smart Potluck stub with the Claude API call. Build the eval scorer that reads Suggestions Log post-party fields and produces precision and recall numbers. Ship calendar `.ics` export and a public RSVP confirmation screen.

**V2.2 and beyond**: per-event comments, budget feature exposed in the app (the schema already supports it), custom domain.

The thing I'm watching for is whether category balance plus a phased AI roadmap is enough to make Spread feel like a product instead of a one-event experiment. The 6/6 launch is the first real signal.

## 8. Reflections on building under deadline

Three things would be different if I were doing this again from scratch.

**Phone normalization is harder than it looks.** E.164 normalization across V1 (Apps Script) and V2 (Node) had to be byte-for-byte identical to avoid duplicate guest records during migration. Reusing the V1 logic verbatim was the right call; rewriting "cleanly" in TypeScript would have introduced a drift bug that only surfaced during migration.

**The fallback plan was worth writing.** The SPEC includes a §8 day-of-party fallback plan (Vercel down → Notion event page plus group chat RSVPs; total app failure → paper signup sheet, the event still happens). I did not need it. Writing it forced me to think about which parts of the stack were truly load-bearing and which were nice-to-have. That clarity affected scope decisions during the build.

**Phase-1-as-eval-data is a generally good pattern.** The framing of "ship the manual version first so the AI version has ground truth to be measured against" applies broadly. Any product where an LLM call is the hero feature can benefit from a manual-first phase that produces ground truth. I'd reuse this pattern in any future AI-feature build.

## 9. V3: the research-grounded rebuild (2026-07-18)

V3 inverted the build process: due diligence first, code second. Two structured research passes preceded any change — a pain-point + competitor sweep (potluck coordination failures across hosting forums, review sites, and six competitor teardowns) and a UX evidence review (Nielsen heuristics, mobile-web conversion research, no-login identity patterns, AI-suggestion UX from Microsoft HAX and Google PAIR). Both were distilled into a 25-check scoring rubric, and V3 was built against it, then scored honestly (18 pass / 5 partial / 2 unverified). Full detail: `docs/PRD-V3.md`.

Three findings did the most work:

**The white space is real.** Partiful has no native potluck feature — real Partiful potlucks link out to Google Sheets — and every product that does have a dish board monetizes by degrading it (ads, coin paywalls, trial-to-annual billing). Nobody connects dietary data to the dish board or ties quantity math to live RSVPs. Spread's core design was accidentally sitting in an empty intersection; V3 leaned in deliberately.

**The AI feature had a documented failure mode to design against.** Peer-reviewed work on LLM meal planning found allergens slipping through with wrong safety labels (almond milk in a "nut-free" plan). So Phase 2 shipped as "LLM proposes, deterministic rules veto": the live Claude suggester reads a full context snapshot (live headcount, dietary aggregate, arithmetic serving gaps), returns schema-constrained suggestions, and a keyword guardrail strips any dietary tag contradicted by the dish's own name — logging the action. Suggestions render as keep/skip cards with visible rationale; nothing touches the spread until the host approves; every verdict is logged as eval data. The Phase 1 logs from the June party are now scoreable against Phase 2 by `scripts/eval-suggestions.mjs`.

**The RSVP form was hoarding the headcount.** The single long form violated the strongest finding in mobile conversion research: commit the core action first, enrich after. V3's form is one decision plus two fields; plus-ones and dietary needs appear only after the RSVP is recorded. Returning devices skip the form entirely ("Welcome back, Dana — you're going"), the confirmation screen offers add-to-calendar (the documented anti-no-show action), claims are optimistic with a friendly conflict path, and a sticky thumb-zone bar keeps RSVP one tap away.

What's deliberately not in V3: reminders automation (next up as item-level day-before nudges — the "forgot the rolls" pain), a share button, and inline editing of AI suggestions pre-approval. The live model call is verified up to and around the API boundary; the suggester is provider-switchable (Gemini free tier preferred, Claude fallback — both share one prompt, JSON contract, and eval trail, with the serving model logged per run) and needs a `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` in the deploy environment to go live.

---

## Artifacts

- **PRD V1.1 (Category Balance):** *Google Doc link coming soon*
- **V2 SPEC:** *Google Doc link coming soon*
- **GitHub repo:** [github.com/danielxhe/event-planner](https://github.com/danielxhe/event-planner)
- **Live app:** *coming soon*
