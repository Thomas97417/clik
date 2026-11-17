import { useCallback } from "react";
import { useConvex } from "convex/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import CreationPreview from "./creation-preview";

export default function RemoteProjectPreview({
  projectId,
  revision,
  poster,
  ...props
}: {
  projectId: Id<"projects">;
  revision: number;
  poster?: string | null;
  cacheKey: string;
  title: string;
  className?: string;
  imageClassName?: string;
  placeholderClassName?: string;
}) {
  const convex = useConvex();
  const load = useCallback(async () => {
    const project = await convex.query(api.projects.get, { id: projectId });
    if (project.revision !== revision)
      throw Error("La création a changé. Actualisez son aperçu.");
    return project.scene;
  }, [convex, projectId, revision]);
  return (
    <CreationPreview {...props} scene={load} poster={poster ?? undefined} />
  );
}
