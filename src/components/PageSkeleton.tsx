export function PageSkeleton() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-(--foam)" />
        <div className="island-shell h-48 animate-pulse rounded-md" />
        <div className="island-shell h-32 animate-pulse rounded-md" />
      </div>
    </main>
  );
}
