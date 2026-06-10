---
name: deploy-wxcloud-run
description: Initialize, prepare, and operate backend projects for WeChat Cloud Run / 微信云托管. Use when the user says “初始化微信云托管”, “部署微信云托管”, asks to create a .wxcloud.env file, generate a Dockerfile for 微信云托管, prepare wxcloud.config.js, deploy a backend with @wxcloud/cli, or asks to 操作云数据库 / 操作对象存储 with environment-variable-driven scripts.
---

# Deploy WeChat Cloud Run

## Routing

- When the prompt mentions `初始化微信云托管` or `部署微信云托管`, run steps 1 and 2.
- When the prompt mentions `操作云数据库`, `操作对象存储`, `云数据库`, or `对象存储`, run step 3.
- If the backend project directory is ambiguous, inspect the workspace for `package.json`, `Dockerfile`, or framework entry files and choose the most likely backend root. Ask only when multiple choices are equally risky.

## Step 1: Initialize `.wxcloud.env`

Run:

```bash
python3 <skill-dir>/scripts/init_wxcloud_backend.py --project <backend-dir>
```

This script creates or merges:

- `.wxcloud.env` with WeChat Cloud Run, cloud database, and object storage variables.
- `.gitignore` entries for `.wxcloud.env`, local secret overrides, and generated upload/download scratch files.
- `wxcloud.config.js` for `type: "run"` deployments unless an existing config file is present.

After running it, remind the user to fill in real values before deploying or operating cloud resources:

- `WX_CLOUD_ENV_ID`, `WX_CLOUD_SERVICE_NAME`, `WX_CLOUD_PORT`, `WX_CLOUD_REGION`
- `WX_CLOUD_APP_ID`, `WX_CLOUD_PRIVATE_KEY` when non-interactive CLI login is needed
- `TCB_ENV_ID`, `TCB_SECRET_ID`, `TCB_SECRET_KEY`
- `TCB_STORAGE_BUCKET`, `TCB_STORAGE_PREFIX`, `TCB_DATABASE_COLLECTION`

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
wxcloud deploy -e "$WX_CLOUD_ENV_ID" -s "$WX_CLOUD_SERVICE_NAME" -p "$WX_CLOUD_PORT"
```

For dry runs:

```bash
wxcloud deploy -e "$WX_CLOUD_ENV_ID" -s "$WX_CLOUD_SERVICE_NAME" -p "$WX_CLOUD_PORT" --dryRun
```

Read `references/wxcloud-cli.md` when exact CLI command details are needed.

## Step 3: Add Cloud Database / Storage Operation Script

Run:

```bash
python3 <skill-dir>/scripts/install_data_ops.py --project <backend-dir>
```

This creates `scripts/wxcloud-data.mjs` in the backend project and adds `wxcloud:data` to `package.json` when possible. The generated script reads `.wxcloud.env` and supports:

```bash
npm run wxcloud:data -- db:list --collection todos --limit 20
npm run wxcloud:data -- db:get --collection todos --id record-id
npm run wxcloud:data -- db:add --collection todos --json '{"title":"demo"}'
npm run wxcloud:data -- db:update --collection todos --id record-id --json '{"done":true}'
npm run wxcloud:data -- db:delete --collection todos --id record-id
npm run wxcloud:data -- storage:upload --local ./avatar.png --remote uploads/avatar.png
npm run wxcloud:data -- storage:download --remote uploads/avatar.png --local ./tmp/avatar.png
npm run wxcloud:data -- storage:delete --remote uploads/avatar.png
```

The generated script uses `@cloudbase/node-sdk`. If it is missing, install it in the backend project:

```bash
npm i @cloudbase/node-sdk
```

For bulk object storage listing/deleting, prefer the official `wxcloud storage:*` commands documented in `references/wxcloud-cli.md`.

## Safety

- Never print `.wxcloud.env` secret values in final responses.
- Do not overwrite existing `Dockerfile`, `wxcloud.config.*`, `.wxcloud.env`, or user scripts without an explicit backup or merge.
- Treat real database/storage operations as production-affecting. Use dry-run or list/get operations first when intent is unclear.
