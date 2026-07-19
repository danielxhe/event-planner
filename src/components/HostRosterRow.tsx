'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DietaryRestriction, RsvpStatus } from '@/lib/schema';

const STATUSES: RsvpStatus[] = ['Yes', 'Maybe', 'No', 'No Response'];
const DIETARY: DietaryRestriction[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy', 'Dairy-Free', 'Halal', 'Kosher', 'Other',
];

interface Props {
  slug: string;
  hostSecret: string;
  rsvp: { id: string; guestId: string; title: string; status: RsvpStatus; plusOnes: number; notes: string };
  dietaryRestrictions: DietaryRestriction[];
  dietaryNotes: string;
}

const STATUS_CLS: Record<string, string> = {
  Yes: 'bg-emerald-500/20 text-emerald-300',
  Maybe: 'bg-amber-500/20 text-amber-300',
  No: 'bg-rose-500/20 text-rose-300',
};

export function HostRosterRow({ slug, hostSecret, rsvp, dietaryRestrictions, dietaryNotes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const [name, setName] = useState(rsvp.title);
  const [status, setStatus] = useState<RsvpStatus>(rsvp.status);
  const [plusOnes, setPlusOnes] = useState<string>(String(rsvp.plusOnes ?? 0));
  const [tags, setTags] = useState<DietaryRestriction[]>(dietaryRestrictions);
  const [dietNotes, setDietNotes] = useState(dietaryNotes);
  const [notes, setNotes] = useState(rsvp.notes);

  function toggleTag(t: DietaryRestriction) {
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          hostSecret,
          rsvpId: rsvp.id,
          guestId: rsvp.guestId,
          name: name.trim(),
          status,
          plusOnes: parseInt(plusOnes, 10) || 0,
          dietaryRestrictions: tags,
          dietaryNotes: dietNotes,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostSecret, rsvpId: rsvp.id, guestId: rsvp.guestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Remove failed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="border-b border-slate-800/60">
        <td className="py-2 px-2 font-medium">{rsvp.title}</td>
        <td className="py-2 px-2">
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS_CLS[rsvp.status] ?? 'bg-slate-700 text-slate-300'}`}>
            {rsvp.status}
          </span>
        </td>
        <td className="py-2 px-2 text-slate-300">{rsvp.plusOnes}</td>
        <td className="py-2 px-2 text-slate-300">
          {dietaryRestrictions.length > 0 || dietaryNotes ? (
            <div className="flex flex-wrap gap-1 items-center">
              {dietaryRestrictions.map(t => (
                <span key={t} className="text-[10px] rounded bg-amber-500/15 text-amber-200 px-1.5 py-0.5">{t}</span>
              ))}
              {dietaryNotes && <span className="text-[10px] text-slate-400">{dietaryNotes}</span>}
            </div>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="py-2 px-2 text-slate-400 truncate max-w-xs">{rsvp.notes}</td>
        <td className="py-2 px-2 text-right">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="rounded bg-slate-700 hover:bg-slate-600 px-2.5 py-1 text-xs text-slate-200"
          >
            Edit
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-slate-800/60 bg-slate-950/40">
          <td colSpan={6} className="px-2 py-3">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="text-xs text-slate-400">
                  Name
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Status
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as RsvpStatus)}
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-100"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-400">
                  Plus-ones
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={plusOnes}
                    onChange={e => setPlusOnes(e.target.value)}
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </label>
              </div>

              <div>
                <span className="block text-xs text-slate-400 mb-1">Dietary restrictions</span>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`rounded-full px-2 py-0.5 text-[10px] border transition ${
                        tags.includes(t)
                          ? 'border-amber-500 bg-amber-500/20 text-amber-100'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-400">
                  Dietary notes
                  <input
                    type="text"
                    value={dietNotes}
                    onChange={e => setDietNotes(e.target.value)}
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  RSVP notes
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </label>
              </div>

              {error && <p className="text-[11px] text-rose-400">{error}</p>}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={busy || !name.trim()}
                  className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50"
                >
                  Cancel
                </button>

                {!confirmRemove ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(true)}
                    disabled={busy}
                    className="ml-auto rounded bg-rose-600/80 hover:bg-rose-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  >
                    Remove guest
                  </button>
                ) : (
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-rose-300">Remove {rsvp.title}? Frees their dishes.</span>
                    <button
                      type="button"
                      onClick={remove}
                      disabled={busy}
                      className="rounded bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    >
                      {busy ? 'Removing…' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(false)}
                      disabled={busy}
                      className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
