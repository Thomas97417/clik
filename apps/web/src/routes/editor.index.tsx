import { seo } from "@/lib/seo/meta";
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import Editor from "@/components/clik/editor";
import Loader from "@/components/loader";
import {
  getLastLocalDraftId,
  isLocalDraftId,
} from "@/lib/clik/last-local-draft";
import { listLocalCreations } from "@/lib/clik/local";
export const Route = createFileRoute("/editor/")({
  head: () =>
    seo({
      title: "Votre atelier de construction 3D",
      text: "Assemblez et personnalisez vos créations dans votre atelier Clik.",
      path: "/editor",
      noindex: true,
    }),
  validateSearch: (s: Record<string, unknown>): { draft?: string } => ({
    draft: isLocalDraftId(s.draft) ? s.draft : undefined,
  }),
  component: Page,
});
function Page() {
  const { draft } = Route.useSearch();
  const navigate = Route.useNavigate();
  useEffect(() => {
    if (draft !== undefined) return;
    let active = true;
    const resume = async () => {
      let id = getLastLocalDraftId();
      if (id === undefined) {
        try {
          const latest = (await listLocalCreations())[0];
          id = latest?.key === "guest" ? "" : (latest?.key.slice(6) ?? "");
        } catch {
          id = "";
        }
      }
      if (active)
        await navigate({
          to: "/editor",
          search: { draft: id },
          replace: true,
        });
    };
    void resume();
    return () => {
      active = false;
    };
  }, [draft, navigate]);
  // Resolve the resume link before loading a scene into the shared editor store.
  if (draft === undefined) return <Loader />;
  return (
    <Editor
      key={draft || "guest"}
      draftId={draft || undefined}
      onNewCreation={() =>
        navigate({ to: "/editor", search: { draft: crypto.randomUUID() } })
      }
    />
  );
}
