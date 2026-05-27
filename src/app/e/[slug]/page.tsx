import { notFound } from 'next/navigation';
import { findEventBySlug, listRsvpsByEvent, listPotluckByEvent } from '@/lib/notion';
import { formatPhoneForDisplay } from '@/lib/phone';
import { estimatedHeadcountFromRsvps } from '@/lib/categories';
import { RsvpForm } from '@/components/RsvpForm';
import { PotluckList } from '@/components/PotluckList';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await findEventBySlug(slug);
  if (!event || !event.isPublished || event.cancelled) notFound();

  const [rsvps, potluck] = await Promise.all([
    listRsvpsByEvent(event.id),
    listPotluckByEvent(event.id),
  ]);

  const confirmedRsvps = rsvps.filter(r => r.status === 'Yes');

  // Map guestId → name from RSVPs (since RSVP title = guest name in V2)
  const guestNames: Record<string, string> = {};
  for (const r of rsvps) guestNames[r.guestId] = r.title;

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Date TBD';

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section
        className="relative px-6 pt-12 pb-10 sm:pt-20"
        style={
          event.coverPhotoUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.4), rgba(2,6,23,1)), url(${event.coverPhotoUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="mx-auto max-w-xl space-y-3">
          {event.isSurprise && (
            <div className="rounded-lg border border-pink-500/40 bg-pink-500/10 px-4 py-3 text-sm">
              🤫 <span className="font-semibold">Surprise event.</span> Do not share this link or post about it anywhere.
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{event.name}</h1>
          <p className="text-lg text-slate-300">{dateStr}</p>
          {event.venueName && (
            <div className="text-slate-400 leading-snug">
              {event.venueMapUrl ? (
                <a href={event.venueMapUrl} target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 underline-offset-4 hover:underline">
                  📍 {event.venueName}
                </a>
              ) : (
                <>📍 {event.venueName}</>
              )}
              {event.venueAddress && (
                <div className="text-sm text-slate-500 pl-6">{event.venueAddress}</div>
              )}
            </div>
          )}
          {event.hostPhone && (
            <p className="text-slate-400">
              <a href={`sms:${event.hostPhone}`} className="hover:text-slate-200 underline-offset-4 hover:underline">
                💬 Text the host: {formatPhoneForDisplay(event.hostPhone)}
              </a>
            </p>
          )}
          {event.dressCode && (
            <p className="inline-block rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-200">
              👔 {event.dressCode}
            </p>
          )}
          {event.description && (
            <p className="pt-2 text-slate-300 whitespace-pre-line">{event.description}</p>
          )}
        </div>
      </section>

      {/* RSVP */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-lg font-semibold">Are you coming?</h2>
          <RsvpForm slug={event.slug} plusOnesMax={2} targetHeadcount={event.targetHeadcount} />
        </div>
      </section>

      {/* Potluck */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-lg font-semibold">Bring a dish</h2>
          <PotluckList
            items={potluck}
            guests={guestNames}
            event={event}
            effectiveHeadcount={estimatedHeadcountFromRsvps(rsvps, event.targetHeadcount)}
          />
        </div>
      </section>

      {/* Guest list — hidden if surprise */}
      {!event.isSurprise && confirmedRsvps.length > 0 && (
        <section className="px-6 py-8">
          <div className="mx-auto max-w-xl">
            <h2 className="mb-4 text-lg font-semibold">
              Who&apos;s coming · {confirmedRsvps.length}
            </h2>
            <div className="flex flex-wrap gap-2">
              {confirmedRsvps.map(r => (
                <span key={r.id} className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">
                  {r.title}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="px-6 py-12 text-center text-xs text-slate-500">
        Made with Event Planner V2
      </footer>
    </main>
  );
}
