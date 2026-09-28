import { createFileRoute } from "@tanstack/react-router";
import Editor from "@/components/clik/editor";
export const Route = createFileRoute("/editor/")({
  validateSearch: (s: Record<string, unknown>): { draft?: string } => ({
    draft:
      typeof s.draft === "string" && /^[a-z0-9-]{1,80}$/i.test(s.draft)
        ? s.draft
        : undefined,
  }),
  component: Page,
});
function Page() {
  const { draft } = Route.useSearch();
  return <Editor key={draft ?? "guest"} draftId={draft} />;
}
