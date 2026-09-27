import { useQuery } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";

export function useCurrentUser() {
  return useQuery(api.auth.getCurrentUser);
}
