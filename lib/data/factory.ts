import type { OperationsRepositories } from "./repository";
import { createInMemoryRepositories } from "./in-memory";

export function createOperationsRepositories(): OperationsRepositories {
  // Keep the application independent from a live Supabase project during development.
  // The Supabase implementation will replace this adapter once the dedicated project exists.
  return createInMemoryRepositories();
}
