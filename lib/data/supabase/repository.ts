import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { EntityRepository, OperationsRepositories, RepositoryResult } from "../repository";

type Client = SupabaseClient<Database>;
type Row = Record<string, unknown>;

type TableName = keyof Database["public"]["Tables"];

function repository(client: Client, table: TableName): EntityRepository<Row> {
  return {
    async getById(id) {
      const { data, error } = await client.from(table as never).select("*").eq("id" as never, id).maybeSingle();
      return { data: (data as Row | null) ?? null, error: error?.message ?? null };
    },
    async list(limit = 100) {
      const { data, error } = await client.from(table as never).select("*").limit(limit);
      return { data: (data as Row[] | null) ?? [], error: error?.message ?? null };
    },
    async create(input) {
      const { data, error } = await client.from(table as never).insert(input as never).select("*").single();
      return { data: (data as Row | null) ?? null, error: error?.message ?? null };
    },
    async update(id, input) {
      const { data, error } = await client.from(table as never).update(input as never).eq("id" as never, id).select("*").single();
      return { data: (data as Row | null) ?? null, error: error?.message ?? null };
    },
  };
}

export function createSupabaseRepositories(client: Client): OperationsRepositories {
  return {
    organisations: repository(client, "organisations"),
    prospects: repository(client, "prospects"),
    researchRequests: repository(client, "research_requests"),
    researchSources: repository(client, "research_sources"),
    qualifications: repository(client, "qualifications"),
    leads: repository(client, "leads"),
    outreachStrategies: repository(client, "outreach_strategies"),
    campaigns: repository(client, "campaigns"),
    campaignMessages: repository(client, "campaign_messages"),
    emailEvents: repository(client, "email_events"),
    followUps: repository(client, "follow_ups"),
    auditEvents: repository(client, "audit_events"),
  };
}
