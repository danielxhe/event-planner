'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface EventEditable {
  name: string;
  date: string | null;
  venueName: string;
  venueAddress: string;
  venueMapUrl: string | null;
  hostPhone: string | null;
  dressCode: string;
  description: string;
  targetHeadcount: number | null;
  plusOnesMax: number | null;
  isPublished: boolean;
  isSurprise: boolean;
  hideClaimerNames: boolean;
}

interface Props {
  slug: string;
  hostSecret: string;
  event: EventEditable;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventDetailsEditor({ slug, hostSecret, event }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: event.name,
    date: toLocalInput(event.date),
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    venueMapUrl: event.venueMapUrl ?? '',
    hostPhone: event.hostPhone ?? '',
    dressCode: event.dressCode,
    description: event.description,
    targetHeadcount: event.targetHeadcount ?? '',
    plusOnesMax: event.plusOnesMax ?? '',
    isPublished: event.isPublished,
    isSurprise: event.isSurprise,
    hideClaimerNames: event.hideClaimerNames,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/event/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          hostSecret,
          name: f.name.trim(),
          date: f.date ? new Date(f.date).toISOString() : null,
          venueName: f.venueName,
          venueAddress: f.venueAddress,
          venueMapUrl: f.venueMapUrl.trim() || null,
          hostPhone: f.hostPhone.trim() || null,
          dressCode: f.dressCode,
          description: f.description,
          targetHeadcount: f.targetHeadcount === '' ? null : Number(f.targetHeadcount),
          plusOnesMax: f.plusOnesMax === '' ? null : Number(f.plusOnesMax),
          isPublished: f.isPublished,
          isSurprise: f.isSurprise,
          hideClaimerNames: f.hideClaimerNames,
        }),
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

  const input = 'w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-purple-500';
  const label = 'block text-xs text-slate-400 mb-1';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-700 hover:border-slate-500 px-3 py-1.5 text-sm text-slate-300"
      >
        Edit event details
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Edit event details</h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm">Close</button>
      </div>

      <div>
        <label className={label}>Event name</label>
        <input className={input} value={f.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Date & time</label>
          <input type="datetime-local" className={input} value={f.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label className={label}>Venue name</label>
          <input className={input} value={f.venueName} onChange={e => set('venueName', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={label}>Venue address</label>
        <input className={input} value={f.venueAddress} onChange={e => set('venueAddress', e.target.value)} />
      </div>
      <div>
        <label className={label}>Venue map link</label>
        <input className={input} value={f.venueMapUrl} onChange={e => set('venueMapUrl', e.target.value)} placeholder="https://maps.google.com/..." />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea className={input} rows={3} value={f.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>Dress code / theme</label>
          <input className={input} value={f.dressCode} onChange={e => set('dressCode', e.target.value)} />
        </div>
        <div>
          <label className={label}>Target headcount</label>
          <input type="number" min={0} className={input} value={f.targetHeadcount} onChange={e => set('targetHeadcount', e.target.value as never)} />
        </div>
        <div>
          <label className={label}>Plus-ones max</label>
          <input type="number" min={0} className={input} value={f.plusOnesMax} onChange={e => set('plusOnesMax', e.target.value as never)} />
        </div>
      </div>
      <div>
        <label className={label}>Host phone (guests can text)</label>
        <input className={input} value={f.hostPhone} onChange={e => set('hostPhone', e.target.value)} placeholder="+1 555 123 4567" />
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={f.isPublished} onChange={e => set('isPublished', e.target.checked)} />
          Published (guests can open the link)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={f.hideClaimerNames} onChange={e => set('hideClaimerNames', e.target.checked)} />
          Hide claimer names from guests
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={f.isSurprise} onChange={e => set('isSurprise', e.target.checked)} />
          Surprise event
        </label>
        {f.isSurprise && (
          <p className="text-[11px] text-pink-300 pl-6">
            Shows guests a &ldquo;keep it a secret&rdquo; reminder on the invite. Guests still see each other; use &ldquo;Hide claimer names&rdquo; for that.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {saved && !error && <p className="text-sm text-emerald-300">Saved.</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={busy || !f.name.trim()}
          className="rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save details'}
        </button>
      </div>
    </div>
  );
}
