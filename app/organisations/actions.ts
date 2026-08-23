"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/data/supabase/database.types";

type OrganisationInsert = Database["public"]["Tables"]["organisations"]["Insert"];
type OrganisationUpdate = Database["public"]["Tables"]["organisations"]["Update"];
type AuditInsert = Database["public"]["Tables"]["audit_events"]["Insert"];
type OrganisationIdRow = Pick<Database["public"]["Tables"]["organisations"]["Row"], "id">;

async function requireEditor() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator"].includes(String(role))) redirect("/organisations?error=not_authorized");
  return { supabase, user };
}

function normalizeWebsite(value: string | null) {
  if (!value) return null;
  return value.toLowerCase().trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export async function createOrganisation(formData: FormData) {
  const { supabase, user } = await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const geography = String(formData.get("geography") ?? "").trim() || null;
  const websiteUrl = String(formData.get("website_url") ?? "").trim() || null;
  if (!name) redirect("/organisations?error=name_required");

  const { data: nameMatch } = await (supabase.from("organisations") as any)
    .select("id,name,website_url")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();
  if (nameMatch) redirect(`/organisations?error=duplicate_organisation&match=${encodeURIComponent(nameMatch.name)}`);

  if (websiteUrl) {
    const normalized = normalizeWebsite(websiteUrl);
    const { data: orgRows } = await (supabase.from("organisations") as any).select("id,name,website_url").not("website_url", "is", null).limit(500);
    const websiteMatch = (orgRows ?? []).find((row: { website_url: string | null }) => normalizeWebsite(row.website_url) === normalized);
    if (websiteMatch) redirect(`/organisations?error=duplicate_website&match=${encodeURIComponent(websiteMatch.name)}`);
  }

  const organisationPayload: OrganisationInsert = { name, industry, geography, website_url: websiteUrl };
  const { data, error } = await supabase.from("organisations").insert(organisationPayload as never).select("id").single();
  if (error || !data) redirect(`/organisations?error=${encodeURIComponent(error?.message ?? "organisation_create_failed")}`);
  const organisation = data as unknown as OrganisationIdRow;

  const auditPayload: AuditInsert = {
    actor_type: "user", actor_id: user.id, action: "organisation_created", entity_type: "organisation", entity_id: organisation.id,
    metadata: { source: "manual", duplicate_check: "passed" },
  };
  await supabase.from("audit_events").insert(auditPayload as never);
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

  const { data: duplicateName } = await (supabase.from("organisations") as any)
    .select("id,name")
    .ilike("name", name)
    .neq("id", id)
    .limit(1)
    .maybeSingle();
  if (duplicateName) redirect(`/organisations/${id}?error=duplicate_organisation&match=${encodeURIComponent(duplicateName.name)}`);

  if (websiteUrl) {
    const normalized = normalizeWebsite(websiteUrl);
    const { data: orgRows } = await (supabase.from("organisations") as any).select("id,name,website_url").neq("id", id).not("website_url", "is", null).limit(500);
    const websiteMatch = (orgRows ?? []).find((row: { website_url: string | null }) => normalizeWebsite(row.website_url) === normalized);
    if (websiteMatch) redirect(`/organisations/${id}?error=duplicate_website&match=${encodeURIComponent(websiteMatch.name)}`);
  }

  const updatePayload: OrganisationUpdate = { name, industry, geography, website_url: websiteUrl };
  const { error } = await supabase.from("organisations").update(updatePayload as never).eq("id", id);
  if (error) redirect(`/organisations?error=${encodeURIComponent(error.message)}`);
  const auditPayload: AuditInsert = { actor_type: "user", actor_id: user.id, action: "organisation_updated", entity_type: "organisation", entity_id: id, metadata: { source: "manual" } };
  await supabase.from("audit_events").insert(auditPayload as never);
  revalidatePath("/organisations");
  revalidatePath(`/organisations/${id}`);
  revalidatePath("/");
  redirect(`/organisations/${id}?updated=1`);
}
