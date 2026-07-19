'use client';

// Item-level reminders — "you're bringing the mac and cheese" per guest,
// prefilled from their actual claims. The template is editable once and
// substituted per row, so the host reviews and taps instead of typing N texts.

import { useState } from 'react';
import { formatPhoneForDisplay } from '@/lib/phone';

export interface DishReminderRow {
  name: string;
  phone: string;
  items: string[];
}

interface Props {
  rows: DishReminderRow[];
  eventName: string;
  eventDateStr: string;
  guestLink: string;
  isSurprise: boolean;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

export function DishReminderPanel({ rows, eventName, eventDateStr, guestLink, isSurprise }: Props) {
  const [template, setTemplate] = useState(
    `Hey {name}! Quick reminder for ${eventName} (${eventDateStr}): you're bringing {dishes}. ` +
      `Swap or unclaim anytime: ${guestLink}`
  );
  const [copied, setCopied] = useState<string | null>(null);

  function render(row: DishReminderRow): string {
    return template
      .replaceAll('{name}', firstName(row.name))
      .replaceAll('{dishes}', row.items.join(', '));
  }

  function copy(label: string, text: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-xl bg-slate-900 p-5">
        <h2 className="text-lg font-semibold mb-2">Dish reminders</h2>
        <p className="text-sm text-slate-400">
          Nobody has claimed a dish yet — once they do, per-person reminders show up here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-slate-900 p-5">
      <h2 className="text-lg font-semibold mb-1">Dish reminders · {rows.length}</h2>
      <p className="text-xs text-slate-400 mb-3">
        One text per claimer, prefilled with their dishes. Best sent the day before
        {isSurprise && (
          <> — text individually, a group thread could <span className="text-pink-300">tip off the guest of honor</span></>
        )}
        .
      </p>

      <label htmlFor="dish-reminder-template" className="block text-xs text-slate-400 mb-1">
        Template — <code>{'{name}'}</code> and <code>{'{dishes}'}</code> fill in per person
      </label>
      <textarea
        id="dish-reminder-template"
        value={template}
        onChange={e => setTemplate(e.target.value)}
        rows={3}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
      />

      <ul className="mt-4 space-y-3">
        {rows.map(row => {
          const msg = render(row);
          return (
            <li key={row.phone} className="rounded bg-slate-800 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-sm">{row.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{formatPhoneForDisplay(row.phone)}</span>
                  <span className="ml-2 text-xs text-purple-300">
                    {row.items.join(', ')}
                  </span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => copy(row.phone, msg)}
                    className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1 text-xs"
                  >
                    {copied === row.phone ? '✓' : 'Copy'}
                  </button>
                  <a
                    href={`sms:${row.phone}?&body=${encodeURIComponent(msg)}`}
                    className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1 text-xs font-medium text-white"
                  >
                    Text
                  </a>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{msg}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
