import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";

const APP_NAME = "Troupe";
const DATABASE_FILENAME = "troupe.db";

function isStandaloneBuildRoot(candidate: string) {
  const normalized = path.resolve(candidate).split(path.sep).join("/");
  return normalized.endsWith("/.next/standalone");
}

function pathExists(targetPath: string) {
  return fs.existsSync(targetPath);
}

function isDirectory(targetPath: string) {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function looksLikeProjectRoot(
  candidate: string,
  options?: { allowStandaloneBuild?: boolean }
) {
  const matchesProjectMarkers =
    pathExists(path.join(candidate, "package.json")) &&
    isDirectory(path.join(candidate, "drizzle"));

  if (!matchesProjectMarkers) {
    return false;
  }

  return options?.allowStandaloneBuild || !isStandaloneBuildRoot(candidate);
}

function findUp(startDir: string, predicate: (candidate: string) => boolean) {
  let current = path.resolve(startDir);

  while (true) {
    if (predicate(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function getSearchRoots() {
  return [process.cwd(), process.argv[1] ? path.dirname(process.argv[1]) : null]
    .filter((value): value is string => Boolean(value))
    .map((value) => path.resolve(value));
}

function findProjectRoot(options?: { allowStandaloneBuild?: boolean }) {
  for (const root of getSearchRoots()) {
    const found = findUp(root, (candidate) =>
      looksLikeProjectRoot(candidate, options)
    );
    if (found) {
      return found;
    }
  }

  return process.cwd();
}

function getLegacyDatabaseCandidates() {
  return [
    ...new Set(
      [...getSearchRoots(), findProjectRoot()].filter((root) => !isStandaloneBuildRoot(root))
    ),
  ].map((root) => path.join(root, DATABASE_FILENAME));
}

interface DatabaseSummary {
  projectCount: number;
  latestProjectUpdatedAt: number;
}

function getDatabaseSummary(targetPath: string): DatabaseSummary {
  if (!pathExists(targetPath)) {
    return { projectCount: 0, latestProjectUpdatedAt: 0 };
  }

  let db: Database.Database | null = null;

  try {
    db = new Database(targetPath, { readonly: true, fileMustExist: true });
    const hasProjectsTable = db
      .prepare(
        `SELECT 1
         FROM sqlite_master
         WHERE type = 'table' AND name = 'projects'
         LIMIT 1`
      )
      .get();

    if (!hasProjectsTable) {
      return { projectCount: 0, latestProjectUpdatedAt: 0 };
    }

    const result = db
      .prepare(
        `SELECT
           COUNT(*) as count,
           COALESCE(MAX(updated_at), 0) as latestUpdatedAt
         FROM projects`
      )
      .get() as
      | {
          count?: number;
          latestUpdatedAt?: number;
        }
      | undefined;

    return {
      projectCount: typeof result?.count === "number" ? result.count : 0,
      latestProjectUpdatedAt:
        typeof result?.latestUpdatedAt === "number"
          ? result.latestUpdatedAt
          : 0,
    };
  } catch {
    return { projectCount: 0, latestProjectUpdatedAt: 0 };
  } finally {
    db?.close();
  }
}

function getStableAppDataDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_NAME);
  }

  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      APP_NAME
    );
  }

  return path.join(
    process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
    APP_NAME.toLowerCase()
  );
}

export function pickPreferredDatabasePath(
  legacyCandidates: string[],
  stableDatabasePath: string
) {
  const stableSummary = getDatabaseSummary(stableDatabasePath);
  let freshestLegacyPath: string | null = null;
  let freshestLegacySummary: DatabaseSummary | null = null;

  for (const legacyDatabasePath of legacyCandidates) {
    const summary = getDatabaseSummary(legacyDatabasePath);

    if (summary.projectCount === 0) {
      continue;
    }

    if (
      !freshestLegacySummary ||
      summary.latestProjectUpdatedAt > freshestLegacySummary.latestProjectUpdatedAt
    ) {
      freshestLegacyPath = legacyDatabasePath;
      freshestLegacySummary = summary;
    }
  }

  if (
    stableSummary.projectCount > 0 &&
    (!freshestLegacySummary ||
      stableSummary.latestProjectUpdatedAt >=
        freshestLegacySummary.latestProjectUpdatedAt)
  ) {
    return stableDatabasePath;
  }

  if (freshestLegacyPath) {
    return freshestLegacyPath;
  }

  for (const legacyDatabasePath of legacyCandidates) {
    if (pathExists(legacyDatabasePath)) {
      return legacyDatabasePath;
    }
  }

  return stableDatabasePath;
}

export function resolveDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;
  if (configuredPath) {
    fs.mkdirSync(path.dirname(configuredPath), { recursive: true });
    return configuredPath;
  }

  const stableDataDir = getStableAppDataDir();
  fs.mkdirSync(stableDataDir, { recursive: true });
  const stableDatabasePath = path.join(stableDataDir, DATABASE_FILENAME);

  return pickPreferredDatabasePath(
    getLegacyDatabaseCandidates(),
    stableDatabasePath
  );
}

export function resolveMigrationsFolder() {
  const configuredPath = process.env.DATABASE_MIGRATIONS_PATH;
  if (configuredPath) {
    return configuredPath;
  }

  const cwdMigrationsFolder = path.join(process.cwd(), "drizzle");
  if (isDirectory(cwdMigrationsFolder)) {
    return cwdMigrationsFolder;
  }

  return path.join(findProjectRoot({ allowStandaloneBuild: true }), "drizzle");
}
