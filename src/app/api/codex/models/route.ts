import { NextResponse } from "next/server";
import { getCodexModels } from "@/lib/ai/codex";

export const runtime = "nodejs";

export async function GET() {
  const models = getCodexModels();
  return NextResponse.json({ models });
}
