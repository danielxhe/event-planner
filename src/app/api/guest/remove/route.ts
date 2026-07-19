import { NextResponse } from 'next/server';
import { findEventBySlug, getRsvp, archiveRsvp, releaseGuestClaims } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';

interface Body {
  slug: string;
  hostSecret: string;
  rsvpId: string;
  guestId: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug || !body.hostSecret || !body.rsvpId || !body.guestId) {
    return NextResponse.json({ error: 'Missing slug, hostSecret, rsvpId, or guestId' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const rsvp = await getRsvp(body.rsvpId);
  if (!rsvp || rsvp.eventId !== event.id || rsvp.guestId !== body.guestId) {
    return NextResponse.json({ error: 'RSVP not found for this event' }, { status: 404 });
  }

  // Free their claimed dishes first, then take them off the roster. The shared
  // Guest record is left intact (it may belong to other events).
  const released = await releaseGuestClaims(event.id, body.guestId);
  await archiveRsvp(rsvp.id);

  return NextResponse.json({ ok: true, releasedClaims: released });
}
