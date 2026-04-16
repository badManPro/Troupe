import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { v4 as uuid } from "uuid";
import { asc, eq, inArray } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (!conversationId) {
    return NextResponse.json(
      { error: "Missing conversationId" },
      { status: 400 }
    );
  }

  const msgs = db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.createdAt))
    .all();

  return NextResponse.json(msgs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const body = await req.json();

  const msg = {
    id: uuid(),
    conversationId: body.conversationId,
    role: body.role,
    content: body.content,
  };

  db.insert(schema.messages).values(msg).run();
  return NextResponse.json(msg, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const body = await req.json();
  const conversationId = String(body.conversationId ?? "").trim();
  const messageId = String(body.messageId ?? "").trim();
  const nextContent = String(body.content ?? "").trim();

  if (!conversationId || !messageId || !nextContent) {
    return NextResponse.json(
      { error: "Missing conversationId, messageId, or content" },
      { status: 400 }
    );
  }

  const result = db.transaction((tx) => {
    const conversationMessages = tx
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(asc(schema.messages.createdAt))
      .all();

    const targetIndex = conversationMessages.findIndex((msg) => msg.id === messageId);
    if (targetIndex === -1) {
      return { error: "Message not found", status: 404 as const };
    }

    const targetMessage = conversationMessages[targetIndex];
    if (targetMessage.role !== "user") {
      return { error: "Only user messages can be edited", status: 400 as const };
    }

    tx.update(schema.messages)
      .set({ content: nextContent })
      .where(eq(schema.messages.id, messageId))
      .run();

    const laterMessageIds = conversationMessages
      .slice(targetIndex + 1)
      .map((msg) => msg.id);

    if (laterMessageIds.length > 0) {
      tx.delete(schema.messages)
        .where(inArray(schema.messages.id, laterMessageIds))
        .run();
    }

    return {
      status: 200 as const,
      messages: [
        ...conversationMessages.slice(0, targetIndex),
        {
          ...targetMessage,
          content: nextContent,
        },
      ],
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ messages: result.messages });
}
