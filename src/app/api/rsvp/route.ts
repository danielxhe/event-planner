import { NextResponse } from 'next/server';
import { findEventBySlug, upsertGuestByPhone, upsertRsvp } from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';
import type { DietaryRestriction } from '@/lib/schema';

const DIETARY_OPTIONS: DietaryRestriction[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy',
  'Dairy-Free', 'Halal', 'Kosher', 'Other',
];

interface RsvpBody {
  slug: string;
  phone: string;
  name: string;
  status: 'Yes' | 'Maybe' | 'No';
  plusOnes?: number;
  notes?: string;
  email?: string;
  dietaryRestrictions?: string[];
  dietaryNotes?: string;
}

export async function POST(req: Request) {
  let body: RsvpBody;
  try {
    body = (await req.json()) as RsvpBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });

  if (!['Yes', 'Maybe', 'No'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event || !event.isPublished || event.cancelled) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const dietaryRestrictions = Array.isArray(body.dietaryRestrictions)
    ? (body.dietaryRestrictions.filter(r => DIETARY_OPTIONS.includes(r as DietaryRestriction)) as DietaryRestriction[])
    : undefined;

  const guest = await upsertGuestByPhone({
    phoneRaw: phone,
    name: body.name.trim(),
    email: body.email?.trim() || undefined,
    dietaryRestrictions,
    dietaryNotes: body.dietaryNotes?.trim(),
  });

  const rsvp = await upsertRsvp({
    eventId: event.id,
    guestId: guest.id,
    guestName: guest.name || body.name.trim(),
    status: body.status,
    plusOnes: Math.max(0, Math.min(guest.plusOnesAllowed, Number(body.plusOnes) || 0)),
    notes: body.notes?.trim() || undefined,
    source: 'form',
  });

  return NextResponse.json({
    ok: true,
    guestId: guest.id,
    rsvpId: rsvp.id,
    phone,
    saved: {
      name: guest.name,
      status: rsvp.status,
      plusOnes: rsvp.plusOnes,
      notes: rsvp.notes,
      dietaryRestrictions: guest.dietaryRestrictions,
      dietaryNotes: guest.dietaryNotes,
    },
  });
}
