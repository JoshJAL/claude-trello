import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "#/lib/db";
import * as schema from "#/lib/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  database: drizzleAdapter(db, { provider: "sqlite", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Replace with a real email service (e.g. Resend, SendGrid)
      console.log(`[Password Reset] To: ${user.email}`);
      console.log(`[Password Reset] URL: ${url}`);
    },
  },

  plugins: [
    tanstackStartCookies(), // must be last plugin
  ],
});
