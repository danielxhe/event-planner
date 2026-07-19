// Downloadable .ics for an event, so the post-RSVP screen can offer
// add-to-calendar on Apple/Outlook as well as the Google link.

import { NextResponse } from 'next/server';
import { findEventBySlug } from '@/lib/notion';
import { buildIcs } from '@/lib/calendar';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const event = await findEventBySlug(slug);
  if (!event || !event.isPublished || event.cancelled) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const base = process.env.NEXT_PUBLIC_APP_BASE_URL || origin;
  const ics = buildIcs(event, `${base}/e/${event.slug}`);
  if (!ics) return NextResponse.json({ error: 'Event has no date yet' }, { status: 400 });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
