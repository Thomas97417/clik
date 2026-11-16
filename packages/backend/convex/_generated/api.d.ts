/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as avatars from "../avatars.js";
import type * as challenges from "../challenges.js";
import type * as comments from "../comments.js";
import type * as crons from "../crons.js";
import type * as env from "../env.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_authorNames from "../lib/authorNames.js";
import type * as lib_avatars from "../lib/avatars.js";
import type * as lib_rewards from "../lib/rewards.js";
import type * as privateData from "../privateData.js";
import type * as projects from "../projects.js";
import type * as rewards from "../rewards.js";
import type * as sendEmails from "../sendEmails.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  avatars: typeof avatars;
  challenges: typeof challenges;
  comments: typeof comments;
  crons: typeof crons;
  env: typeof env;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/authorNames": typeof lib_authorNames;
  "lib/avatars": typeof lib_avatars;
  "lib/rewards": typeof lib_rewards;
  privateData: typeof privateData;
  projects: typeof projects;
  rewards: typeof rewards;
  sendEmails: typeof sendEmails;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
