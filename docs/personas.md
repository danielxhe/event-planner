# Personas & User Journeys

**Owner:** danielxhe
**Last updated:** 2026-05-25
**Related docs:** [PRD](PRD.md) · [Notion Schema](notion-schema.md)

This doc puts faces and timelines on the abstract user types in [PRD §2](PRD.md#2-target-users). The three personas below map 1:1 to the Primary / Secondary / Tertiary users in the PRD, and the two journey maps walk through the end-to-end experience for the host and the guest.

---

## Personas

### 1. Primary — Maya Okafor, the recurring host

| | |
|---|---|
| **Age** | 31 |
| **Occupation** | Senior UX researcher at a mid-size fintech, hybrid (in office Tue/Wed) |
| **Lives** | A 2-bedroom apartment in Oakland, CA with her partner Sam and a cat named Dumpling |
| **Hosting cadence** | 4–6 gatherings per year: an annual Lunar New Year dumpling night (~18 people), a summer rooftop BBQ at her building (~25), a Friendsgiving (~14), plus 1–2 ad-hoc dinners or game nights |
| **Tech comfort** | High. Lives in Notion for work notes, runs her household Costco list in Google Sheets, comfortable with Zapier but has never set it up at home |
| **Group identity** | Hub of a friend group of ~30 people across two overlapping circles (grad school cohort + Sam's coworkers). She's "the one who hosts." |

#### Context

Maya started hosting in earnest after grad school in 2022. Her gatherings have a reputation — guests know there will be name tags for the first hour, a non-alcoholic option that isn't just LaCroix, and a vegetarian main that isn't an afterthought. She tracks dietary restrictions in a personal Notes app file that she copies forward event-to-event. The file is two screens long now and she has no idea which entries are still accurate.

Her current workflow: a fresh WhatsApp group per event for the invite ("Friendsgiving 2025 🦃"), a Google Sheet for the potluck signup pinned in the group chat, and a "Day-of" note in Apple Notes with the schedule and grocery list. RSVPs come in via WhatsApp reactions (👍 = yes, 🤔 = maybe), DMs, in-person at brunch the weekend before, and one person who always texts "is this still happening?" the morning of.

#### Goals

- **Spend less time on logistics, more time on the actual hosting.** She enjoys the cooking and the curating, not the spreadsheet wrangling.
- **Never again learn at the event itself** that someone went vegan six months ago, or that Priya is now gluten-free, or that there are three lasagnas and zero salads.
- **Get an accurate headcount by Thursday night** so her Friday Costco run is right-sized.
- **Build a memory across events** — by year three, she wants to know who's a reliable +1, who flakes, and who always brings the best dessert without re-remembering it each time.
- **Make it easy for Sam to help** without having to forward screenshots or ask "did you see what Jess brought last time?"

#### Frustrations with the current workflow

- **RSVPs are scattered across surfaces.** She tallies by scrolling WhatsApp, checking DMs, and remembering one verbal "yes" from a coffee. She has been wrong by ±3 people three events in a row.
- **The potluck Sheet gets ignored.** Half the guests claim a slot in the Sheet; the other half just text her "I'll bring something sweet 🍪" and she has to manually add a row. The result is always over-indexed on desserts.
- **Dietary info evaporates.** She re-asks the same five people about allergies every event because there's no place that remembers.
- **The day-before is a stress spike.** She rebuilds the schedule, the grocery list, and the prep timeline from scratch every event because last time's note is buried in a stack of 400 Apple Notes.
- **Sam can't help meaningfully.** He'd take the schedule and grocery run off her plate, but the info lives in her head and her phone — not a shared surface.
- **No retro = same mistakes.** Last Friendsgiving she ran out of folding chairs at exactly 6:45 pm. She remembered this in November 2026, three days *after* it happened again.

#### What success looks like for Maya

- **Wednesday before the event:** she opens one Notion page, sees `Confirmed Count: 16`, `Maybe Count: 2`, `Estimated Headcount: 17` (from the [Events DB rollup](notion-schema.md#1-events-db-master)), `Potluck Coverage: 92%`, and one open slot tagged `Side`. She nudges the two Maybes once and moves on with her evening.
- **Friday at Costco:** the grocery list is rolled up from her schedule's prep items + the headcount formula. She buys for 17 instead of "20-ish, I think?"
- **Saturday at 7:15 pm:** Priya arrives. Maya already knew (from the [Guests DB](notion-schema.md#2-guests-db-persistent-across-events)) that Priya is now gluten-free, and the cheese board has a labeled GF cracker section. Priya notices. Priya tells someone. Maya feels like the host she wants to be.
- **Sunday morning:** she writes three lines in Retro Notes: "chairs ran out again — buy 4 more before BBQ", "Jess's tres leches is now a permanent ask", "playlist died at 9 — assign to co-organizer next time." Next event, those notes are one click away on the Past Events library view.
- **Cumulative:** by event #3 in 2026, planning time is ~90 minutes instead of ~5 hours (the [PRD §6 north-star metric](PRD.md#6-success-metrics)).

#### Anti-patterns she'd reject

- Anything that requires guests to make an account.
- A mobile app she has to install — Notion mobile is fine.
- Built-in payment splitting (she trusts Venmo and doesn't want a half-baked clone — [PRD §4 out-of-scope](PRD.md#4-scope)).
- Heavy "event marketing" features. This is a dinner, not a ticketed show.

---

### 2. Secondary — Sam Reyes, the co-organizer

| | |
|---|---|
| **Age** | 33 |
| **Occupation** | Backend engineer at a logistics startup, fully remote |
| **Lives** | With Maya (above) |
| **Hosting role** | Co-host on every Maya event; takes lead on drinks, music, and physical setup (chairs, tables, ice) |
| **Tech comfort** | Very high (engineer), but actively *resists* adopting new tools in his personal life. Lives in his terminal and a single Apple Notes file. |
| **Personality** | Quiet, reliable, hates ambiguity. Would rather own a clearly defined slice than be a "general helper." |

#### Context

Sam is Maya's partner and her default second-in-command for every gathering. He doesn't initiate events but he genuinely enjoys executing them — he likes the puzzle of fitting 20 people around their dining table plus the kitchen island plus three folding chairs. His pain isn't motivation; it's information asymmetry.

When Maya hosts, Sam ends up asking her a steady stream of questions in the 48 hours before the event: *how many people, are the Kims bringing the baby, do we need the high chair, did Marcus confirm he's bringing speakers, what time does it actually start vs. what time did you tell people.* Every answer requires Maya to context-switch out of cooking-mode.

#### Goals

- **Own his slice end-to-end** without having to interview Maya for status updates.
- **Know the headcount and confirmed +1s** so he can set up the right number of chairs / glasses / place settings.
- **Have visibility into the schedule** so he can run the music transitions and the "okay everyone, dinner!" call without Maya prompting him.
- **Add or edit things himself** — if Marcus texts him saying "I'll bring speakers but only until 10," Sam wants to update that in the plan, not relay it to Maya.

#### Frustrations with the current workflow

- **He's read-only by default.** The Google Sheet is "Maya's." The Apple Notes file is on Maya's phone. He can ask, but he can't act.
- **Group-chat fragmentation.** Marcus DMed Maya about speakers. Sam doesn't know until he asks. Maya forgets to tell him because she's chopping shallots.
- **No source of truth for "his" stuff.** Drinks list, ice run, playlist — these live half in his head, half in Maya's. Every event, they re-discover the gaps at 5 pm.
- **He feels like a helper, not a co-host.** Not status — just clarity. He'd take ownership if there were defined ownership to take.

#### What success looks like for Sam

- He's added as a **Co-Organizer** on the [Events DB record](notion-schema.md#1-events-db-master) and gets edit rights automatically.
- The [Schedule DB](notion-schema.md#4-schedule-db) has an **Owner** field — three rows are assigned to him (Setup 4-5pm, Drinks station 5-7pm, Music transitions all night). He owns them outright.
- When Marcus texts him about speakers, he opens the Potluck DB on his phone, finds Marcus's `Supplies / Speakers` row, edits the Notes field to "available until 10pm only." Maya sees the change next time she opens the page. No relay needed.
- On event day at 4 pm, Sam pulls up the **Day-of view** on the Schedule DB on his iPad, sees his three rows, and works through them. He marks each `Done` as he completes it. Maya doesn't have to manage him.
- **Co-organizer edit count ≥ 1** — the PRD's explicit [success metric for multi-user value](PRD.md#6-success-metrics). For Sam, the realistic count is more like 8–12 edits per event.

#### Anti-patterns he'd reject

- Anything that requires real-time collaboration (Google Docs cursors stressing him out).
- Notifications. He will mute anything that pings him more than twice a week.
- A separate "co-organizer dashboard." Same Notion page as Maya, just with edit rights — that's it.

---

### 3. Tertiary — Jess Tamura, the guest

| | |
|---|---|
| **Age** | 28 |
| **Occupation** | Pediatric nurse, three 12-hour shifts a week (often weekends) |
| **Lives** | Studio apartment in Berkeley, 20 minutes from Maya's |
| **Relationship to host** | Grad-school friend of Maya's; sees her 4–6 times a year, mostly at Maya's events |
| **Tech comfort** | Medium. Lives in iMessage, Instagram DMs, and the Epic charting app at work. Doesn't have a Notion account and isn't going to make one. |
| **Hosting** | Never. Has hosted exactly one event in her life (a karaoke birthday in 2023) and it was stressful. |

#### Context

Jess loves Maya's gatherings — they're one of the few times she sees her grad school crew. But her schedule is unpredictable: she'll RSVP yes to Friendsgiving in October, then get a Thanksgiving-week shift swap she can't refuse and have to back out the morning of. When she does come, she'll bring something thoughtful (last time: a tres leches cake that became legend).

Her interaction with the event is short and bursty: she gets the invite, RSVPs, then doesn't think about it until the day before, when she suddenly needs to remember the address, what time to show up, what she said she'd bring, and whether there's parking.

#### Goals

- **One link to bookmark.** Address, time, what she's bringing, dress code — all in one place.
- **RSVP in under 60 seconds** on her phone, between patients.
- **Claim a potluck slot without negotiating** in a group chat.
- **Update her RSVP late** if her shift changes — without feeling like she's letting Maya down via a public chat message.

#### Frustrations with the current workflow

- **Scrolling for the address.** Maya posted it in the WhatsApp group 11 days ago, buried under 200 reaction messages and a sub-thread about parking.
- **"What did I say I'd bring?"** She remembers committing to a side dish; she does not remember which. She scrolls the Sheet, doesn't find her name (Maya hasn't added her manual text-reply yet), and texts Maya at 9 am to ask. Maya is at the farmer's market.
- **Public RSVP changes feel awkward.** Backing out in a 30-person group chat draws a chorus of "noooo," which she doesn't want. So she DMs Maya, which Maya then has to manually update.
- **Dietary surprises.** She's pescatarian but eats dairy and gluten. Whether that's been recorded varies event-to-event. She's tired of explaining.

#### What success looks like for Jess

- She gets a Google Form link in her email. Fills it out in 45 seconds on the bus: name, yes, no +1, dietary tags `Pescatarian`, picks "Dessert — tres leches" from the dropdown.
- The day before the event she gets one reminder email (V2 feature, [PRD §4](PRD.md#4-scope)) with the address, time, what she committed to bring, and a Google Maps link.
- Her shift gets swapped Saturday morning. She opens the same Form link, changes her RSVP to No, and adds a note. Maya sees it within an hour — no group-chat drama.
- At the event: she arrives knowing the dress code is `Casual` and that there are GF crackers (because the page-level read-only summary lists dietary roll-ups). She hands Maya the tres leches. She has a great time.
- She never sees the Notion workspace. She never makes an account. She doesn't even know there *is* a Notion workspace. The Form and the reminder email are her entire surface.

#### Anti-patterns she'd reject

- Making an account for anything.
- Installing an app.
- An invite that requires "downloading the calendar file" — she'll just screenshot the date.
- A reminder cadence of more than 1 email. Anything more and she'll filter the sender.

---

## User journey maps

Each journey covers a single event end-to-end. Stages map to PRD scope items and Notion DBs where applicable.

### Journey A — Maya, the host

From "I want to throw a thing" through post-event retro. Imagine her **Lunar New Year dumpling night, 2026**, 18 invited guests, potluck-style with Maya making the dumpling wrappers and assigning fillings + sides + drinks.

| # | Stage | Action | Tool / Surface | Emotion | Pain point (today) | How this app helps |
|---|---|---|---|---|---|---|
| 1 | **Spark** | Decides to host LNY ~6 weeks out; picks a Saturday date | Brain / iMessage with Sam | Excited | None yet — but tends to delay because "setup is annoying" | Friction is low enough that the spark survives until execution |
| 2 | **Create event** | Duplicates the "Event" template; fills in name, date/time, venue (her apartment), dress code (`Casual — wear red if you've got it`), cover photo | [Events DB](notion-schema.md#1-events-db-master) row, Status = `Planning` | Productive | Today: opens a fresh WhatsApp group, a fresh Sheet, a fresh Note — 3 setup steps | One template duplicate = entire scaffold ready (event page + linked Potluck/Schedule/Guests views) |
| 3 | **Build guest list** | Adds 18 people from her [Guests DB](notion-schema.md#2-guests-db-persistent-across-events); 14 are existing records with dietary tags + reliability scores, 4 are new | Guests DB → Relation on Event | Slightly proud (the DB is paying off) | Today: re-types names into a fresh chat, re-asks dietary info she "should know by now" | Persistent Guests DB means returning guests come with dietary tags + history pre-filled; the "Reliability" formula flags Marcus (RSVP rate 62%) for an extra nudge |
| 4 | **Plan potluck slots** | Creates 12 empty [Potluck Items](notion-schema.md#3-potluck-items-db) rows: 3 Mains (dumpling fillings), 4 Sides, 2 Desserts, 2 Drinks, 1 Supplies (chopsticks) | Potluck DB, `By Category` board view | Focused | Today: types these into a Sheet header by header; guests claim chaotically | Empty slots are visible to guests in the Form's dropdown; structure prevents 6-desserts problem upfront |
| 5 | **Draft schedule** | Adds 6 [Schedule rows](notion-schema.md#4-schedule-db): 5:30 setup (owner: Sam), 6:00 arrival, 6:30 wrapping demo, 7:00 dinner, 8:30 mahjong, 10:30 wind-down | Schedule DB, Timeline view | In flow | Today: lives in Apple Notes; rewritten from scratch every event | Schedule has an Owner field — Sam's three rows are explicitly his; she stops worrying about them |
| 6 | **Send invites** | Sets Status = `Upcoming`; copies the Google Form link + event blurb into a fresh group message (WhatsApp + email for two non-WhatsApp friends) | WhatsApp + email; Form URL | Anticipatory | Today: invite copy is one message; RSVP collection happens *back in* WhatsApp, scattered | Invite copy explicitly says "RSVP via this link — texts won't be tracked" ([PRD §7 risk mitigation](PRD.md#7-risks--assumptions)) |
| 7 | **Wait + monitor RSVPs** | Checks the Events page once a day Mon–Wed | Events DB, single page | Calm | Today: counts WhatsApp 👍 emojis at 11pm, gets it wrong | `Confirmed Count`, `Maybe Count`, `Estimated Headcount` rollups give her the number at a glance |
| 8 | **Nudge stragglers** | Wednesday: 6 unresponsives. Filters Guests where RSVP = blank, sends them a single group DM | Notion filter + WhatsApp | Mildly annoyed | Today: scrolls list of 18 against a spreadsheet, manually cross-references | Filtered view gives her the exact 6 names in 10 seconds |
| 9 | **Track potluck claims** | Form responses landed in a Sheet; she copies the 11 claimed rows into the Potluck DB (MVP manual sync) | Google Sheet → Notion paste | Slightly annoyed but it's only 11 rows | Today: this *is* the chaos — claims happen in chat, Sheet, and DMs | One intake surface (the Form). Manual copy is < 5 min for MVP; auto-sync is the V2 commitment |
| 10 | **Spot gaps** | `Potluck Coverage: 92%` — one Side slot still open. DMs Priya, who'd RSVP'd Yes but not claimed | Events DB rollup | Confident | Today: she'd discover the gap at 6:45 pm Saturday when 18 people walk in with 3 desserts | Coverage rollup makes the gap visible Wednesday, not Saturday |
| 11 | **Headcount-driven shopping** | Thursday: `Estimated Headcount: 17` (16 confirmed + 2 maybes × 0.5). Sams the right amount of pork, napa, flour | Events DB + her grocery list | Confident | Today: buys for "20-ish" and either has leftovers for a week or runs short | Formula gives her a defensible number she can build a grocery list against |
| 12 | **Dietary roll-up** | Reviews the Guests-on-this-event view: 2 vegetarian, 1 gluten-free, 1 nut allergy. Makes a veg dumpling filling; labels the GF crackers; checks the satay sauce ingredient list | Guests DB filter on this Event | Relieved | Today: she'd re-text 4 people the morning-of or guess | Roll-up surfaces every restriction *before* she's chopping at 4 pm |
| 13 | **Sam handoff** | Sends Sam the Notion link with a "you're co-organizer on this one." He's already in the workspace. He sees his 3 schedule rows | Notion share | Calm | Today: forwards 4 screenshots and answers DM questions | He acts independently. She stops being his information broker |
| 14 | **Day-of: setup** | 3pm Saturday: opens Schedule DB `Day-of` view on her iPad in the kitchen. Marks each row Done as she goes | Schedule DB | Slightly stressed but in control | Today: juggles paper list, phone, and asks "what time again?" 4 times | Single source of truth on a counter; status field lets her glance and re-orient |
| 15 | **Guests arrive** | Greets, points to drinks, name-tags the people who don't know each other | In-person | Joyful | Today: same — but with low-grade background anxiety about whether she forgot to ask about Priya's diet | Background anxiety gone. She knew about Priya on Wednesday |
| 16 | **Event runs** | Schedule transitions happen; Sam runs music; she focuses on dumpling demo | In-person + Notion as fallback | Present | Today: she's mentally running the schedule and the host duties simultaneously | Schedule + Owner field means transitions don't all rely on her brain |
| 17 | **Wind down** | Last guests leave 11pm. Dishes. Bed | Real life | Tired but happy | — | — |
| 18 | **Retro** | Sunday morning, coffee in hand: opens the Events page, writes 4 lines in Retro Notes ("dumpling wrappers ran short — 1.5x next time"; "Priya brought matcha mochi — add to dessert ideas"; "Jess's tres leches still legendary"; "chairs fine this time — folding chair purchase was worth it") | Events DB Retro Notes field | Reflective | Today: doesn't happen. Same mistakes recur. (See: chairs ran out twice in a row.) | Retro Notes field is right there on the page; takes 3 min. Sets up next event for compounding improvement |
| 19 | **Archive** | Sets Status = `Past`. Event automatically moves to the `Library` gallery view | Events DB | Tidied | Today: WhatsApp group lingers forever; she eventually leaves it | One status change = clean handoff to past-events library, the [PRD V3 retention play](PRD.md#4-scope) |
| 20 | **Compound benefit (next event)** | When she duplicates the template for her summer BBQ, she opens the LNY retro notes from the Library. "1.5x dumpling wrappers" doesn't apply, but "chairs purchased ✅" and her sharpened guest dietary records carry forward | Library view → new Event | Smug, lightly | Today: she'd plan the BBQ from scratch and re-make a chair mistake | The persistent Guests DB + retro notes are the moat. By event #5, planning time is ~90 min |

---

### Journey B — Jess, the guest

From "I got invited" through post-event. Same Lunar New Year dumpling event, Jess's POV.

| # | Stage | Action | Tool / Surface | Emotion | Pain point (today) | How this app helps |
|---|---|---|---|---|---|---|
| 1 | **Invite arrives** | Sees a WhatsApp message from Maya in the LNY group: blurb, date, "RSVP via this Form ↓" with a Google Form link | WhatsApp on her phone, between patients | Happy to see Maya | Today: invite is a wall of text in chat; details bury immediately | Single clear CTA — one link |
| 2 | **Open the form** | Taps the link on her phone. Form loads. Sees: name (pre-filled if Maya passed email param), email, Are you coming?, +1, dietary, what will you bring? | Google Form on mobile browser | Mild relief — it's short | Today: she'd reply in chat, then forget to claim a potluck slot until prompted | Form combines RSVP + dietary + potluck claim into one ~45s interaction |
| 3 | **RSVP yes** | Picks `Yes`. No +1. Dietary: `Pescatarian` (which she adds in the Other field; or picks `Other` and types it — depending on whether Maya added a Pescatarian option) | Form | Confident | Today: dietary info is conveyed by DM, often re-asked next event | Tags propagate to her [persistent Guests record](notion-schema.md#2-guests-db-persistent-across-events); next event Maya already knows |
| 4 | **Claim a potluck slot** | Scrolls dropdown of open slots: 2 Mains, 3 Sides, 2 Desserts open. Picks `Dessert — open slot`. In the "Custom item" field types "tres leches cake" | Form | A little proud of her contribution | Today: she'd type "I'll bring dessert" in chat; Maya manually adds it to the Sheet (or doesn't); ends up as one of 4 desserts | Dropdown shows *only open slots* — she sees Dessert has 2 left, picks one. Prevents over-claiming a category |
| 5 | **Submit** | Hits submit. Sees "Thanks! Maya will see your RSVP. Save this link to update later." | Form confirmation | Done in under a minute | Today: not "done" — she'll get follow-up DMs to confirm details | Form confirmation acts as receipt; Maya stops needing to chase her |
| 6 | **Forget about it for 2 weeks** | Life. Work. Three 12-hour shifts | Brain | Distracted | — | — |
| 7 | **Day-before reminder** *(V2 feature)* | Friday at 10am gets one email: "LNY dinner tomorrow 6:30pm at Maya's. Address: 123 Street, Oakland. You said you'd bring: tres leches cake. Dress code: casual / wear red. Parking: street, free after 6pm." | Email | Grateful — she'd half-forgotten | Today: she's scrolling 2 weeks of chat at 9am Saturday looking for the address | Reminder is the *only* surface she needs day-of |
| 8 | **Shift swap — needs to update** | Saturday 8am: her colleague calls in sick. She has to cover. Opens the reminder email, taps "Update your RSVP" link (which re-opens her Form pre-filled), changes Yes → No, adds note "covering a shift, so sorry" | Form (edit response) | Bummed but glad it's clean | Today: she'd post in chat → chorus of "noooo" → DMs Maya separately to officially back out | Quiet update. Maya sees it within an hour. No group-chat awkwardness. Headcount auto-decrements |
| 9 | **Alt path: shift NOT swapped — she goes** | Saturday 6:15pm: walks out, screenshots the address from the email, calls a Lyft | Email + Lyft | Excited | Today: re-scrolls chat for address in the Lyft | Address in the email; no scroll needed |
| 10 | **Arrival** | Hands Maya the tres leches. Maya knows she's pescatarian and points her to the veg dumplings and the salmon side. | In-person | Welcomed, seen | Today: she'd say "oh I don't eat meat" at the table; mild awkwardness | She doesn't have to explain. Dietary roll-up did its work |
| 11 | **Event happens** | Eats, plays mahjong, leaves at 10:45pm | Real life | Joyful | — | — |
| 12 | **Post-event** | Doesn't open Notion. Doesn't see the retro. Gets a one-line "thanks for coming!" text from Maya the next day. | iMessage | Warm | Today: same | Tertiary persona's surface ends at the door. By design — [PRD §5](PRD.md#5-solution-overview) commits to guests never needing a Notion account |
| 13 | **Compound benefit (next event)** | Six months later she gets the BBQ invite. The Form pre-fills her name, email, and dietary tag (`Pescatarian`). She RSVPs in 20 seconds. | Form (pre-filled) | Slight delight | Today: she'd re-enter dietary info; Maya would re-ask | Persistent Guests DB means she only sets dietary preferences once across the lifetime of knowing Maya |

---

## How the personas map to PRD scope

| Persona | Most-used PRD MVP feature | Most-anticipated V2 feature | Out-of-scope feature they don't miss |
|---|---|---|---|
| **Maya (host)** | Auto headcount + dietary roll-up ([Events DB](notion-schema.md#1-events-db-master) formulas) | Day-before reminder email (cuts her last manual nag) | Payment splitting (Venmo works) |
| **Sam (co-organizer)** | Co-organizer edit permissions + Schedule Owner field | Form → Notion auto-sync (one less manual step for Maya, indirectly helps him) | Native mobile app (Notion mobile is fine) |
| **Jess (guest)** | Google Form (RSVP + potluck + dietary in one) | Day-before reminder email | Calendar integration beyond `.ics` (she'll screenshot the date) |

The personas exist to keep the team honest about a recurring temptation: building features that feel impressive to the *host* power-user (Maya) but add friction for the 80% of usage that's *guests* (Jess). Every feature decision should be re-tested against: "does this preserve Jess's < 60-second RSVP and zero-account commitment?"

---

## Open questions raised by the persona work

These belong in [PRD §8 Open Questions](PRD.md#8-open-questions) at next revision:

1. **Should the Form support "edit my response" links?** Jess's journey assumes yes (Stage 8). Google Forms requires "Edit after submit" toggle + sending the unique edit URL in the confirmation email. Low-cost win — should be MVP, not V2.
2. **Should co-organizers get a separate "their tasks only" view?** Sam's persona suggests yes, but it's just a filtered view of the Schedule DB — no new DB needed. Add as a documented view.
3. **Where does the "Reliability" score on Guests DB get surfaced to Maya?** Right now it's a number on the Guest record. Should it appear in the Event's confirmed-guest view as a column? Or only when filtering "who haven't I nudged?" Defer to first real pilot.
4. **Pescatarian missing from the dietary multi-select.** Jess's persona surfaces this: current schema has `Vegetarian / Vegan / GF / Nut / Dairy-Free / Halal / Kosher / Other`. Add `Pescatarian` to the [Guests DB.Dietary Restrictions option list](notion-schema.md#2-guests-db-persistent-across-events) — cheap fix.

---

*These personas are composites drawn from interviewing 6 hosts and 4 guests during scoping (Apr–May 2026). Names and identifying details are fictionalized; behaviors, frustrations, and goals are direct from interview notes.*
