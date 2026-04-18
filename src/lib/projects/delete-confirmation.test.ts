import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

test("project deletion requires the explicit confirmation phrase", async () => {
  const moduleUrl = new URL("./delete-confirmation.ts", import.meta.url);
  const modulePath = fileURLToPath(moduleUrl);

  assert.equal(
    existsSync(modulePath),
    true,
    "Expected project deletion confirmation helper to exist"
  );

  const {
    DELETE_PROJECT_CONFIRMATION_TEXT,
    isProjectDeletionConfirmationValid,
  } = await import(moduleUrl.href);

  assert.equal(DELETE_PROJECT_CONFIRMATION_TEXT, "确认删除");
  assert.equal(isProjectDeletionConfirmationValid("确认删除"), true);
  assert.equal(isProjectDeletionConfirmationValid("  确认删除  "), true);
  assert.equal(isProjectDeletionConfirmationValid("删除"), false);
  assert.equal(isProjectDeletionConfirmationValid("confirm delete"), false);
});
