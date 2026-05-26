'use client';

import { useState } from 'react';
import { formatPhoneForDisplay } from '@/lib/phone';

export interface Recipient {
  name: string;
  phone: string;
  status: 'Yes' | 'Maybe';
}

interface Props {
  recipients: Recipient[];
  isSurprise: boolean;
  defaultMessage: string;
}

export function ReminderPanel({ recipients, isSurprise, defaultMessage }: Props) {
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(label: string, text: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const yesCount = recipients.filter(r => r.status === 'Yes').length;
  const maybeCount = recipients.filter(r => r.status === 'Maybe').length;

  if (recipients.length === 0) {
    return (
      <section className="rounded-xl bg-slate-900 p-5">
        <h2 className="text-lg font-semibold mb-2">Send reminders</h2>
        <p className="text-sm text-slate-400">No one has RSVPd Yes or Maybe yet.</p>
      </section>
    );
  }

  const encoded = encodeURIComponent(message);
  const allPhones = recipients.map(r => r.phone).join(',');

  return (
    <section className="rounded-xl bg-slate-900 p-5">
      <h2 className="text-lg font-semibold mb-1">
        Send reminders · {recipients.length}
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        {yesCount} Yes · {maybeCount} Maybe. Tap &ldquo;Text&rdquo; on each row to message individually
        {isSurprise && (
          <> — group send would <span className="text-pink-300">reveal the guest list</span>.</>
        )}
        {!isSurprise && <>.</>}
      </p>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
      />

      <div className="mt-2 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => copy('message', message)}
          className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs"
        >
          {copied === 'message' ? '✓ Copied message' : 'Copy message'}
        </button>
        <button
          type="button"
          onClick={() => copy('phones', allPhones)}
          className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs"
        >
          {copied === 'phones' ? '✓ Copied phones' : `Copy all phones (${recipients.length})`}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {recipients.map(r => (
          <li
            key={r.phone}
            className="flex items-center justify-between rounded bg-slate-800 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium">{r.name}</span>
              <span className="ml-2 text-xs text-slate-400">{formatPhoneForDisplay(r.phone)}</span>
              <span
                className={`ml-2 text-xs ${
                  r.status === 'Yes' ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {r.status}
              </span>
            </div>
            <a
              href={`sms:${r.phone}?&body=${encoded}`}
              className="rounded bg-purple-600 hover:bg-purple-500 px-3 py-1 text-xs font-medium text-white flex-shrink-0"
            >
              Text
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
