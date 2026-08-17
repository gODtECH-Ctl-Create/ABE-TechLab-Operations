import type { EntityRepository, OperationsRepositories, RepositoryResult } from "./repository";

type RecordValue = Record<string, unknown> & { id?: string };

class InMemoryRepository implements EntityRepository<RecordValue> {
  private rows: RecordValue[] = [];

  async getById(id: string): Promise<RepositoryResult<RecordValue>> {
    const row = this.rows.find((item) => item.id === id);
    return row ? { data: { ...row }, error: null } : { data: null, error: "not_found" };
  }

  async list(limit = 100): Promise<RepositoryResult<RecordValue[]>> {
    return { data: this.rows.slice(0, limit).map((row) => ({ ...row })), error: null };
  }

  async create(input: Partial<RecordValue>): Promise<RepositoryResult<RecordValue>> {
    const row: RecordValue = { ...input, id: input.id ?? crypto.randomUUID() };
    this.rows.push(row);
    return { data: { ...row }, error: null };
  }

  async update(id: string, input: Partial<RecordValue>): Promise<RepositoryResult<RecordValue>> {
    const index = this.rows.findIndex((item) => item.id === id);
    if (index < 0) return { data: null, error: "not_found" };
    this.rows[index] = { ...this.rows[index], ...input, id };
    return { data: { ...this.rows[index] }, error: null };
  }
}

export function createInMemoryRepositories(): OperationsRepositories {
  const repository = () => new InMemoryRepository();
  return {
    organisations: repository(),
    prospects: repository(),
    researchRequests: repository(),
    researchSources: repository(),
    qualifications: repository(),
    leads: repository(),
    outreachStrategies: repository(),
    campaigns: repository(),
    campaignMessages: repository(),
    emailEvents: repository(),
    followUps: repository(),
    auditEvents: repository(),
  };
}
