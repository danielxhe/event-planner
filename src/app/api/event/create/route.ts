// Self-serve event creation — the front door for new hosts. Mints a
// non-guessable slug + host secret, creates the Notion Events row (published,
// default categories), and hands back both URLs. No account: the host-secret
// URL is the host's only credential, so the client must show it with a
// "bookmark this" moment.

import { NextResponse } from 'next/server';
import { createEvent, findEventBySlug } from '@/lib/notion';
import { generateEventSlug, generateHostSecret } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

interface CreateEventBody {
  name: string;
  date?: string;
  venueName?: string;
  venueAddress?: string;
  description?: string;
  targetHeadcount?: number;
  isSurprise?: boolean;
  hostPhone?: string;
}

const clip = (s: unknown, max: number) =>
  typeof s === 'string' ? s.trim().slice(0, max) : '';

export async function POST(req: Request) {
  let body: CreateEventBody;
  try {
    body = (await req.json()) as CreateEventBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = clip(body.name, 80);
  if (!name) return NextResponse.json({ error: 'Event name required' }, { status: 400 });

  let date: string | undefined;
  if (body.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || Number.isNaN(Date.parse(body.date))) {
      return NextResponse.json({ error: 'Date must be YYYY-MM-DD' }, { status: 400 });
    }
    date = body.date;
  }

  const targetHeadcount =
    Number.isFinite(body.targetHeadcount) && (body.targetHeadcount as number) > 0
      ? Math.min(Math.round(body.targetHeadcount as number), 500)
      : undefined;

  const hostPhone = body.hostPhone ? normalizePhone(body.hostPhone) ?? undefined : undefined;

  // Collision on a 16-char random slug is effectively impossible, but a
  // duplicate would leak another event's page — so check, and retry once.
  let slug = generateEventSlug();
  if (await findEventBySlug(slug)) slug = generateEventSlug();
  const hostSecret = generateHostSecret();

  const event = await createEvent({
    name,
    slug,
    hostSecret,
    date,
    venueName: clip(body.venueName, 120) || undefined,
    venueAddress: clip(body.venueAddress, 200) || undefined,
    description: clip(body.description, 2000) || undefined,
    targetHeadcount,
    isSurprise: !!body.isSurprise,
    hostPhone,
  });

  return NextResponse.json({
    ok: true,
    slug: event.slug,
    hostSecret,
    guestPath: `/e/${event.slug}`,
    hostPath: `/host/${hostSecret}/${event.slug}`,
  });
}
