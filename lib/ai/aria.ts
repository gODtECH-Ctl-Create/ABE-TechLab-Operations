import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateAi } from "@/lib/ai/gateway";
import { getAiRuntimeMode } from "@/lib/ai/provider-router";
import { addInvoiceTotals, type InvoiceRow } from "@/lib/ai/finance";
import { getPendingApprovals } from "@/lib/ai/approvals";

type ToolContext = { userId: string };
type ToolResult = { name: string; result: unknown };

async function runTools(context: ToolContext): Promise<ToolResult[]> {
  const supabase = await createSupabaseServerClient();
  const db = supabase as any;

  const [leads, opportunities, invoices, activities, approvals] = await Promise.all([
    db.from("leads").select("id,organisation_id,status,service_interest,score,next_action,next_action_due_at,updated_at").order("updated_at", { ascending: false }).limit(100),
    db.from("opportunities").select("id,organisation_id,name,stage,value,currency,probability,expected_close_date,owner_id,next_action,next_action_due_at,updated_at").order("updated_at", { ascending: false }).limit(100),
    db.from("invoices").select("id,invoice_number,issue_date,due_date,status,currency,client_company,project,amount_paid,tax,created_at,updated_at,invoice_items(quantity,unit_price)").order("created_at", { ascending: false }).limit(100),
    db.from("audit_events").select("id,actor_type,action,entity_type,entity_id,metadata,created_at").order("created_at", { ascending: false }).limit(20),
    getPendingApprovals(supabase),
  ]);

  for (const [source, item] of [["leads", leads], ["opportunities", opportunities], ["invoices", invoices], ["recent activity", activities]] as const) {
    if (item.error) throw new Error(`ARIA could not load ${source}. Please contact an administrator.`, { cause: item.error });
  }

  return [
    { name: "get_leads", result: leads.data ?? [] },
    { name: "get_opportunities", result: opportunities.data ?? [] },
    { name: "get_invoices", result: addInvoiceTotals((invoices.data ?? []) as InvoiceRow[]) },
    { name: "get_recent_activity", result: activities.data ?? [] },
    { name: "get_pending_approvals", result: approvals },
    { name: "get_runtime", result: { mode: getAiRuntimeMode("aria_internal"), userId: context.userId } },
  ];
}

function buildPrompt(toolResults: ToolResult[]) {
  return [
    "You are ARIA, the internal intelligence assistant for ABE TechLab Operations.",
    "Use only the supplied Operations data. Treat database records as verified operational facts.",
    "Do not invent financial figures, clients, project status, dates, people, or capabilities.",
    "Clearly distinguish observations from recommendations.",
    "Do not claim any external or database action is completed. Consequential actions require human approval.",
    "Prepare a concise, decision-ready operations briefing for the operator.",
    "Include: current state, urgent attention items, commercial and finance signals, pending human decisions, and 3 prioritized recommendations.",
    "If a data set is empty, say so instead of filling the gap.",
    "Operations data:",
    JSON.stringify(toolResults),
  ].join("\n\n");
}

function telemetryOutput(value: unknown) {
  if (Array.isArray(value)) return { type: "array", count: value.length };
  if (value && typeof value === "object") return { type: "object", keys: Object.keys(value as Record<string, unknown>).slice(0, 25) };
  return { type: typeof value };
}

export async function runAriaBrief(userId: string) {
  const mode = getAiRuntimeMode("aria_internal");
  if (mode === "off") throw new Error("ARIA is disabled because AI_RUNTIME_MODE=off.");

  const toolResults = await runTools({ userId });
  const requestId = crypto.randomUUID();
  const db = createSupabaseServiceClient() as any;

  const { data: run, error: runError } = await db.from("ai_runs").insert({
    request_id: requestId,
    agent: "aria",
    task: "operations_brief",
    mode,
    status: "started",
    metadata: { tool_count: toolResults.length },
  }).select("id").single();

  if (runError || !run) throw new Error("ARIA could not create its audit record. Please contact an administrator.", { cause: runError });

  try {
    const result = await generateAi({
      surface: "aria_internal",
      prompt: buildPrompt(toolResults),
      task: "aria_operations_brief",
      requestId,
    });

    await db.from("ai_runs").update({
      status: "completed",
      provider: result.provider,
      model: result.model,
      input_tokens: result.usage?.inputTokens ?? null,
      output_tokens: result.usage?.outputTokens ?? null,
      completed_at: new Date().toISOString(),
      metadata: {
        attempted: result.attempted,
        fallback_used: result.fallbackUsed,
        tool_count: toolResults.length,
      },
    }).eq("id", run.id);

    const { error: toolError } = await db.from("ai_tool_calls").insert(toolResults.map((tool) => ({
      run_id: run.id,
      tool_name: tool.name,
      status: "completed",
      input: {},
      output: telemetryOutput(tool.result),
      completed_at: new Date().toISOString(),
    })));
    if (toolError) throw toolError;

    await db.from("audit_events").insert({
      actor_type: "aria",
      actor_id: userId,
      action: "aria.operations_brief_generated",
      entity_type: "ai_run",
      entity_id: run.id,
      metadata: { request_id: requestId, provider: result.provider, model: result.model, fallback_used: result.fallbackUsed },
    });

    return { ...result, requestId, toolResults };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.from("ai_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}
