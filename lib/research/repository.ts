import type { Prospect } from "../prospecting/types";
import type { ResearchExecution, ResearchTask } from "./execution";

export interface ResearchRecord {
  task: ResearchTask;
  prospects: Prospect[];
  createdAt: string;
}

export interface ResearchRepository {
  save(record: ResearchRecord): Promise<void>;
  listByRequest(requestId: string): Promise<ResearchRecord[]>;
}

export class InMemoryResearchRepository implements ResearchRepository {
  private records: ResearchRecord[] = [];

  async save(record: ResearchRecord) {
    this.records.push(record);
  }

  async listByRequest(requestId: string) {
    return this.records.filter((record) => record.task.requestId === requestId);
  }
}

export async function persistResearchExecution(
  repository: ResearchRepository,
  execution: ResearchExecution,
) {
  await repository.save({
    task: execution.task,
    prospects: execution.result?.prospects ?? [],
    createdAt: new Date().toISOString(),
  });
}
