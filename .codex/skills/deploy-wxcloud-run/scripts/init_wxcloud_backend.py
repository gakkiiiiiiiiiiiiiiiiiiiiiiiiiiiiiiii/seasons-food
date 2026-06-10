#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


ENV_TEMPLATE = """# WeChat Cloud Run / 微信云托管
WX_CLOUD_ENV_ID=
WX_CLOUD_SERVICE_NAME=
WX_CLOUD_PORT={port}
WX_CLOUD_REGION=ap-shanghai
WX_CLOUD_APP_ID=
WX_CLOUD_PRIVATE_KEY=

# Tencent CloudBase / 云开发资源
TCB_ENV_ID=
TCB_SECRET_ID=
TCB_SECRET_KEY=
TCB_REGION=ap-shanghai

# Cloud database / 云数据库
TCB_DATABASE_COLLECTION=

# Object storage / 对象存储
TCB_STORAGE_BUCKET=
TCB_STORAGE_PREFIX=
"""


GITIGNORE_LINES = [
    ".wxcloud.env",
    ".wxcloud.env.local",
    ".wxcloud-data-tmp/",
]


def read_package_json(project: Path) -> dict:
    package_path = project / "package.json"
    if not package_path.exists():
        return {}
    try:
        return json.loads(package_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def detect_package_manager(project: Path) -> str:
    if (project / "pnpm-lock.yaml").exists():
        return "pnpm"
    if (project / "yarn.lock").exists():
        return "yarn"
    return "npm"


def detect_start_command(project: Path, package: dict, explicit: str | None) -> str:
    if explicit:
        return explicit
    scripts = package.get("scripts", {}) if isinstance(package.get("scripts"), dict) else {}
    manager = detect_package_manager(project)
    if "start" in scripts:
        return f"{manager} start"
    for candidate in ("server.js", "app.js", "index.js", "src/server.js", "src/index.js", "dist/server.js", "dist/index.js"):
        if (project / candidate).exists():
            return f"node {candidate}"
    return "npm start"


def detect_install_command(project: Path, manager: str) -> str:
    if manager == "pnpm":
        if (project / "pnpm-lock.yaml").exists():
            return "corepack enable && pnpm install --frozen-lockfile"
        return "corepack enable && pnpm install"
    if manager == "yarn":
        if (project / "yarn.lock").exists():
            return "corepack enable && yarn install --frozen-lockfile"
        return "corepack enable && yarn install"
    if (project / "package-lock.json").exists() or (project / "npm-shrinkwrap.json").exists():
        return "npm ci"
    return "npm install"


def detect_build_command(package: dict, manager: str) -> str:
    scripts = package.get("scripts", {}) if isinstance(package.get("scripts"), dict) else {}
    if "build" not in scripts:
        return ""
    if manager == "pnpm":
        return "RUN pnpm build"
    if manager == "yarn":
        return "RUN yarn build"
    return "RUN npm run build"


def write_env(project: Path, port: int) -> None:
    env_path = project / ".wxcloud.env"
    template_pairs = {}
    for line in ENV_TEMPLATE.format(port=port).splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            template_pairs[key] = value

    if env_path.exists():
        existing = env_path.read_text(encoding="utf-8")
        existing_keys = {
            line.split("=", 1)[0].strip()
            for line in existing.splitlines()
            if "=" in line and not line.lstrip().startswith("#")
        }
        missing = [f"{key}={value}" for key, value in template_pairs.items() if key not in existing_keys]
        if missing:
            env_path.write_text(existing.rstrip() + "\n\n# Added by deploy-wxcloud-run\n" + "\n".join(missing) + "\n", encoding="utf-8")
        return

    env_path.write_text(ENV_TEMPLATE.format(port=port), encoding="utf-8")


def update_gitignore(project: Path) -> None:
    ignore_path = project / ".gitignore"
    existing = ignore_path.read_text(encoding="utf-8") if ignore_path.exists() else ""
    lines = existing.splitlines()
    present = {line.strip() for line in lines}
    additions = [line for line in GITIGNORE_LINES if line not in present]
    if additions:
        prefix = "\n" if existing and not existing.endswith("\n") else ""
        block = "# WeChat Cloud Run local secrets\n" + "\n".join(additions) + "\n"
        ignore_path.write_text(existing + prefix + block, encoding="utf-8")


def write_dockerfile(project: Path, port: int, start_cmd: str) -> None:
    dockerfile = project / "Dockerfile"
    if dockerfile.exists():
        return
    package = read_package_json(project)
    manager = detect_package_manager(project)
    install_cmd = detect_install_command(project, manager)
    build_cmd = detect_build_command(package, manager)
    corepack_cmd = "RUN corepack enable" if manager in {"pnpm", "yarn"} else ""
    copy_lock = {
        "pnpm": "COPY package.json pnpm-lock.yaml* ./",
        "yarn": "COPY package.json yarn.lock* ./",
        "npm": "COPY package*.json ./",
    }[manager]
    content = f"""FROM node:20-alpine AS deps
WORKDIR /app
{copy_lock}
RUN {install_cmd}

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT={port}
{corepack_cmd}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
{build_cmd}
EXPOSE {port}
CMD {json.dumps(start_cmd.split())}
"""
    dockerfile.write_text(content.replace("\n\n\n", "\n\n"), encoding="utf-8")


def write_wxcloud_config(project: Path, port: int) -> None:
    for name in ("wxcloud.config.cjs", "wxcloud.config.js", "wxcloud.config.json"):
        if (project / name).exists():
            return
    config = f"""module.exports = {{
  type: "run",
  server: {{
    port: {port},
    buildDir: ".",
    versionRemark: "deploy-wxcloud-run"
  }}
}};
"""
    (project / "wxcloud.config.js").write_text(config, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize backend project files for WeChat Cloud Run.")
    parser.add_argument("--project", required=True, help="Backend project directory.")
    parser.add_argument("--port", type=int, default=3000, help="Service port for Cloud Run and Dockerfile.")
    parser.add_argument("--start-cmd", help="Container start command, for example 'node server.js'.")
    args = parser.parse_args()

    project = Path(args.project).expanduser().resolve()
    if not project.exists() or not project.is_dir():
        raise SystemExit(f"Project directory not found: {project}")

    package = read_package_json(project)
    start_cmd = detect_start_command(project, package, args.start_cmd)

    write_env(project, args.port)
    update_gitignore(project)
    write_dockerfile(project, args.port, start_cmd)
    write_wxcloud_config(project, args.port)

    print(f"Initialized WeChat Cloud Run files in {project}")
    print("Review .wxcloud.env and fill real secret/resource values before deploy or data operations.")


if __name__ == "__main__":
    main()
