import type { OperationsRepositories } from "./repository";
import { createInMemoryRepositories } from "./in-memory";
import { createSupabaseRepositories } from "./supabase";

type SupabaseClient = Parameters<typeof createSupabaseRepositories>[0];

export function createOperationsRepositories(client?: SupabaseClient): OperationsRepositories {
  // Development stays database-free until the dedicated Supabase project exists.
  return client ? createSupabaseRepositories(client) : createInMemoryRepositories();
}
