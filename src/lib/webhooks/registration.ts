import { randomUUID } from "crypto";
import { db } from "#/lib/db";
import { registeredWebhooks } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type WebhookSource = "trello" | "github" | "gitlab";

/**
 * Check if a webhook is already registered for a user + source + identifier.
 */
export async function isWebhookRegistered(
  userId: string,
  source: WebhookSource,
  sourceIdentifier: string,
): Promise<boolean> {
  const [existing] = await db
    .select({ id: registeredWebhooks.id })
    .from(registeredWebhooks)
    .where(
      and(
        eq(registeredWebhooks.userId, userId),
        eq(registeredWebhooks.source, source),
        eq(registeredWebhooks.sourceIdentifier, sourceIdentifier),
        eq(registeredWebhooks.active, true),
      ),
    )
    .limit(1);

  return !!existing;
}

/**
 * Record a webhook registration.
 * Called after successfully registering with the source API.
 */
export async function recordWebhookRegistration(
  userId: string,
  source: WebhookSource,
  sourceIdentifier: string,
  webhookId?: string,
  secret?: string,
): Promise<void> {
  await db.insert(registeredWebhooks).values({
    id: randomUUID(),
    userId,
    source,
    sourceIdentifier,
    webhookId: webhookId ?? null,
    secret: secret ?? null,
    active: true,
    createdAt: new Date(),
  });
}

/**
 * Deactivate all webhooks for a user + source (e.g. when disconnecting).
 */
export async function deactivateWebhooks(
  userId: string,
  source: WebhookSource,
): Promise<void> {
  await db
    .update(registeredWebhooks)
    .set({ active: false })
    .where(
      and(
        eq(registeredWebhooks.userId, userId),
        eq(registeredWebhooks.source, source),
      ),
    );
}

/**
 * Attempt to register a webhook with the source API.
 * Best-effort — errors are logged but don't block the session.
 */
export async function ensureWebhookRegistered(
  userId: string,
  source: WebhookSource,
  sourceIdentifier: string,
  sourceToken: string,
): Promise<boolean> {
  try {
    // Check if already registered
    if (await isWebhookRegistered(userId, source, sourceIdentifier)) {
      return true;
    }

    const baseUrl = process.env.BASE_URL ?? process.env.BETTER_AUTH_URL;
    if (!baseUrl) return false;

    let webhookId: string | undefined;

    if (source === "trello") {
      const callbackUrl = `${baseUrl}/api/webhooks/trello`;
      const apiKey = process.env.TRELLO_API_KEY;
      if (!apiKey) return false;

      const res = await fetch(
        `https://api.trello.com/1/tokens/${sourceToken}/webhooks?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callbackURL: callbackUrl,
            idModel: sourceIdentifier,
            description: `TaskPilot webhook for board ${sourceIdentifier}`,
          }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as { id: string };
        webhookId = data.id;
      } else {
        console.error("[Webhook] Trello registration failed:", res.status, await res.text());
        return false;
      }
    } else if (source === "github") {
      // GitHub webhooks require repo admin access — log for now
      // Users typically set these up via GitHub UI or API manually
      console.log(`[Webhook] GitHub webhook auto-registration not supported. Set up manually for ${sourceIdentifier}`);
      // Still record as "registered" to avoid repeated attempts
    } else if (source === "gitlab") {
      console.log(`[Webhook] GitLab webhook auto-registration not supported. Set up manually for ${sourceIdentifier}`);
    }

    await recordWebhookRegistration(userId, source, sourceIdentifier, webhookId);
    return true;
  } catch (err) {
    console.error("[Webhook] Registration failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
