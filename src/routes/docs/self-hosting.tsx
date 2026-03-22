import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  Server,
  Database,
  Key,
  Shield,
  Globe,
  Terminal,
  Copy,
  Check,
  Github,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/docs/self-hosting")({
  component: SelfHostingDocsPage,
  head: () => ({
    meta: [{ title: "Self-Hosting Guide — TaskPilot" }],
  }),
});

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded p-1 text-(--sea-ink-soft) transition hover:bg-white/20"
      title="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-(--foam) p-4 font-mono text-xs leading-relaxed text-(--sea-ink)">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="island-shell rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={20} className="text-(--lagoon)" />
        <h2 className="text-lg font-semibold text-(--sea-ink)">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-(--sea-ink-soft)">
        {children}
      </div>
    </section>
  );
}

function EnvTable({
  rows,
}: {
  rows: Array<{
    name: string;
    required: string;
    description: string;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-(--shore-line)">
            <th className="py-2 pr-4 font-semibold text-(--sea-ink)">Variable</th>
            <th className="py-2 pr-4 font-semibold text-(--sea-ink)">Required</th>
            <th className="py-2 font-semibold text-(--sea-ink)">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-(--shore-line)/50">
              <td className="py-2 pr-4 font-mono text-(--lagoon)">{row.name}</td>
              <td className="py-2 pr-4">{row.required}</td>
              <td className="py-2">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelfHostingDocsPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="island-shell rounded-2xl p-8">
          <div className="mb-1 flex items-center gap-2">
            <Server size={24} className="text-(--lagoon)" />
            <h1 className="text-2xl font-bold text-(--sea-ink)">
              Self-Hosting Guide
            </h1>
          </div>
          <p className="mb-4 text-sm text-(--sea-ink-soft)">
            Run your own TaskPilot instance. Every user brings their own AI
            provider keys — there is no shared server-side API key.
          </p>
          <a
            href="https://github.com/JoshJAL/claude-trello"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#24292f] px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-[#1b1f23] dark:bg-[#f0f6fc] dark:text-[#24292f] dark:hover:bg-[#d0d7de]"
          >
            <Github size={16} />
            View Source on GitHub
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Prerequisites */}
        <Section icon={Terminal} title="Prerequisites">
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Node.js 20+</strong></li>
            <li><strong>pnpm</strong> — install with <code className="rounded bg-(--foam) px-1">npm i -g pnpm</code></li>
            <li>A <strong>Turso</strong> database (free tier at <a href="https://turso.tech" target="_blank" rel="noopener noreferrer" className="text-(--lagoon) underline">turso.tech</a>)</li>
            <li>OAuth credentials for at least one task source (Trello, GitHub, or GitLab)</li>
            <li>A domain with HTTPS for production (localhost works for development)</li>
          </ul>
        </Section>

        {/* Clone & Install */}
        <Section icon={Terminal} title="1. Clone & Install">
          <CodeBlock
            code={`git clone https://github.com/JoshJAL/claude-trello.git
cd claude-trello
pnpm install
cp .env.example .env`}
          />
        </Section>

        {/* Database */}
        <Section icon={Database} title="2. Create Database">
          <p>TaskPilot uses <strong>Turso</strong> (hosted SQLite). Create a free database:</p>
          <CodeBlock
            code={`# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Sign up / log in
turso auth signup

# Create database
turso db create taskpilot

# Get credentials for .env
turso db show taskpilot --url        # TURSO_DATABASE_URL
turso db tokens create taskpilot     # TURSO_AUTH_TOKEN`}
          />
        </Section>

        {/* Environment Variables */}
        <Section icon={Key} title="3. Configure Environment Variables">
          <p>
            Edit <code className="rounded bg-(--foam) px-1">.env</code> and fill
            in all values. Generate secrets with{" "}
            <code className="rounded bg-(--foam) px-1">openssl rand -hex 32</code>.
          </p>

          <h3 className="mt-4 text-sm font-semibold text-(--sea-ink)">Required</h3>
          <EnvTable
            rows={[
              { name: "BETTER_AUTH_SECRET", required: "Yes", description: "Random 32+ char hex string. Signs sessions and tokens." },
              { name: "BETTER_AUTH_URL", required: "Yes", description: "Your app URL (e.g. http://localhost:3000)" },
              { name: "TURSO_DATABASE_URL", required: "Yes", description: "From turso db show" },
              { name: "TURSO_AUTH_TOKEN", required: "Yes", description: "From turso db tokens create" },
              { name: "ENCRYPTION_KEY", required: "Yes", description: "64-char hex string (openssl rand -hex 32). Encrypts user API keys at rest." },
              { name: "BASE_URL", required: "Yes", description: "Same as BETTER_AUTH_URL" },
              { name: "VITE_BETTER_AUTH_URL", required: "Yes", description: "Same as BETTER_AUTH_URL (client-side)" },
            ]}
          />

          <h3 className="mt-4 text-sm font-semibold text-(--sea-ink)">Task Sources (configure at least one)</h3>
          <EnvTable
            rows={[
              { name: "TRELLO_API_KEY", required: "For Trello", description: "From trello.com/app-key" },
              { name: "TRELLO_API_SECRET", required: "For Trello", description: "Same page as above" },
              { name: "GITHUB_CLIENT_ID", required: "For GitHub", description: "From GitHub OAuth App settings" },
              { name: "GITHUB_CLIENT_SECRET", required: "For GitHub", description: "Same page as above" },
              { name: "GITLAB_CLIENT_ID", required: "For GitLab", description: "From GitLab Application settings" },
              { name: "GITLAB_CLIENT_SECRET", required: "For GitLab", description: "Same page as above" },
            ]}
          />

          <h3 className="mt-4 text-sm font-semibold text-(--sea-ink)">Optional</h3>
          <EnvTable
            rows={[
              { name: "RESEND_API_KEY", required: "No", description: "For password reset emails (from resend.com)" },
              { name: "GITHUB_WEBHOOK_SECRET", required: "No", description: "For GitHub webhook signature validation" },
              { name: "GITLAB_WEBHOOK_SECRET", required: "No", description: "For GitLab webhook token validation" },
            ]}
          />
        </Section>

        {/* OAuth Callbacks */}
        <Section icon={Shield} title="4. OAuth Callback URLs">
          <p>When creating your OAuth apps, set these callback URLs:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-(--shore-line)">
                  <th className="py-2 pr-4 font-semibold text-(--sea-ink)">Source</th>
                  <th className="py-2 font-semibold text-(--sea-ink)">Callback URL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="py-2 pr-4">Trello</td>
                  <td className="py-2 font-mono text-(--lagoon)">{"{BASE_URL}"}/api/auth/callback/trello</td>
                </tr>
                <tr className="border-b border-(--shore-line)/50">
                  <td className="py-2 pr-4">GitHub</td>
                  <td className="py-2 font-mono text-(--lagoon)">{"{BASE_URL}"}/api/github/callback</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">GitLab</td>
                  <td className="py-2 font-mono text-(--lagoon)">{"{BASE_URL}"}/api/gitlab/callback</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            Replace <code className="rounded bg-(--foam) px-1">{"{BASE_URL}"}</code> with
            your actual domain (e.g.{" "}
            <code className="rounded bg-(--foam) px-1">https://taskpilot.yourdomain.com</code>).
          </p>
        </Section>

        {/* Push Schema */}
        <Section icon={Database} title="5. Push Database Schema">
          <CodeBlock code="pnpm db:push" />
          <p>This creates all required tables in your Turso database.</p>
        </Section>

        {/* Run */}
        <Section icon={Terminal} title="6. Run">
          <h3 className="text-sm font-semibold text-(--sea-ink)">Development</h3>
          <CodeBlock code="pnpm dev" />

          <h3 className="mt-4 text-sm font-semibold text-(--sea-ink)">Production</h3>
          <CodeBlock
            code={`pnpm build
node .output/server/index.mjs`}
          />
          <p>
            TaskPilot uses <strong>Nitro</strong> under the hood. It can deploy to Vercel,
            any Node.js host, or Docker. The build output is in{" "}
            <code className="rounded bg-(--foam) px-1">.output/</code>.
          </p>
        </Section>

        {/* Webhooks */}
        <Section icon={Globe} title="7. Webhooks (Optional)">
          <p>
            For real-time task updates instead of 5-second polling:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>Trello</strong>: Webhooks are auto-registered when you start
              your first session on a board. No manual setup needed.
            </li>
            <li>
              <strong>GitHub</strong>: Go to your repo Settings &gt; Webhooks &gt;
              Add webhook. Set the payload URL to{" "}
              <code className="rounded bg-(--foam) px-1">{"{BASE_URL}"}/api/webhooks/github</code>,
              content type to <code className="rounded bg-(--foam) px-1">application/json</code>,
              and the secret to match your <code className="rounded bg-(--foam) px-1">GITHUB_WEBHOOK_SECRET</code>.
              Select events: Issues, Pull requests.
            </li>
            <li>
              <strong>GitLab</strong>: Go to your project Settings &gt; Webhooks.
              Set the URL to{" "}
              <code className="rounded bg-(--foam) px-1">{"{BASE_URL}"}/api/webhooks/gitlab</code> and
              the secret token to match <code className="rounded bg-(--foam) px-1">GITLAB_WEBHOOK_SECRET</code>.
              Enable: Issue events, Merge request events.
            </li>
          </ul>
        </Section>

        {/* Security */}
        <Section icon={Shield} title="Security Notes">
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>No shared AI key</strong>: Every user enters their own
              Anthropic/OpenAI/Groq API key. Keys are encrypted with AES-256-GCM
              before storage and only decrypted at the moment a session launches.
            </li>
            <li>
              <strong>ENCRYPTION_KEY</strong> is the master secret. If you rotate
              it, you must re-encrypt all stored keys (migration required).
            </li>
            <li>
              <strong>OAuth tokens</strong> are stored server-side only — never
              sent to the client.
            </li>
            <li>
              <strong>Sessions</strong> are HTTP-only cookies signed with
              BETTER_AUTH_SECRET.
            </li>
            <li>
              <strong>Passwords</strong> are bcrypt-hashed by Better Auth.
            </li>
            <li>
              Never commit <code className="rounded bg-(--foam) px-1">.env</code>.
              It is in <code className="rounded bg-(--foam) px-1">.gitignore</code>.
            </li>
          </ul>
        </Section>

        {/* Source Code */}
        <Section icon={Github} title="Source Code">
          <p>
            TaskPilot is open source. The full codebase, architecture docs, and
            implementation history are available on GitHub:
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a
              href="https://github.com/JoshJAL/claude-trello"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--shore-line) px-3 py-2 text-sm font-medium text-(--sea-ink) no-underline transition hover:border-(--lagoon)"
            >
              <Github size={16} />
              Web App (this repo)
              <ExternalLink size={12} />
            </a>
            <a
              href="https://www.npmjs.com/package/taskpilot-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--shore-line) px-3 py-2 text-sm font-medium text-(--sea-ink) no-underline transition hover:border-(--lagoon)"
            >
              <Terminal size={16} />
              CLI on npm
              <ExternalLink size={12} />
            </a>
          </div>
          <p className="mt-4">
            Key files for understanding the architecture:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li><code className="rounded bg-(--foam) px-1">CLAUDE.md</code> — Full architecture reference, data flow, patterns</li>
            <li><code className="rounded bg-(--foam) px-1">PROGRESS.md</code> — Implementation history with all 20 phases</li>
            <li><code className="rounded bg-(--foam) px-1">src/lib/</code> — Core logic (auth, encryption, providers, tasks)</li>
            <li><code className="rounded bg-(--foam) px-1">src/routes/api/</code> — All API endpoints</li>
            <li><code className="rounded bg-(--foam) px-1">cli/</code> — CLI tool source</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
