'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PotluckItem, PotluckCategory } from '@/lib/schema';

interface Props {
  items: PotluckItem[];
  guests: Record<string, string>;  // guestId → display name (for "claimed by X" labels)
}

const CATEGORY_ORDER: PotluckCategory[] = ['Appetizer', 'Main', 'Side', 'Dessert', 'Drinks', 'Supplies'];

export function PotluckGrid({ items, guests }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPhone(localStorage.getItem('ep:phone'));
  }, []);

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

  const claimedCount = items.filter(i => i.claimedByGuestId).length;

  if (items.length === 0) {
    return <p className="text-sm text-slate-400">No potluck items yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-400">{claimedCount} / {items.length} claimed</span>
        {!phone && (
          <span className="text-xs text-slate-500">RSVP above to claim items</span>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {CATEGORY_ORDER.map(cat => {
        const catItems = items.filter(p => p.category === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-400">
              {cat}
            </h3>
            <ul className="space-y-2">
              {catItems.map(item => {
                const claimedByMe = item.claimedByGuestId && guests[item.claimedByGuestId] && phone;
                // We don't know our own guestId client-side, so we rely on server unclaim check
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border p-3 ${
                      item.claimedByGuestId
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.item}</div>
                        {item.dietaryTags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.dietaryTags.map(t => (
                              <span key={t} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.claimedByGuestId && (
                          <div className="mt-1 text-xs text-emerald-300">
                            ✅ {guests[item.claimedByGuestId] ?? 'Claimed'}
                          </div>
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
                        {item.claimedByGuestId && phone && claimedByMe && (
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
        );
      })}
    </div>
  );
}
