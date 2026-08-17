import { NextResponse } from "next/server";
import { getAiProviderDashboard } from "@/lib/ai/provider-router";

export async function GET() {
  const providers = await getAiProviderDashboard();
  return NextResponse.json({ providers });
}
