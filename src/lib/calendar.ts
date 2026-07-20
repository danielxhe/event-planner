// Add-to-calendar helpers. Research basis: the post-RSVP screen should offer
// add-to-calendar + share — the two actions that fight no-show rates.

import type { Event } from './schema';

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

// Notion dates come in two shapes: date-only ("2026-06-06", time unknown) and
// full datetimes. Treating date-only as UTC midnight puts the party on the
// wrong DAY for anyone west of Greenwich (verified live: DTSTART:20260606T000000Z
// renders as June 5, 8 PM in New York). Date-only events must become all-day
// calendar entries, never timed ones.
export function isDateOnly(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

// Anchor date-only values at local noon so formatting never shifts the day.
export function safeEventDate(raw: string): Date {
  return new Date(isDateOnly(raw) ? `${raw}T12:00:00` : raw);
}

// Shared display formatter: show a time only when the event actually has one
// (date-only events were rendering as "at 12:00 AM" to every guest).
export function formatEventDate(raw: string, month: 'long' | 'short' = 'long'): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', month, day: 'numeric' };
  if (!isDateOnly(raw)) {
    opts.hour = 'numeric';
    opts.minute = '2-digit';
  }
  return safeEventDate(raw).toLocaleString('en-US', opts);
}

function toUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// All-day format: compact date plus the exclusive next day.
function allDayRange(raw: string): { start: string; end: string } {
  const start = raw.replaceAll('-', '');
  const next = new Date(`${raw}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString().slice(0, 10).replaceAll('-', '');
  return { start, end };
}

function eventWindow(event: Pick<Event, 'date'>): { start: Date; end: Date } | null {
  if (!event.date) return null;
  const start = new Date(event.date);
  if (isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + DEFAULT_DURATION_MS) };
}

export function googleCalendarUrl(
  event: Pick<Event, 'name' | 'date' | 'venueName' | 'venueAddress' | 'description'>,
  eventUrl: string,
): string | null {
  if (!event.date) return null;
  let dates: string;
  if (isDateOnly(event.date)) {
    const r = allDayRange(event.date);
    dates = `${r.start}/${r.end}`;
  } else {
    const window = eventWindow(event);
    if (!window) return null;
    dates = `${toUtcStamp(window.start)}/${toUtcStamp(window.end)}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates,
    details: [event.description, eventUrl].filter(Boolean).join('\n\n'),
    location: [event.venueName, event.venueAddress].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function buildIcs(
  event: Pick<Event, 'id' | 'name' | 'date' | 'venueName' | 'venueAddress' | 'description'>,
  eventUrl: string,
): string | null {
  if (!event.date) return null;
  let dtLines: string[];
  if (isDateOnly(event.date)) {
    const r = allDayRange(event.date);
    dtLines = [`DTSTART;VALUE=DATE:${r.start}`, `DTEND;VALUE=DATE:${r.end}`];
  } else {
    const window = eventWindow(event);
    if (!window) return null;
    dtLines = [`DTSTART:${toUtcStamp(window.start)}`, `DTEND:${toUtcStamp(window.end)}`];
  }
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spread//Event//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@spread`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    ...dtLines,
    `SUMMARY:${icsEscape(event.name)}`,
    ...(event.venueName || event.venueAddress
      ? [`LOCATION:${icsEscape([event.venueName, event.venueAddress].filter(Boolean).join(', '))}`]
      : []),
    `DESCRIPTION:${icsEscape([event.description, eventUrl].filter(Boolean).join('\n\n'))}`,
    `URL:${eventUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}
