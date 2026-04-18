#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const SUPPORTED_TAURI_COMMANDS = new Set(["dev", "build"]);
const TAURI_CLI_PACKAGE = "@tauri-apps/cli@^2";

function prependPathEntry(currentPath, entry, delimiter = path.delimiter) {
  if (!entry) {
    return currentPath || "";
  }

  const parts = (currentPath || "").split(delimiter).filter(Boolean);

  if (parts.includes(entry)) {
    return parts.join(delimiter);
  }

  return [entry, ...parts].join(delimiter);
}

function getCargoBinPath(platform = process.platform, env = process.env) {
  const homeDir = env.HOME || env.USERPROFILE || os.homedir();

  if (!homeDir) {
    return null;
  }

  return path.join(homeDir, ".cargo", "bin");
}

function buildBootstrapEnv(baseEnv = process.env, platform = process.platform) {
  const cargoBinPath = getCargoBinPath(platform, baseEnv);
  const nextEnv = { ...baseEnv };

  if (cargoBinPath) {
    nextEnv.PATH = prependPathEntry(baseEnv.PATH || "", cargoBinPath);
  }

  return nextEnv;
}

function getCargoCommand(platform = process.platform) {
  return platform === "win32" ? "cargo.exe" : "cargo";
}

function hasCommand(command, env = process.env) {
  const result = spawnSync(command, ["--version"], {
    env,
    stdio: "ignore",
    windowsHide: true,
  });

  if (result.error && result.error.code === "ENOENT") {
    return false;
  }

  return result.status === 0;
}

function hasCargo(env = process.env, platform = process.platform) {
  return hasCommand(getCargoCommand(platform), buildBootstrapEnv(env, platform));
}

function getRustInstallInvocation(platform = process.platform, env = process.env) {
  if (platform === "darwin" || platform === "linux") {
    if (hasCommand("curl", env)) {
      return {
        command: "sh",
        args: [
          "-c",
          "curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y",
        ],
      };
    }

    if (hasCommand("wget", env)) {
      return {
        command: "sh",
        args: ["-c", "wget -qO- https://sh.rustup.rs | sh -s -- -y"],
      };
    }

    throw new Error("Rust bootstrap requires curl or wget to be available.");
  }

  if (platform === "win32") {
    if (hasCommand("winget", env)) {
      return {
        command: "winget",
        args: [
          "install",
          "-e",
          "--id",
          "Rustlang.Rustup",
          "--accept-package-agreements",
          "--accept-source-agreements",
        ],
      };
    }

    if (hasCommand("choco", env)) {
      return {
        command: "choco",
        args: ["install", "rustup.install", "-y"],
      };
    }

    throw new Error(
      "Rust bootstrap on Windows requires winget or Chocolatey. Install Rust from https://rustup.rs/ and retry.",
    );
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function installRust(env = process.env, platform = process.platform) {
  const invocation = getRustInstallInvocation(platform, env);

  console.log("[bootstrap] `cargo` not found. Installing Rust toolchain...");

  const result = spawnSync(invocation.command, invocation.args, {
    env,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Rust installation failed with exit code ${result.status}.`);
  }
}

function getTauriCliCommand(platform = process.platform) {
  return platform === "win32" ? "npx.cmd" : "npx";
}

function getTauriCliArgs(subcommand, extraArgs = []) {
  return ["--yes", TAURI_CLI_PACKAGE, subcommand, ...extraArgs];
}

function runTauri(subcommand, extraArgs = [], env = process.env, platform = process.platform) {
  const result = spawnSync(getTauriCliCommand(platform), getTauriCliArgs(subcommand, extraArgs), {
    env,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function parseArgs(argv = process.argv.slice(2)) {
  const [subcommand, ...extraArgs] = argv;

  if (!subcommand) {
    throw new Error(
      "Missing Tauri command. Usage: node ./scripts/tauri-bootstrap.js <dev|build> [args]",
    );
  }

  if (!SUPPORTED_TAURI_COMMANDS.has(subcommand)) {
    throw new Error(
      `Unsupported Tauri command: ${subcommand}. Expected one of: ${Array.from(SUPPORTED_TAURI_COMMANDS).join(", ")}`,
    );
  }

  return { subcommand, extraArgs };
}

function main(argv = process.argv.slice(2), env = process.env, platform = process.platform) {
  const { subcommand, extraArgs } = parseArgs(argv);
  let runtimeEnv = buildBootstrapEnv(env, platform);

  if (!hasCargo(runtimeEnv, platform)) {
    installRust(runtimeEnv, platform);
    runtimeEnv = buildBootstrapEnv(runtimeEnv, platform);
  }

  if (!hasCargo(runtimeEnv, platform)) {
    const cargoBinPath = getCargoBinPath(platform, runtimeEnv);

    throw new Error(
      `Rust installation completed but \`cargo\` is still unavailable. Make sure ${cargoBinPath} is on PATH and retry.`,
    );
  }

  console.log(`[bootstrap] Starting Tauri ${subcommand}...`);

  return runTauri(subcommand, extraArgs, runtimeEnv, platform);
}

if (require.main === module) {
  try {
    const exitCode = main();
    process.exit(exitCode);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[bootstrap] ${message}`);
    process.exit(1);
  }
}

module.exports = {
  TAURI_CLI_PACKAGE,
  buildBootstrapEnv,
  getCargoBinPath,
  getRustInstallInvocation,
  getTauriCliArgs,
  hasCargo,
  parseArgs,
  prependPathEntry,
};
