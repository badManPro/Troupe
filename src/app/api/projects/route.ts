import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { deleteProjectById } from "@/lib/projects/delete-project";
import { v4 as uuid } from "uuid";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  ensureDb();
  const projects = db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.updatedAt))
    .all();

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const id = uuid();

  const project = {
    id,
    name: body.name || "Untitled Project",
    description: body.description || "",
    phase: "brainstorm" as const,
  };

  db.insert(schema.projects).values(project).run();

  const gate = {
    id: uuid(),
    projectId: id,
    phase: "brainstorm",
    status: "in_progress",
    checklist: "[]",
  };
  db.insert(schema.phaseGates).values(gate).run();

  const inserted = db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .get();

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  ensureDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing project id" }, { status: 400 });
  }

  const result = deleteProjectById(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
