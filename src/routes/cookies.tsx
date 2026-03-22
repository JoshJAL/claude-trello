import { createFileRoute } from "@tanstack/react-router";
import { Cookie, HardDrive } from "lucide-react";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
  head: () => ({
    meta: [{ title: "Cookie Policy — TaskPilot" }],
  }),
});

function CookiesPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-(--sea-ink)">Cookie Policy</h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            Last updated: March 22, 2026
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <p className="text-sm leading-relaxed text-(--sea-ink-soft)">
            TaskPilot uses only essential cookies required for the application to
            function. We do not use any tracking, analytics, or advertising
            cookies.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-(--sea-ink)">
            <Cookie size={20} className="text-(--lagoon)" />
            Cookies
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--shore-line)">
                  <th className="pb-2 pr-4 font-semibold text-(--sea-ink)">Name</th>
                  <th className="pb-2 pr-4 font-semibold text-(--sea-ink)">Purpose</th>
                  <th className="pb-2 pr-4 font-semibold text-(--sea-ink)">Type</th>
                  <th className="pb-2 font-semibold text-(--sea-ink)">Expiry</th>
                </tr>
              </thead>
              <tbody className="text-(--sea-ink-soft)">
                <tr className="border-b border-(--shore-line)/50">
                  <td className="py-2 pr-4 font-mono text-xs">better_auth.session_token</td>
                  <td className="py-2 pr-4">
                    Authenticates your session. HTTP-only and signed — cannot be
                    read by JavaScript.
                  </td>
                  <td className="py-2 pr-4">Essential</td>
                  <td className="py-2">Session expiry</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-(--sea-ink-soft)">
            This is the only cookie set by TaskPilot. It is strictly necessary
            for the application to function and cannot be disabled.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-(--sea-ink)">
            <HardDrive size={20} className="text-(--lagoon)" />
            Local Storage
          </h2>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            The following data is stored in your browser's localStorage. This
            data <strong>never leaves your browser</strong> and is not sent to
            our servers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--shore-line)">
                  <th className="pb-2 pr-4 font-semibold text-(--sea-ink)">Key</th>
                  <th className="pb-2 pr-4 font-semibold text-(--sea-ink)">Purpose</th>
                  <th className="pb-2 font-semibold text-(--sea-ink)">Values</th>
                </tr>
              </thead>
              <tbody className="text-(--sea-ink-soft)">
                <tr className="border-b border-(--shore-line)/50">
                  <td className="py-2 pr-4 font-mono text-xs">sidebar-collapsed</td>
                  <td className="py-2 pr-4">Remembers if the sidebar is collapsed</td>
                  <td className="py-2 font-mono text-xs">"true" / "false"</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="py-2 pr-4 font-mono text-xs">theme</td>
                  <td className="py-2 pr-4">Your color theme preference</td>
                  <td className="py-2 font-mono text-xs">"light" / "dark" / "auto"</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="py-2 pr-4 font-mono text-xs">seen-updates</td>
                  <td className="py-2 pr-4">Which update notifications you've dismissed</td>
                  <td className="py-2 font-mono text-xs">JSON array of IDs</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">site-consent</td>
                  <td className="py-2 pr-4">Whether you've acknowledged the consent banner</td>
                  <td className="py-2 font-mono text-xs">"accepted"</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-bold text-(--sea-ink)">
            Third-Party Cookies
          </h2>
          <p className="text-sm text-(--sea-ink-soft)">
            TaskPilot does not embed any third-party scripts, trackers, or
            analytics services. No third-party cookies are set when using
            TaskPilot.
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6">
          <p className="text-sm text-(--sea-ink-soft)">
            For more information about how we handle your data, see our{" "}
            <a
              href="/privacy"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
