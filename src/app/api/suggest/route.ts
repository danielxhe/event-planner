// Smart Potluck endpoint.
// 'manual_stub' (Phase 1): host passes their own suggestions; we log + create items.
// 'claude_api' (Phase 2): server calls the AI provider (Gemini or Claude,
// resolved from env — see lib/suggest.ts), returns suggestions for host
// review — nothing is added to the spread until /api/suggest/resolve.
// Both modes log the identical context snapshot, so Phase 1 rows score Phase 2.

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  findEventBySlug,
  createPotluckItem,
  createSuggestionRun,
  listRsvpsByEvent,
  listGuestsByIds,
  listPotluckByEvent,
} from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import {
  applyAllergenGuardrail,
  buildSuggestionContext,
  generateSuggestions,
  SuggestionServiceBusyError,
} from '@/lib/suggest';
import type { PotluckCategory, PotluckDietaryTag } from '@/lib/schema';

// Claude call + Notion writes can exceed the default function window.
export const maxDuration = 60;

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
  acceptAll?: boolean;                   // manual_stub only
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

  // Snapshot the full context at run time — the eval substrate for both modes.
  const [rsvps, potluck] = await Promise.all([
    listRsvpsByEvent(event.id),
    listPotluckByEvent(event.id),
  ]);
  const attending = rsvps.filter(r => r.status === 'Yes' || r.status === 'Maybe');
  const guests = await listGuestsByIds([...new Set(attending.map(r => r.guestId))]);
  const context = buildSuggestionContext(event, rsvps, guests, potluck);

  if (body.mode === 'claude_api') {
    let suggestions;
    let model = '';
    let guardrailActions: string[] = [];
    try {
      const generated = await generateSuggestions(context);
      model = generated.model;
      ({ suggestions, actions: guardrailActions } = applyAllergenGuardrail(generated.suggestions));
    } catch (err) {
      const overloaded =
        err instanceof Anthropic.APIError && typeof err.status === 'number' && err.status >= 500;
      if (
        err instanceof SuggestionServiceBusyError ||
        err instanceof Anthropic.RateLimitError ||
        overloaded
      ) {
        return NextResponse.json(
          { error: 'The suggestion service is busy — try again in a minute.' },
          { status: 503 }
        );
      }
      console.error('Smart Potluck generation failed:', err);
      return NextResponse.json(
        { error: 'Suggestion generation failed. You can retry, or add items manually.' },
        { status: 502 }
      );
    }

    const run = await createSuggestionRun({
      eventId: event.id,
      runLabel: body.runLabel ?? `AI run ${new Date().toISOString()}`,
      mode: 'claude_api',
      inputs: context,
      suggestions,
      notes: [body.notes, `model: ${model}`, ...guardrailActions].filter(Boolean).join('\n') || undefined,
    });

    return NextResponse.json({ ok: true, runId: run.id, suggestions });
  }

  // ----- Phase 1 manual stub -----
  const suggestions: SuggestionInput[] = body.suggestions ?? [];
  if (suggestions.length === 0) {
    return NextResponse.json(
      { error: 'manual_stub mode requires suggestions[] (Phase 1: host enters their own)' },
      { status: 400 }
    );
  }

  const run = await createSuggestionRun({
    eventId: event.id,
    runLabel: body.runLabel ?? `Run ${new Date().toLocaleString()}`,
    mode: 'manual_stub',
    inputs: context,
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
        hostEstimate: s.serves,
        dietaryTags: s.dietaryTags,
        source: 'ai_suggested',
      });
      createdItems.push(item);
    }
  }

  return NextResponse.json({ ok: true, runId: run.id, createdItems });
}
