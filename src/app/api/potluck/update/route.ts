import { NextResponse } from 'next/server';
import {
  findEventBySlug,
  findGuestByPhone,
  getPotluckItem,
  updatePotluckItem,
} from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';

interface Body {
  slug: string;
  phone: string;
  itemId: string;
  item?: string;
  category?: string;
  servings?: number;
  dietaryTags?: string[];
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
  if (item.claimedByGuestId !== guest.id) {
    return NextResponse.json({ error: 'You can only edit your own items' }, { status: 403 });
  }

  // A guest can always adjust their own serving count. Renaming, recategorizing,
  // and tagging are only allowed on items the guest added themselves — not on a
  // host-created slot they merely claimed.
  const ownAddition = item.source === 'guest_added';
  const update: Parameters<typeof updatePotluckItem>[0] = { itemId: item.id };

  if (body.servings !== undefined) {
    if (!(Number.isFinite(body.servings) && (body.servings as number) > 0)) {
      return NextResponse.json({ error: 'Servings must be a positive number' }, { status: 400 });
    }
    update.serves = Math.round(body.servings);
  }

  if (body.item !== undefined || body.category !== undefined || body.dietaryTags !== undefined) {
    if (!ownAddition) {
      return NextResponse.json(
        { error: 'Only servings can be changed on a host-created item' },
        { status: 403 }
      );
    }
    if (body.item !== undefined) {
      if (!body.item.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
      update.item = body.item.trim().slice(0, 80);
    }
    if (body.category !== undefined) {
      if (!event.spreadCategories.some(c => c.name === body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      update.category = body.category;
    }
    if (body.dietaryTags !== undefined) {
      update.dietaryTags = body.dietaryTags;
    }
  }

  const updated = await updatePotluckItem(update);
  return NextResponse.json({ ok: true, item: updated });
}
