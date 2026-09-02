import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../../../../lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron sends the configured CRON_SECRET as a Bearer token.
  // Keep the endpoint manually callable when CRON_SECRET has not yet been
  // configured so the deployment can be smoke-tested during setup.
  if (cronSecret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({
          status: "error",
          service: "supabase",
          message: "Unauthorized",
          timestamp: new Date().toISOString(),
        }),
        { status: 401, headers: JSON_HEADERS },
      );
    }
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .from("system_heartbeat")
      .select("id")
      .eq("id", 1)
      .single();

    if (error || !data) {
      console.error("Supabase heartbeat query failed");
      return new Response(
        JSON.stringify({
          status: "error",
          service: "supabase",
          timestamp: new Date().toISOString(),
        }),
        { status: 503, headers: JSON_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        service: "supabase",
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  } catch (error) {
    console.error("Supabase heartbeat request failed", error);
    return new Response(
      JSON.stringify({
        status: "error",
        service: "supabase",
        timestamp: new Date().toISOString(),
      }),
      { status: 503, headers: JSON_HEADERS },
    );
  }
}
