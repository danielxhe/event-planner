'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  slug: string;
  hostSecret: string;
  itemId: string;
  itemLabel: string;
  isClaimed: boolean;
}

export function PotluckDeleteButton({ slug, hostSecret, itemId, itemLabel, isClaimed }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const warning = isClaimed
      ? `"${itemLabel}" is already claimed. Remove it anyway?`
      : `Remove "${itemLabel}"?`;
    if (!confirm(warning)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/potluck', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, hostSecret, itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title="Remove item"
      aria-label={`Remove ${itemLabel}`}
      className="text-slate-500 hover:text-rose-400 disabled:opacity-40 text-sm leading-none px-1"
    >
      ×
    </button>
  );
}
