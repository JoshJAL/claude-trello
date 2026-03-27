import { createFileRoute } from "@tanstack/react-router";
import {
  Shield,
  Database,
  Key,
  Eye,
  Clock,
  UserCheck,
  Cookie,
  Mail,
  Server,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: "Privacy Policy — TaskPilot" }],
  }),
});

function Section({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: typeof Shield;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="island-shell scroll-mt-20 rounded-md p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-(--sea-ink)">
        <Icon size={20} className="text-(--lagoon)" />
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-(--sea-ink-soft)">
        {children}
      </div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-(--sea-ink)">
            Privacy Policy
          </h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            Last updated: March 22, 2026
          </p>
        </div>

        <div className="island-shell rounded-md p-6">
          <p className="text-sm leading-relaxed text-(--sea-ink-soft)">
            TaskPilot is an open-source tool that connects AI coding agents to
            task boards. We take your privacy seriously. This policy explains
            what data we collect, why, how it's stored, and your rights
            regarding it.
          </p>
        </div>

        <Section icon={Database} title="Information We Collect" id="data-collection">
          <p className="font-semibold text-(--sea-ink)">Account Information</p>
          <p>
            When you register, we collect your <strong>name</strong>,{" "}
            <strong>email address</strong>, and <strong>password</strong>. Your
            password is hashed using bcrypt before storage and is never stored
            in plaintext.
          </p>

          <p className="font-semibold text-(--sea-ink)">OAuth Tokens</p>
          <p>
            When you connect Trello, GitHub, or GitLab, we store the OAuth
            access token (and refresh token for GitLab) returned by the
            provider. These tokens are stored server-side in the database and
            are <strong>never sent to your browser</strong>. They are used
            solely to interact with the respective APIs on your behalf.
          </p>

          <p className="font-semibold text-(--sea-ink)">AI Provider API Keys</p>
          <p>
            You provide your own API keys for Anthropic (Claude), OpenAI, or
            Groq. Each key is{" "}
            <strong>encrypted at rest using AES-256-GCM</strong> before being
            stored in the database. Keys are decrypted only at the moment an AI
            session is launched and are never returned to your browser.
          </p>

          <p className="font-semibold text-(--sea-ink)">Session History</p>
          <p>
            When you run an AI session, we store a record including: the task
            source and board/repo name, the AI provider used, session mode,
            status, token counts, cost (in cents), start/end timestamps, and a
            log of session events (messages, tool calls, task completions). This
            data is used to power the History and Analytics pages.
          </p>

          <p className="font-semibold text-(--sea-ink)">User Settings</p>
          <p>
            We store your preferences including monthly budget limit, budget
            alert threshold, and PR automation configuration.
          </p>

          <p className="font-semibold text-(--sea-ink)">Client-Side Storage</p>
          <p>
            The following data is stored in your browser's localStorage and is{" "}
            <strong>never sent to our servers</strong>:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Sidebar collapse state</li>
            <li>Theme preference (light/dark/auto)</li>
            <li>List of seen update notifications</li>
            <li>Cookie consent status</li>
          </ul>
        </Section>

        <Section icon={Eye} title="How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>Authenticate you and maintain your session</li>
            <li>
              Interact with Trello, GitHub, and GitLab APIs on your behalf
            </li>
            <li>Launch AI coding sessions using your own API keys</li>
            <li>Display your session history and cost analytics</li>
            <li>Enforce budget limits you configure</li>
            <li>Create pull requests and merge requests when configured</li>
          </ul>
          <p>
            We do <strong>not</strong> use your data for advertising, profiling,
            or any purpose unrelated to providing the TaskPilot service.
          </p>
        </Section>

        <Section icon={Key} title="Data Storage & Security">
          <p>
            All data is stored in a <strong>Turso</strong> (cloud SQLite)
            database. The database is encrypted in transit and at rest by the
            hosting provider.
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>Passwords</strong> are hashed with bcrypt (never stored in
              plaintext)
            </li>
            <li>
              <strong>AI API keys</strong> are encrypted with AES-256-GCM using
              a server-side encryption key
            </li>
            <li>
              <strong>OAuth tokens</strong> are stored server-side and never
              exposed to the client
            </li>
            <li>
              <strong>Session cookies</strong> are HTTP-only and signed with a
              secret key
            </li>
          </ul>
        </Section>

        <Section icon={Server} title="Third-Party Services">
          <p>
            TaskPilot integrates with third-party services that have their own
            privacy policies:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>Trello</strong> (Atlassian) — for reading boards, cards,
              and checklists
            </li>
            <li>
              <strong>GitHub</strong> — for reading issues, creating branches,
              commits, and pull requests
            </li>
            <li>
              <strong>GitLab</strong> — for reading issues, creating branches,
              commits, and merge requests
            </li>
            <li>
              <strong>Anthropic</strong>, <strong>OpenAI</strong>,{" "}
              <strong>Groq</strong> — for AI model inference (using your own API
              keys)
            </li>
            <li>
              <strong>Turso</strong> — for database hosting
            </li>
          </ul>
          <p>
            We send only the minimum data required to each service. Your code
            and task content are sent to the AI provider you select during a
            session, using your own API key.
          </p>
        </Section>

        <Section icon={Clock} title="Data Retention">
          <p>
            Your data is retained for as long as your account exists. If you
            delete your account, all associated data — including session history,
            API keys, OAuth tokens, and settings — is permanently deleted. There
            is no backup retention period.
          </p>
          <p>
            Session event logs may be large. You can delete individual sessions
            from the History page at any time.
          </p>
        </Section>

        <Section icon={UserCheck} title="Your Rights">
          <p>You have the right to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              <strong>Access</strong> your data — your settings, session
              history, and connected accounts are all visible in the app
            </li>
            <li>
              <strong>Delete</strong> your data — remove API keys, disconnect
              OAuth accounts, delete sessions, or delete your entire account
            </li>
            <li>
              <strong>Export</strong> your data — session history is viewable
              in-app and the project is open source
            </li>
            <li>
              <strong>Withdraw consent</strong> — disconnect any integration or
              remove your API key at any time from Settings
            </li>
          </ul>
        </Section>

        <Section icon={Cookie} title="Cookies">
          <p>
            TaskPilot uses a single essential cookie for authentication. We do
            not use any tracking, analytics, or advertising cookies.
          </p>
          <p>
            For full details, see our{" "}
            <a
              href="/cookies"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Cookie Policy
            </a>
            .
          </p>
        </Section>

        <Section icon={Mail} title="Contact">
          <p>
            If you have questions about this privacy policy, please{" "}
            <a
              href="https://github.com/JoshJAL/claude-trello/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-(--lagoon) hover:underline"
            >
              open an issue on GitHub
            </a>
            .
          </p>
        </Section>

        <Section icon={Shield} title="Changes to This Policy">
          <p>
            We may update this privacy policy from time to time. Changes will be
            posted on this page with an updated "Last updated" date. Continued
            use of the service after changes constitutes acceptance of the
            updated policy.
          </p>
        </Section>
      </div>
    </main>
  );
}
