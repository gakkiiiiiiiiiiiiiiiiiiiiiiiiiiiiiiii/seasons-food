---
name: deploy-wxcloud-run
description: Initialize, prepare, and operate backend projects for WeChat Cloud Run / 微信云托管. Use when the user says “初始化微信云托管”, “部署微信云托管”, asks to create a .wxcloud.env file, generate a Dockerfile for 微信云托管, prepare wxcloud.config.js, deploy a backend with @wxcloud/cli, or asks to 操作对象存储 with wxcloud CLI scripts.
---

# Deploy WeChat Cloud Run

## Routing

- When the prompt mentions `初始化微信云托管` or `部署微信云托管`, run steps 1 and 2.
- When the prompt mentions `操作对象存储` or `对象存储`, run step 3.
- When the prompt mentions `操作云数据库` or `云数据库`, explain that the default CLI-only template does not include database credentials. Ask for an explicit database SDK setup only if database scripting is required.
- If the backend project directory is ambiguous, inspect the workspace for `package.json`, `Dockerfile`, or framework entry files and choose the most likely backend root. Ask only when multiple choices are equally risky.

## Step 1: Initialize `.wxcloud.env`

Run:

```bash
python3 <skill-dir>/scripts/init_wxcloud_backend.py --project <backend-dir>
```

This script creates or merges:

- `.wxcloud.env` with only non-interactive wxcloud CLI login variables.
- `.gitignore` entries for `.wxcloud.env`, local secret overrides, and generated upload/download scratch files.
- `wxcloud.config.js` for `type: "run"` deployments unless an existing config file is present.

After running it, remind the user to fill in real values before non-interactive CLI login:

- `WX_CLOUD_APP_ID`
- `WX_CLOUD_PRIVATE_KEY`

Pass deployment targets as command arguments instead of storing them in `.wxcloud.env`:

- `--envId` / `-e`
- `--serviceName` / `-s`
- `--port` / `-p`
- `--region` when a storage or environment command needs it

## Step 2: Generate Dockerfile

The same `init_wxcloud_backend.py` script generates a conservative Node.js Dockerfile when none exists. It detects `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`, installs dependencies with the matching package manager, runs `build` when present, and starts via `npm start`, `pnpm start`, `yarn start`, or common server entry files.

If the project is not Node.js, pass explicit values:

```bash
python3 <skill-dir>/scripts/init_wxcloud_backend.py --project <backend-dir> --port 3000 --start-cmd "node server.js"
```

Use the official CLI flow after files are ready:

```bash
npm i -g @wxcloud/cli
wxcloud login
wxcloud deploy -e <env-id> -s <service-name> -p <port>
```

For dry runs:

```bash
wxcloud deploy -e <env-id> -s <service-name> -p <port> --dryRun
```

Read `references/wxcloud-cli.md` when exact CLI command details are needed.

## Step 3: Add Object Storage Operation Script

Run:

```bash
python3 <skill-dir>/scripts/install_data_ops.py --project <backend-dir>
```

This creates `scripts/wxcloud-data.mjs` in the backend project and adds `wxcloud:data` to `package.json` when possible. The generated script reads `.wxcloud.env` for CLI login only and shells out to the official `wxcloud` CLI. It supports:

```bash
npm run wxcloud:data -- login
npm run wxcloud:data -- env:list --region ap-shanghai
npm run wxcloud:data -- storage:upload --local ../web/public/assets --remote /assets --envId <env-id> --region ap-shanghai --concurrency 8
npm run wxcloud:data -- storage:list --prefix /assets --envId <env-id> --region ap-shanghai --json
npm run wxcloud:data -- storage:delete --object assets/example.png --envId <env-id> --region ap-shanghai
npm run wxcloud:data -- storage:delete --prefix assets/old/ --envId <env-id> --region ap-shanghai
npm run wxcloud:data -- storage:purge --envId <env-id> --region ap-shanghai
```

No extra npm package is required. For exact CLI options, read `references/wxcloud-cli.md`.

## Safety

- Never print `.wxcloud.env` secret values in final responses.
- Do not overwrite existing `Dockerfile`, `wxcloud.config.*`, `.wxcloud.env`, or user scripts without an explicit backup or merge.
- Treat real database/storage operations as production-affecting. Use dry-run or list/get operations first when intent is unclear.
