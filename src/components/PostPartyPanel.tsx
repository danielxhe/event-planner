'use client';

// Post-party check-in — shown once the event date has passed. The host walks
// the claimed dishes: did it show up, was there a dietary problem, any note.
// One save writes the ground truth the eval scorer needs (brought-rate,
// dietary errors) without the host ever touching Notion.

import { useState } from 'react';

export interface PostPartyItem {
  name: string;
  claimerName: string | null;
}

interface Entry {
  brought: boolean;
  dietaryOk: boolean;
  note: string;
}

interface Props {
  slug: string;
  hostSecret: string;
  items: PostPartyItem[];
  initial: { itemName: string; brought: boolean; dietaryOk: boolean; note?: string }[] | null;
}

export function PostPartyPanel({ slug, hostSecret, items, initial }: Props) {
  const [entries, setEntries] = useState<Record<string, Entry>>(() => {
    const byName = new Map((initial ?? []).map(a => [a.itemName, a]));
    return Object.fromEntries(
      items.map(i => {
        const prev = byName.get(i.name);
        return [
          i.name,
          {
            brought: prev ? prev.brought : true,
            dietaryOk: prev ? prev.dietaryOk : true,
            note: prev?.note ?? '',
          },
        ];
      })
    );
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(name: string, patch: Partial<Entry>) {
    setEntries(prev => ({ ...prev, [name]: { ...prev[name], ...patch } }));
    setSavedAt(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const actual = items.map(i => ({
        itemName: i.name,
        brought: entries[i.name].brought,
        dietaryOk: entries[i.name].dietaryOk,
        ...(entries[i.name].note.trim() ? { note: entries[i.name].note.trim() } : {}),
      }));
      const res = await fetch('/api/suggest/post-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostSecret, actual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Saving failed');
      setSavedAt(
        data.runsUpdated > 0
          ? `Saved — scored against ${data.runsUpdated} suggestion run${data.runsUpdated === 1 ? '' : 's'}`
          : 'Saved (no AI runs on this event to score against)'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saving failed');
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl bg-slate-900 p-5">
      <h2 className="text-lg font-semibold mb-1">How did it go?</h2>
      <p className="text-xs text-slate-400 mb-4">
        Two taps per dish closes the loop: it feeds the suggestion scorer and next
        time&apos;s planning.
      </p>

      <ul className="space-y-3">
        {items.map(i => {
          const e = entries[i.name];
          return (
            <li key={i.name} className="rounded bg-slate-800 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-sm">{i.name}</span>
                  {i.claimerName && (
                    <span className="ml-2 text-xs text-slate-400">{i.claimerName}</span>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    aria-pressed={e.brought}
                    onClick={() => update(i.name, { brought: !e.brought })}
                    className={`rounded px-3 py-1.5 text-xs font-medium ${
                      e.brought
                        ? 'bg-emerald-600/80 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {e.brought ? '✓ Showed up' : 'No-show'}
                  </button>
                  <button
                    type="button"
                    aria-pressed={!e.dietaryOk}
                    onClick={() => update(i.name, { dietaryOk: !e.dietaryOk })}
                    className={`rounded px-3 py-1.5 text-xs font-medium ${
                      e.dietaryOk
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-pink-600/80 text-white'
                    }`}
                  >
                    {e.dietaryOk ? 'Dietary OK' : '⚠ Dietary issue'}
                  </button>
                </div>
              </div>
              {(!e.brought || !e.dietaryOk) && (
                <input
                  value={e.note}
                  onChange={ev => update(i.name, { note: ev.target.value })}
                  maxLength={300}
                  placeholder="What happened? (optional)"
                  aria-label={`Note for ${i.name}`}
                  className="mt-2 w-full rounded bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                />
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-3 text-sm text-pink-300" aria-live="polite">{error}</p>}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save check-in'}
        </button>
        {savedAt && (
          <span className="text-xs text-emerald-300" aria-live="polite">{savedAt}</span>
        )}
      </div>
    </section>
  );
}
