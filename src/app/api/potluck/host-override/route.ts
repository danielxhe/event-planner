import { NextResponse } from 'next/server';
import { findEventBySlug, getPotluckItem, setPotluckHostOverride } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import type { HostOverride, PotluckDietaryTag } from '@/lib/schema';

const VALID_DIETARY_TAGS: PotluckDietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

interface Body {
  slug: string;
  hostSecret: string;
  itemId: string;
  override: Partial<HostOverride> | null;
  showHostValue?: boolean;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug || !body.hostSecret || !body.itemId) {
    return NextResponse.json({ error: 'Missing slug, hostSecret, or itemId' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const item = await getPotluckItem(body.itemId);
  if (!item || item.eventId !== event.id) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Build a clean override from the body, or null to clear it.
  let override: HostOverride | null = null;
  if (body.override) {
    const o: HostOverride = {};
    if (typeof body.override.item === 'string' && body.override.item.trim()) {
      o.item = body.override.item.trim().slice(0, 80);
    }
    if (typeof body.override.category === 'string' && body.override.category.trim()) {
      const cat = body.override.category.trim();
      // Validate against the event's configured categories so a typo can't
      // strand the item in a group that doesn't render.
      if (!event.spreadCategories.some(c => c.name === cat)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      o.category = cat;
    }
    if (typeof body.override.claimer === 'string' && body.override.claimer.trim()) {
      o.claimer = body.override.claimer.trim().slice(0, 80);
    }
    if (body.override.serves != null) {
      if (!(Number.isFinite(body.override.serves) && body.override.serves > 0)) {
        return NextResponse.json({ error: 'Servings must be a positive number' }, { status: 400 });
      }
      o.serves = Math.round(body.override.serves);
    }
    if (Array.isArray(body.override.dietaryTags)) {
      o.dietaryTags = body.override.dietaryTags.filter(
        (t): t is PotluckDietaryTag => VALID_DIETARY_TAGS.includes(t as PotluckDietaryTag)
      );
    }
    if (Object.keys(o).length > 0) override = o;
  }

  const updated = await setPotluckHostOverride({
    itemId: item.id,
    override,
    showHostValue: !!body.showHostValue,
  });

  return NextResponse.json({ ok: true, item: updated });
}
