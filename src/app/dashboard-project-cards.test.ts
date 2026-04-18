import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("dashboard project cards reserve a consistent vertical layout", async () => {
  const pagePath = path.join(process.cwd(), "src", "app", "page.tsx");
  const pageSource = await readFile(pagePath, "utf8");

  assert.match(pageSource, /<motion\.div[\s\S]*className="h-full"/);
  assert.match(
    pageSource,
    /<Card[\s\S]*className="group flex h-full cursor-pointer flex-col transition-shadow hover:shadow-md"/
  );
  assert.match(
    pageSource,
    /<CardTitle className="line-clamp-2 min-h-\[3rem\] text-base leading-6"/
  );
  assert.match(
    pageSource,
    /<CardDescription className="min-h-10 line-clamp-2 leading-5">/
  );
});
