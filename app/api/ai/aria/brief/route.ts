import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { runAriaBrief } from "@/lib/ai/aria";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleValue } = await supabase.rpc("get_my_role" as never);
  const role = String(roleValue ?? "");
  if (!["admin", "operator", "reviewer"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runAriaBrief(user.id);
    return NextResponse.json({
      ok: true,
      requestId: result.requestId,
      provider: result.provider,
      model: result.model,
      brief: result.brief,
      tools: result.toolResults.map((item) => item.name),
      fallbackUsed: result.fallbackUsed,
    });
  } catch (error) {
    console.error("ARIA operations brief failed", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "ARIA request failed",
    }, { status: 500 });
  }
}
