import { NextResponse } from 'next/server';
import {
  findEventBySlug,
  findGuestByPhone,
  getPotluckItem,
  archivePotluckItem,
} from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';

interface Body {
  slug: string;
  phone: string;
  itemId: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug || !body.itemId) {
    return NextResponse.json({ error: 'Missing slug or itemId' }, { status: 400 });
  }
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const event = await findEventBySlug(body.slug);
  if (!event || !event.isPublished || event.cancelled) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const guest = await findGuestByPhone(phone);
  if (!guest) return NextResponse.json({ error: 'RSVP first' }, { status: 403 });

  const item = await getPotluckItem(body.itemId);
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  // A guest may only delete an item they added themselves. To drop a host slot
  // they claimed, they release it instead.
  if (item.claimedByGuestId !== guest.id || item.source !== 'guest_added') {
    return NextResponse.json(
      { error: 'You can only delete items you added' },
      { status: 403 }
    );
  }

  await archivePotluckItem(item.id);
  return NextResponse.json({ ok: true });
}
