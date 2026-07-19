'use client';

// Self-serve event creation. No account: the host-secret URL minted here is
// the host's only credential, so the success state is a deliberate
// "save this link" moment before they enter the dashboard.

import { useState } from 'react';

interface CreatedLinks {
  guestPath: string;
  hostPath: string;
}

export default function NewEventPage() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [description, setDescription] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [isSurprise, setIsSurprise] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLinks | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  function copy(label: string, text: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Give your event a name');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/event/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          date: date || undefined,
          venueName: venueName.trim() || undefined,
          venueAddress: venueAddress.trim() || undefined,
          description: description.trim() || undefined,
          targetHeadcount: headcount ? Number(headcount) : undefined,
          isSurprise,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create the event');
      setCreated({ guestPath: data.guestPath, hostPath: data.hostPath });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the event');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    const hostUrl = `${origin}${created.hostPath}`;
    const guestUrl = `${origin}${created.guestPath}`;
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h1 className="text-3xl font-bold">🎉 {name.trim()} is live</h1>

          <section className="mt-8 rounded-xl border border-amber-400/40 bg-amber-500/10 p-5">
            <h2 className="font-semibold text-amber-200">Save your host link — it&apos;s your only key</h2>
            <p className="mt-1 text-sm text-amber-100/80">
              There&apos;s no account and no password reset. Bookmark this link or text it to
              yourself right now. Anyone who has it controls the event, so don&apos;t put it in
              the group chat.
            </p>
            <p className="mt-3 break-all rounded bg-slate-900/70 px-3 py-2 text-xs text-slate-200">{hostUrl}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy('host', hostUrl)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400"
              >
                {copied === 'host' ? '✓ Copied' : 'Copy host link'}
              </button>
              <a
                href={`sms:?&body=${encodeURIComponent(`My Spread host link for ${name.trim()}: ${hostUrl}`)}`}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
              >
                Text it to myself
              </a>
            </div>
          </section>

          <section className="mt-4 rounded-xl bg-slate-900 p-5">
            <h2 className="font-semibold">Guest link — this one you share</h2>
            <p className="mt-1 break-all rounded bg-slate-800 px-3 py-2 text-xs text-slate-300">{guestUrl}</p>
            <button
              type="button"
              onClick={() => copy('guest', guestUrl)}
              className="mt-2 rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
            >
              {copied === 'guest' ? '✓ Copied' : 'Copy guest link'}
            </button>
          </section>

          <a
            href={created.hostPath}
            className="mt-8 block rounded-xl bg-purple-600 px-6 py-3.5 text-center text-base font-semibold hover:bg-purple-500"
          >
            Open your host dashboard →
          </a>
          <p className="mt-2 text-center text-xs text-slate-400">
            Set dish categories and serving targets there, then send the guest link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold">Start your spread</h1>
        <p className="mt-2 text-slate-300">
          One form, no account. You&apos;ll get a guest link to share and a private host link to
          run the show.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="ev-name" className="block text-sm font-medium text-slate-200">
              Event name <span className="text-pink-300">*</span>
            </label>
            <input
              id="ev-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={80}
              placeholder="Friendsgiving at Dana's"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ev-date" className="block text-sm font-medium text-slate-200">Date</label>
              <input
                id="ev-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ev-headcount" className="block text-sm font-medium text-slate-200">
                Expected guests
              </label>
              <input
                id="ev-headcount"
                type="number"
                inputMode="numeric"
                min={1}
                max={500}
                value={headcount}
                onChange={e => setHeadcount(e.target.value)}
                placeholder="20"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ev-venue" className="block text-sm font-medium text-slate-200">Venue</label>
            <input
              id="ev-venue"
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              maxLength={120}
              placeholder="Dana's backyard"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ev-address" className="block text-sm font-medium text-slate-200">Address</label>
            <input
              id="ev-address"
              value={venueAddress}
              onChange={e => setVenueAddress(e.target.value)}
              maxLength={200}
              placeholder="123 Elm St, Brooklyn"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ev-desc" className="block text-sm font-medium text-slate-200">
              What&apos;s the vibe?
            </label>
            <textarea
              id="ev-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Cozy potluck, bring your A-game casserole. The AI suggester reads this to match dish ideas to your theme."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-3">
            <input
              type="checkbox"
              checked={isSurprise}
              onChange={e => setIsSurprise(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm">
              🤫 It&apos;s a surprise — guests see a &ldquo;keep it secret&rdquo; banner
            </span>
          </label>

          {error && (
            <p className="text-sm text-pink-300" aria-live="polite">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold hover:bg-purple-500 disabled:opacity-50"
          >
            {submitting ? 'Setting up…' : 'Create my event'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Everything is editable later from your host dashboard.
          </p>
        </form>
      </div>
    </main>
  );
}
