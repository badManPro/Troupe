import assert from "node:assert/strict";
import test from "node:test";

test("parseDocumentGenerationSse keeps remainder until an event frame is complete", async () => {
  const { parseDocumentGenerationSse } = await import(
    new URL("./generation-stream.ts", import.meta.url).href
  );

  const firstPass = parseDocumentGenerationSse(
    'data: {"type":"text-delta","delta":"第一段"}\n\ndata: {"type":"data-chatStatus","data":{"phase":"thinking","label":"正在分析"}}'
  );

  assert.deepEqual(firstPass.events, [
    {
      type: "text-delta",
      delta: "第一段",
    },
  ]);
  assert.equal(
    firstPass.remainder,
    'data: {"type":"data-chatStatus","data":{"phase":"thinking","label":"正在分析"}}'
  );

  const secondPass = parseDocumentGenerationSse(
    `${firstPass.remainder}\n\ndata: [DONE]\n\n`
  );

  assert.deepEqual(secondPass.events, [
    {
      type: "data-chatStatus",
      data: {
        phase: "thinking",
        label: "正在分析",
      },
    },
  ]);
  assert.equal(secondPass.remainder, "");
});

test("reduceDocumentGenerationEvent accumulates preview text and final status", async () => {
  const {
    createDocumentGenerationState,
    reduceDocumentGenerationEvent,
  } = await import(new URL("./generation-stream.ts", import.meta.url).href);

  let state = createDocumentGenerationState();

  state = reduceDocumentGenerationEvent(state, {
    type: "data-chatStatus",
    data: {
      phase: "queued",
      label: "已提交生成请求",
      detail: "正在唤起设计助手。",
    },
  });

  state = reduceDocumentGenerationEvent(state, {
    type: "text-delta",
    delta: "## 用户流程\n",
  });

  state = reduceDocumentGenerationEvent(state, {
    type: "text-delta",
    delta: "- 首次进入工作台\n",
  });

  state = reduceDocumentGenerationEvent(state, {
    type: "data-chatStatus",
    data: {
      phase: "complete",
      label: "用户流程已生成",
      detail: "正在写入文档面板。",
    },
  });

  assert.equal(state.previewText, "## 用户流程\n- 首次进入工作台\n");
  assert.deepEqual(state.status, {
    phase: "complete",
    label: "用户流程已生成",
    detail: "正在写入文档面板。",
  });
  assert.equal(state.isComplete, true);
  assert.equal(state.error, null);
});

test("reduceDocumentGenerationEvent records stream errors without losing existing preview", async () => {
  const {
    createDocumentGenerationState,
    reduceDocumentGenerationEvent,
  } = await import(new URL("./generation-stream.ts", import.meta.url).href);

  const state = reduceDocumentGenerationEvent(
    {
      ...createDocumentGenerationState(),
      previewText: "已有内容",
    },
    {
      type: "error",
      errorText: "Generation failed",
    }
  );

  assert.equal(state.previewText, "已有内容");
  assert.equal(state.error, "Generation failed");
  assert.deepEqual(state.status, {
    phase: "error",
    label: "生成失败",
    detail: "Generation failed",
  });
  assert.equal(state.isComplete, false);
});
