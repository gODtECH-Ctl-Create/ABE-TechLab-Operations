import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../data/supabase/database.types";
import { getPendingApprovals } from "./approvals";

function mockDatabase(error: unknown = null, empty = false) {
  const queries: Record<string, ReturnType<typeof query>> = {};
  function query(table: string) {
    return {
      select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: empty ? [] : [{ id: table, status: "draft" }],
        error: table === "campaigns" ? error : null,
      }),
    };
  }
  const from = vi.fn((table: string) => {
    queries[table] = query(table);
    return queries[table];
  });
  return { db: { from } as unknown as SupabaseClient<Database>, from, queries };
}

describe("ARIA pending approvals", () => {
  it("uses the active queue tables and statuses, never the legacy table", async () => {
    const { db, from, queries } = mockDatabase();
    const result = await getPendingApprovals(db);
    expect(from.mock.calls).toEqual([["outreach_strategies"], ["campaigns"]]);
    expect(queries.outreach_strategies.in).toHaveBeenCalledWith("status", ["needs_review", "draft"]);
    expect(queries.campaigns.eq).toHaveBeenCalledWith("status", "draft");
    expect(result.map((row) => row.entity_type)).toEqual(["outreach_strategy", "campaign"]);
  });

  it("reports an empty queue only when both queries succeed with no rows", async () => {
    expect(await getPendingApprovals(mockDatabase(null, true).db)).toEqual([]);
  });

  it("preserves database failures for logs without passing raw details to the UI", async () => {
    const cause = { code: "PGRST205", message: "private schema details" };
    await expect(getPendingApprovals(mockDatabase(cause).db)).rejects.toMatchObject({
      message: "ARIA could not load pending approvals. Please contact an administrator.", cause,
    });
  });
});
