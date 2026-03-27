import { createFileRoute } from "@tanstack/react-router";
import {
  Scale,
  FileText,
  UserCheck,
  Key,
  ShieldAlert,
  Copyright,
  AlertTriangle,
  Link2,
  XCircle,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "Terms of Service — TaskPilot" }],
  }),
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Scale;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="island-shell rounded-md p-6">
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

function TermsPage() {
  return (
    <main className="page-wrap px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-(--sea-ink)">
            Terms of Service
          </h1>
          <p className="mt-1 text-sm text-(--sea-ink-soft)">
            Last updated: March 22, 2026
          </p>
        </div>

        <Section icon={Scale} title="Acceptance of Terms">
          <p>
            By creating an account or using TaskPilot, you agree to these Terms
            of Service. If you do not agree, do not use the service.
          </p>
        </Section>

        <Section icon={FileText} title="Description of Service">
          <p>
            TaskPilot is an open-source web application and CLI tool that
            connects AI coding agents to task boards (Trello, GitHub Issues,
            GitLab Issues). It reads your tasks, launches AI agents that make
            code changes, and updates task status as work is completed.
          </p>
          <p>
            The service is provided "as-is" and is under active development.
            Features may change, be added, or be removed at any time.
          </p>
        </Section>

        <Section icon={UserCheck} title="Account Registration">
          <p>
            You must provide accurate information when registering. You are
            responsible for maintaining the security of your account credentials.
            Do not share your account with others.
          </p>
          <p>
            You must be at least 13 years old to use this service, or the
            minimum age required in your jurisdiction.
          </p>
        </Section>

        <Section icon={Key} title="API Keys & Third-Party Services">
          <p>
            TaskPilot requires you to provide your own API keys for AI providers
            (Anthropic, OpenAI, or Groq). You are solely responsible for:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              All charges incurred on your AI provider accounts during sessions
            </li>
            <li>
              Complying with the terms of service of each AI provider
            </li>
            <li>
              The security of your API keys outside of TaskPilot
            </li>
            <li>
              Any OAuth permissions you grant for Trello, GitHub, or GitLab
            </li>
          </ul>
          <p>
            TaskPilot encrypts your API keys at rest and decrypts them only when
            launching a session. We never share your keys with third parties
            beyond the AI provider you select.
          </p>
        </Section>

        <Section icon={ShieldAlert} title="Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>
              Use the service for any illegal purpose or in violation of any
              applicable laws
            </li>
            <li>
              Attempt to gain unauthorized access to other users' accounts or
              data
            </li>
            <li>
              Reverse engineer, decompile, or disassemble the service (note: the
              source code is publicly available under the MIT license)
            </li>
            <li>
              Use the service to generate malicious code, malware, or content
              that violates AI provider terms
            </li>
            <li>
              Abuse rate limits or overwhelm the service with automated requests
            </li>
          </ul>
        </Section>

        <Section icon={Copyright} title="Intellectual Property">
          <p>
            <strong>Your code:</strong> You retain all rights to any code that
            AI agents produce during sessions in your repositories. TaskPilot
            makes no claim to your code or intellectual property.
          </p>
          <p>
            <strong>TaskPilot:</strong> The TaskPilot application, brand, and
            documentation are the property of their respective authors.
            The source code is licensed under the MIT license.
          </p>
        </Section>

        <Section icon={AlertTriangle} title="Limitation of Liability">
          <p>
            TaskPilot is provided <strong>"as-is"</strong> without warranty of
            any kind, express or implied. We do not guarantee:
          </p>
          <ul className="list-inside list-disc space-y-1 pl-2">
            <li>The quality, correctness, or safety of AI-generated code</li>
            <li>
              Uninterrupted or error-free operation of the service
            </li>
            <li>
              That AI agents will complete all tasks correctly
            </li>
            <li>
              Accuracy of cost tracking or budget enforcement
            </li>
          </ul>
          <p>
            You are responsible for reviewing all code changes made by AI agents
            before merging, deploying, or using them in production. In no event
            shall TaskPilot or its authors be liable for any damages arising
            from the use of the service.
          </p>
        </Section>

        <Section icon={Link2} title="Privacy">
          <p>
            Your use of TaskPilot is also governed by our{" "}
            <a
              href="/privacy"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Privacy Policy
            </a>
            , which describes how we collect, use, and protect your data.
          </p>
        </Section>

        <Section icon={XCircle} title="Termination">
          <p>
            You may delete your account at any time. Upon deletion, all your
            data — including session history, API keys, OAuth tokens, and
            settings — is permanently removed.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these terms. We will make reasonable efforts to notify you before
            taking such action.
          </p>
        </Section>

        <Section icon={Scale} title="Changes to These Terms">
          <p>
            We may update these terms from time to time. Changes will be posted
            on this page with an updated "Last updated" date. Continued use of
            the service after changes constitutes acceptance of the updated
            terms.
          </p>
        </Section>

        <Section icon={Mail} title="Contact">
          <p>
            If you have questions about these terms, please{" "}
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
      </div>
    </main>
  );
}
