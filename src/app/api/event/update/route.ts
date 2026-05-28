import { NextResponse } from 'next/server';
import { findEventBySlug, updateEvent, type UpdateEventInput } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

interface Body extends Partial<UpdateEventInput> {
  slug: string;
  hostSecret: string;
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

  const event = await findEventBySlug(body.slug);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!hostSecretValid(body.hostSecret, event.hostSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Normalize the host phone if one was supplied (keep null/empty as a clear).
  const hostPhone =
    body.hostPhone === undefined
      ? undefined
      : body.hostPhone
      ? normalizePhone(body.hostPhone) ?? body.hostPhone
      : null;

  const updated = await updateEvent({
    eventId: event.id,
    name: body.name,
    date: body.date,
    venueName: body.venueName,
    venueAddress: body.venueAddress,
    venueMapUrl: body.venueMapUrl,
    hostPhone,
    dressCode: body.dressCode,
    description: body.description,
    targetHeadcount: body.targetHeadcount,
    plusOnesMax: body.plusOnesMax,
    isPublished: body.isPublished,
    isSurprise: body.isSurprise,
    hideClaimerNames: body.hideClaimerNames,
  });

  return NextResponse.json({ ok: true, event: { slug: updated.slug } });
}
