import { NextResponse } from 'next/server';
import {
  createPotluckItem,
  claimPotluckAtomic,
  findEventBySlug,
  findGuestByPhone,
} from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';
import type { PotluckCategory } from '@/lib/schema';
import { DEFAULTS_PER_DISH, ALL_CATEGORIES } from '@/lib/categories';

interface AddBody {
  slug: string;
  phone: string;
  item: string;
  category: PotluckCategory;
  servings?: number;
}

export async function POST(req: Request) {
  let body: AddBody;
  try {
    body = (await req.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  if (!body.item || !body.item.trim())
    return NextResponse.json({ error: 'Dish name required' }, { status: 400 });
  if (!ALL_CATEGORIES.includes(body.category))
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const event = await findEventBySlug(body.slug);
  if (!event || !event.isPublished || event.cancelled) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const guest = await findGuestByPhone(phone);
  if (!guest) {
    return NextResponse.json(
      { error: 'RSVP first before adding a dish' },
      { status: 403 }
    );
  }

  const servings = Number.isFinite(body.servings) && (body.servings as number) > 0
    ? Math.round(body.servings as number)
    : DEFAULTS_PER_DISH[body.category];

  try {
    const created = await createPotluckItem({
      eventId: event.id,
      item: body.item.trim().slice(0, 80),
      category: body.category,
      serves: servings,
      source: 'guest_added',
    });
    const claimed = await claimPotluckAtomic(created.id, guest.id);
    return NextResponse.json({ ok: true, item: claimed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add dish' },
      { status: 500 }
    );
  }
}
