import type { ProspectingRequest } from "../prospecting/types";
import { MockResearchProvider, type ResearchProvider, type ResearchResult } from "./provider";

export type ResearchTaskStatus = "queued" | "running" | "completed" | "failed";

export interface ResearchTask {
  id: string;
  requestId: string;
  provider: string;
  status: ResearchTaskStatus;
  attempts: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ResearchExecution {
  task: ResearchTask;
  result?: ResearchResult;
}

export async function executeResearch(
  request: ProspectingRequest,
  provider: ResearchProvider = new MockResearchProvider(),
): Promise<ResearchExecution> {
  const startedAt = new Date().toISOString();
  const task: ResearchTask = {
    id: `research-${request.id}-${Date.now()}`,
    requestId: request.id,
    provider: provider.name,
    status: "running",
    attempts: 1,
    createdAt: startedAt,
  };

  try {
    const result = await provider.research(request);
    return {
      task: { ...task, status: "completed", completedAt: result.completedAt },
      result,
    };
  } catch (error) {
    return {
      task: {
        ...task,
        status: "failed",
        error: error instanceof Error ? error.message : "Research provider failed",
      },
    };
  }
}
