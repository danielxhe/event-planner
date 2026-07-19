import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight">Spread</h1>
        <p className="mt-4 text-lg text-slate-300">
          Potluck planning that actually works. Guests RSVP in 5 seconds with no account, claim
          dishes so you don&apos;t get twelve casseroles, and an AI suggester fills the gaps
          around everyone&apos;s dietary needs.
        </p>

        <Link
          href="/new"
          className="mt-8 inline-block rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold hover:bg-purple-500"
        >
          Plan a potluck →
        </Link>
        <p className="mt-3 text-sm text-slate-400">
          Free, no signup. You get a link for guests and a private link for you.
        </p>

        <ul className="mt-12 space-y-3 text-sm text-slate-300">
          <li>🍽️ <span className="font-medium">Live dish board</span> — see what&apos;s claimed and what&apos;s missing, by category and servings</li>
          <li>🥦 <span className="font-medium">Dietary-aware</span> — restrictions flow from RSVPs straight into planning</li>
          <li>✨ <span className="font-medium">AI suggestions</span> — gap-targeted dish ideas you approve with one tap</li>
          <li>📱 <span className="font-medium">Reminder texts</span> — nudge exactly the people who haven&apos;t claimed</li>
        </ul>

        <p className="mt-12 text-sm text-slate-400">
          Got an invite link? Open it directly — this page isn&apos;t the event.
        </p>
      </div>
    </main>
  );
}
