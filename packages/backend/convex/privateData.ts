import { query } from "./_generated/server";
import { authComponent } from "./auth";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return {
        message: "Not authenticated",
      };
    }
    return {
      message: "This is private",
    };
  },
});
