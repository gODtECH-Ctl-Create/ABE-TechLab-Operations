import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiRuntimeMode, getProviderHealth } from "@/lib/ai/provider-router";
import { AriaBriefing } from "./aria-briefing";
import "./aria.css";
import "./aria-capabilities.css";
import { AriaNavigation } from "@/components/workspace-navigation";

type RecentRun = { id: string; status: string; provider: string | null; model: string | null; created_at: string };

export default async function AriaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  const userRole = String(role ?? "");
  if (!["admin", "operator", "reviewer"].includes(userRole)) redirect("/");

  const { data: runs } = await supabase.from("ai_runs").select("id,status,provider,model,created_at").eq("agent", "aria").order("created_at", { ascending: false }).limit(6);
  const mode = getAiRuntimeMode("aria_internal");
  const configuredProviders = getProviderHealth().filter((provider) => provider.configured).length;
  const view = params.view === "conversation" ? "conversation" : params.view === "activity" ? "activity" : "overview";
  const active = view === "conversation" ? "Conversation" : view === "activity" ? "Activity" : "Overview";

  return <main className="page-shell aria-page">
    <header className="page-header aria-page-header"><div><div className="eyebrow">Internal AI · Decision support</div><h1>ARIA</h1><p>Your operations copilot for structured insight, follow-up questions, and human-approved action proposals.</p></div><div className="header-actions"><span className={`status-chip ${mode === "off" ? "warning" : "success"}`}>{mode === "off" ? "Paused" : "Advisory + proposals"}</span><span className="status-chip state-neutral">{configuredProviders}/7 providers</span><Link className="ghost-button" href="/settings/integrations/ai">AI settings</Link></div></header>
    <AriaNavigation active={active} />
    <AriaBriefing initialRuns={(runs ?? []) as RecentRun[]} canPropose={["admin", "operator"].includes(userRole)} view={view} />
  </main>;
}
