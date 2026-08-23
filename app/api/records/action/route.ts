import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tables = {
  organisation: "organisations",
  lead: "leads",
  opportunity: "opportunities",
  contact: "contacts",
} as const;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!['admin', 'operator'].includes(String(role))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await request.json();
  const entity = body?.entity as keyof typeof tables;
  const id = String(body?.id || "");
  const action = body?.action as "archive" | "trash";
  const table = tables[entity];
  if (!table || !id || !["archive", "trash"].includes(action)) return NextResponse.json({ error: "Invalid record action" }, { status: 400 });

  const values = action === "archive"
    ? { archived_at: new Date().toISOString(), archived_by: user.id }
    : { deleted_at: new Date().toISOString(), deleted_by: user.id, deletion_reason: "Moved to Trash from record actions" };

  const { error } = await (supabase.from(table) as any).update(values).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await (supabase.from("audit_events") as any).insert({
    actor_type: "user",
    actor_id: user.id,
    action: action === "archive" ? "record_archived" : "record_trashed",
    entity_type: entity,
    entity_id: id,
    metadata: { action, source: "record_actions" },
  });

  return NextResponse.json({ ok: true });
}
