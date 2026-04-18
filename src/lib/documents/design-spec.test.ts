import assert from "node:assert/strict";
import test from "node:test";

test("isDesignSpecReadyForExecution returns false when required sections are placeholders", async () => {
  const { buildSharedDesignSpec, isDesignSpecReadyForExecution } = await import(
    new URL("./design-spec.ts", import.meta.url).href
  );

  const designSpec = buildSharedDesignSpec({
    userFlowContent: "### 主流程\n- 已补齐",
    informationArchitectureContent: "### 页面清单\n- 已补齐",
  });

  assert.equal(isDesignSpecReadyForExecution(designSpec), false);
});

test("isDesignSpecReadyForExecution returns true when flow, IA and style are all present", async () => {
  const { buildSharedDesignSpec, isDesignSpecReadyForExecution } = await import(
    new URL("./design-spec.ts", import.meta.url).href
  );

  const designSpec = buildSharedDesignSpec({
    userFlowContent: "### 主流程\n- 已补齐",
    informationArchitectureContent: "### 页面清单\n- 已补齐",
    visualStyleContent: "### 设计规范\n- 已补齐",
  });

  assert.equal(isDesignSpecReadyForExecution(designSpec), true);
});
