# PRD V3 — Spread: Research-Grounded Rebuild

**Author:** Daniel He
**Date:** 2026-07-18
**Status:** Shipped to main working tree (pending commit). 2026-07-19: suggester made provider-switchable — Gemini (`GEMINI_API_KEY`, free tier) preferred, Claude (`ANTHROPIC_API_KEY`) fallback. Live model call blocked only on pasting either key.

---

## 1. Why a V3

V2.1 shipped a working potluck companion for one real event. V3 answers a harder question: what would make Spread genuinely user-friendly and worth a second host? Instead of guessing, this release was preceded by structured due diligence: (a) a pain-point and competitor sweep across potluck coordination sources, and (b) a UX evidence review (Nielsen heuristics, mobile-web conversion research, no-login identity patterns, AI-suggestion UX). Both reports live with this doc's research trail; every V3 change traces to a finding.

## 2. What the research established

### Pain points (ranked, host-side unless noted)

| # | Pain | Evidence highlight |
|---|------|--------------------|
| P1 | RSVP flaking / no-shows | 24 yes → 8 showed (documented Partiful case); 10–20% no-show baseline |
| P2 | Promised dish never arrives | "Showing up late without the rolls they were supposed to bring" |
| P3 | Duplicate dishes / unbalanced spread | "Twelve broccoli casseroles"; the signature potluck failure |
| P4 | Group-text / spreadsheet coordination chaos | Real Partiful potlucks link out to Google Sheets |
| P6 | Dietary chaos (both sides) | Host flowcharts "like air traffic control"; vegan guest quietly never returns |
| P7 | Serving-quantity math | A whole calculator ecosystem exists as a workaround |
| P9 | Signup/claim friction (guest) | Partiful's top complaint is its phone-verification wall |

### Competitive white space

Partiful (the culturally dominant invite app) has **no native potluck feature**. The tools that do (SignUpGenius, Punchbowl, PerfectPotluck) have dated UI, ads, or dark-pattern billing. Nobody connects dietary data to the dish board, ties quantity math to live RSVPs, or does item-level reminders. Spread's category-balance + dietary-aware AI suggester sits squarely in the empty intersection.

### AI feature evidence (shapes the Smart Potluck design)

