import { Link } from "@tanstack/react-router";
import { signOut, useSession } from "#/lib/auth-client";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-3 py-3 sm:py-4">
        <h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm text-(--sea-ink) no-underline shadow-[0_8px_24px_rgba(14,21,22,0.06)] sm:px-4 sm:py-2"
          >
            Claude Trello
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
          {session ? (
            <>
              <Link
                to="/dashboard"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Settings
              </Link>
              <button
                onClick={() => signOut().then(() => { window.location.href = "/"; })}
                className="nav-link cursor-pointer border-none bg-transparent"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="nav-link"
                activeProps={{ className: "nav-link is-active" }}
              >
                Register
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
