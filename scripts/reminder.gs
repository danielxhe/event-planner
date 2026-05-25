/**
 * ============================================================================
 *  Event Planner — Day-Before Reminder Email
 *  V2 feature per docs/roadmap.md and docs/PRD.md (§4 "In scope V2").
 * ============================================================================
 *
 *  WHAT THIS DOES
 *  --------------
 *  Runs once per day. Reads the RSVP responses Sheet, finds every guest who
 *  RSVP'd "Yes" to an event happening *tomorrow*, and emails each of them a
 *  personalized reminder with venue, time, and their potluck item.
 *
 *  SETUP (one-time, ~10 minutes)
 *  -----------------------------
 *  1. Open the Google Sheet that your RSVP Google Form writes to.
 *  2. Extensions → Apps Script. Delete the placeholder code.
 *  3. Paste this entire file into the editor. Save (disk icon). Name the
 *     project "Event Planner Reminders".
 *  4. In the left sidebar click the gear icon (Project Settings) →
 *     "Script Properties" → "Add script property". Add the following keys:
 *
 *        SHEET_ID            <-- the long ID from your Sheet's URL
 *                                (the part between /d/ and /edit)
 *        SHEET_TAB_NAME      <-- usually "Form Responses 1"
 *        HOST_NAME           <-- e.g. "Daniel"
 *        HOST_REPLY_EMAIL    <-- where guests' replies should go
 *        VENUE_MAP_FALLBACK  <-- optional Google Maps URL if a row has none
 *
 *     (The script also reads per-event venue overrides from the Sheet itself —
 *     see the "Event Date" / "Venue" columns. Script properties are just the
 *     defaults / host identity.)
 *
 *  5. Run the function `sendReminders` once manually. Google will ask you to
 *     authorize access to Sheets + Gmail — approve it (it's your own account).
 *  6. Click the clock icon (Triggers) → "Add Trigger":
 *        Function:        sendReminders
 *        Event source:    Time-driven
 *        Type:            Day timer
 *        Time of day:     9am – 10am (guest-friendly morning send)
 *     Save. You're done — it now runs daily.
 *
 *  EXPECTED SHEET COLUMNS (header row)
 *  -----------------------------------
 *    A: Timestamp
 *    B: Name
 *    C: Email
 *    D: Event Name
 *    E: Event Date       (parseable date — e.g. 2026-06-15 or 6/15/2026)
 *    F: RSVP             ("Yes" / "No" / "Maybe")
 *    G: Potluck Item     (free text — may be empty)
 *    H: Dietary Restrictions
 *  Optional extra columns the script will use if present:
 *    I: Event Time       (e.g. "7:00 PM")
 *    J: Venue Name
 *    K: Venue Map        (URL)
 *
 *  IDEMPOTENCY
 *  -----------
 *  The script writes the date of its last successful run to script properties
 *  (`LAST_SENT_DATE`). If you run it twice in the same calendar day it will
 *  log and exit without re-sending. Delete that property manually if you ever
 *  need to force a resend (e.g. you fixed a typo in the venue).
 *
 *  LOGS
 *  ----
 *  View → Executions in the Apps Script editor shows every run.
 *  Logger.log lines appear inside each execution.
 * ============================================================================
 */

// ---- Column index constants (0-based) ----
const COL_TIMESTAMP   = 0;
const COL_NAME        = 1;
const COL_EMAIL       = 2;
const COL_EVENT_NAME  = 3;
const COL_EVENT_DATE  = 4;
const COL_RSVP        = 5;
const COL_POTLUCK     = 6;
const COL_DIETARY     = 7;
const COL_EVENT_TIME  = 8;   // optional
const COL_VENUE_NAME  = 9;   // optional
const COL_VENUE_MAP   = 10;  // optional

/**
 * Main entry point. Wire this to a daily time-driven trigger.
 */
