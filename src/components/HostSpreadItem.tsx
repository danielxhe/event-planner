'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HostOverride, PotluckDietaryTag, PotluckItem } from '@/lib/schema';
import { PotluckDeleteButton } from './PotluckDeleteButton';

const DIETARY_TAGS: PotluckDietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

interface Props {
  slug: string;
  hostSecret: string;
  item: PotluckItem;
  guestClaimerName: string | null;
  categories: string[];
}

export function HostSpreadItem({ slug, hostSecret, item, guestClaimerName, categories }: Props) {
  const router = useRouter();
  const o = item.hostOverride;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dish, setDish] = useState(o?.item ?? '');
  const [category, setCategory] = useState(o?.category ?? item.category);
  const [claimer, setClaimer] = useState(o?.claimer ?? '');
  const [serves, setServes] = useState<string>(o?.serves != null ? String(o.serves) : '');
  const [tags, setTags] = useState<PotluckDietaryTag[]>(o?.dietaryTags ?? []);
  const [show, setShow] = useState(item.showHostValue);

  function toggleTag(t: PotluckDietaryTag) {
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]));
  }

  // Build the override from only the fields the host meaningfully set; a blank
  // field falls back to the guest value. Category counts only when it differs.
  function buildOverride(): HostOverride | null {
    const out: HostOverride = {};
    if (dish.trim()) out.item = dish.trim();
    if (category && category !== item.category) out.category = category;
    if (claimer.trim()) out.claimer = claimer.trim();
    const n = parseInt(serves, 10);
    if (Number.isFinite(n) && n > 0) out.serves = n;
    if (tags.length > 0) out.dietaryTags = tags;
    return Object.keys(out).length > 0 ? out : null;
  }

  const canShow = buildOverride() != null;

  async function post(override: HostOverride | null, showHostValue: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/potluck/host-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostSecret, itemId: item.id, override, showHostValue }),
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

  function clearOverride() {
    setDish('');
    setCategory(item.category);
    setClaimer('');
    setServes('');
    setTags([]);
    setShow(false);
    void post(null, false);
  }

  const hasSaved = o != null;

  return (
    <li
      className={`rounded px-3 py-2 text-sm ${
        item.claimedByGuestId
          ? 'bg-emerald-500/5 border-l-2 border-emerald-500/50'
          : 'bg-slate-800/50 border-l-2 border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{item.item}</span>
          {item.source === 'ai_suggested' && (
            <span className="text-[10px] rounded bg-purple-500/20 text-purple-300 px-1.5 py-0.5">AI</span>
          )}
          {item.dietaryTags.map(t => (
            <span key={t} className="text-[10px] rounded bg-slate-700 text-slate-300 px-1.5 py-0.5">{t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {(item.hostEstimate != null || item.serves != null) && (
            <span className="text-[10px] text-slate-500 whitespace-nowrap">
              {[
                item.hostEstimate != null ? `est ${item.hostEstimate}` : null,
                item.serves != null ? `bringing ${item.serves}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {hasSaved && item.showHostValue && (
            <span className="text-[10px] rounded bg-pink-500/20 text-pink-300 px-1.5 py-0.5 whitespace-nowrap">
              showing host
            </span>
          )}
          {hasSaved && !item.showHostValue && (
            <span className="text-[10px] rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 whitespace-nowrap">
              override hidden
            </span>
          )}
          <span className="text-xs text-slate-400">{guestClaimerName ?? '🟡 open'}</span>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="rounded bg-slate-700 hover:bg-slate-600 px-2.5 py-1 text-xs text-slate-200"
          >
            Edit
          </button>
          <PotluckDeleteButton
            slug={slug}
            hostSecret={hostSecret}
            itemId={item.id}
            itemLabel={item.item}
            isClaimed={!!item.claimedByGuestId}
          />
        </div>
      </div>

      {open && (
        <div className="mt-2 rounded-md border border-slate-600 bg-slate-950 p-3 space-y-2.5">
          <p className="text-[11px] text-slate-400">
            Guest input: <span className="text-slate-300">{item.item}</span>
            {guestClaimerName ? ` · claimed by ${guestClaimerName}` : ' · unclaimed'}. Leave a field
            blank to keep the guest&apos;s value.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={dish}
              onChange={e => setDish(e.target.value)}
              placeholder={item.item}
              className="rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              value={claimer}
              onChange={e => setClaimer(e.target.value)}
              placeholder={guestClaimerName ?? "Who's bringing it (e.g. Aunt Carol)"}
              className="rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500"
            />
            <input
              type="number"
              min={1}
              max={500}
              value={serves}
              onChange={e => setServes(e.target.value)}
              placeholder={item.serves != null ? `${item.serves} servings` : 'servings'}
              className="rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DIETARY_TAGS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full px-2 py-0.5 text-[10px] border transition ${
                  tags.includes(t)
                    ? 'border-purple-500 bg-purple-500/20 text-purple-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={show && canShow}
              disabled={!canShow}
              onChange={e => setShow(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Show this version to guests
              <span className="block text-[10px] text-amber-300/80">
                {canShow
                  ? 'Replaces what guests see and counts toward the coverage dots — not just the label.'
                  : 'Fill in at least one field above to enable.'}
              </span>
            </span>
          </label>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => post(buildOverride(), show && canShow)}
              disabled={busy}
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
            {hasSaved && (
              <button
                type="button"
                onClick={clearOverride}
                disabled={busy}
                className="ml-auto rounded bg-rose-600/80 hover:bg-rose-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
              >
                Clear override
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
