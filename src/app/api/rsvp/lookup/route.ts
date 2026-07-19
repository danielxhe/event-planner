// Returning-guest recognition: given the phone this device already knows
// (localStorage), return the saved RSVP so the page can show "Welcome back,
// Dana — you're going" instead of a blank form. Phone is the identity key by
// design; this returns only what the guest themselves entered.

import { NextResponse } from 'next/server';
import { findEventBySlug, findGuestByPhone, findRsvp } from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const phoneRaw = searchParams.get('phone');
  if (!slug || !phoneRaw) {
    return NextResponse.json({ error: 'Missing slug or phone' }, { status: 400 });
  }
  const phone = normalizePhone(phoneRaw);
  if (!phone) return NextResponse.json({ found: false });

  const event = await findEventBySlug(slug);
  if (!event || !event.isPublished || event.cancelled) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const guest = await findGuestByPhone(phone);
  if (!guest) return NextResponse.json({ found: false });

  const rsvp = await findRsvp(event.id, guest.id);
  if (!rsvp || rsvp.status === 'No Response') return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    guestId: guest.id,
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
