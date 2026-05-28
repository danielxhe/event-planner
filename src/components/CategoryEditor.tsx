'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryConfig } from '@/lib/schema';

interface Props {
  slug: string;
  hostSecret: string;
  categories: CategoryConfig[];
  estimatedHeadcount: number;
}

type Mode = 'auto' | 'fixed' | 'list';

interface Row {
  id: string;
  name: string;
  mode: Mode;
  num: number; // per-guest ratio when auto, target total when fixed
}

function toRow(c: CategoryConfig): Row {
  if (c.target != null) return { id: c.id, name: c.name, mode: 'fixed', num: c.target };
  if (c.perGuest != null) return { id: c.id, name: c.name, mode: 'auto', num: c.perGuest };
  return { id: c.id, name: c.name, mode: 'list', num: 1 };
}

function newId() {
  return `cat-${Math.random().toString(36).slice(2, 10)}`;
}

export function CategoryEditor({ slug, hostSecret, categories, estimatedHeadcount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => categories.map(toRow));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(id: string, patch: Partial<Row>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    setRows(rs => rs.filter(r => r.id !== id));
  }
  function add() {
    setRows(rs => [...rs, { id: newId(), name: '', mode: 'list', num: 1 }]);
  }
  function move(i: number, dir: -1 | 1) {
    setRows(rs => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const categoriesOut = rows.map(r => ({
      id: r.id,
      name: r.name.trim(),
      target: r.mode === 'fixed' ? r.num : null,
      perGuest: r.mode === 'auto' ? r.num : null,
    }));
    try {
      const res = await fetch('/api/event/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostSecret, categories: categoriesOut }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-700 hover:border-slate-500 px-3 py-1.5 text-sm text-slate-300"
      >
        Edit categories
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit categories</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm">
          Close
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => {
          const preview =
            r.mode === 'auto'
              ? `target ≈ ${Math.round(r.num * estimatedHeadcount)} at ${estimatedHeadcount} guests`
              : r.mode === 'fixed'
              ? `target ${r.num}`
              : 'sign-up list, no target';
          return (
            <div key={r.id} className="rounded-md border border-slate-800 bg-slate-900 p-2 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={r.name}
                  onChange={e => update(r.id, { name: e.target.value })}
                  placeholder="Category name (e.g. Food, Drinks, Activities)"
                  className="flex-1 min-w-0 rounded bg-slate-950 border border-slate-700 px-2 py-1.5 text-sm"
                />
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 px-1" title="Move up">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 px-1" title="Move down">↓</button>
                <button onClick={() => remove(r.id)} className="text-slate-500 hover:text-rose-400 px-1" title="Remove">✕</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={r.mode}
                  onChange={e => update(r.id, { mode: e.target.value as Mode })}
                  className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
                >
                  <option value="auto">Auto (scales to headcount)</option>
                  <option value="fixed">Fixed target</option>
                  <option value="list">No target (list)</option>
                </select>
                {r.mode !== 'list' && (
                  <input
                    type="number"
                    min={r.mode === 'auto' ? 0.25 : 1}
                    step={r.mode === 'auto' ? 0.25 : 1}
                    value={r.num}
                    onChange={e => update(r.id, { num: Number(e.target.value) || 0 })}
                    className="w-20 rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs"
                    title={r.mode === 'auto' ? 'Servings per guest' : 'Total target servings'}
                  />
                )}
                <span className="text-[11px] text-slate-500">{preview}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={add} className="text-sm text-purple-300 hover:text-purple-200">
        + Add category
      </button>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-300">Saved.</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save categories'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Auto targets scale with your estimated headcount. Renaming a category moves its items along.
        A category with items can&apos;t be deleted until those items are moved or removed.
      </p>
    </div>
  );
}
