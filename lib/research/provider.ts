import type { Prospect, ProspectingRequest } from "../prospecting/types";

export interface ResearchProvider {
  readonly name: string;
  research(request: ProspectingRequest): Promise<ResearchResult>;
}

export interface ResearchResult {
  requestId: string;
  provider: string;
  prospects: Prospect[];
  completedAt: string;
}

export class MockResearchProvider implements ResearchProvider {
  readonly name = "mock";

  async research(request: ProspectingRequest): Promise<ResearchResult> {
    return {
      requestId: request.id,
      provider: this.name,
      prospects: [],
      completedAt: new Date().toISOString(),
    };
  }
}
