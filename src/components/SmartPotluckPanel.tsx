'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PotluckCategory, PotluckDietaryTag } from '@/lib/schema';

interface Props {
  slug: string;
  hostSecret: string;
}

interface DraftSuggestion {
  id: string;
  category: PotluckCategory;
  itemName: string;
  serves: number;
  dietaryTags: PotluckDietaryTag[];
  rationale: string;
}

const CATEGORIES: PotluckCategory[] = ['Appetizer', 'Main', 'Side', 'Dessert', 'Drinks', 'Supplies'];
const TAGS: PotluckDietaryTag[] = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free'];

export function SmartPotluckPanel({ slug, hostSecret }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftSuggestion[]>([
    blank('Appetizer'),
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function blank(category: PotluckCategory): DraftSuggestion {
    return {
      id: crypto.randomUUID(),
      category,
      itemName: '',
      serves: 8,
      dietaryTags: [],
      rationale: '',
    };
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

  async function submit() {
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
      setOpen(false);
      setDrafts([blank('Appetizer')]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestion run failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen(true)}
          className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 text-sm"
        >
          Generate suggestions
        </button>
        <span className="text-[10px] uppercase tracking-wider text-purple-300/70 whitespace-nowrap">
          Smart Potluck · Phase 1
        </span>
      </div>
      <p className="mt-2 text-xs text-purple-300/60">
        V2.0: you enter your own suggestions; we log everything. V2.1 will replace this with Claude API output, scored against your Phase 1 logs.
      </p>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-xl max-w-2xl w-full p-6 my-12 max-h-[90vh] overflow-y-auto">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="text-xl font-semibold">Suggest potluck items</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">×</button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Enter what you&apos;d suggest given the headcount + dietary mix above. We&apos;ll save these as the AI-suggested potluck items AND log the inputs + your suggestions to <code className="text-purple-300">Suggestions Log</code> so V2.1 has eval data.
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
                      onChange={e => updateDraft(draft.id, { category: e.target.value as PotluckCategory })}
                      className="rounded bg-slate-700 px-2 py-1.5 text-sm"
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
                    placeholder="Why this one? (optional rationale — feeds Phase 1 eval)"
                    value={draft.rationale}
                    onChange={e => updateDraft(draft.id, { rationale: e.target.value })}
                    className="w-full rounded bg-slate-700 px-2 py-1.5 text-sm placeholder-slate-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDrafts(ds => [...ds, blank('Main')])}
              className="mt-3 text-sm text-purple-300 hover:text-purple-200"
            >
              + Add another suggestion
            </button>

            {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
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

