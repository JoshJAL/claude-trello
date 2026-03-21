import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { db } from "#/lib/db";
import * as schema from "#/lib/db/schema";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,

  database: drizzleAdapter(db, { provider: "sqlite", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      const { error } = await resend.emails.send({
        from: "noreply@ct.joshualevine.me",
        to: user.email,
        subject: "Reset your password — Claude Trello Bridge",
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password:</p><p><a href="${url}">Reset password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
      if (error) {
        console.error("[Password Reset] Failed to send email:", error);
      }
    },
  },

  plugins: [
    tanstackStartCookies(), // must be last plugin
  ],
});
