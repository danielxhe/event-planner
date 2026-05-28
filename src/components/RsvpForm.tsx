'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DietaryRestriction } from '@/lib/schema';

interface Props {
  slug: string;
  plusOnesMax?: number;
  targetHeadcount?: number | null;
}

const STORAGE_KEY = 'ep:phone';
const NAME_KEY = 'ep:name';
const GUEST_KEY = 'ep:guestId';

const DIETARY_OPTIONS: DietaryRestriction[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy',
  'Dairy-Free', 'Halal', 'Kosher', 'Other',
];

export function RsvpForm({ slug, plusOnesMax = 2, targetHeadcount }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Yes' | 'Maybe' | 'No'>('Yes');
  const [plusOnes, setPlusOnes] = useState(0);
  const [notes, setNotes] = useState('');
  const [dietary, setDietary] = useState<DietaryRestriction[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState<{
    name: string;
    status: string;
    plusOnes: number;
    notes: string;
    dietaryRestrictions: DietaryRestriction[];
    dietaryNotes: string;
  } | null>(null);

  function toggleDietary(opt: DietaryRestriction) {
    setDietary(prev => prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt]);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedPhone) setPhone(savedPhone);
    if (savedName) setName(savedName);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Name required'); return; }
    if (!phone.trim()) { setError('Phone required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          phone: phone.trim(),
          name: name.trim(),
          status,
          plusOnes,
          notes: notes.trim(),
          dietaryRestrictions: dietary,
          dietaryNotes: dietaryNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'RSVP failed');
      // Persist phone + name so guest can claim potluck items and not retype
      const savedPhone = data.phone ?? phone.trim();
      localStorage.setItem(STORAGE_KEY, savedPhone);
      localStorage.setItem(NAME_KEY, name.trim());
      if (data.guestId) localStorage.setItem(GUEST_KEY, data.guestId);
      // Tell PotluckList (already mounted, won't re-run its mount effect on
      // router.refresh) that the guest now has an identity, so its claim
      // buttons appear without a full reload.
      window.dispatchEvent(
        new CustomEvent('ep:identity', { detail: { phone: savedPhone, guestId: data.guestId } })
      );
      if (data.saved) setSaved(data.saved);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'RSVP failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6">
        <p className="text-emerald-300 font-medium">RSVP received ✨</p>
        {saved && (
          <div className="mt-2 text-sm text-emerald-100 space-y-1">
            <p>
              Saved as <span className="font-medium">{saved.name}</span> · {saved.status}
              {saved.status !== 'No' && saved.plusOnes > 0 && ` · +${saved.plusOnes}`}
            </p>
            {saved.dietaryRestrictions.length > 0 && (
              <p>Dietary: {saved.dietaryRestrictions.join(', ')}</p>
            )}
            {saved.dietaryNotes && <p className="text-emerald-200/80">&ldquo;{saved.dietaryNotes}&rdquo;</p>}
            {saved.notes && <p className="text-emerald-200/80">Note to host: {saved.notes}</p>}
          </div>
        )}
        <p className="mt-2 text-sm text-emerald-200">
          You can now claim potluck items below. Need to change your RSVP?{' '}
          <button onClick={() => setDone(false)} className="underline">Edit response</button>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-slate-900 p-6 space-y-4">
      {targetHeadcount && targetHeadcount > 0 && (
        <p className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-2 text-xs text-purple-200">
          🍴 Bringing food or drinks? Aim for <span className="font-medium">~{targetHeadcount} servings</span>.
        </p>
      )}

      <div className="flex gap-2">
        {(['Yes', 'Maybe', 'No'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg py-3 font-medium transition ${
              status === s
                ? s === 'Yes'
                  ? 'bg-emerald-500 text-white'
                  : s === 'Maybe'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          required
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          required
        />
      </div>

      {status !== 'No' && plusOnesMax > 0 && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">Plus-ones (max {plusOnesMax})</label>
          <input
            type="number"
            min={0}
            max={plusOnesMax}
            value={plusOnes}
            onChange={e => setPlusOnes(Math.max(0, Math.min(plusOnesMax, Number(e.target.value) || 0)))}
            className="w-24 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 focus:border-purple-500 focus:outline-none"
          />
        </div>
      )}

      {status !== 'No' && (
        <div>
          <label className="block text-sm text-slate-400 mb-2">Dietary restrictions (optional)</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(opt => {
              const on = dietary.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleDietary(opt)}
                  className={`rounded-full px-3 py-1 text-xs border transition ${
                    on
                      ? 'bg-purple-500/30 border-purple-400 text-purple-100'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Allergy specifics or notes (optional)"
            value={dietaryNotes}
            onChange={e => setDietaryNotes(e.target.value)}
            className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      )}

      <textarea
        placeholder="Anything for the host? (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
      />

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 disabled:opacity-50"
      >
        {submitting ? 'Sending...' : 'Send RSVP'}
      </button>
    </form>
  );
}
