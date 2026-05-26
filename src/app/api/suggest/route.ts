// Smart Potluck endpoint.
// V2.0: 'manual_stub' mode — host passes their own suggestions; we log + create items.
// V2.1: 'claude_api' mode — server calls Anthropic, returns suggestions, logs the same shape.

import { NextResponse } from 'next/server';
import {
  findEventBySlug,
  createPotluckItem,
  createSuggestionRun,
  listRsvpsByEvent,
  listPotluckByEvent,
} from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import type { PotluckCategory, PotluckDietaryTag, SuggestionInputs } from '@/lib/schema';

interface SuggestionInput {
  category: PotluckCategory;
  itemName: string;
  dietaryTags?: PotluckDietaryTag[];
  serves?: number;
  rationale?: string;
}

interface SuggestBody {
  slug: string;
  hostSecret: string;
  mode: 'manual_stub' | 'claude_api';
  suggestions?: SuggestionInput[];      // required for manual_stub
  acceptAll?: boolean;                   // if true, create Potluck Items rows for each suggestion
  runLabel?: string;
  notes?: string;
}

export async function POST(req: Request) {
  let body: SuggestBody;
  try {
    body = (await req.json()) as SuggestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.slug || !body.hostSecret) {
    return NextResponse.json({ error: 'Missing slug or hostSecret' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Snapshot the inputs at run time — this is the Phase 1 eval substrate
  const [rsvps, potluck] = await Promise.all([
    listRsvpsByEvent(event.id),
    listPotluckByEvent(event.id),
  ]);
  const confirmed = rsvps.filter(r => r.status === 'Yes');
  const maybe = rsvps.filter(r => r.status === 'Maybe');
  const plusOnesConfirmed = confirmed.reduce((s, r) => s + (r.plusOnes ?? 0), 0);

  const claimsByCategory: Record<PotluckCategory, number> = {
    Appetizer: 0, Main: 0, Side: 0, Dessert: 0, Drinks: 0, Supplies: 0,
  };
  for (const p of potluck) claimsByCategory[p.category]++;

  const inputs: SuggestionInputs = {
    confirmedCount: confirmed.length,
    maybeCount: maybe.length,
    plusOnesConfirmed,
    targetHeadcount: event.targetHeadcount ?? 10,
    dietaryAggregate: {},  // Dietary aggregate would join RSVP→Guest→DietaryRestrictions; deferred to V2.1
    currentClaimsByCategory: claimsByCategory,
  };

  let suggestions: SuggestionInput[] = body.suggestions ?? [];

  if (body.mode === 'claude_api') {
    return NextResponse.json(
      { error: 'claude_api mode not implemented in V2.0 — ships in V2.1' },
      { status: 501 }
    );
  }

  if (body.mode === 'manual_stub' && suggestions.length === 0) {
    return NextResponse.json(
      { error: 'manual_stub mode requires suggestions[] (Phase 1: host enters their own)' },
      { status: 400 }
    );
  }

  const run = await createSuggestionRun({
    eventId: event.id,
    runLabel: body.runLabel ?? `Run ${new Date().toLocaleString()}`,
    mode: 'manual_stub',
    inputs,
    suggestions,
    notes: body.notes,
  });

  const createdItems = [];
  if (body.acceptAll) {
    for (const s of suggestions) {
      const item = await createPotluckItem({
        eventId: event.id,
        item: s.itemName,
        category: s.category,
        serves: s.serves,
        dietaryTags: s.dietaryTags,
        source: 'ai_suggested',
      });
      createdItems.push(item);
    }
  }

  return NextResponse.json({ ok: true, runId: run.id, createdItems });
}
