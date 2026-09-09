import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiRuntimeMode, getProviderHealth } from "@/lib/ai/provider-router";
import { AriaBriefing } from "./aria-briefing";
import "./aria.css";

type RecentRun = { id: string; status: string; provider: string | null; model: string | null; created_at: string };

export default async function AriaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await supabase.rpc("get_my_role" as never);
  if (!["admin", "operator", "reviewer"].includes(String(role ?? ""))) redirect("/");

  const { data: runs } = await supabase.from("ai_runs").select("id,status,provider,model,created_at").eq("agent", "aria").order("created_at", { ascending: false }).limit(6);
  const mode = getAiRuntimeMode("aria_internal");
  const configuredProviders = getProviderHealth().filter((provider) => provider.configured).length;

  return <main className="page-shell aria-page">
    <header className="page-header aria-page-header"><div><div className="eyebrow">Internal AI · Decision support</div><h1>ARIA</h1><p>Your read-only operations copilot for priority, risk, commercial signals, and decisions requiring human attention.</p></div><div className="header-actions"><span className={`status-chip ${mode === "off" ? "warning" : "success"}`}>{mode === "off" ? "Paused" : `${mode[0].toUpperCase()}${mode.slice(1)} mode`}</span><span className="status-chip state-neutral">{configuredProviders}/7 providers</span><Link className="ghost-button" href="/settings/integrations/ai">AI settings</Link></div></header>
    <AriaBriefing initialRuns={(runs ?? []) as RecentRun[]} />
  </main>;
}
