import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../data/supabase/database.types";

// Keep the same sources and review statuses as the Approval Queue page.
export async function getPendingApprovals(db: SupabaseClient<Database>) {
  const [strategies, campaigns] = await Promise.all([
    db.from("outreach_strategies")
      .select("id,lead_id,objective,channel,status,created_at,updated_at")
      .in("status", ["needs_review", "draft"])
      .order("created_at", { ascending: false }).limit(100),
    db.from("campaigns")
      .select("id,strategy_id,lead_id,channel,status,created_at,updated_at")
      .eq("status", "draft")
      .order("created_at", { ascending: false }).limit(100),
  ]);

  if (strategies.error || campaigns.error) {
    throw new Error("ARIA could not load pending approvals. Please contact an administrator.", {
      cause: strategies.error ?? campaigns.error,
    });
  }

  return [
    ...(strategies.data ?? []).map((row) => ({ ...row, entity_type: "outreach_strategy" })),
    ...(campaigns.data ?? []).map((row) => ({ ...row, entity_type: "campaign" })),
  ];
}
