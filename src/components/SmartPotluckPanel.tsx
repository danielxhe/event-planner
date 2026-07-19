'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PotluckCategory, PotluckDietaryTag, PotluckSuggestion } from '@/lib/schema';

interface Props {
  slug: string;
  hostSecret: string;
  categories: string[];
}

interface DraftSuggestion {
  id: string;
  category: PotluckCategory;
  itemName: string;
  serves: number;
  dietaryTags: PotluckDietaryTag[];
  rationale: string;
}

interface ReviewSuggestion extends PotluckSuggestion {
  id: string;
  accepted: boolean;
}

const TAGS: PotluckDietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

export function SmartPotluckPanel({ slug, hostSecret, categories }: Props) {
  const router = useRouter();
  const firstCat = categories[0] ?? 'Main';

  // AI flow state
  const [generating, setGenerating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewSuggestion[] | null>(null);
  const [resolving, setResolving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Phase 1 manual flow state
  const [manualOpen, setManualOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftSuggestion[]>(() => [blank()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function blank(category: string = firstCat): DraftSuggestion {
    return {
      id: crypto.randomUUID(),
      category,
      itemName: '',
      serves: 8,
      dietaryTags: [],
      rationale: '',
    };
  }

  async function generate() {
    setAiError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostSecret, mode: 'claude_api' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Suggestion run failed');
      setRunId(data.runId);
      setReview(
        (data.suggestions as PotluckSuggestion[]).map(s => ({
          ...s,
          id: crypto.randomUUID(),
          accepted: true,
        }))
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Suggestion run failed');
    } finally {
      setGenerating(false);
    }
  }

  async function resolve(list: ReviewSuggestion[]) {
    if (!runId) return;
    setResolving(true);
    setAiError(null);
    const strip = (s: ReviewSuggestion) => ({
      category: s.category,
      itemName: s.itemName,
      serves: s.serves,
      dietaryTags: s.dietaryTags,
      rationale: s.rationale,
    });
    try {
      const res = await fetch('/api/suggest/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          hostSecret,
          runId,
          accepted: list.filter(s => s.accepted).map(strip),
          rejected: list.filter(s => !s.accepted).map(strip),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Saving your picks failed');
      setReview(null);
      setRunId(null);
      router.refresh();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Saving your picks failed');
    } finally {
      setResolving(false);
    }
  }

  function toggleAccepted(id: string) {
    setReview(rs => rs && rs.map(s => (s.id === id ? { ...s, accepted: !s.accepted } : s)));
  }

  function updateDraft(id: string, patch: Partial<DraftSuggestion>) {
    setDrafts(ds => ds.map(d => (d.id === id ? { ...d, ...patch } : d)));
  }

  function toggleTag(id: string, tag: PotluckDietaryTag) {
    setDrafts(ds =>
      ds.map(d =>
        d.id === id
          ? {
              ...d,
              dietaryTags: d.dietaryTags.includes(tag)
                ? d.dietaryTags.filter(t => t !== tag)
                : [...d.dietaryTags, tag],
            }
          : d
      )
    );
  }

  async function submitManual() {
    setError(null);
    const valid = drafts.filter(d => d.itemName.trim().length > 0);
    if (valid.length === 0) {
      setError('Add at least one suggestion');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          hostSecret,
          mode: 'manual_stub',
          suggestions: valid.map(d => ({
            category: d.category,
            itemName: d.itemName.trim(),
            dietaryTags: d.dietaryTags,
            serves: d.serves,
            rationale: d.rationale.trim() || undefined,
          })),
          acceptAll: true,
          runLabel: `Manual run · ${new Date().toLocaleString()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Suggestion run failed');
      setManualOpen(false);
      setDrafts([blank()]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestion run failed');
    } finally {
      setSubmitting(false);
    }
  }

  const acceptedCount = review?.filter(s => s.accepted).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={generate}
          disabled={generating || !!review}
          className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 text-sm disabled:opacity-60"
        >
          {generating ? 'Planning your spread…' : '✨ Generate suggestions'}
        </button>
        <span className="text-[10px] uppercase tracking-wider text-purple-300/70 whitespace-nowrap">
          Smart Potluck
        </span>
      </div>
      <p className="mt-2 text-xs text-purple-300/60">
        Claude reads your live headcount, dietary needs, and category gaps, then proposes dishes.
        Nothing is added until you approve it.{' '}
        <button onClick={() => setManualOpen(true)} className="underline hover:text-purple-200">
          Prefer to enter your own?
        </button>
      </p>

      {generating && (
        <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 text-sm text-purple-200 animate-pulse">
          Reading RSVPs, dietary notes, and what&apos;s already claimed…
        </div>
      )}

      {aiError && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 flex items-center justify-between gap-3">
          <span>{aiError}</span>
          {!review && (
            <button onClick={generate} className="underline whitespace-nowrap">Retry</button>
          )}
        </div>
      )}

      {review && (
        <div className="mt-3 rounded-xl border border-purple-500/30 bg-slate-900 p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">Suggested dishes</h3>
            <span className="text-xs text-slate-400">tap a card to keep or skip</span>
          </div>

          <ul className="space-y-2">
            {review.map(s => (
              <li key={s.id}>
                <button
                  onClick={() => toggleAccepted(s.id)}
                  aria-pressed={s.accepted}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    s.accepted
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-slate-700 bg-slate-800/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {s.itemName}
                        <span className="ml-2 text-xs text-slate-400">
                          {s.category} · serves {s.serves}
                        </span>
                      </div>
                      {s.dietaryTags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.dietaryTags.map(t => (
                            <span
                              key={t}
                              className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-slate-400 italic">{s.rationale}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-medium ${
                        s.accepted ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      {s.accepted ? '✓ Keep' : 'Skip'}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => review && resolve(review)}
              disabled={resolving || acceptedCount === 0}
              className="rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {resolving
                ? 'Adding…'
                : `Add ${acceptedCount} ${acceptedCount === 1 ? 'dish' : 'dishes'} to the spread`}
            </button>
            <button
              onClick={() => review && resolve(review.map(s => ({ ...s, accepted: false })))}
              disabled={resolving}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
            >
              Dismiss all
            </button>
          </div>
          <p className="text-[10px] text-slate-500">
            Your keep/skip choices are logged so suggestion quality can be measured over time.
          </p>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl max-w-2xl w-full p-6 my-12 max-h-[90vh] overflow-y-auto">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-xl font-semibold">Suggest potluck items</h3>
              <button onClick={() => setManualOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Enter your own suggestions given the headcount + dietary mix above. They&apos;re added
              to the spread and logged alongside the AI runs for comparison.
            </p>

            <div className="space-y-4">
              {drafts.map((draft, idx) => (
                <div key={draft.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Suggestion {idx + 1}</span>
                    {drafts.length > 1 && (
                      <button
                        onClick={() => setDrafts(ds => ds.filter(d => d.id !== draft.id))}
                        className="text-xs text-slate-500 hover:text-rose-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={draft.category}
                      onChange={e => updateDraft(draft.id, { category: e.target.value })}
                      className="rounded bg-slate-700 px-2 py-1.5 text-sm"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Dish name"
                      value={draft.itemName}
                      onChange={e => updateDraft(draft.id, { itemName: e.target.value })}
                      className="rounded bg-slate-700 px-2 py-1.5 text-sm placeholder-slate-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Serves</label>
                    <input
                      type="number"
                      min={1}
                      value={draft.serves}
                      onChange={e => updateDraft(draft.id, { serves: Number(e.target.value) || 1 })}
                      className="w-16 rounded bg-slate-700 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TAGS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(draft.id, t)}
                        className={`text-xs rounded px-2 py-1 ${
                          draft.dietaryTags.includes(t)
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Why this one? (optional rationale)"
                    value={draft.rationale}
                    onChange={e => updateDraft(draft.id, { rationale: e.target.value })}
                    className="w-full rounded bg-slate-700 px-2 py-1.5 text-sm placeholder-slate-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDrafts(ds => [...ds, blank()])}
              className="mt-3 text-sm text-purple-300 hover:text-purple-200"
            >
              + Add another suggestion
            </button>

            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setManualOpen(false)}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitManual}
                disabled={submitting}
                className="rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save & add to potluck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
