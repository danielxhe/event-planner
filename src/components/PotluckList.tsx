'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PotluckItem, PotluckDietaryTag, Event } from '@/lib/schema';
import {
  QUICK_SERVINGS,
  DEFAULT_ITEM_SERVINGS,
  computeCategoryStats,
  sortStatsByNeed,
  effectivePotluck,
  type CategoryStat,
} from '@/lib/categories';

interface Props {
  items: PotluckItem[];
  guests: Record<string, string>;
  event: Pick<Event, 'slug' | 'spreadCategories' | 'hideClaimerNames'>;
  effectiveHeadcount: number | null;
}

const DIETARY_TAGS: PotluckDietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

export function PotluckList({ items, guests, event, effectiveHeadcount }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [myGuestId, setMyGuestId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  // Items this guest just claimed, rendered as claimed immediately (optimistic)
  // while the server + refresh catch up. Rolled back on failure.
  const [optimisticClaims, setOptimisticClaims] = useState<Record<string, number | undefined>>({});
  const [claimServings, setClaimServings] = useState<number>(DEFAULT_ITEM_SERVINGS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editServings, setEditServings] = useState<number>(DEFAULT_ITEM_SERVINGS);
  const [editTags, setEditTags] = useState<PotluckDietaryTag[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemServings, setNewItemServings] = useState<number>(DEFAULT_ITEM_SERVINGS);
  const [addBusy, setAddBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      setPhone(localStorage.getItem('ep:phone'));
      setMyGuestId(localStorage.getItem('ep:guestId'));
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    read();
    // The RSVP form sets identity after this component has already mounted, and
    // router.refresh() does not remount client components, so re-read on the
    // broadcast (same tab), storage events (other tabs), and refocus.
    const onIdentity: EventListener = e => {
      const detail = (e as unknown as CustomEvent<{ phone?: string; guestId?: string }>).detail;
      setPhone(detail?.phone ?? localStorage.getItem('ep:phone'));
      setMyGuestId(detail?.guestId ?? localStorage.getItem('ep:guestId'));
    };
    window.addEventListener('ep:identity', onIdentity);
    window.addEventListener('storage', read);
    window.addEventListener('focus', read);
    return () => {
      window.removeEventListener('ep:identity', onIdentity);
      window.removeEventListener('storage', read);
      window.removeEventListener('focus', read);
    };
  }, []);

  const showNames = !event.hideClaimerNames;
  const categoryNames = event.spreadCategories.map(c => c.name);

  const stats = useMemo(
    () => computeCategoryStats(items, event.spreadCategories, effectiveHeadcount),
    [items, event.spreadCategories, effectiveHeadcount],
  );
  const sorted = useMemo(() => sortStatsByNeed(stats), [stats]);
  const mostNeeded = sorted.filter(s => s.status === 'needed').slice(0, 2).map(s => s.name);

  function tracksServings(catName: string): boolean {
    return stats.find(s => s.name === catName)?.tracksServings ?? false;
  }

  function startClaim(itemId: string, tracks: boolean, hostEstimate: number | null) {
    if (!phone) return;
    if (tracks) {
      setClaimServings(hostEstimate ?? DEFAULT_ITEM_SERVINGS);
      setClaimingId(itemId);
    } else {
      void claim(itemId);
    }
  }

  async function claim(itemId: string, servings?: number) {
    if (!phone) return;
    setError(null);
    // Optimistic: the card flips to "You've got this" instantly; rollback below.
    setOptimisticClaims(prev => ({ ...prev, [itemId]: servings }));
    setClaimingId(null);
    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, phone, servings }),
      });
      if (!res.ok) {
        const data = await res.json();
        setOptimisticClaims(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        if (res.status === 409) {
          setError('Someone just grabbed that one — the list is refreshed, plenty still needed.');
          router.refresh();
          return;
        }
        throw new Error(data.error ?? 'Claim failed');
      }
      router.refresh();
    } catch (err) {
      setOptimisticClaims(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setError(err instanceof Error ? err.message : 'Claim failed — give it another tap.');
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

  function openEdit(item: PotluckItem) {
    setEditingId(item.id);
    setEditName(item.item);
    setEditCategory(item.category);
    setEditServings(item.serves ?? DEFAULT_ITEM_SERVINGS);
    setEditTags(item.dietaryTags);
    setError(null);
  }

  async function submitEdit(item: PotluckItem, fullEdit: boolean) {
    setBusyId(item.id);
    setError(null);
    const body: Record<string, unknown> = { slug: event.slug, phone, itemId: item.id };
    if (tracksServings(fullEdit ? editCategory : item.category)) body.servings = editServings;
    if (fullEdit) {
      body.item = editName.trim();
      body.category = editCategory;
      body.dietaryTags = editTags;
    }
    try {
      const res = await fetch('/api/potluck/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: PotluckItem) {
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch('/api/potluck/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: event.slug, phone, itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Remove failed');
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusyId(null);
    }
  }

  function openAdd(catName: string) {
    setAddingCategory(catName);
    setNewItemName('');
    setNewItemServings(DEFAULT_ITEM_SERVINGS);
    setExpanded(catName);
  }

  async function submitAdd() {
    if (!phone || !addingCategory) return;
    if (!newItemName.trim()) {
      setError('Add a name first');
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
          servings: tracksServings(addingCategory) ? newItemServings : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add');
      setAddingCategory(null);
      setNewItemName('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setAddBusy(false);
    }
  }

  function toggleEditTag(tag: PotluckDietaryTag) {
    setEditTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  }

  function renderDots(filled: number) {
    return (
      <span className="font-mono tracking-widest text-base leading-none" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < filled ? 'text-emerald-400' : 'text-slate-600'}>
            ●
          </span>
        ))}
      </span>
    );
  }

  function statusText(s: CategoryStat): { text: string; cls: string } {
    if (s.status === 'list') return { text: '', cls: '' };
    if (s.status === 'covered') return { text: 'covered', cls: 'text-emerald-300' };
    return { text: `needs ${s.gap}`, cls: 'text-amber-300' };
  }

  function liveImpact(): string {
    if (!addingCategory) return '';
    const stat = stats.find(s => s.name === addingCategory);
    if (!stat || stat.target == null) return '';
    if (stat.claimed >= stat.target) return `${addingCategory} is already covered. Extras welcome.`;
    const remaining = Math.max(0, stat.target - stat.claimed);
    const fills = Math.min(newItemServings, remaining);
    return `Fills ${fills} of ${remaining} servings still needed.`;
  }

  function itemsFor(catName: string) {
    // Group by EFFECTIVE category so a host-recategorized item shows where the
    // host put it, consistent with the coverage dots.
    return items.filter(i => effectivePotluck(i).category === catName);
  }

  if (items.length === 0 && !phone) {
    return <p className="text-sm text-slate-400">RSVP above to start signing up.</p>;
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
          const isOpen = expanded === stat.name;
          const cs = itemsFor(stat.name);
          const status = statusText(stat);
          const singular = stat.name.replace(/s$/, '');
          return (
            <li key={stat.name}>
              <button
                onClick={() => setExpanded(isOpen ? null : stat.name)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition text-left"
              >
                <div className="min-w-0">
                  <div className="font-medium">{stat.name}</div>
                  <div className="text-xs text-slate-400">
                    {cs.length === 0 ? 'nothing yet' : `${cs.length} item${cs.length === 1 ? '' : 's'}`}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {stat.tracksServings && renderDots(stat.dotsFilled)}
                  {status.text && (
                    <span className={`text-xs w-16 text-right ${status.cls}`}>{status.text}</span>
                  )}
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
                      <p className="text-sm text-slate-500">Nothing here yet. Be the first.</p>
                    ) : (
                      <ul className="space-y-2">
                        {cs.map(item => {
                          // Effective view (host override applied) drives what
                          // others see: name, tags, claimed status, claimer.
                          const eff = effectivePotluck(item);
                          const optimisticMine = item.id in optimisticClaims;
                          const isClaimed = eff.isClaimed || optimisticMine;
                          const mine = (!!myGuestId && item.claimedByGuestId === myGuestId) || optimisticMine;
                          const canFullEdit = mine && item.source === 'guest_added';
                          const canEditServings = mine && stat.tracksServings;
                          const isClaiming = claimingId === item.id;
                          const isEditing = editingId === item.id;
                          // Personal serving count is the claiming guest's own
                          // truth (raw), never the host's override. Others only
                          // ever see the host estimate on an unclaimed slot.
                          const myServes = optimisticMine ? optimisticClaims[item.id] : item.serves;
                          const servingText = mine && myServes != null
                            ? `you're bringing ${myServes} servings`
                            : !isClaimed && stat.tracksServings && item.hostEstimate != null
                            ? `host estimate ~${item.hostEstimate}`
                            : null;
                          const meta = [servingText, eff.dietaryTags.join(', ') || null]
                            .filter(Boolean)
                            .join(' · ');
                          const claimerLabel = isClaimed
                            ? mine
                              ? 'You'
                              : showNames
                              ? eff.hostClaimerName ??
                                (item.claimedByGuestId ? guests[item.claimedByGuestId] ?? 'Claimed' : 'Claimed')
                              : 'Claimed'
                            : null;
                          return (
                            <li
                              key={item.id}
                              className={`rounded-md border p-3 transition-colors ${
                                isClaimed
                                  ? 'border-emerald-500/30 bg-emerald-500/5'
                                  : 'border-slate-700 bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{eff.item}</div>
                                  {meta && <div className="text-xs text-slate-400 mt-0.5">{meta}</div>}
                                  {claimerLabel && (
                                    <div className="mt-1 text-xs text-emerald-300">✅ {claimerLabel}</div>
                                  )}
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                  {!isClaimed && phone && !isClaiming && (
                                    <button
                                      onClick={() => startClaim(item.id, stat.tracksServings, item.hostEstimate)}
                                      disabled={busyId === item.id}
                                      className="rounded-md bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                                    >
                                      {busyId === item.id ? '...' : "I've got this"}
                                    </button>
                                  )}
                                  {mine && (canFullEdit || canEditServings) && !isEditing && (
                                    <button
                                      onClick={() => openEdit(item)}
                                      className="rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-sm text-slate-300"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {item.claimedByGuestId && mine && (
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

                              {isClaiming && (
                                <div className="mt-3 rounded-md border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
                                  <ServingsField
                                    value={claimServings}
                                    onChange={setClaimServings}
                                    hint="How many servings are you bringing?"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => claim(item.id, claimServings)}
                                      disabled={busyId === item.id || claimServings <= 0}
                                      className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
                                    >
                                      {busyId === item.id ? 'Claiming...' : 'Confirm'}
                                    </button>
                                    <button
                                      onClick={() => setClaimingId(null)}
                                      disabled={busyId === item.id}
                                      className="rounded-md bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isEditing && (
                                <div className="mt-3 rounded-md border border-slate-600 bg-slate-900 p-3 space-y-3">
                                  {canFullEdit && (
                                    <>
                                      <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                                      />
                                      <div>
                                        <label className="block text-xs text-slate-400 mb-1">Category</label>
                                        <select
                                          value={editCategory}
                                          onChange={e => setEditCategory(e.target.value)}
                                          className="w-full rounded-md bg-slate-950 border border-slate-700 px-2 py-2 text-sm"
                                        >
                                          {categoryNames.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </>
                                  )}
                                  {tracksServings(canFullEdit ? editCategory : item.category) && (
                                    <ServingsField value={editServings} onChange={setEditServings} />
                                  )}
                                  {canFullEdit && (
                                    <div>
                                      <label className="block text-xs text-slate-400 mb-1.5">Dietary tags</label>
                                      <div className="flex flex-wrap gap-2">
                                        {DIETARY_TAGS.map(t => (
                                          <button
                                            key={t}
                                            type="button"
                                            onClick={() => toggleEditTag(t)}
                                            className={`rounded-full px-3 py-1 text-xs border transition ${
                                              editTags.includes(t)
                                                ? 'border-purple-500 bg-purple-500/20 text-purple-100'
                                                : 'border-slate-700 text-slate-300 hover:border-slate-500'
                                            }`}
                                          >
                                            {t}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => submitEdit(item, canFullEdit)}
                                      disabled={busyId === item.id || (canFullEdit && !editName.trim())}
                                      className="rounded-md bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
                                    >
                                      {busyId === item.id ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      disabled={busyId === item.id}
                                      className="rounded-md bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                    {canFullEdit && (
                                      <button
                                        onClick={() => removeItem(item)}
                                        disabled={busyId === item.id}
                                        className="ml-auto rounded-md bg-rose-600/80 hover:bg-rose-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {phone && addingCategory !== stat.name && (
                      <button
                        onClick={() => openAdd(stat.name)}
                        className="w-full rounded-md border border-dashed border-slate-700 hover:border-slate-500 px-3 py-2 text-sm text-slate-300"
                      >
                        + Add to {stat.name}
                      </button>
                    )}

                    {phone && addingCategory === stat.name && (
                      <div className="rounded-md border border-purple-500/30 bg-purple-500/5 p-3 space-y-3">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          placeholder={`What ${singular.toLowerCase()} are you bringing?`}
                          className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                          autoFocus
                        />
                        {stat.tracksServings && (
                          <ServingsField value={newItemServings} onChange={setNewItemServings} hint={liveImpact()} />
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={submitAdd}
                            disabled={addBusy || !newItemName.trim() || (stat.tracksServings && newItemServings <= 0)}
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

      {!phone && (
        <p className="text-xs text-slate-500">RSVP above to sign up for something.</p>
      )}
    </div>
  );
}

// Uniform serving-size picker: quick-pick chips 2/4/6/8 plus a Custom field.
function ServingsField({
  value,
  onChange,
  hint,
}: {
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  const isCustom = !QUICK_SERVINGS.includes(value);
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">Estimated servings</label>
      <div className="flex flex-wrap gap-2 items-center">
        {QUICK_SERVINGS.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`rounded-full px-3 py-1 text-xs border transition ${
              value === n
                ? 'border-purple-500 bg-purple-500/20 text-purple-100'
                : 'border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(isCustom ? value : 10)}
          className={`rounded-full px-3 py-1 text-xs border transition ${
            isCustom
              ? 'border-purple-500 bg-purple-500/20 text-purple-100'
              : 'border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Custom
        </button>
        {isCustom && (
          <input
            type="number"
            min={1}
            max={500}
            value={value || ''}
            onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
            className="w-20 rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-2">{hint}</p>}
    </div>
  );
}
