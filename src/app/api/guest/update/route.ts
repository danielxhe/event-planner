import { NextResponse } from 'next/server';
import { findEventBySlug, getRsvp, hostUpdateRsvp, hostUpdateGuest } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import type { DietaryRestriction, RsvpStatus } from '@/lib/schema';

const VALID_STATUS: RsvpStatus[] = ['Yes', 'Maybe', 'No', 'No Response'];
const VALID_DIETARY: DietaryRestriction[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy', 'Dairy-Free', 'Halal', 'Kosher', 'Other',
];

interface Body {
  slug: string;
  hostSecret: string;
  rsvpId: string;
  guestId: string;
  name?: string;
  status?: RsvpStatus;
  plusOnes?: number;
  dietaryRestrictions?: DietaryRestriction[];
  dietaryNotes?: string;
  notes?: string;
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

  if (body.status !== undefined && !VALID_STATUS.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  if (body.plusOnes !== undefined && !(Number.isInteger(body.plusOnes) && body.plusOnes >= 0)) {
    return NextResponse.json({ error: 'Plus-ones must be a non-negative integer' }, { status: 400 });
  }

  const name = body.name?.trim();

  await hostUpdateRsvp({
    rsvpId: rsvp.id,
    guestName: name || undefined,
    status: body.status,
    plusOnes: body.plusOnes,
    notes: body.notes,
  });

  // Touch the shared Guest record only when name/dietary were provided.
  if (name !== undefined || body.dietaryRestrictions !== undefined || body.dietaryNotes !== undefined) {
    await hostUpdateGuest({
      guestId: body.guestId,
      name: name || undefined,
      dietaryRestrictions: body.dietaryRestrictions?.filter(d => VALID_DIETARY.includes(d)),
      dietaryNotes: body.dietaryNotes,
    });
  }

  return NextResponse.json({ ok: true });
}
