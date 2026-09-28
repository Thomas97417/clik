import { createFileRoute } from "@tanstack/react-router";
import Editor from "@/components/clik/editor";
export const Route = createFileRoute("/editor/$projectId")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  return <Editor key={projectId} projectId={projectId} />;
}
