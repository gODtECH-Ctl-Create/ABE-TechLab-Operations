import type { ProspectingRequest } from "../prospecting/types";
import { executeResearch } from "./execution";
import { InMemoryResearchRepository, persistResearchExecution, type ResearchRepository } from "./repository";
import type { ResearchProvider } from "./provider";

export async function runResearch(
  request: ProspectingRequest,
  options?: { provider?: ResearchProvider; repository?: ResearchRepository },
) {
  const repository = options?.repository ?? new InMemoryResearchRepository();
  const execution = await executeResearch(request, options?.provider);
  await persistResearchExecution(repository, execution);

  return { execution, repository };
}
