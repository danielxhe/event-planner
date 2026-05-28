import { NextResponse } from 'next/server';
import {
  findEventBySlug,
  listPotluckByEvent,
  updatePotluckItem,
  updateEventCategories,
} from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import type { CategoryConfig } from '@/lib/schema';

interface IncomingCategory {
  id?: string;
  name?: string;
  target?: number | null;
  perGuest?: number | null;
}

interface Body {
  slug: string;
  hostSecret: string;
  categories: IncomingCategory[];
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug || !body.hostSecret) {
    return NextResponse.json({ error: 'Missing slug or hostSecret' }, { status: 400 });
  }
  if (!Array.isArray(body.categories)) {
    return NextResponse.json({ error: 'categories[] required' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Sanitize incoming list: drop blanks, clamp, ensure ids and unique names.
  const seen = new Set<string>();
  const cleaned: CategoryConfig[] = [];
  for (const c of body.categories) {
    const name = (c.name ?? '').trim().slice(0, 40);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return NextResponse.json({ error: `Duplicate category "${name}"` }, { status: 400 });
    }
    seen.add(key);
    cleaned.push({
      id: c.id && typeof c.id === 'string' ? c.id : `cat-${Math.random().toString(36).slice(2, 10)}`,
      name,
      target: typeof c.target === 'number' && c.target >= 0 ? Math.round(c.target) : null,
      perGuest: typeof c.perGuest === 'number' && c.perGuest > 0 ? c.perGuest : null,
    });
  }
  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'Keep at least one category' }, { status: 400 });
  }

  const oldById = new Map(event.spreadCategories.map(c => [c.id, c]));
  const newIds = new Set(cleaned.map(c => c.id));
  const items = await listPotluckByEvent(event.id);

  // Block deleting a category that still has items.
  for (const old of event.spreadCategories) {
    if (!newIds.has(old.id)) {
      const count = items.filter(i => i.category === old.name).length;
      if (count > 0) {
        return NextResponse.json(
          { error: `"${old.name}" still has ${count} item${count === 1 ? '' : 's'}. Move or remove them first.` },
          { status: 409 }
        );
      }
    }
  }

  // Apply renames: move existing items from the old name to the new name.
  const renames: { from: string; to: string }[] = [];
  for (const c of cleaned) {
    const old = oldById.get(c.id);
    if (old && old.name !== c.name) renames.push({ from: old.name, to: c.name });
  }
  for (const r of renames) {
    const toMove = items.filter(i => i.category === r.from);
    for (const item of toMove) {
      await updatePotluckItem({ itemId: item.id, category: r.to });
    }
  }

  await updateEventCategories(event.id, cleaned);
  return NextResponse.json({ ok: true, categories: cleaned });
}
