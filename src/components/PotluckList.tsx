'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PotluckItem, PotluckCategory, Event } from '@/lib/schema';
import {
  DEFAULTS_PER_DISH,
  SERVING_CHIPS,
  computeCategoryStats,
  sortStatsByNeed,
  effectiveServings,
} from '@/lib/categories';

interface Props {
  items: PotluckItem[];
  guests: Record<string, string>;
  event: Pick<Event, 'slug' | 'targetHeadcount' | 'targetServings' | 'isSurprise'>;
}

export function PotluckList({ items, guests, event }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<PotluckCategory | null>(null);
  const [addingCategory, setAddingCategory] = useState<PotluckCategory | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemServings, setNewItemServings] = useState<number>(0);
  const [addBusy, setAddBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read after mount to avoid SSR hydration mismatch on localStorage access.
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhone(localStorage.getItem('ep:phone'));
  }, []);

  const stats = useMemo(() => computeCategoryStats(items, event), [items, event]);
  const sorted = useMemo(() => sortStatsByNeed(stats), [stats]);

  const mostNeeded = sorted.filter(s => s.status === 'needed').slice(0, 2).map(s => s.label);
  const supplies = items.filter(i => i.category === 'Supplies');

  async function claim(itemId: string) {
    if (!phone) return;
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Claim failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setBusyId(null);
    }
  }

  async function unclaim(itemId: string) {
    if (!phone) return;
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch('/api/unclaim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unclaim failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unclaim failed');
    } finally {
      setBusyId(null);
    }
  }

  function openAdd(cat: PotluckCategory) {
    setAddingCategory(cat);
    setNewItemName('');
    setNewItemServings(DEFAULTS_PER_DISH[cat]);
    setExpanded(cat);
  }

  async function submitAdd() {
    if (!phone || !addingCategory) return;
    if (!newItemName.trim()) {
      setError('Add a dish name first');
      return;
    }
    setAddBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/potluck/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: event.slug,
          phone,
          item: newItemName.trim(),
          category: addingCategory,
          servings: newItemServings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add dish');
      setAddingCategory(null);
      setNewItemName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add dish');
    } finally {
      setAddBusy(false);
    }
  }

  function renderDots(filled: number) {
    return (
      <span className="font-mono tracking-widest text-base leading-none" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={i < filled ? 'text-emerald-400' : 'text-slate-600'}
          >
            ●
          </span>
        ))}
      </span>
    );
  }

  function statusText(s: typeof sorted[number]): { text: string; cls: string } {
    if (s.status === 'covered') return { text: 'covered', cls: 'text-emerald-300' };
    if (s.status === 'unset') return { text: '—', cls: 'text-slate-500' };
    if (s.gap === 0) return { text: 'covered', cls: 'text-emerald-300' };
    return { text: `needs ${s.gap}`, cls: 'text-amber-300' };
  }

  function liveImpact(): string {
    if (!addingCategory) return '';
    const stat = stats.find(s => s.category === addingCategory);
    if (!stat || stat.target == null) return '';
    if (stat.claimed >= stat.target) return `${addingCategory} is already covered — extras welcome.`;
    const remaining = Math.max(0, stat.target - stat.claimed);
    const fills = Math.min(newItemServings, remaining);
    return `Fills ${fills} of ${remaining} ${stat.label.toLowerCase()} servings still needed.`;
  }

  function itemsFor(cat: PotluckCategory) {
    return items.filter(i => i.category === cat);
  }

  if (items.length === 0 && !phone) {
    return <p className="text-sm text-slate-400">RSVP above to start adding dishes.</p>;
  }

  return (
    <div className="space-y-4">
      {mostNeeded.length > 0 && (
        <p className="text-sm text-slate-300">
          Hosts could use more:{' '}
          <span className="font-medium text-amber-200">{mostNeeded.join(', ')}</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900/40">
        {sorted.map(stat => {
          const isOpen = expanded === stat.category;
          const cs = itemsFor(stat.category);
          const status = statusText(stat);
          return (
            <li key={stat.category}>
              <button
                onClick={() => setExpanded(isOpen ? null : stat.category)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition text-left"
              >
                <div className="min-w-0">
                  <div className="font-medium">{stat.label}</div>
                  <div className="text-xs text-slate-400">
                    {cs.length === 0
                      ? 'no dishes yet'
                      : `${cs.length} dish${cs.length === 1 ? '' : 'es'} · ${stat.claimed} servings`}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {renderDots(stat.dotsFilled)}
                  <span className={`text-xs w-16 text-right ${status.cls}`}>{status.text}</span>
                  <span
                    className={`text-slate-500 text-xs transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  >
                    ▼
                  </span>
                </div>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-3">
                  {cs.length === 0 ? (
                    <p className="text-sm text-slate-500">No dishes here yet. Be the first.</p>
                  ) : (
                    <ul className="space-y-2">
                      {cs.map(item => {
                        const claimerName = item.claimedByGuestId
                          ? event.isSurprise
                            ? 'Claimed'
                            : guests[item.claimedByGuestId] ?? 'Claimed'
                          : null;
                        return (
                          <li
                            key={item.id}
                            className={`rounded-md border p-3 ${
                              item.claimedByGuestId
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{item.item}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  serves {effectiveServings(item)}
                                  {item.dietaryTags.length > 0 && (
                                    <span> · {item.dietaryTags.join(', ')}</span>
                                  )}
                                </div>
                                {claimerName && (
                                  <div className="mt-1 text-xs text-emerald-300">✅ {claimerName}</div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {!item.claimedByGuestId && phone && (
                                  <button
                                    onClick={() => claim(item.id)}
                                    disabled={busyId === item.id}
                                    className="rounded-md bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                                  >
                                    {busyId === item.id ? '...' : "I'll bring this"}
                                  </button>
                                )}
                                {item.claimedByGuestId && phone && (
                                  <button
                                    onClick={() => unclaim(item.id)}
                                    disabled={busyId === item.id}
                                    className="rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-50"
                                  >
                                    Release
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {phone && addingCategory !== stat.category && (
                    <button
                      onClick={() => openAdd(stat.category)}
                      className="w-full rounded-md border border-dashed border-slate-700 hover:border-slate-500 px-3 py-2 text-sm text-slate-300"
                    >
                      + Add a {stat.label.toLowerCase().replace(/s$/, '')}
                    </button>
                  )}

                  {phone && addingCategory === stat.category && (
                    <div className="rounded-md border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        placeholder={`What ${stat.label.toLowerCase().replace(/s$/, '')} are you bringing?`}
                        className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                        autoFocus
                      />
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          Estimated servings
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {SERVING_CHIPS[stat.category].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setNewItemServings(n)}
                              className={`rounded-full px-3 py-1 text-xs border transition ${
                                newItemServings === n
                                  ? 'border-purple-500 bg-purple-500/20 text-purple-100'
                                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={newItemServings || ''}
                            onChange={e => setNewItemServings(parseInt(e.target.value, 10) || 0)}
                            className="w-20 rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">{liveImpact()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={submitAdd}
                          disabled={addBusy || !newItemName.trim() || newItemServings <= 0}
                          className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
                        >
                          {addBusy ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          onClick={() => {
                            setAddingCategory(null);
                            setNewItemName('');
                          }}
                          disabled={addBusy}
                          className="rounded-md bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {supplies.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
            Supplies
          </h3>
          <ul className="space-y-2">
            {supplies.map(item => {
              const claimerName = item.claimedByGuestId
                ? event.isSurprise
                  ? 'Claimed'
                  : guests[item.claimedByGuestId] ?? 'Claimed'
                : null;
              return (
                <li
                  key={item.id}
                  className={`rounded-md border p-3 ${
                    item.claimedByGuestId
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.item}</div>
                      {claimerName && (
                        <div className="mt-1 text-xs text-emerald-300">✅ {claimerName}</div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {!item.claimedByGuestId && phone && (
                        <button
                          onClick={() => claim(item.id)}
                          disabled={busyId === item.id}
                          className="rounded-md bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                        >
                          {busyId === item.id ? '...' : "I'll bring this"}
                        </button>
                      )}
                      {item.claimedByGuestId && phone && (
                        <button
                          onClick={() => unclaim(item.id)}
                          disabled={busyId === item.id}
                          className="rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-50"
                        >
                          Release
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!phone && (
        <p className="text-xs text-slate-500">RSVP above to claim or add a dish.</p>
      )}
    </div>
  );
}
