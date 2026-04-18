import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";

function createDatabase(
  targetPath: string,
  projectName?: string,
  updatedAt = 1776508749
) {
  const db = new Database(targetPath);
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      phase TEXT NOT NULL DEFAULT 'brainstorm',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  if (projectName) {
    db.prepare(
      `INSERT INTO projects (id, name, description, phase, created_at, updated_at)
       VALUES (?, ?, '', 'design', ?, ?)`
    ).run(`${projectName}-id`, projectName, updatedAt, updatedAt);
  }

  db.close();
}

test("pickPreferredDatabasePath prefers populated stable db over empty legacy db", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "troupe-db-paths-"));

  try {
    const legacyPath = path.join(tempDir, "legacy.db");
    const stablePath = path.join(tempDir, "stable.db");

    createDatabase(legacyPath);
    createDatabase(stablePath, "AI学习助手");

    const { pickPreferredDatabasePath } = await import(
      new URL("./paths.ts", import.meta.url).href
    );

    assert.equal(
      pickPreferredDatabasePath([legacyPath], stablePath),
      stablePath
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("pickPreferredDatabasePath keeps populated legacy db when it is fresher than stable db", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "troupe-db-paths-"));

  try {
    const legacyPath = path.join(tempDir, "legacy.db");
    const stablePath = path.join(tempDir, "stable.db");

    createDatabase(legacyPath, "Legacy项目", 1776508750);
    createDatabase(stablePath, "Stable项目", 1776508749);

    const { pickPreferredDatabasePath } = await import(
      new URL("./paths.ts", import.meta.url).href
    );

    assert.equal(
      pickPreferredDatabasePath([legacyPath], stablePath),
      legacyPath
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("pickPreferredDatabasePath prefers stable db when legacy is only an equally fresh duplicate", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "troupe-db-paths-"));

  try {
    const legacyPath = path.join(tempDir, "legacy.db");
    const stablePath = path.join(tempDir, "stable.db");

    createDatabase(legacyPath, "Legacy项目", 1776508749);
    createDatabase(stablePath, "Stable项目", 1776508749);

    const { pickPreferredDatabasePath } = await import(
      new URL("./paths.ts", import.meta.url).href
    );

    assert.equal(
      pickPreferredDatabasePath([legacyPath], stablePath),
      stablePath
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
