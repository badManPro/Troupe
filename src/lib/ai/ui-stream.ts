import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
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
