import { NextResponse } from 'next/server';
import { claimPotluckAtomic, findGuestByPhone } from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';

interface ClaimBody {
  itemId: string;
  phone: string;
}

export async function POST(req: Request) {
  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const guest = await findGuestByPhone(phone);
  if (!guest) {
    return NextResponse.json(
      { error: 'RSVP first before claiming a dish' },
      { status: 403 }
    );
  }

  try {
    const item = await claimPotluckAtomic(body.itemId, guest.id);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Claim failed' },
      { status: 409 }
    );
  }
}
