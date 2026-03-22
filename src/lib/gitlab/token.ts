import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshGitLabToken } from "./client";

/** Buffer before expiry to trigger proactive refresh (5 minutes) */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Get a valid GitLab access token for a user, automatically refreshing
 * if expired. Returns null if the user has no GitLab connection.
 *
 * Throws if the refresh token is also invalid (user must reconnect).
 */
export async function getValidGitLabToken(userId: string): Promise<string | null> {
  const [row] = await db
    .select({
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
    })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "gitlab"),
      ),
    )
    .limit(1);

  if (!row?.accessToken) return null;

  // If no expiry info, return the token as-is (legacy row without refresh support)
  if (!row.accessTokenExpiresAt) return row.accessToken;

  // Check if the token is still valid (with buffer)
  const now = Date.now();
  const expiresAt = row.accessTokenExpiresAt.getTime();

  if (now < expiresAt - REFRESH_BUFFER_MS) {
    return row.accessToken;
  }

  // Token expired or expiring soon — refresh it
  if (!row.refreshToken) {
    throw new Error("GitLab token expired and no refresh token available. Please reconnect GitLab in Settings.");
  }

  try {
    const tokenSet = await refreshGitLabToken(row.refreshToken);
    const newExpiresAt = tokenSet.expiresIn
      ? new Date(Date.now() + tokenSet.expiresIn * 1000)
      : null;

    // Update the stored tokens
    await db
      .update(account)
      .set({
        accessToken: tokenSet.accessToken,
        refreshToken: tokenSet.refreshToken ?? row.refreshToken,
        accessTokenExpiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, "gitlab"),
        ),
      );

    return tokenSet.accessToken;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token refresh failed";
    throw new Error(`GitLab token refresh failed: ${msg}. Please reconnect GitLab in Settings.`);
  }
}
