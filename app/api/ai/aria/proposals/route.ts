import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { proposalTypes } from "@/lib/ai/aria-output";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: roleValue } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(roleValue ?? ""))) return NextResponse.json({ error: "Only administrators and operators can submit proposals." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const type = String(body.type ?? "");
    const title = String(body.title ?? "").trim().slice(0, 160);
    const description = String(body.description ?? "").trim().slice(0, 2000);
    const rationale = String(body.rationale ?? "").trim().slice(0, 1000) || null;
    const targetLabel = String(body.targetLabel ?? "").trim().slice(0, 160) || null;
    if (!proposalTypes.includes(type as typeof proposalTypes[number]) || title.length < 3 || description.length < 3) return NextResponse.json({ error: "The proposal is incomplete." }, { status: 400 });
    const db = supabase as any;
    const { data, error } = await db.from("aria_action_proposals").insert({ proposal_type: type, title, description, rationale, target_label: targetLabel, created_by: user.id, payload: {} }).select("id").single();
    if (error || !data) throw error ?? new Error("Proposal could not be recorded.");
    await db.from("audit_events").insert({ actor_type: "human", actor_id: user.id, action: "aria.proposal_submitted", entity_type: "aria_action_proposal", entity_id: data.id, metadata: { proposal_type: type } });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    console.error("ARIA proposal submission failed", error);
    return NextResponse.json({ ok: false, error: "The proposal could not be submitted for review." }, { status: 500 });
  }
}
