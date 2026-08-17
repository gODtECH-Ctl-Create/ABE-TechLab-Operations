import type { OperationsRepositories } from "../data/repository";

export type AuditActor = "human" | "aria" | "system" | "provider";

export interface AuditEventInput {
  actorType: AuditActor;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(
  repositories: OperationsRepositories,
  event: AuditEventInput,
) {
  return repositories.auditEvents.create({
    actor_type: event.actorType,
    actor_id: event.actorId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    metadata: event.metadata ?? {},
    created_at: new Date().toISOString(),
  });
}

export async function recordHumanDecision(
  repositories: OperationsRepositories,
  input: Omit<AuditEventInput, "actorType">,
) {
  return recordAudit(repositories, { ...input, actorType: "human" });
}

export async function recordAriaAction(
  repositories: OperationsRepositories,
  input: Omit<AuditEventInput, "actorType">,
) {
  return recordAudit(repositories, { ...input, actorType: "aria" });
}
