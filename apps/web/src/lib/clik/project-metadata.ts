import { emptyProvenance, type ProjectProvenance } from "@clik/scene";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";

export function importInputs(
  provenance: ProjectProvenance = emptyProvenance(),
) {
  return provenance.imports.map(({ id, title, receiptIds }) => ({
    id,
    title,
    receiptIds: receiptIds as Id<"importReceipts">[],
  }));
}
export function creationMetadata(
  provenance: ProjectProvenance = emptyProvenance(),
) {
  return {
    imports: importInputs(provenance),
    ...(provenance.originReceiptId
      ? { originReceiptId: provenance.originReceiptId as Id<"importReceipts"> }
      : {}),
    ...(!provenance.originReceiptId && provenance.originSourceProjectId
      ? { copyFrom: provenance.originSourceProjectId as Id<"projects"> }
      : {}),
  };
}
