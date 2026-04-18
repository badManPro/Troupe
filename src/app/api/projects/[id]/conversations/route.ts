import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { ensureDb } from "@/lib/db/init";
import { v4 as uuid } from "uuid";
import { eq, and, desc, inArray } from "drizzle-orm";

function buildConversationLabel(content: string) {
  const normalized = content
    .replace(/\s+/g, " ")
    .replace(/[#>*`_-]/g, " ")
    .trim();

  if (!normalized) {
    return "新对话";
  }

  return normalized.length > 16 ? `${normalized.slice(0, 16)}...` : normalized;
}

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

  if (convs.length === 0) {
    return NextResponse.json([]);
  }

  const conversationIds = convs.map((conversation) => conversation.id);
  const messages = db
    .select()
    .from(schema.messages)
    .where(inArray(schema.messages.conversationId, conversationIds))
    .orderBy(desc(schema.messages.createdAt))
    .all();

  const messagesByConversation = new Map<string, typeof messages>();
  for (const message of messages) {
    const bucket = messagesByConversation.get(message.conversationId) ?? [];
    bucket.push(message);
    messagesByConversation.set(message.conversationId, bucket);
  }

  const payload = convs
    .map((conversation) => {
      const conversationMessages = messagesByConversation.get(conversation.id) ?? [];
      const latestMessage = conversationMessages[0] ?? null;
      const firstUserMessage =
        [...conversationMessages]
          .reverse()
          .find((message) => message.role === "user" && message.content.trim()) ?? null;

      return {
        ...conversation,
        label: buildConversationLabel(firstUserMessage?.content ?? ""),
        messageCount: conversationMessages.length,
        lastMessageAt: latestMessage?.createdAt ?? null,
        isEmpty: conversationMessages.length === 0,
        starterPrompt: firstUserMessage?.content ?? null,
      };
    })
    .sort((left, right) => {
      const leftTimestamp = new Date(left.lastMessageAt ?? left.createdAt).getTime();
      const rightTimestamp = new Date(right.lastMessageAt ?? right.createdAt).getTime();
      return rightTimestamp - leftTimestamp;
    });

  return NextResponse.json(payload);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  ensureDb();
  const { id } = await params;
  const body = await req.json();
  const forceNew = Boolean(body.forceNew);

  if (!forceNew) {
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
      .orderBy(desc(schema.conversations.createdAt))
      .get();

    if (existing) {
      return NextResponse.json(existing);
    }
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
