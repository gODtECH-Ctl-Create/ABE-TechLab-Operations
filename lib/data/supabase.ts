import type { EntityRepository, OperationsRepositories, RepositoryResult } from "./repository";

type Row = Record<string, unknown>;

type SupabaseLike = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: unknown) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
    };
    insert: (value: Row) => {
      select: () => Promise<{ data: Row[] | null; error: { message: string } | null }>;
    };
    update: (value: Row) => {
      eq: (column: string, value: unknown) => {
        select: () => Promise<{ data: Row[] | null; error: { message: string } | null }>;
      };
    };
  };
};

class SupabaseRepository implements EntityRepository<Row> {
  constructor(private readonly client: SupabaseLike, private readonly table: string) {}

  async getById(id: string): Promise<RepositoryResult<Row>> {
    const { data, error } = await this.client.from(this.table).select("*").eq("id", id);
    return { data: data?.[0] ?? null, error: error?.message ?? null };
  }

  async list(): Promise<RepositoryResult<Row[]>> {
    // The current adapter intentionally keeps querying minimal until the real
    // Supabase client is installed and pagination requirements are finalized.
    const { data, error } = await this.client.from(this.table).select("*").eq("id", "__all__");
    return { data: data ?? [], error: error?.message ?? null };
  }

  async create(input: Partial<Row>): Promise<RepositoryResult<Row>> {
    const { data, error } = await this.client.from(this.table).insert(input).select();
    return { data: data?.[0] ?? null, error: error?.message ?? null };
  }

  async update(id: string, input: Partial<Row>): Promise<RepositoryResult<Row>> {
    const { data, error } = await this.client.from(this.table).update(input).eq("id", id).select();
    return { data: data?.[0] ?? null, error: error?.message ?? null };
  }
}

export function createSupabaseRepositories(client: SupabaseLike): OperationsRepositories {
  const repository = (table: string) => new SupabaseRepository(client, table);
  return {
    organisations: repository("organisations"),
    prospects: repository("prospects"),
    researchRequests: repository("research_requests"),
    researchSources: repository("research_sources"),
    qualifications: repository("qualifications"),
    leads: repository("leads"),
    outreachStrategies: repository("outreach_strategies"),
    campaigns: repository("campaigns"),
    campaignMessages: repository("campaign_messages"),
    emailEvents: repository("email_events"),
    followUps: repository("follow_ups"),
    auditEvents: repository("audit_events"),
  };
}
