import { notFound } from 'next/navigation';
import { findEventBySlug, listRsvpsByEvent, listPotluckByEvent, listGuestsByIds } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import { SmartPotluckPanel } from '@/components/SmartPotluckPanel';
import { HostItemAdder } from '@/components/HostItemAdder';
import { PotluckDeleteButton } from '@/components/PotluckDeleteButton';
import { ReminderPanel, type Recipient } from '@/components/ReminderPanel';
import type { PotluckCategory } from '@/lib/schema';

interface PageProps {
  params: Promise<{ secret: string; slug: string }>;
}

const CATEGORY_ORDER: PotluckCategory[] = ['Appetizer', 'Main', 'Side', 'Dessert', 'Drinks', 'Supplies'];

export default async function HostPage({ params }: PageProps) {
  const { secret, slug } = await params;
  const event = await findEventBySlug(slug);
  if (!event) notFound();

  if (!hostSecretValid(secret, event.hostSecret)) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Not authorized</h1>
          <p className="text-slate-400">This host URL is invalid for this event.</p>
        </div>
      </main>
    );
  }

  const [rsvps, potluck] = await Promise.all([
    listRsvpsByEvent(event.id),
    listPotluckByEvent(event.id),
  ]);

  const yes = rsvps.filter(r => r.status === 'Yes');
  const maybe = rsvps.filter(r => r.status === 'Maybe');
  const no = rsvps.filter(r => r.status === 'No');

  // Pull phones for Yes/Maybe so the reminder panel can text them.
  const reminderRsvps = [...yes, ...maybe];
  const guests = await listGuestsByIds(reminderRsvps.map(r => r.guestId));
  const guestById = new Map(guests.map(g => [g.id, g]));
  const recipients: Recipient[] = reminderRsvps
    .map(r => {
      const g = guestById.get(r.guestId);
      if (!g?.phone) return null;
      return {
        name: g.name || r.title || g.phone,
        phone: g.phone,
        status: r.status as 'Yes' | 'Maybe',
      };
    })
    .filter((r): r is Recipient => r !== null);

  const eventDateStr = event.date
    ? new Date(event.date).toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'soon';
  const defaultReminderMessage =
    `Hey! Just a reminder about ${event.name} — ${eventDateStr}` +
    (event.venueName ? ` at ${event.venueName}` : '') +
    `. Can't wait to see you!`;
  const plusOnesConfirmed = yes.reduce((s, r) => s + (r.plusOnes ?? 0), 0);
  const plusOnesMaybe = maybe.reduce((s, r) => s + (r.plusOnes ?? 0), 0);
  const estimatedHeadcount = Math.round(
    (yes.length + plusOnesConfirmed) + 0.5 * (maybe.length + plusOnesMaybe)
  );

  const claimsByCategory: Record<PotluckCategory, number> = {
    Appetizer: 0, Main: 0, Side: 0, Dessert: 0, Drinks: 0, Supplies: 0,
  };
  for (const p of potluck) claimsByCategory[p.category]++;

  // guestId → name (for displaying who claimed what)
  const guestNames: Record<string, string> = {};
  for (const r of rsvps) guestNames[r.guestId] = r.title;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Header */}
        <header>
          <div className="text-xs uppercase tracking-wider text-purple-300/70 mb-1">Host dashboard</div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="mt-1 text-sm text-slate-400">
            {event.date && new Date(event.date).toLocaleString()}
            {event.isSurprise && (
              <span className="ml-3 rounded bg-pink-500/20 text-pink-300 px-2 py-0.5 text-xs">🤫 Surprise</span>
            )}
            {!event.isPublished && (
              <span className="ml-2 rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-xs">Unpublished</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Guest link: <code className="text-slate-300">/e/{event.slug}</code>
          </div>
        </header>

        {/* Headcount summary */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Target" value={event.targetHeadcount ?? '—'} tone="slate" />
          <StatCard label="Yes" value={yes.length} sub={`+${plusOnesConfirmed} plus-ones`} tone="emerald" />
          <StatCard label="Maybe" value={maybe.length} sub={`+${plusOnesMaybe} plus-ones`} tone="amber" />
          <StatCard label="No" value={no.length} tone="rose" />
          <StatCard label="Est. headcount" value={estimatedHeadcount} tone="purple" />
        </section>

        {/* Smart Potluck */}
        <SmartPotluckPanel
          slug={event.slug}
          hostSecret={event.hostSecret}
          inputs={{
            confirmedCount: yes.length,
            maybeCount: maybe.length,
            plusOnesConfirmed,
            targetHeadcount: event.targetHeadcount ?? 10,
            currentClaimsByCategory: claimsByCategory,
          }}
        />

        {/* Potluck management */}
        <section className="rounded-xl bg-slate-900 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold">Potluck items · {potluck.length}</h2>
          </div>
          <div className="mb-4">
            <HostItemAdder slug={event.slug} hostSecret={event.hostSecret} />
          </div>
          {potluck.length === 0 ? (
            <p className="text-sm text-slate-400">No items yet. Add one above or use Smart Potluck.</p>
          ) : (
            <div className="space-y-4">
              {CATEGORY_ORDER.map(cat => {
                const items = potluck.filter(p => p.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <h3 className="text-xs uppercase tracking-wide text-slate-400 mb-1">{cat}</h3>
                    <ul className="space-y-1">
                      {items.map(item => (
                        <li
                          key={item.id}
                          className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                            item.claimedByGuestId
                              ? 'bg-emerald-500/5 border-l-2 border-emerald-500/50'
                              : 'bg-slate-800/50 border-l-2 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate">{item.item}</span>
                            {item.source === 'ai_suggested' && (
                              <span className="text-[10px] rounded bg-purple-500/20 text-purple-300 px-1.5 py-0.5">AI</span>
                            )}
                            {item.dietaryTags.map(t => (
                              <span key={t} className="text-[10px] rounded bg-slate-700 text-slate-300 px-1.5 py-0.5">{t}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <span className="text-xs text-slate-400">
                              {item.claimedByGuestId
                                ? guestNames[item.claimedByGuestId] ?? 'Claimed'
                                : '🟡 open'}
                            </span>
                            <PotluckDeleteButton
                              slug={event.slug}
                              hostSecret={event.hostSecret}
                              itemId={item.id}
                              itemLabel={item.item}
                              isClaimed={!!item.claimedByGuestId}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Roster */}
        <section className="rounded-xl bg-slate-900 p-5">
          <h2 className="text-lg font-semibold mb-3">Roster · {rsvps.length}</h2>
          {rsvps.length === 0 ? (
            <p className="text-sm text-slate-400">No RSVPs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">+1</th>
                  <th className="text-left py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map(r => (
                  <tr key={r.id} className="border-b border-slate-800/60">
                    <td className="py-2 font-medium">{r.title}</td>
                    <td className="py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          r.status === 'Yes' ? 'bg-emerald-500/20 text-emerald-300'
                            : r.status === 'Maybe' ? 'bg-amber-500/20 text-amber-300'
                            : r.status === 'No' ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">{r.plusOnes}</td>
                    <td className="py-2 text-slate-400 truncate max-w-xs">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Reminder panel */}
        <ReminderPanel
          recipients={recipients}
          isSurprise={event.isSurprise}
          defaultMessage={defaultReminderMessage}
        />

        <footer className="text-xs text-slate-500 text-center pt-8">
          🔒 Host-only URL. Don&apos;t share. Bookmark this page.
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label, value, sub, tone,
}: {
  label: string; value: number | string; sub?: string;
  tone: 'slate' | 'emerald' | 'amber' | 'rose' | 'purple';
}) {
  const tones = {
    slate: 'bg-slate-900 text-slate-100',
    emerald: 'bg-emerald-500/10 text-emerald-100 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-100 border border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-100 border border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-100 border border-purple-500/20',
  };
  return (
    <div className={`rounded-lg p-3 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs opacity-60">{sub}</div>}
    </div>
  );
}
