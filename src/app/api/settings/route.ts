import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting, ensureDb } from "@/lib/db/init";

export async function GET(req: NextRequest) {
  ensureDb();
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const value = await getSetting(key);
  return NextResponse.json({ key, value });
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();

  if (!body.key || body.value === undefined) {
    return NextResponse.json(
      { error: "Missing key or value" },
      { status: 400 }
    );
  }

  await setSetting(body.key, body.value);
  return NextResponse.json({ success: true });
}
