import { NextResponse } from "next/server";
import { getClaudeStatus } from "@/lib/ai/claude";

export const runtime = "nodejs";

export async function GET() {
  const status = await getClaudeStatus();
  return NextResponse.json(status);
}