- Published failure mode of LLM food tools: **allergens slipping through with wrong safety labels** (almond milk in a "nut-free" plan — PubMed 37269717; Pak'nSave recipe-bot incident).
- Evidence-backed pattern: **LLM proposes, deterministic rule layer vetoes**; quantity math by arithmetic, not the model; suggest into empty slots, not open-ended generation; host stays the decider.
- Existing AI party features (Partiful "Party Genie") are received as gimmicks because they are unscoped.

## 3. What V3 ships

### 3.1 Smart Potluck Phase 2 — live AI suggester (P3, P6, P7)

- `POST /api/suggest` `mode: "claude_api"`: server builds a full context snapshot (live headcount incl. maybes and plus-ones, dietary aggregate from an RSVP→guest join, per-category serving gaps computed arithmetically, existing items) and calls Claude (`claude-opus-4-8`, adaptive thinking, JSON-schema-constrained output with per-event category enum).
- **Deterministic allergen guardrail** (`applyAllergenGuardrail`): if a dish name names an ingredient contradicting one of its own dietary tags, the tag is stripped and the action logged. The model can propose the dish; it cannot assert an unverified safety claim. This is the direct answer to the published failure mode.
- **Human-in-the-loop review UI**: suggestions render as keep/skip cards with the one-line rationale visible ("covers the 12-serving dessert gap"). Nothing touches the spread until the host taps "Add N dishes". Keep/skip verdicts are written back to the run (`/api/suggest/resolve`) — every review becomes eval data.
- Same input/output contract and logging shape as the Phase 1 manual stub, so all Phase 1 logs remain valid eval baselines. Manual entry is preserved as the fallback path.

### 3.2 Eval surface — `scripts/eval-suggestions.mjs`

Scores every Suggestions Log run: host accept rate, gap-targeting rate, duplicate rate, dietary-coverage rate, and (once the host fills Post Party Actual) brought-rate and dietary errors. Aggregates by mode, so **Phase 1 (human baseline) vs Phase 2 (Claude) is a direct comparison**. Verified against the 4 real Phase 1 runs from the 2026-06-06 party plus a new-shape pipeline run. Log truncation bug fixed (Notion 2000-char rich_text limit now chunked, not sliced — truncated JSON would have silently corrupted the eval set).

### 3.3 Guest RSVP restructure (P1, P9; UX checklist Tier 1)

- **Commit the headcount first**: the form is now one decision (Yes/Maybe/No) plus two fields (name, phone). Plus-ones, dietary needs, and notes moved to an enrichment step that appears only after the RSVP is recorded — drop-off there no longer loses the headcount.
- **Returning-guest recognition**: new `GET /api/rsvp/lookup`; a recognized device sees "Welcome back, Dana — you're going · +1" instead of a blank form, with "Not Dana?" escape. Claim buttons activate without any re-entry.
- **Anti-no-show actions on the confirmation screen**: Google Calendar link + `.ics` download (new `/api/event/ics`).
- **Sticky bottom-thumb-zone RSVP bar** on the guest page (appears only when the form is off-screen and the guest is unidentified).
- **Social proof above the form**: "Join Sarah, Mike + 5 others — they're in."
- Friction copy: explicit "no account, no verification texts" line (the counter-position to Partiful's top complaint).

### 3.4 Claim UX (P3; checklist Tier 1/2)

- **Optimistic claiming**: the card flips to "You've got this" instantly; rollback with a retry message on failure.
- **Conflict handled socially, not technically**: a lost claim race says "Someone just grabbed that one — the list is refreshed, plenty still needed" and refreshes.

### 3.5 Accessibility pass

`aria-label`s on all bare inputs, `autocomplete="name"` / `autocomplete="tel"` / `inputmode="tel"`, `aria-pressed` on toggle buttons, stepper buttons (44px) instead of a number input for plus-ones, `aria-live` on state changes, 48px primary CTAs.

## 4. UX checklist scorecard (research-derived, 25 checks)

Scored honestly against the V3 working tree. PASS 18 · PARTIAL 5 · UNVERIFIED 2.

| Tier | Check | Verdict |
|---|---|---|
| 1 | RSVP ≤2 typed fields, ≤4 taps | PASS |
| 1 | No account/email/app anywhere in guest path | PASS |
| 1 | Event page LCP ≤2.5s on 4G | **UNVERIFIED** — Notion API round-trips dominate TTFB; needs prod measurement (see §6 risks) |
| 1 | Who/when/where + CTA above fold @375px | PARTIAL — long descriptions can push the form; mitigated by the sticky jump bar |
| 1 | RSVP recorded before optional steps | PASS (new) |
| 1 | Primary CTA thumb zone ≥48px | PASS (new) |
| 1 | Returning guest recognized, zero re-entry, escape hatch | PASS (new) |
| 1 | <100ms tap feedback with rollback | PASS for claims (new); PARTIAL for RSVP submit (spinner, not optimistic) |
| 2 | Social proof before RSVP decision | PASS (new) |
| 2 | Claimed vs needed visible; conflict offers a path, not an error | PASS |
| 2 | One decision per screen | PASS (new) |
| 2 | Post-RSVP add-to-calendar and share | PARTIAL — calendar shipped; share button not yet |
| 2 | Change RSVP / unclaim later, zero friction | PASS |
| 2 | `type="tel"` + `autocomplete` attrs | PASS (new) |
| 2 | CLS ≤0.1, nothing moves after first paint | PASS by construction; unmeasured |
| 2 | Survives in-app browsers | PASS (SMS opens real browser; no storage needed for first paint) |
| 3 | AI suggestions editable/dismissible, never auto-applied | PASS (keep/skip + post-add host override; inline pre-add editing not shipped) |
| 3 | Each suggestion shows a one-line data-tied reason | PASS |
| 3 | Graceful AI absence/failure | PASS (friendly error + retry + manual fallback) |
| 3 | Corrections captured as a feedback loop | PASS (accept/reject logged per run) |
| 4 | Text contrast ≥4.5:1 incl. themed backgrounds | PARTIAL — small `slate-500` copy is borderline in spots |
| 4 | Inputs labeled, buttons named, lang set, zoom allowed | PASS |
| 4 | Tap targets ≥24px floor, primary 44–48px | PASS |
| 4 | Micro-delight at RSVP + claim only, reduced-motion respected | PARTIAL — minimal animation, no reduced-motion gating yet |
| 4 | Keyboard/screen-reader end-to-end pass | **UNVERIFIED** — needs a manual pass |

## 5. Verification log (2026-07-18)

- `tsc --noEmit` clean; `next build` green, all 19 routes compile.
- End-to-end on dev server against the live Notion backend (`june-test` event): suggestion run created with new context shape (chunked JSON parses), `/api/suggest/resolve` created exactly the accepted item and wrote Host Accepted/Rejected, eval scorer produced full metrics on the new-shape run (accept 50%, dupes 0%, dietary coverage 100%), `/api/event/ics` returns valid VEVENT, `/api/rsvp/lookup` correct on unknown phone. Test artifacts cleaned up.
- **Live model call VERIFIED 2026-07-19 (Gemini).** With the free-tier `GEMINI_API_KEY` in place, the full loop ran against `june-test`: `gemini-flash-latest` returned 3 schema-valid suggestions targeting the open gaps (accept 1 / reject 2 → item created with source `ai_suggested`, verdicts logged, eval scorer produced full metrics for the run: accept 33%, dupes 0%, dietary coverage 100%). The no-key error path is also verified (502 with friendly copy, cause named in server log). Note: pinned `gemini-2.5-flash` is retired for new accounts (404); the `-latest` alias is the default to prevent recurrence.

## 6. Risks and open items

1. **API key** — blocker for the flagship feature; user action.
2. **Page TTFB** — every guest view does serial Notion reads with `cache: 'no-store'`. If prod LCP misses 2.5s, options: parallelize reads (already partial), move read caching to short-TTL revalidate for anonymous views, or a KV cache layer. Measure first.
3. **Guardrail scope** — keyword lists cover common allergen/diet conflicts in dish *names* only; it is a claim-withdrawal layer, not a safety guarantee. The eval loop (post-party dietary audit) is what actually measures safety.
4. **Vercel deploy drift** — the deployed site is still V2.1; V3 needs a deploy after the key lands + a commit.

## 7. Next (in leverage order)

1. **Item-level day-before reminders** (P2, white space #5): "you're bringing the mac and cheese tomorrow" — extend ReminderPanel to per-claimed-item SMS drafts.
2. Real-host recruitment (5–10 hosts) + the metrics in §5 of the case study — this is the PM-portfolio payoff.
3. Share button on confirmation; inline edit of AI suggestions pre-add; reduced-motion gating; SR pass.
4. Phase 2 eval milestone: after 3+ AI-assisted events, run the scorer and write the Phase 1 vs Phase 2 comparison into the case study.
