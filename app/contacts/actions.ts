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

  const payload = {
    organisation_id: organisationId,
    name,
    role_title: String(formData.get("role_title") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    is_decision_maker: formData.get("is_decision_maker") === "on",
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { error } = await (supabase.from("contacts" as never) as any).insert(payload);
  if (error) redirect(`/contacts?error=${encodeURIComponent(error.message)}`);

  await supabase.from("audit_events").insert({
    actor_type: "human",
    actor_id: user.id,
    action: "contact.created",
    entity_type: "contact",
    metadata: { organisation_id: organisationId, name },
  } as never);

  revalidatePath("/contacts");
  revalidatePath(`/organisations/${organisationId}`);
  redirect("/contacts?created=1");
}
