export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-4xl font-bold tracking-tight">Event Planner V2</h1>
        <p className="mt-4 text-lg text-slate-300">
          Smart potluck planning for small parties. PM portfolio project — see SPEC.md for the full design.
        </p>
        <p className="mt-8 text-sm text-slate-400">
          Got an invite link? Open it directly on your phone — this page isn&apos;t the event.
        </p>
      </div>
    </main>
  );
}
