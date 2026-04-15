import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { v4 as uuid } from "uuid";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const phase = searchParams.get("phase");

  let query = db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.projectId, id))
    .orderBy(desc(schema.conversations.createdAt));

  const convs = query.all().filter((c) => {
    if (role && c.role !== role) return false;
    if (phase && c.phase !== phase) return false;
    return true;
  });

  return NextResponse.json(convs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();

  const existing = db
    .select()
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.projectId, id),
        eq(schema.conversations.role, body.role),
        eq(schema.conversations.phase, body.phase)
      )
    )
    .get();

  if (existing) {
    return NextResponse.json(existing);
  }

  const conv = {
    id: uuid(),
    projectId: id,
    role: body.role,
    phase: body.phase,
  };

  db.insert(schema.conversations).values(conv).run();

  return NextResponse.json(conv, { status: 201 });
}
