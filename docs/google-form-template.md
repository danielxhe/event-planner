# Guest RSVP: Google Form Template

This doc is the **source of truth** for the guest-facing RSVP Form. Build the Form once from this spec, then clone it per event (instructions at the bottom).

The Form has **6 sections**. Sections 2 and 5 contain conditional logic. Every field maps to (a) a column in the Form's responses Google Sheet (which the [reminder Apps Script](../scripts/reminder.gs) reads from), and (b) a Notion property in [`notion-schema.md`](./notion-schema.md).

**Form-level settings to enable when building:**
- "Collect email addresses" → **Off** (we ask explicitly in §1 so it shows in responses and we control the question wording)
- "Limit to 1 response" → **Off** (guests may RSVP, then come back to update potluck)
- "Edit after submit" → **On** (lets guests change their potluck pick without contacting host)
- "Response receipts" → **On, if respondent requests it**
- Theme: match host's brand if portfolio-grade; otherwise default Google clean look is fine
- Confirmation message: `Thanks! You'll get a one-line reminder the day before. Reply to that email if anything changes.`

---

## Section 1: Identity

| # | Question | Type | Required | Validation | Sheet column | Notion property |
|---|---|---|---|---|---|---|
| 1.1 | What's your name? | Short answer | Yes | None | `Name` | `Guests.Name` (match-or-create) |
| 1.2 | Email | Short answer | Yes | Response validation → "Text" → "Email" (Google's built-in email regex) | `Email` | `Guests.Email` |

> **Why ask name+email explicitly instead of using "Collect email addresses":** that setting forces Google sign-in, which excludes guests who don't use Gmail. Asking inline keeps the Form open to everyone.

---

## Section 2: RSVP (with conditional branching)

| # | Question | Type | Required | Validation | Sheet column | Notion property |
|---|---|---|---|---|---|---|
| 2.1 | Can you make it? | Multiple choice: `Yes` / `No` / `Maybe` | Yes | Use "Go to section based on answer" | `RSVP` | Sets RSVP status on the Event ↔ Guest relation |

**Branching rules (Form Settings → "Go to section based on answer"):**
- `Yes` → continue to Section 3
- `Maybe` → continue to Section 3 (treat as soft-yes; still ask about +1/dietary/potluck so host can plan for them)
- `No` → jump to **Section 6** (skip +1, dietary, potluck; they're not coming)

> **Why Maybe still flows through:** the Estimated Headcount formula counts Maybes at 0.5x (see `notion-schema.md` Events DB). To compute that we need their dietary info too, in case they show up.

---

## Section 3: Plus-one

| # | Question | Type | Required | Validation | Sheet column | Notion property |
|---|---|---|---|---|---|---|
| 3.1 | Bringing a +1? | Multiple choice: `Yes` / `No` | Yes | Branch: `Yes` shows 3.2 inline; `No` continues to §4 | `Plus One` | Increments Event's confirmed count |
| 3.2 | +1's name (and dietary restrictions if any) | Short answer | No | Shown only if 3.1 = Yes. Use Google Forms' "Add question" → conditional show via the parent multiple-choice "Go to section" trick, OR a one-question Section 3b with "After section 3b → Section 4" | `Plus One Name` | Free-text note attached to host's row |

> **Per-guest +1 control:** the schema's `Guests.Plus-Ones Allowed` field (default 0) gates this at the Notion level. The Form itself can't enforce per-guest. Show 3.1 to everyone, and the host filters out unauthorized +1s when copying responses into Notion. Acceptable for MVP.

---

## Section 4: Dietary restrictions

| # | Question | Type | Required | Validation | Sheet column | Notion property |
|---|---|---|---|---|---|---|
| 4.1 | Any dietary restrictions? Pick all that apply. | Checkboxes (multi-select) | No | Options must match `Guests.Dietary Restrictions` multi-select exactly | `Dietary Restrictions` | `Guests.Dietary Restrictions` |
| 4.2 | If you picked "Other" or want to add detail, tell us here. | Short answer | No | None | `Dietary Notes` | `Guests.Dietary Notes` |

**Checkbox options (copy verbatim; they must match Notion exactly so import is one-click):**
- Vegetarian
- Vegan
- Gluten-Free
- Nut Allergy
- Dairy-Free
- Halal
- Kosher
- Other
- No restrictions

> "No restrictions" is an explicit option so we can distinguish "guest confirmed they have none" from "guest didn't answer." That distinction matters for the **Dietary surprises = 0** metric in `metrics.md`.

---

## Section 5: Potluck claim

| # | Question | Type | Required | Validation | Sheet column | Notion property |
|---|---|---|---|---|---|---|
| 5.1 | What can you bring? Pick from open slots. | Dropdown | No | Options = list of unclaimed Potluck Items for this event, plus `I'll bring something else (tell us below)` and `Nothing this time, I'll just bring myself` | `Potluck Item` | Creates/updates `Potluck Items.Claimed By` |
| 5.2 | If "something else," what is it? | Short answer | No | Shown only if 5.1 = "I'll bring something else" | `Potluck Custom` | New `Potluck Items` row with `Item Name` = this value |
| 5.3 | Anything we should know about your dish? (Allergens it contains, needs fridge space, etc.) | Short answer | No | None | `Potluck Notes` | `Potluck Items.Notes` |

### How the host populates the §5.1 dropdown per event

The dropdown is **per-event**, so it must be updated each time the Form is cloned. Workflow:

1. In Notion, open the Event page → Potluck Items linked view.
2. Filter to `Status = 🟡 Open`. Copy the list of `Item Name` values.
3. In the Form editor, open question 5.1 → paste each item as a dropdown option (one per line; Google Forms accepts bulk paste).
4. Always keep the two trailing options:
   - `I'll bring something else (tell us below)`
   - `Nothing this time, I'll just bring myself`
5. When a guest claims a slot, the host marks it `Claimed By` in Notion → next guest opening the Form sees the updated dropdown only if the host re-pastes. (MVP friction; V2 task in `roadmap.md` is to auto-sync this via Apps Script.)

---

## Section 6: Notes / questions for host

This is the section the `No`-branch jumps to from §2.

| # | Question | Type | Required | Validation | Sheet column | Notion property |
|---|---|---|---|---|---|---|
| 6.1 | Anything you want to ask or tell me? | Paragraph (long answer) | No | None | `Notes` | Pasted into `Events.Retro Notes` raw bucket, or copied into the relevant `Guests.Notes` row |

After this section, Form ends. Configure the **No-branch confirmation message** separately by adding a second "Section end" with custom text:

> `Bummed you can't make it. Totally get it. Let's catch up at the next one.`

(Google Forms doesn't natively support per-branch confirmation pages, so this is achieved by sending the `No` branch to a final "thank-you only" section whose body text serves as the goodbye.)

---

## Cloning the Form per event

Google Forms supports duplication via **"Make a copy"**. Use this for every new event so each event has its own response Sheet.

**Per-event clone checklist:**

1. Open the master `RSVP: Template` Form. Top-right `⋮` menu → **Make a copy**.
2. Rename to `RSVP: <Event Name> (<Date>)`, e.g. `RSVP: Sarah's Birthday (2026-06-15)`.
3. Update the **Form description** (under the title) with the event's one-line blurb from `Events.Description` in Notion.
4. Update **question 5.1's dropdown options** per the workflow in Section 5 above.
5. **Responses tab → green Sheets icon** → "Create a new spreadsheet" → name it `RSVP Responses: <Event Name>`. Note the Sheet ID (the long string in its URL).
6. If using the reminder script (V2): update the Apps Script's `SHEET_ID` script property to point at this new Sheet, **OR** keep all events flowing into one master sheet and the script will fan-reminders-out per event-date automatically (the script already filters by Event Date column; recommended).
7. Send the Form link to guests. Embed the same link in the Notion Event page under "Guest RSVP" so they can find it later.

**Why a fresh Sheet per event (recommendation: don't):** isolation is cleaner, but the V2 reminder script gets simpler if all RSVPs live in one master Sheet keyed by `Event Name` + `Event Date`. **Default: one master Sheet, one Form per event, Form's response destination points at the same master Sheet via "Select existing spreadsheet."** This is the configuration `scripts/reminder.gs` assumes.

