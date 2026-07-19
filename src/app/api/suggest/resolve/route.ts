// Host review verdict for an AI suggestion run: create potluck items for the
// accepted suggestions, log accepted + rejected back onto the run so the eval
// scorer can compute accept rate and dietary precision/recall per run.

import { NextResponse } from 'next/server';
import {
  findEventBySlug,
  createPotluckItem,
  updateSuggestionRun,
} from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import type { PotluckCategory, PotluckDietaryTag } from '@/lib/schema';

interface ReviewedSuggestion {
  category: PotluckCategory;
  itemName: string;
  dietaryTags?: PotluckDietaryTag[];
  serves?: number;
  rationale?: string;
}

interface ResolveBody {
  slug: string;
  hostSecret: string;
  runId: string;
  accepted: ReviewedSuggestion[];
  rejected: ReviewedSuggestion[];
}

export async function POST(req: Request) {
  let body: ResolveBody;
  try {
    body = (await req.json()) as ResolveBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.slug || !body.hostSecret || !body.runId) {
    return NextResponse.json({ error: 'Missing slug, hostSecret, or runId' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const accepted = body.accepted ?? [];
  const rejected = body.rejected ?? [];

  const createdItems = [];
  for (const s of accepted) {
    if (!s.itemName?.trim()) continue;
    const item = await createPotluckItem({
      eventId: event.id,
      item: s.itemName.trim(),
      category: s.category,
      hostEstimate: s.serves,
      dietaryTags: s.dietaryTags,
      source: 'ai_suggested',
    });
    createdItems.push(item);
  }

  await updateSuggestionRun(body.runId, {
    hostAccepted: accepted,
    hostRejected: rejected,
  });

  return NextResponse.json({ ok: true, createdItems });
}
