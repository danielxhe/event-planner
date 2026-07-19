'use client';

// RSVP flow, research-backed shape:
// 1. Commit the headcount first: status + name + phone, nothing else.
// 2. Enrich after the RSVP is already recorded (plus-ones, dietary, notes).
// 3. Recognize returning guests from this device and skip re-entry entirely.
// 4. Post-RSVP screen offers add-to-calendar, the anti-no-show action.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DietaryRestriction } from '@/lib/schema';
import { googleCalendarUrl } from '@/lib/calendar';

export interface RsvpEventInfo {
  name: string;
  date: string | null;
  venueName: string;
  venueAddress: string;
  description: string;
}

interface Props {
  slug: string;
  plusOnesMax?: number;
  targetHeadcount?: number | null;
  event: RsvpEventInfo;
}

const STORAGE_KEY = 'ep:phone';
const NAME_KEY = 'ep:name';
const GUEST_KEY = 'ep:guestId';

const DIETARY_OPTIONS: DietaryRestriction[] = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut Allergy',
  'Dairy-Free', 'Halal', 'Kosher', 'Other',
];

interface SavedRsvp {
  name: string;
  status: string;
  plusOnes: number;
  notes: string;
  dietaryRestrictions: DietaryRestriction[];
  dietaryNotes: string;
}

