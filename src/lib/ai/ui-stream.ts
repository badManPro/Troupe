import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { randomUUID } from "crypto";

export function createStaticTextStreamResponse(
  text: string,
  originalMessages?: UIMessage[]
) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      const textId = randomUUID();
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

interface TextChunkOptions {
  minChunkSize?: number;
  maxChunkSize?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTextIntoChunks(
  text: string,
  { minChunkSize = 8, maxChunkSize = 24 }: TextChunkOptions = {}
) {
  const chunks: string[] = [];
  const chars = Array.from(text);
  let buffer = "";

  for (const char of chars) {
    buffer += char;

    const reachedMin = buffer.length >= minChunkSize;
    const reachedMax = buffer.length >= maxChunkSize;
    const isBoundary =
      char === "\n" || /[，。！？；：,.!?;:、]/.test(char) || /\s/.test(char);

    if (reachedMax || (reachedMin && isBoundary)) {
      chunks.push(buffer);
      buffer = "";
    }
  }

  if (buffer) {
    chunks.push(buffer);
  }

  return chunks.filter(Boolean);
}

function getChunkDelay(
  chunk: string,
  { baseDelayMs = 24, maxDelayMs = 90 }: TextChunkOptions = {}
) {
  if (!chunk.trim()) return 0;

  const length = Array.from(chunk).length;
  let delay = baseDelayMs + Math.max(0, length - 6) * 3;

  if (/[。！？!?]\s*$/.test(chunk)) {
    delay += 45;
  } else if (chunk.includes("\n")) {
    delay += 24;
  }

  return Math.min(delay, maxDelayMs);
}

export async function writeTextInChunks<UI_MESSAGE extends UIMessage>(
  writer: UIMessageStreamWriter<UI_MESSAGE>,
  text: string,
  options: TextChunkOptions = {}
) {
  const textId = randomUUID();
  const chunks = splitTextIntoChunks(text, options);

  writer.write({ type: "text-start", id: textId });

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    writer.write({ type: "text-delta", id: textId, delta: chunk });

    if (index < chunks.length - 1) {
      await sleep(getChunkDelay(chunk, options));
    }
  }

  writer.write({ type: "text-end", id: textId });
}
