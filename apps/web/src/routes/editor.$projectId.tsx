import { seo } from "@/lib/seo/meta";
import { createFileRoute } from "@tanstack/react-router";
import Editor from "@/components/clik/editor";
export const Route = createFileRoute("/editor/$projectId")({
  validateSearch: (search: Record<string, unknown>): { publish?: boolean } => ({
    publish:
      search.publish === true || search.publish === "true" ? true : undefined,
  }),
  head: () =>
    seo({
      title: "Votre création dans l’atelier",
      text: "Retrouvez votre espace de construction personnel sur Clik.",
      path: "/editor",
      noindex: true,
    }),
  component: Page,
});
function Page() {
  const { projectId } = Route.useParams();
  const { publish } = Route.useSearch();
  return (
    <Editor key={projectId} projectId={projectId} publishOnLoad={publish} />
  );
}
