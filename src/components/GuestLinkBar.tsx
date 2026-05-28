'use client';

import { useState } from 'react';

export function GuestLinkBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Guest link:</span>
      <code className="text-slate-300 truncate max-w-[18rem]">{url}</code>
      <button
        onClick={copy}
        className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-slate-300"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-slate-300"
      >
        Preview as guest ↗
      </a>
    </div>
  );
}
