import { z } from "zod";

export const attributionSchema = z.object({
  publicationId: z.string().min(1),
  versionId: z.string().min(1),
  author: z.string(),
  title: z.string(),
});
export const projectImportSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(100),
  receiptIds: z.array(z.string().min(1)),
  sources: z.array(attributionSchema),
});
export const provenanceSchema = z.object({
  origin: attributionSchema.optional(),
  originReceiptId: z.string().optional(),
  originSourceProjectId: z.string().optional(),
  imports: z.array(projectImportSchema),
});
export type Attribution = z.infer<typeof attributionSchema>;
export type ProjectImport = z.infer<typeof projectImportSchema>;
export type ProjectProvenance = z.infer<typeof provenanceSchema>;
export const emptyProvenance = (): ProjectProvenance => ({ imports: [] });
export const MAX_PROJECT_SOURCES = 1000;
export function validateProvenance(value: unknown): ProjectProvenance {
  if (new TextEncoder().encode(JSON.stringify(value)).length > 512 * 1024)
    throw Error("Les sources du projet sont trop volumineuses.");
  const provenance = provenanceSchema.parse(value);
  if (projectSources(provenance).length > MAX_PROJECT_SOURCES)
    throw Error(
      "Limite de 1 000 sources atteinte. L’import n’a pas été ajouté.",
    );
  return provenance;
}
export function uniqueSources(sources: Attribution[]) {
  return [
    ...new Map(
      sources.map((source) => [source.publicationId, source]),
    ).values(),
  ];
}
export function projectSources(provenance: ProjectProvenance) {
  return uniqueSources([
    ...(provenance.origin ? [provenance.origin] : []),
    ...provenance.imports.flatMap((item) => item.sources),
  ]);
}
