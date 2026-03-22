import { db } from "#/lib/db";
import { account } from "#/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { refreshGoogleToken } from "./client";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getValidGoogleToken(userId: string): Promise<string | null> {
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
        eq(account.providerId, "google"),
      ),
    )
    .limit(1);

  if (!row?.accessToken) return null;

  if (!row.accessTokenExpiresAt) return row.accessToken;

  const now = Date.now();
  const expiresAt = row.accessTokenExpiresAt.getTime();

  if (now < expiresAt - REFRESH_BUFFER_MS) {
    return row.accessToken;
  }

  if (!row.refreshToken) {
    throw new Error("Google token expired and no refresh token available. Please reconnect Google Drive in Settings.");
  }

  try {
    const tokenSet = await refreshGoogleToken(row.refreshToken);
    const newExpiresAt = tokenSet.expiresIn
      ? new Date(Date.now() + tokenSet.expiresIn * 1000)
      : null;

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
          eq(account.providerId, "google"),
        ),
      );

    return tokenSet.accessToken;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token refresh failed";
    throw new Error(`Google token refresh failed: ${msg}. Please reconnect Google Drive in Settings.`);
  }
}
