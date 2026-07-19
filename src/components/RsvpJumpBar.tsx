'use client';

// Sticky bottom-thumb-zone CTA. The RSVP form can sit below a long hero on
// small screens; this keeps the primary action one tap away until the guest
// has either reached the form or already has an identity (RSVPed).

import { useEffect, useState } from 'react';

export function RsvpJumpBar() {
  const [formVisible, setFormVisible] = useState(true);
  const [identified, setIdentified] = useState(true); // assume known until checked

  useEffect(() => {
    setIdentified(!!localStorage.getItem('ep:guestId'));
    const onIdentity: EventListener = e => {
      const detail = (e as unknown as CustomEvent<{ phone?: string }>).detail;
      setIdentified(!!detail?.phone);
    };
    window.addEventListener('ep:identity', onIdentity);

    const target = document.getElementById('rsvp');
    let observer: IntersectionObserver | undefined;
    if (target && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        entries => setFormVisible(entries[0]?.isIntersecting ?? true),
        { rootMargin: '0px 0px -20% 0px' }
      );
      observer.observe(target);
    } else {
      setFormVisible(true);
    }
    return () => {
      window.removeEventListener('ep:identity', onIdentity);
      observer?.disconnect();
    };
  }, []);

  if (formVisible || identified) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        onClick={() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        className="w-full max-w-xl mx-auto block rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3.5 shadow-lg shadow-purple-950/50"
      >
        RSVP — it takes 5 seconds
      </button>
    </div>
  );
}