export function RsvpForm({ slug, plusOnesMax = 2, targetHeadcount, event }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Yes' | 'Maybe' | 'No'>('Yes');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedRsvp | null>(null);
  const [checkingReturn, setCheckingReturn] = useState(true);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [editing, setEditing] = useState(false);

  // Details section (post-RSVP enrichment)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [plusOnes, setPlusOnes] = useState(0);
  const [dietary, setDietary] = useState<DietaryRestriction[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const applySaved = useCallback((s: SavedRsvp) => {
    setSaved(s);
    setName(s.name);
    if (s.status === 'Yes' || s.status === 'Maybe' || s.status === 'No') setStatus(s.status);
    setPlusOnes(s.plusOnes ?? 0);
    setDietary(s.dietaryRestrictions ?? []);
    setDietaryNotes(s.dietaryNotes ?? '');
    setNotes(s.notes ?? '');
  }, []);

  // Returning-guest recognition: device remembers the phone; server returns the
  // saved RSVP so the guest sees their state instead of a blank form.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedPhone = localStorage.getItem(STORAGE_KEY);
    const savedName = localStorage.getItem(NAME_KEY);
    if (savedName) setName(savedName);
    if (!savedPhone) {
      setCheckingReturn(false);
      return;
    }
    setPhone(savedPhone);
    fetch(`/api/rsvp/lookup?slug=${encodeURIComponent(slug)}&phone=${encodeURIComponent(savedPhone)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.found && data.saved) {
          applySaved(data.saved as SavedRsvp);
          setWelcomeBack(true);
          if (data.guestId) {
            localStorage.setItem(GUEST_KEY, data.guestId);
            window.dispatchEvent(
              new CustomEvent('ep:identity', { detail: { phone: savedPhone, guestId: data.guestId } })
            );
          }
        }
      })
      .catch(() => {})
      .finally(() => setCheckingReturn(false));
  }, [slug, applySaved]);

  async function post(extra: Record<string, unknown> = {}) {
    const res = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        phone: phone.trim(),
        name: name.trim(),
        status,
        ...extra,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'RSVP failed');
    const savedPhone = data.phone ?? phone.trim();
    localStorage.setItem(STORAGE_KEY, savedPhone);
    localStorage.setItem(NAME_KEY, name.trim());
    if (data.guestId) localStorage.setItem(GUEST_KEY, data.guestId);
    window.dispatchEvent(
      new CustomEvent('ep:identity', { detail: { phone: savedPhone, guestId: data.guestId } })
    );
    if (data.saved) applySaved(data.saved as SavedRsvp);
    router.refresh();
  }

  // Step 1: record the RSVP with the minimum. Details come after.
  async function submitCore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Name required'); return; }
    if (!phone.trim()) { setError('Phone required'); return; }
    setSubmitting(true);
    try {
      await post({ plusOnes, notes, dietaryRestrictions: dietary, dietaryNotes });
      setEditing(false);
      setWelcomeBack(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'RSVP failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDetails() {
    setSavingDetails(true);
    setError(null);
    try {
      await post({
        plusOnes,
        notes: notes.trim(),
        dietaryRestrictions: dietary,
        dietaryNotes: dietaryNotes.trim(),
      });
      setDetailsSaved(true);
      setTimeout(() => setDetailsSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saving details failed');
    } finally {
      setSavingDetails(false);
    }
  }

  function notMe() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(GUEST_KEY);
    setSaved(null);
    setWelcomeBack(false);
    setEditing(false);
    setName('');
    setPhone('');
    setStatus('Yes');
    setPlusOnes(0);
    setDietary([]);
    setDietaryNotes('');
    setNotes('');
    window.dispatchEvent(new CustomEvent('ep:identity', { detail: {} }));
  }

  function toggleDietary(opt: DietaryRestriction) {
    setDietary(prev => prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt]);
  }

  if (checkingReturn) {
    return (
      <div className="rounded-xl bg-slate-900 p-6 text-sm text-slate-500" aria-live="polite">
        Checking if we know you…
      </div>
    );
  }

  // ---------- Confirmed state (fresh RSVP or recognized returning guest) ----------
  if (saved && !editing) {
    const going = saved.status !== 'No';
    const eventUrl = typeof window !== 'undefined' ? window.location.href : '';
    const gcal = googleCalendarUrl(event, eventUrl);
    return (
      <div
        id="rsvp"
        className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6"
        aria-live="polite"
      >
        <p className="text-emerald-300 font-medium">
          {welcomeBack ? `Welcome back, ${saved.name}` : 'RSVP received ✨'}
        </p>
        <p className="mt-1 text-sm text-emerald-100">
          {going
            ? `You're ${saved.status === 'Maybe' ? 'a maybe' : 'going'}${saved.plusOnes > 0 ? ` · +${saved.plusOnes}` : ''}`
            : "You said you can't make it"}
          {saved.dietaryRestrictions.length > 0 && ` · ${saved.dietaryRestrictions.join(', ')}`}
        </p>

        {going && (
          <div className="mt-3 flex flex-wrap gap-2">
            {gcal && (
              <a
                href={gcal}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-200"
              >
                📅 Google Calendar
              </a>
            )}
            {event.date && (
              <a
                href={`/api/event/ics?slug=${encodeURIComponent(slug)}`}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-200"
              >
                📅 Apple / Outlook
              </a>
            )}
          </div>
        )}

        {going && (
          <div className="mt-4 border-t border-emerald-500/20 pt-3">
            <button
              onClick={() => setDetailsOpen(o => !o)}
              aria-expanded={detailsOpen}
              className="text-sm text-emerald-200 underline underline-offset-4"
            >
              {detailsOpen ? 'Hide details' : 'Add plus-ones or dietary needs'}
            </button>

            {detailsOpen && (
              <div className="mt-3 space-y-4">
                {plusOnesMax > 0 && (
                  <div>
                    <span className="block text-sm text-slate-300 mb-1">Plus-ones</span>
                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-800 p-1">
                      <button
                        type="button"
                        aria-label="Fewer plus-ones"
                        onClick={() => setPlusOnes(n => Math.max(0, n - 1))}
                        className="h-10 w-10 rounded-md bg-slate-700 hover:bg-slate-600 text-lg"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-medium" aria-live="polite">{plusOnes}</span>
                      <button
                        type="button"
                        aria-label="More plus-ones"
                        onClick={() => setPlusOnes(n => Math.min(plusOnesMax, n + 1))}
                        className="h-10 w-10 rounded-md bg-slate-700 hover:bg-slate-600 text-lg"
                      >
                        +
                      </button>
                    </div>
                    <span className="ml-2 text-xs text-slate-500">max {plusOnesMax}</span>
                  </div>
                )}

                <div>
                  <span className="block text-sm text-slate-300 mb-2">Dietary restrictions</span>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map(opt => {
                      const on = dietary.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleDietary(opt)}
                          className={`rounded-full px-3 py-1.5 text-xs border transition ${
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
                    aria-label="Allergy specifics or dietary notes"
                    placeholder="Allergy specifics (severity, cross-contamination…)"
                    value={dietaryNotes}
                    onChange={e => setDietaryNotes(e.target.value)}
                    className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <textarea
                  aria-label="Note to the host"
                  placeholder="Anything for the host? (optional)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />

                {error && <p className="text-sm text-rose-400">{error}</p>}

                <button
                  onClick={submitDetails}
                  disabled={savingDetails}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {savingDetails ? 'Saving…' : detailsSaved ? 'Saved ✓' : 'Save details'}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-sm text-emerald-200">
          {going && (
            <>
              {targetHeadcount && targetHeadcount > 0
                ? `Pick something to bring below — aim for ~${targetHeadcount} servings. `
                : 'You can now pick something to bring below. '}
            </>
          )}
          <button onClick={() => { setEditing(true); setError(null); }} className="underline underline-offset-4">
            {going ? 'Change RSVP' : 'Changed plans? Update your RSVP'}
          </button>
          {' · '}
          <button onClick={notMe} className="underline underline-offset-4 text-emerald-200/70">
            Not {saved.name.split(' ')[0] || 'you'}?
          </button>
        </p>
      </div>
    );
  }

  // ---------- Core RSVP form: one decision + two fields ----------
  return (
    <form id="rsvp" onSubmit={submitCore} className="rounded-xl bg-slate-900 p-6 space-y-4">
      <div className="flex gap-2" role="group" aria-label="Are you coming?">
        {(['Yes', 'Maybe', 'No'] as const).map(s => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-lg py-3.5 font-medium transition ${
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
          aria-label="Your name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          required
        />
        <input
          type="tel"
          aria-label="Phone number"
          autoComplete="tel"
          inputMode="tel"
          placeholder="Phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-3 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          required
        />
      </div>
      <p className="text-xs text-slate-500">
        Your number is only used so the host can reach you and so this device remembers you. No
        account, no verification texts.
      </p>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium py-3.5 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send RSVP'}
      </button>
      <p className="text-xs text-slate-500">
        Plus-ones and dietary needs come after — RSVP first, it takes five seconds.
      </p>
      {editing && (
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          className="text-sm text-slate-400 underline underline-offset-4"
        >
          Cancel
        </button>
      )}
    </form>
  );
}
