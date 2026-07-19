'use client';

import { useEffect, useState } from 'react';

export function GuestLinkBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState(url);

  // Resolve against the current origin so the guest link is always a complete,
  // shareable absolute URL even if NEXT_PUBLIC_APP_BASE_URL wasn't baked into
  // the build (otherwise `url` can be a bare "/e/slug" path).
  useEffect(() => {
    try {
      setFullUrl(new URL(url, window.location.origin).toString());
    } catch {
      setFullUrl(url);
    }
  }, [url]);

  function copy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">Guest link:</span>
      <code className="text-slate-300 break-all">{fullUrl}</code>
      <button
        onClick={copy}
        className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-slate-300"
      >
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-slate-300"
      >
        Preview as guest ↗
      </a>
    </div>
  );
}
