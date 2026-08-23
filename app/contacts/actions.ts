"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireOperator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/contacts?error=unauthorized");
  return { supabase, user };
}

export async function createContact(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const organisationId = String(formData.get("organisation_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!organisationId || !name) redirect("/contacts?error=required");

  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  if (email) {
    const { data: duplicate } = await (supabase.from("contacts") as any).select("id").eq("email", email).is("deleted_at", null).maybeSingle();
    if (duplicate) redirect("/contacts?error=duplicate_email");
  }

  const payload = {
    organisation_id: organisationId,
    first_name: name.split(/\s+/)[0],
    last_name: name.split(/\s+/).slice(1).join(" ") || null,
    job_title: String(formData.get("role_title") ?? "").trim() || null,
    email,
    phone: String(formData.get("phone") ?? "").trim() || null,
    is_decision_maker: formData.get("is_decision_maker") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { data, error } = await (supabase.from("contacts") as never).insert(payload as never).select("id").single();
  if (error || !data) redirect(`/contacts?error=${encodeURIComponent(error?.message ?? "contact_create_failed")}`);

  await supabase.from("audit_events").insert({
    actor_type: "human",
    actor_id: user.id,
    action: "contact.created",
    entity_type: "contact",
    entity_id: data.id,
    metadata: { organisation_id: organisationId, name },
  } as never);

  revalidatePath("/contacts");
  revalidatePath(`/organisations/${organisationId}`);
  redirect("/contacts?created=1");
}

export async function trashContact(formData: FormData) {
  const { supabase, user } = await requireOperator();
  const id = String(formData.get("id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || "Removed from active workspace";
  if (!id) redirect("/contacts?error=invalid_contact");
  const { error } = await (supabase.from("contacts") as any).update({ deleted_at: new Date().toISOString(), deleted_by: user.id, deletion_reason: reason }).eq("id", id).is("deleted_at", null);
  if (error) redirect(`/contacts?error=${encodeURIComponent(error.message)}`);
  await (supabase.from("deleted_records") as any).upsert({ entity_type: "contact", entity_id: id, deleted_by: user.id, reason }, { onConflict: "entity_type,entity_id" });
  await (supabase.from("audit_events") as any).insert({ actor_type: "human", actor_id: user.id, action: "contact.trashed", entity_type: "contact", entity_id: id, metadata: { reason } });
  revalidatePath("/contacts");
  revalidatePath("/trash");
  redirect("/contacts?trashed=1");
}
