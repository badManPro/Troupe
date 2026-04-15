import fs from "fs";
import os from "os";
import path from "path";
import { defineConfig } from "drizzle-kit";

function resolveDatabasePath() {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  const legacyPath = path.join(process.cwd(), "troupe.db");
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  const stableDir =
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library", "Application Support", "Troupe")
      : process.platform === "win32"
        ? path.join(
            process.env.APPDATA ||
              path.join(os.homedir(), "AppData", "Roaming"),
            "Troupe"
          )
        : path.join(
            process.env.XDG_DATA_HOME ||
              path.join(os.homedir(), ".local", "share"),
            "troupe"
          );

  fs.mkdirSync(stableDir, { recursive: true });
  return path.join(stableDir, "troupe.db");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveDatabasePath(),
  },
});
