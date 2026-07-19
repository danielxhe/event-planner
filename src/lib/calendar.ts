// Add-to-calendar helpers. Research basis: the post-RSVP screen should offer
// add-to-calendar + share — the two actions that fight no-show rates.

import type { Event } from './schema';

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

// Notion date-only values ("2026-06-06") parse as UTC midnight and shift a
// day when formatted in a western timezone — anchor them at local noon.
export function safeEventDate(raw: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
}

function toUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
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
  const window = eventWindow(event);
  if (!window) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${toUtcStamp(window.start)}/${toUtcStamp(window.end)}`,
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
  const window = eventWindow(event);
  if (!window) return null;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spread//Event//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@spread`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(window.start)}`,
    `DTEND:${toUtcStamp(window.end)}`,
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
