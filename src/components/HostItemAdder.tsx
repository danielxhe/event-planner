'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  slug: string;
  hostSecret: string;
  categories: string[];
}

export function HostItemAdder({ slug, hostSecret, categories }: Props) {
  const router = useRouter();
  const [item, setItem] = useState('');
  const [category, setCategory] = useState<string>(categories[0] ?? 'Main');
  const [serves, setServes] = useState(8);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!item.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/potluck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, hostSecret,
          item: item.trim(),
          category,
          serves,
          source: 'host_added',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Add failed');
      setItem('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Add a potluck slot (e.g. Garlic bread)"
        value={item}
        onChange={e => setItem(e.target.value)}
        className="flex-1 min-w-[200px] rounded bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm placeholder-slate-500"
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm"
      >
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="number"
        min={1}
        value={serves}
        onChange={e => setServes(Number(e.target.value) || 1)}
        className="w-16 rounded bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm"
        title="Your serving estimate (planning only — the guest who claims it sets the real count)"
        placeholder="est."
      />
      <button
        type="submit"
        disabled={submitting || !item.trim()}
        className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Add
      </button>
      {error && <span className="w-full text-xs text-rose-400">{error}</span>}
    </form>
  );
}
