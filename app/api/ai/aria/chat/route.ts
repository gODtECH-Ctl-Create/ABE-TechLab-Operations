import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runAriaFollowUp } from "@/lib/ai/aria";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: roleValue } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(roleValue ?? ""))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json() as { message?: unknown; history?: unknown };
    const message = typeof body.message === "string" ? body.message : "";
    const history = Array.isArray(body.history) ? body.history.filter((turn): turn is { role: "user" | "assistant"; content: string } =>
      Boolean(turn && typeof turn === "object" && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")) : [];
    const result = await runAriaFollowUp(user.id, message, history);
    return NextResponse.json({ ok: true, requestId: result.requestId, provider: result.provider, model: result.model, fallbackUsed: result.fallbackUsed, ...result.response });
  } catch (error) {
    console.error("ARIA follow-up failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "ARIA could not answer this question." }, { status: 500 });
  }
}
