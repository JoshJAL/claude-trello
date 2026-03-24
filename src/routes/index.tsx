import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "#/components/AuthForm";
import { getSession } from "#/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) {
      throw redirect({ to: "/dashboard", search: { q: "" } });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  return (
    <main className="page-wrap flex min-h-[80vh] items-center justify-center px-4">
      <div className="island-shell w-full max-w-md rounded-2xl p-8">
        <h1 className="mb-2 text-center text-2xl font-bold text-(--sea-ink)">
          Sign in
        </h1>
        <p className="mb-6 text-center text-sm text-(--sea-ink-soft)">
          Bridge your Trello boards with Claude Code
        </p>
        <AuthForm mode="sign-in" />
      </div>
    </main>
  );
}
