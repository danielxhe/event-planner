import { NextResponse } from 'next/server';
import { unclaimPotluck, findGuestByPhone } from '@/lib/notion';
import { normalizePhone } from '@/lib/phone';

interface UnclaimBody {
  itemId: string;
  phone: string;
}

export async function POST(req: Request) {
  let body: UnclaimBody;
  try {
    body = (await req.json()) as UnclaimBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 });

  const guest = await findGuestByPhone(phone);
  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

  try {
    const item = await unclaimPotluck(body.itemId, guest.id);
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unclaim failed' },
      { status: 403 }
    );
  }
}
