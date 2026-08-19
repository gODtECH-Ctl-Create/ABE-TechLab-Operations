"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireEditor() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/organisations?error=not_authorized");
  return { supabase, user };
}

export async function createOrganisation(formData: FormData) {
  const { supabase, user } = await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const geography = String(formData.get("geography") ?? "").trim() || null;
  const websiteUrl = String(formData.get("website_url") ?? "").trim() || null;
  if (!name) redirect("/organisations?error=name_required");

  const { data: organisation, error } = await supabase.from("organisations").insert({
    name, industry, geography, website_url: websiteUrl,
  }).select("id").single();
  if (error || !organisation) redirect(`/organisations?error=${encodeURIComponent(error?.message ?? "organisation_create_failed")}`);

  await supabase.from("audit_events").insert({
    actor_type: "user", actor_id: user.id, action: "organisation_created", entity_type: "organisation", entity_id: organisation.id,
    metadata: { source: "manual" },
  });
  revalidatePath("/organisations");
  revalidatePath("/");
  redirect("/organisations?created=1");
}

export async function updateOrganisation(formData: FormData) {
  const { supabase, user } = await requireEditor();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const geography = String(formData.get("geography") ?? "").trim() || null;
  const websiteUrl = String(formData.get("website_url") ?? "").trim() || null;
  if (!id || !name) redirect("/organisations?error=invalid_organisation");

  const { error } = await supabase.from("organisations").update({ name, industry, geography, website_url: websiteUrl }).eq("id", id);
  if (error) redirect(`/organisations?error=${encodeURIComponent(error.message)}`);
  await supabase.from("audit_events").insert({ actor_type: "user", actor_id: user.id, action: "organisation_updated", entity_type: "organisation", entity_id: id, metadata: { source: "manual" } });
  revalidatePath("/organisations");
  revalidatePath(`/organisations/${id}`);
  revalidatePath("/");
  redirect(`/organisations/${id}?updated=1`);
}
