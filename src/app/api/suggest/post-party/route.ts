// Post-party ground truth: the host records which claimed dishes actually
// showed up and whether any dietary claim failed in practice. The same array
// is written to every suggestion run for the event — the eval scorer matches
// each run's accepted items by name, so per-run filtering happens at read
// time. This is the data that turns "the AI suggested things" into "the AI's
// suggestions worked".

import { NextResponse } from 'next/server';
import { findEventBySlug, listSuggestionRunsByEvent, updateSuggestionRun } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';

interface ActualEntry {
  itemName: string;
  brought: boolean;
  dietaryOk: boolean;
  note?: string;
}

interface PostPartyBody {
  slug: string;
  hostSecret: string;
  actual: ActualEntry[];
}

export async function POST(req: Request) {
  let body: PostPartyBody;
  try {
    body = (await req.json()) as PostPartyBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.slug || !body.hostSecret) {
    return NextResponse.json({ error: 'Missing slug or hostSecret' }, { status: 400 });
  }
  if (!Array.isArray(body.actual)) {
    return NextResponse.json({ error: 'actual[] required' }, { status: 400 });
  }

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const actual: ActualEntry[] = body.actual
    .filter(a => a && typeof a.itemName === 'string' && a.itemName.trim())
    .map(a => ({
      itemName: a.itemName.trim().slice(0, 120),
      brought: !!a.brought,
      dietaryOk: a.dietaryOk !== false,
      ...(a.note?.trim() ? { note: a.note.trim().slice(0, 300) } : {}),
    }));

  const runs = await listSuggestionRunsByEvent(event.id);
  await Promise.all(runs.map(r => updateSuggestionRun(r.id, { postPartyActual: actual })));

  return NextResponse.json({ ok: true, runsUpdated: runs.length, entries: actual.length });
}
