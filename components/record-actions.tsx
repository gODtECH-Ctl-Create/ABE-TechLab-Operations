export type RecordEntity = "organisation" | "lead" | "opportunity" | "contact";

/**
 * Legacy compatibility shim. The workspace now uses the canonical
 * RecordActionsBar overflow menu mounted by the root layout.
 */
export function RecordActions(_props: { entity: RecordEntity; id: string; editHref?: string }) {
  return null;
}
