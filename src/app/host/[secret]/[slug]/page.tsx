import { notFound } from 'next/navigation';
import { findEventBySlug, listRsvpsByEvent, listPotluckByEvent, listGuestsByIds } from '@/lib/notion';
import { hostSecretValid } from '@/lib/auth';
import { SmartPotluckPanel } from '@/components/SmartPotluckPanel';
import { HostItemAdder } from '@/components/HostItemAdder';
import { PotluckDeleteButton } from '@/components/PotluckDeleteButton';
import { ReminderPanel, type Recipient } from '@/components/ReminderPanel';
import { CategoryEditor } from '@/components/CategoryEditor';
import { EventDetailsEditor } from '@/components/EventDetailsEditor';
import { computeCategoryStats } from '@/lib/categories';

interface PageProps {
  params: Promise<{ secret: string; slug: string }>;
}

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

  // Pull every responder's guest record so we can show dietary info and text people.
  const guests = await listGuestsByIds([...new Set(rsvps.map(r => r.guestId))]);
  const guestById = new Map(guests.map(g => [g.id, g]));

  const reminderRsvps = [...yes, ...maybe];
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

  // Dietary summary across everyone coming (Yes + Maybe).
  const dietaryCounts: Record<string, number> = {};
  for (const r of [...yes, ...maybe]) {
    const g = guestById.get(r.guestId);
    for (const d of g?.dietaryRestrictions ?? []) dietaryCounts[d] = (dietaryCounts[d] ?? 0) + 1;
  }
  const dietarySummary = Object.entries(dietaryCounts).sort((a, b) => b[1] - a[1]);

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

  const categoryStats = computeCategoryStats(potluck, event.spreadCategories, estimatedHeadcount);

  // Group spread items by the event's configured category order, then append
  // any leftover categories that have items but aren't in the config so
  // nothing silently disappears.
  const configuredNames = event.spreadCategories.map(c => c.name);
  const leftoverNames = [...new Set(potluck.map(p => p.category))].filter(
    n => !configuredNames.includes(n)
  );
  const categoryOrder = [...configuredNames, ...leftoverNames];

  // Nudge: guests who said Yes but haven't claimed anything yet.
  const claimedGuestIds = new Set(
    potluck.map(p => p.claimedByGuestId).filter((x): x is string => !!x)
  );
  const nudgeRecipients: Recipient[] = yes
    .filter(r => !claimedGuestIds.has(r.guestId))
    .map((r): Recipient | null => {
      const g = guestById.get(r.guestId);
      if (!g?.phone) return null;
      return { name: g.name || r.title || g.phone, phone: g.phone, status: 'Yes' };
    })
    .filter((r): r is Recipient => r !== null);
  const gapCategories = categoryStats.filter(s => s.status === 'needed').map(s => s.name);
  const guestLink = `${process.env.NEXT_PUBLIC_APP_BASE_URL ?? ''}/e/${event.slug}`;
  const nudgeMessage =
    `Hey! For ${event.name} we still need ${gapCategories.length ? gapCategories.join(', ') : 'a few things'}. ` +
    `Mind grabbing something from the list? ${guestLink}`;

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
          <div className="mt-3">
            <EventDetailsEditor
              slug={event.slug}
              hostSecret={event.hostSecret}
              event={{
                name: event.name,
                date: event.date,
                venueName: event.venueName,
                venueAddress: event.venueAddress,
                venueMapUrl: event.venueMapUrl,
                hostPhone: event.hostPhone,
                dressCode: event.dressCode,
                description: event.description,
                targetHeadcount: event.targetHeadcount,
                plusOnesMax: event.plusOnesMax,
                isPublished: event.isPublished,
                isSurprise: event.isSurprise,
                hideClaimerNames: event.hideClaimerNames,
              }}
            />
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

        {/* Category targets — what guests are seeing on the dot board */}
        <section className="rounded-xl bg-slate-900 p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Category targets</h2>
            <CategoryEditor
              slug={event.slug}
              hostSecret={event.hostSecret}
              categories={event.spreadCategories}
              estimatedHeadcount={estimatedHeadcount}
            />
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[28rem]">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="text-left py-2 px-2 font-medium">Category</th>
                  <th className="text-left py-2 px-2 font-medium">Target</th>
                  <th className="text-left py-2 px-2 font-medium">Claimed</th>
                  <th className="text-left py-2 px-2 font-medium">Gap</th>
                  <th className="text-left py-2 px-2 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {categoryStats.map(stat => {
                  let statusCls = 'text-slate-400';
                  let statusText = '—';
                  if (stat.status === 'covered') {
                    statusCls = 'text-emerald-300';
                    statusText = 'covered';
                  } else if (stat.status === 'needed') {
                    statusCls = 'text-amber-300';
                    statusText = `needs ${stat.gap}`;
                  } else {
                    statusText = 'list';
                  }
                  return (
                    <tr key={stat.name} className="border-b border-slate-800/60">
                      <td className="py-2 px-2 font-medium">{stat.name}</td>
                      <td className="py-2 px-2 text-slate-300">{stat.target ?? '—'}</td>
                      <td className="py-2 px-2 text-slate-300">
                        {stat.tracksServings ? stat.claimed : '—'}
                      </td>
                      <td className={`py-2 px-2 ${statusCls}`}>{statusText}</td>
                      <td className="py-2 px-2 font-mono tracking-widest leading-none" aria-hidden>
                        {stat.tracksServings
                          ? Array.from({ length: 5 }, (_, i) => (
                              <span
                                key={i}
                                className={i < stat.dotsFilled ? 'text-emerald-400' : 'text-slate-600'}
                              >
                                ●
                              </span>
                            ))
                          : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">
            Categories with a target show coverage dots that fill as guests claim items; a category
            with no target (like Activities) is just a sign-up list. Auto targets scale to estimated
            headcount (currently <span className="text-slate-300">{estimatedHeadcount}</span>: Yes plus
            plus-ones plus half of Maybes). Use &ldquo;Edit categories&rdquo; to change them.
          </p>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <SmartPotluckPanel slug={event.slug} hostSecret={event.hostSecret} categories={configuredNames} />
          </div>
        </section>

        {/* Potluck management */}
        <section className="rounded-xl bg-slate-900 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold">The Spread · {potluck.length}</h2>
          </div>
          <div className="mb-4">
            <HostItemAdder slug={event.slug} hostSecret={event.hostSecret} categories={configuredNames} />
          </div>
          {potluck.length === 0 ? (
            <p className="text-sm text-slate-400">No items yet. Add one above or use Smart Potluck.</p>
          ) : (
            <div className="space-y-4">
              {categoryOrder.map(cat => {
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
                            {(item.hostEstimate != null || item.serves != null) && (
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {[
                                  item.hostEstimate != null ? `est ${item.hostEstimate}` : null,
                                  item.serves != null ? `bringing ${item.serves}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
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

          {dietarySummary.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 self-center">Dietary needs:</span>
              {dietarySummary.map(([name, count]) => (
                <span key={name} className="text-xs rounded-full bg-amber-500/15 text-amber-200 px-2.5 py-0.5">
                  {count} {name}
                </span>
              ))}
            </div>
          )}

          {rsvps.length === 0 ? (
            <p className="text-sm text-slate-400">No RSVPs yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[34rem]">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="text-left py-2 px-2">Name</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">+1</th>
                  <th className="text-left py-2 px-2">Dietary</th>
                  <th className="text-left py-2 px-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map(r => {
                  const g = guestById.get(r.guestId);
                  const tags = g?.dietaryRestrictions ?? [];
                  return (
                  <tr key={r.id} className="border-b border-slate-800/60">
                    <td className="py-2 px-2 font-medium">{r.title}</td>
                    <td className="py-2 px-2">
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
                    <td className="py-2 px-2 text-slate-300">{r.plusOnes}</td>
                    <td className="py-2 px-2 text-slate-300">
                      {tags.length > 0 || g?.dietaryNotes ? (
                        <div className="flex flex-wrap gap-1 items-center">
                          {tags.map(t => (
                            <span key={t} className="text-[10px] rounded bg-amber-500/15 text-amber-200 px-1.5 py-0.5">{t}</span>
                          ))}
                          {g?.dietaryNotes && <span className="text-[10px] text-slate-400">{g.dietaryNotes}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-400 truncate max-w-xs">{r.notes}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </section>

        {/* Reminder panel */}
        <ReminderPanel
          recipients={recipients}
          isSurprise={event.isSurprise}
          defaultMessage={defaultReminderMessage}
        />

        {/* Nudge the unclaimed */}
        <ReminderPanel
          title="Nudge the unclaimed"
          recipients={nudgeRecipients}
          isSurprise={event.isSurprise}
          defaultMessage={nudgeMessage}
          emptyText="Everyone who RSVP'd Yes has claimed something. 🎉"
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
