import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

import type { DataModel } from "./_generated/dataModel";

import { components, internal } from "./_generated/api";
import { query, type ActionCtx } from "./_generated/server";
import authConfig from "./auth.config";
import {
  SITE_URL,
  EMAIL_FROM,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  BETTER_AUTH_URL,
} from "./env";

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: BETTER_AUTH_URL,
    trustedOrigins: [SITE_URL],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        const actionCtx = ctx as unknown as ActionCtx;
        await actionCtx.runAction(internal.sendEmails.sendResetPasswordEmail, {
          from: EMAIL_FROM,
          to: user.email,
          url,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url, token }) => {
        const actionCtx = ctx as unknown as ActionCtx;
        await actionCtx.runAction(internal.sendEmails.sendVerificationEmail, {
          from: EMAIL_FROM,
          to: user.email,
          url,
          token,
        });
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
      deleteUser: {
        enabled: true,
      },
    },
    socialProviders: {
      github: {
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      },
      google: {
        prompt: "select_account",
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
