import type { OperationsRepositories } from "./repository";
import type { Prospect } from "../prospecting/types";
import { createBaselineOutreachStrategy } from "../outreach/baseline";

export async function persistProspect(
  repositories: OperationsRepositories,
  prospect: Prospect,
) {
  return repositories.prospects.create({
    id: prospect.id,
    organisationName: prospect.organisationName,
    recommendedService: prospect.recommendedService,
    likelyNeed: prospect.likelyNeed,
    decisionMakerRole: prospect.decisionMakerRole,
    confidence: prospect.confidence,
  });
}

export async function createAndPersistOutreachStrategy(
  repositories: OperationsRepositories,
  prospect: Prospect,
) {
  const strategy = createBaselineOutreachStrategy(prospect);
  const result = await repositories.outreachStrategies.create(strategy as unknown as Record<string, unknown>);
  return { strategy, persistence: result };
}

export async function recordAuditEvent(
  repositories: OperationsRepositories,
  event: {
    actorType: "human" | "aria" | "system" | "provider";
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return repositories.auditEvents.create({
    actor_type: event.actorType,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    metadata: event.metadata ?? {},
    created_at: new Date().toISOString(),
  });
}
