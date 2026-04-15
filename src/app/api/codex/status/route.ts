import { NextResponse } from "next/server";
import { getCodexStatus } from "@/lib/ai/codex";

export const runtime = "nodejs";

export async function GET() {
  const status = getCodexStatus();
  return NextResponse.json(status);
}
