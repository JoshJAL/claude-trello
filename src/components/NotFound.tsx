export function NotFound() {
  return (
    <main className="page-wrap flex min-h-[60vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8 text-center">
        <div className="mb-4 text-6xl font-bold text-[var(--sea-ink-soft)]">
          404
        </div>
        <h1 className="mb-2 text-xl font-bold text-[var(--sea-ink)]">
          Page not found
        </h1>
        <p className="mb-6 text-sm text-[var(--sea-ink-soft)]">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Go home
        </a>
      </div>
    </main>
  );
}
