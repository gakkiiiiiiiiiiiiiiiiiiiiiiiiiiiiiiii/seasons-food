#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


DATA_SCRIPT = r'''#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function requireValue(args, key) {
  if (!args[key]) {
    throw new Error(`Missing --${key}`);
  }
  return args[key];
}

function runWxcloud(argv) {
  return new Promise((resolve, reject) => {
    const child = spawn("wxcloud", argv, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wxcloud exited with code ${code}`));
      }
    });
  });
}

function envId(args) {
  return args.envId || args.env;
}

function region(args) {
  return args.region || "ap-shanghai";
}

function requireEnvId(args) {
  const value = envId(args);
  if (!value) throw new Error("Missing --envId");
  return value;
}

async function login() {
  if (!process.env.WX_CLOUD_APP_ID) throw new Error("Missing WX_CLOUD_APP_ID in .wxcloud.env");
  if (!process.env.WX_CLOUD_PRIVATE_KEY) throw new Error("Missing WX_CLOUD_PRIVATE_KEY in .wxcloud.env");
  await runWxcloud(["login", "--appId", process.env.WX_CLOUD_APP_ID, "--privateKey", process.env.WX_CLOUD_PRIVATE_KEY]);
}

async function runStorage(command, args) {
  const id = requireEnvId(args);
  if (command === "storage:upload") {
    const local = requireValue(args, "local");
    const remote = args.remote || args.remotePath || `/${path.basename(local)}`;
    const argv = [
      "storage:upload",
      local,
      "--envId",
      id,
      "--mode",
      "storage",
      "--remotePath",
      remote,
      "--region",
      region(args),
    ];
    if (args.concurrency) argv.push("--concurrency", args.concurrency);
    await runWxcloud(argv);
    return;
  }
  if (command === "storage:list") {
    const prefix = args.prefix || args.remote || "/";
    const argv = ["storage:list", prefix, "--envId", id, "--mode", "storage", "--region", region(args)];
    if (args.json) argv.push("--json");
    await runWxcloud(argv);
    return;
  }
  if (command === "storage:delete") {
    const argv = ["storage:delete", "--envId", id, "--mode", "storage", "--region", region(args)];
    if (args.object || args.remote) {
      for (const item of String(args.object || args.remote).split(",").filter(Boolean)) {
        argv.push("-o", item);
      }
    } else if (args.prefix) {
      argv.push("-p", args.prefix);
    } else {
      throw new Error("Missing --object, --remote, or --prefix");
    }
    await runWxcloud(argv);
    return;
  }
  if (command === "storage:purge") {
    await runWxcloud(["storage:purge", "--envId", id, "--region", region(args)]);
    return;
  }
  throw new Error(`Unsupported storage command: ${command}`);
}

async function main() {
  loadEnv(path.resolve(process.cwd(), ".wxcloud.env"));
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command) {
    console.error("Usage: node scripts/wxcloud-data.mjs <login|env:list|storage:upload|storage:list|storage:delete|storage:purge> [options]");
    process.exit(2);
  }
  if (command === "login") {
    await login();
  } else if (command === "env:list") {
    const argv = ["env:list", "--region", region(args)];
    if (args.json) argv.push("--json");
    await runWxcloud(argv);
  } else if (command.startsWith("storage:")) {
    await runStorage(command, args);
  } else if (command.startsWith("db:")) {
    throw new Error("Database commands are not available in the CLI-only helper. Use the WeChat console or add an explicit database SDK setup.");
  } else {
    throw new Error(`Unsupported command: ${command}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
'''


def update_package_json(project: Path) -> None:
    package_path = project / "package.json"
    if not package_path.exists():
        return
    package = json.loads(package_path.read_text(encoding="utf-8"))
    scripts = package.setdefault("scripts", {})
    if "wxcloud:data" not in scripts:
        scripts["wxcloud:data"] = "node scripts/wxcloud-data.mjs"
    package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Install wxcloud CLI helper script.")
    parser.add_argument("--project", required=True, help="Backend project directory.")
    args = parser.parse_args()
    project = Path(args.project).expanduser().resolve()
    if not project.exists() or not project.is_dir():
        raise SystemExit(f"Project directory not found: {project}")
    scripts_dir = project / "scripts"
    scripts_dir.mkdir(exist_ok=True)
    target = scripts_dir / "wxcloud-data.mjs"
    if target.exists():
        raise SystemExit(f"Refusing to overwrite existing script: {target}")
    target.write_text(DATA_SCRIPT, encoding="utf-8")
    target.chmod(0o755)
    update_package_json(project)
    print(f"Installed {target}")
    print("No extra npm dependency is required. The helper shells out to the wxcloud CLI.")


if __name__ == "__main__":
    main()
