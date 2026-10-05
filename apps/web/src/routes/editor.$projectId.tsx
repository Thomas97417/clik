import { seo } from "@/lib/seo/meta";
import { createFileRoute } from "@tanstack/react-router";
import Editor from "@/components/clik/editor";
export const Route = createFileRoute("/editor/$projectId")({
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
  return <Editor key={projectId} projectId={projectId} />;
}
