import { NextResponse } from "next/server";
import { getAiProviderDashboard } from "@/lib/ai/provider-router";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleValue } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(roleValue ?? ""))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const providers = await getAiProviderDashboard();
  return NextResponse.json({ providers });
}
