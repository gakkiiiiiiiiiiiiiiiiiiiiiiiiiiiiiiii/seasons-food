#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


DATA_SCRIPT = r'''#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import cloudbase from "@cloudbase/node-sdk";

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

function parseJsonArg(args) {
  const raw = requireValue(args, "json");
  return JSON.parse(raw);
}

function createApp() {
  const env = process.env.TCB_ENV_ID || process.env.WX_CLOUD_ENV_ID;
  if (!env) throw new Error("Missing TCB_ENV_ID or WX_CLOUD_ENV_ID in .wxcloud.env");
  const config = { env };
  if (process.env.TCB_SECRET_ID && process.env.TCB_SECRET_KEY) {
    config.secretId = process.env.TCB_SECRET_ID;
    config.secretKey = process.env.TCB_SECRET_KEY;
  }
  return cloudbase.init(config);
}

function collectionName(args) {
  return args.collection || process.env.TCB_DATABASE_COLLECTION;
}

async function runDb(app, command, args) {
  const db = app.database();
  const name = collectionName(args);
  if (!name) throw new Error("Missing --collection or TCB_DATABASE_COLLECTION");
  const collection = db.collection(name);
  if (command === "db:list") {
    const limit = Number(args.limit || 20);
    const result = await collection.limit(limit).get();
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "db:get") {
    const result = await collection.doc(requireValue(args, "id")).get();
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "db:add") {
    const result = await collection.add(parseJsonArg(args));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "db:update") {
    const result = await collection.doc(requireValue(args, "id")).update(parseJsonArg(args));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "db:delete") {
    const result = await collection.doc(requireValue(args, "id")).remove();
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  throw new Error(`Unsupported database command: ${command}`);
}

async function runStorage(app, command, args) {
  const storage = app.storage();
  const prefix = process.env.TCB_STORAGE_PREFIX || "";
  const remote = args.remote ? path.posix.join(prefix, args.remote).replace(/^\/+/, "") : "";
  if (command === "storage:upload") {
    const local = requireValue(args, "local");
    const result = await storage.uploadFile({
      cloudPath: remote || path.basename(local),
      fileContent: fs.createReadStream(local),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "storage:download") {
    const local = requireValue(args, "local");
    const result = await storage.downloadFile({ fileID: requireValue(args, "remote") });
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, result.fileContent);
    console.log(JSON.stringify({ local }, null, 2));
    return;
  }
  if (command === "storage:delete") {
    const result = await storage.deleteFile({ fileList: [requireValue(args, "remote")] });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  throw new Error(`Unsupported storage command: ${command}`);
}

async function main() {
  loadEnv(path.resolve(process.cwd(), ".wxcloud.env"));
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command) {
    console.error("Usage: node scripts/wxcloud-data.mjs <db:list|db:get|db:add|db:update|db:delete|storage:upload|storage:download|storage:delete> [options]");
    process.exit(2);
  }
  const app = createApp();
  if (command.startsWith("db:")) {
    await runDb(app, command, args);
  } else if (command.startsWith("storage:")) {
    await runStorage(app, command, args);
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
    parser = argparse.ArgumentParser(description="Install env-driven CloudBase database/storage helper script.")
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
    print("Install @cloudbase/node-sdk in the backend project before running data operations.")


if __name__ == "__main__":
    main()
