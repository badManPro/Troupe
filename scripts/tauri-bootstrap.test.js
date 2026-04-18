const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildBootstrapEnv,
  getCargoBinPath,
  getTauriCliArgs,
  parseArgs,
  prependPathEntry,
} = require("./tauri-bootstrap");

const repoRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(repoRoot, "package.json");
const readmePath = path.join(repoRoot, "README.md");
const bootstrapPath = path.join(__dirname, "tauri-bootstrap.js");

test("desktop scripts are routed through the bootstrap entrypoint", () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  assert.equal(
    packageJson.scripts["tauri:dev"],
    "node ./scripts/tauri-bootstrap.js dev",
  );
  assert.equal(
    packageJson.scripts["tauri:build"],
    "node ./scripts/tauri-bootstrap.js build",
  );
});

test("desktop bootstrap script exists", () => {
  assert.equal(fs.existsSync(bootstrapPath), true);
});

test("cargo bin path is prepended exactly once", () => {
  const cargoBinPath = getCargoBinPath("linux", { HOME: "/tmp/troupe-home" });
  const once = prependPathEntry("/usr/local/bin:/usr/bin", cargoBinPath, ":");
  const twice = prependPathEntry(once, cargoBinPath, ":");

  assert.equal(once, "/tmp/troupe-home/.cargo/bin:/usr/local/bin:/usr/bin");
  assert.equal(twice, once);
});

test("bootstrap env prepends ~/.cargo/bin to PATH", () => {
  const env = buildBootstrapEnv(
    {
      HOME: "/tmp/troupe-home",
      PATH: "/usr/local/bin:/usr/bin",
    },
    "linux",
  );

  assert.equal(env.PATH, "/tmp/troupe-home/.cargo/bin:/usr/local/bin:/usr/bin");
});

test("tauri cli args install the official package on demand", () => {
  assert.deepEqual(getTauriCliArgs("dev", ["--host", "0.0.0.0"]), [
    "--yes",
    "@tauri-apps/cli@^2",
    "dev",
    "--host",
    "0.0.0.0",
  ]);
});

test("argument parsing keeps tauri subcommand passthrough args", () => {
  assert.deepEqual(parseArgs(["build", "--debug"]), {
    subcommand: "build",
    extraArgs: ["--debug"],
  });
});

test("README documents the npm desktop command instead of raw tauri cli usage", () => {
  const readme = fs.readFileSync(readmePath, "utf8");

  assert.match(readme, /npm run tauri:dev/);
  assert.doesNotMatch(readme, /npx tauri dev/);
});
