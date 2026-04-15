import fs from "fs";
import os from "os";
import path from "path";

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

export function resolveDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;
  if (configuredPath) {
    fs.mkdirSync(path.dirname(configuredPath), { recursive: true });
    return configuredPath;
  }

  for (const legacyDatabasePath of getLegacyDatabaseCandidates()) {
    if (pathExists(legacyDatabasePath)) {
      return legacyDatabasePath;
    }
  }

  const stableDataDir = getStableAppDataDir();
  fs.mkdirSync(stableDataDir, { recursive: true });
  return path.join(stableDataDir, DATABASE_FILENAME);
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
