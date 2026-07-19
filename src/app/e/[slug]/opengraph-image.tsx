// Per-event OG card — what the invite link unfurls into inside iMessage,
// WhatsApp, and group chats. Generated on demand from live event data.

import { ImageResponse } from 'next/og';
import { findEventBySlug } from '@/lib/notion';
import { safeEventDate } from '@/lib/calendar';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Party invitation';

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findEventBySlug(slug).catch(() => null);
  const visible = !!event && event.isPublished && !event.cancelled;

  const name = visible ? event.name : 'Spread';
  const dateStr =
    visible && event.date
      ? safeEventDate(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : null;
  const venue = visible ? event.venueName : null;
  const subtitle = [dateStr, venue].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 55%, #0f172a 100%)',
          color: 'white',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 34, color: '#c4b5fd' }}>
          🎉 You&apos;re invited
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: name.length > 28 ? 60 : 78,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          {subtitle && (
            <div style={{ display: 'flex', fontSize: 36, color: '#e2e8f0' }}>{subtitle}</div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 28,
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex' }}>RSVP in 5 seconds · no account needed</div>
          <div style={{ display: 'flex', color: '#c4b5fd', fontWeight: 700 }}>Spread 🍽️</div>
        </div>
      </div>
    ),
    size
  );
}