function sendReminders() {
  const props = PropertiesService.getScriptProperties();
  const todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Idempotency guard — bail if we already ran today.
  const lastSent = props.getProperty('LAST_SENT_DATE');
  if (lastSent === todayKey) {
    Logger.log('Reminders already sent today (' + todayKey + '). Skipping.');
    return;
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const sheetId = props.getProperty('SHEET_ID');
    const tabName = props.getProperty('SHEET_TAB_NAME') || 'Form Responses 1';
    const hostName = props.getProperty('HOST_NAME') || 'Your host';
    const replyTo = props.getProperty('HOST_REPLY_EMAIL') || Session.getActiveUser().getEmail();
    const venueMapFallback = props.getProperty('VENUE_MAP_FALLBACK') || '';

    if (!sheetId) {
      throw new Error('SHEET_ID script property is not set. See setup block at top of file.');
    }

    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(tabName);
    if (!sheet) {
      throw new Error('Sheet tab "' + tabName + '" not found in spreadsheet ' + sheetId);
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('No RSVP rows found. Exiting.');
      return;
    }

    // Compute "tomorrow" as a yyyy-MM-dd string in the script's timezone.
    const tz = Session.getScriptTimeZone();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = Utilities.formatDate(tomorrow, tz, 'yyyy-MM-dd');
    Logger.log('Looking for events on: ' + tomorrowKey);

    // Skip header row.
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      try {
        const rsvp = (row[COL_RSVP] || '').toString().trim().toLowerCase();
        if (rsvp !== 'yes') { skipped++; continue; }

        const eventDateRaw = row[COL_EVENT_DATE];
        if (!eventDateRaw) { skipped++; continue; }

        const eventDate = (eventDateRaw instanceof Date)
          ? eventDateRaw
          : new Date(eventDateRaw);
        if (isNaN(eventDate.getTime())) {
          Logger.log('Row ' + (i + 1) + ': unparseable Event Date "' + eventDateRaw + '" — skipping.');
          skipped++;
          continue;
        }
        const eventKey = Utilities.formatDate(eventDate, tz, 'yyyy-MM-dd');
        if (eventKey !== tomorrowKey) { skipped++; continue; }

        const email = (row[COL_EMAIL] || '').toString().trim();
        if (!email || email.indexOf('@') === -1) {
          Logger.log('Row ' + (i + 1) + ': invalid email "' + email + '" — skipping.');
          skipped++;
          continue;
        }

        const guestName  = (row[COL_NAME]       || 'friend').toString().trim();
        const eventName  = (row[COL_EVENT_NAME] || 'our gathering').toString().trim();
        const potluck    = (row[COL_POTLUCK]    || '').toString().trim();
        const eventTime  = (row[COL_EVENT_TIME] || '').toString().trim();
        const venueName  = (row[COL_VENUE_NAME] || '').toString().trim();
        const venueMap   = (row[COL_VENUE_MAP]  || venueMapFallback).toString().trim();

        const subject = 'Reminder: ' + eventName + ' is tomorrow';
        const body = buildEmailBody({
          guestName: guestName,
          eventName: eventName,
          eventDate: eventDate,
          eventTime: eventTime,
          venueName: venueName,
          venueMap:  venueMap,
          potluck:   potluck,
          hostName:  hostName,
          tz: tz
        });

        MailApp.sendEmail({
          to: email,
          replyTo: replyTo,
          subject: subject,
          body: body,
          name: hostName
        });
        sent++;
        Logger.log('Sent reminder to ' + email + ' for "' + eventName + '"');

      } catch (rowErr) {
        errors++;
        Logger.log('Row ' + (i + 1) + ' failed: ' + rowErr);
      }
    }

    // Only mark the day "done" if at least one attempt was made without
    // a top-level crash. Per-row failures don't block the marker — they're
    // logged and the run is still considered complete.
    props.setProperty('LAST_SENT_DATE', todayKey);
    Logger.log('Run complete. Sent: ' + sent + ', Skipped: ' + skipped + ', Errors: ' + errors);

  } catch (err) {
    Logger.log('FATAL: ' + err);
    // Do NOT update LAST_SENT_DATE — we want tomorrow's trigger to retry.
    throw err;
  }
}

/**
 * Build the plain-text reminder body. Kept as plain text intentionally —
 * higher inbox-deliverability than HTML for low-volume personal sends.
 */
function buildEmailBody(ctx) {
  const dateStr = Utilities.formatDate(ctx.eventDate, ctx.tz, 'EEEE, MMMM d');
  const whenLine = ctx.eventTime
    ? dateStr + ' at ' + ctx.eventTime
    : dateStr;

  const lines = [];
  lines.push('Hi ' + ctx.guestName + ',');
  lines.push('');
  lines.push('Quick reminder that ' + ctx.eventName + ' is tomorrow.');
  lines.push('');
  lines.push('  When:  ' + whenLine);
  if (ctx.venueName) lines.push('  Where: ' + ctx.venueName);
  if (ctx.venueMap)  lines.push('  Map:   ' + ctx.venueMap);
  if (ctx.potluck) {
    lines.push('  You\'re bringing: ' + ctx.potluck);
  }
  lines.push('');
  lines.push('No need to reply — just see you there. If anything changes on your end, hit reply and let me know.');
  lines.push('');
  lines.push('— ' + ctx.hostName);
  return lines.join('\n');
}

/**
 * Utility you can run manually from the editor to clear the idempotency lock
 * (e.g. you sent reminders, noticed a typo in the venue, and want to resend).
 */
function resetLastSentDate() {
  PropertiesService.getScriptProperties().deleteProperty('LAST_SENT_DATE');
  Logger.log('LAST_SENT_DATE cleared. Next sendReminders() run will execute.');
}
