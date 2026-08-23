import type { RecordEntity } from "./record-actions-types";

export type { RecordEntity } from "./record-actions-types";

/**
 * Legacy compatibility shim. The workspace now uses the canonical
 * RecordActionsBar overflow menu mounted by the root layout.
 */
export function RecordActions(_props: { entity: RecordEntity; id: string; editHref?: string }) {
  return null;
}
