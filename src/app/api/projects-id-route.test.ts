import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("projects/[id] route declares a DELETE handler", async () => {
  const routePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "projects",
    "[id]",
    "route.ts"
  );
  const routeSource = await readFile(routePath, "utf8");

  assert.match(routeSource, /export\s+async\s+function\s+DELETE\s*\(/);
});
