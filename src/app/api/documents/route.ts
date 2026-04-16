import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import { syncDerivedDocuments } from "@/lib/documents/sync";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  ensureDb();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId" },
      { status: 400 }
    );
  }

  syncDerivedDocuments(projectId);

  const docs = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.projectId, projectId))
    .all();

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  ensureDb();
  const body = await req.json();
  const documentType = body.type as keyof typeof DOCUMENT_TYPE_LABELS;

  const existing = db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.projectId, body.projectId),
        eq(schema.documents.type, body.type)
      )
    )
    .get();

  if (existing) {
    db.update(schema.documents)
      .set({
        content: body.content,
        title: body.title || existing.title,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, existing.id))
      .run();

    const updated = db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, existing.id))
      .get();

    return NextResponse.json(updated);
  }

  const doc = {
    id: uuid(),
    projectId: body.projectId,
    type: documentType,
    title: body.title || DOCUMENT_TYPE_LABELS[documentType],
    content: body.content || "",
    phase: body.phase,
  };

  db.insert(schema.documents).values(doc).run();
  return NextResponse.json(doc, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  ensureDb();
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  db.update(schema.documents)
    .set({
      content: body.content,
      title: body.title,
      updatedAt: new Date(),
    })
    .where(eq(schema.documents.id, body.id))
    .run();

  const doc = db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, body.id))
    .get();

  return NextResponse.json(doc);
}
