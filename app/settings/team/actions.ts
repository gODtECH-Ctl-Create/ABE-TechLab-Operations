"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const roles = ["admin", "operator", "reviewer"] as const;

type AdminSetRoleRpc = (client: Awaited<ReturnType<typeof createSupabaseServerClient>>, args: { target_user_id: string; target_role: string }) => Promise<{ error: { message: string } | null }>;

async function callAdminSetUserRole(client: Awaited<ReturnType<typeof createSupabaseServerClient>>, args: { target_user_id: string; target_role: string }) {
  const rpc = client.rpc as unknown as AdminSetRoleRpc;
  return rpc(client, args);
}

export async function changeMemberRole(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (String(role) !== "admin") redirect("/settings");

  const userId = String(formData.get("user_id") ?? "").trim();
  const nextRole = String(formData.get("role") ?? "");
  if (!userId || !roles.includes(nextRole as (typeof roles)[number])) redirect("/settings/team?error=invalid_role");
  if (userId === user.id && nextRole !== "admin") redirect("/settings/team?error=last_admin_protection");

  const { error } = await callAdminSetUserRole(supabase, { target_user_id: userId, target_role: nextRole });
  if (error) redirect(`/settings/team?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/settings/team");
  redirect("/settings/team?updated=1");
}

export async function createWorkspaceInvitation(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (String(role) !== "admin") redirect("/settings");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const inviteRole = String(formData.get("role") ?? "operator");
  if (!email || !email.includes("@") || !roles.includes(inviteRole as (typeof roles)[number])) redirect("/settings/team?error=invalid_invitation");

  const { error } = await (supabase.from("workspace_invitations") as any).insert({ email, role: inviteRole, invited_by: user.id });
  if (error) redirect(`/settings/team?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/settings/team");
  redirect("/settings/team?invited=1");
}
