import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { syncDerivedDocuments } from "@/lib/documents/sync";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;

  syncDerivedDocuments(id);

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .get();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const gates = db
    .select()
    .from(schema.phaseGates)
    .where(eq(schema.phaseGates.projectId, id))
    .all();

  const documents = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, id))
    .all();

  return NextResponse.json({ ...project, gates, documents });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();

  db.update(schema.projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .run();

  const project = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .get();

  return NextResponse.json(project);
}
