import { NextResponse } from 'next/server';
import { findEventBySlug, createPotluckItem, archivePotluckItem } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';

interface CreateItemBody {
  slug: string;
  hostSecret: string;
  item: string;
  category: 'Appetizer' | 'Main' | 'Side' | 'Dessert' | 'Drinks' | 'Supplies';
  serves?: number;
  dietaryTags?: string[];
  source?: 'host_added' | 'ai_suggested';
  notes?: string;
}

export async function POST(req: Request) {
  let body: CreateItemBody;
  try {
    body = (await req.json()) as CreateItemBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.slug || !body.hostSecret) {
    return NextResponse.json({ error: 'Missing slug or hostSecret' }, { status: 400 });
  }
  if (!body.item?.trim()) return NextResponse.json({ error: 'Item required' }, { status: 400 });

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const item = await createPotluckItem({
    eventId: event.id,
    item: body.item.trim(),
    category: body.category,
    serves: body.serves,
    dietaryTags: body.dietaryTags,
    source: body.source ?? 'host_added',
    notes: body.notes,
  });

  return NextResponse.json({ ok: true, item });
}

interface DeleteItemBody {
  slug: string;
  hostSecret: string;
  itemId: string;
}

export async function DELETE(req: Request) {
  let body: DeleteItemBody;
  try {
    body = (await req.json()) as DeleteItemBody;
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

  await archivePotluckItem(body.itemId);
  return NextResponse.json({ ok: true });
}
