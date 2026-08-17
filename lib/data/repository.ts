export interface RepositoryResult<T> {
  data: T | null;
  error: string | null;
}

export interface EntityRepository<T> {
  getById(id: string): Promise<RepositoryResult<T>>;
  list(limit?: number): Promise<RepositoryResult<T[]>>;
  create(input: Partial<T>): Promise<RepositoryResult<T>>;
  update(id: string, input: Partial<T>): Promise<RepositoryResult<T>>;
}

export interface OperationsRepositories {
  organisations: EntityRepository<Record<string, unknown>>;
  prospects: EntityRepository<Record<string, unknown>>;
  researchRequests: EntityRepository<Record<string, unknown>>;
  researchSources: EntityRepository<Record<string, unknown>>;
  qualifications: EntityRepository<Record<string, unknown>>;
  leads: EntityRepository<Record<string, unknown>>;
  outreachStrategies: EntityRepository<Record<string, unknown>>;
  campaigns: EntityRepository<Record<string, unknown>>;
  campaignMessages: EntityRepository<Record<string, unknown>>;
  emailEvents: EntityRepository<Record<string, unknown>>;
  followUps: EntityRepository<Record<string, unknown>>;
  auditEvents: EntityRepository<Record<string, unknown>>;
}
