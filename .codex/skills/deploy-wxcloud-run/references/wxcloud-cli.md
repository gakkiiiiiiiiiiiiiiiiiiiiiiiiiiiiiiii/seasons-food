# WeChat Cloud Run CLI Notes

Source: https://cloud.weixin.qq.com/cli/guide and linked command pages, checked on 2026-06-10.

## Install and Login

The CLI package is `@wxcloud/cli` and the binary is `wxcloud`.

```bash
npm i -g @wxcloud/cli
wxcloud login
wxcloud login --appId <微信 AppId> --privateKey <秘钥>
wxcloud logout
```

Most commands require login. CLI keys are generated in the WeChat Cloud Run console settings.

The generated `.wxcloud.env` is intentionally CLI-only:

```bash
WX_CLOUD_APP_ID=
WX_CLOUD_PRIVATE_KEY=
```

Pass deployment and storage targets such as environment ID, service name, port, and region directly to the command that needs them.

## Project Setup

`wxcloud migrate` can identify supported frameworks and generate `Dockerfile` plus `wxcloud.config.js`.

For manual config, supported config files are checked in this priority:

```text
wxcloud.config.cjs
wxcloud.config.js
wxcloud.config.json
```

For backend / Cloud Run services, use `type: "run"` and a server config:

```js
module.exports = {
  type: "run",
  server: {
    port: 3000,
    buildDir: ".",
    versionRemark: "cloudkit"
  }
};
```

## Deploy

Interactive:

```bash
wxcloud deploy
```

Non-interactive:

```bash
wxcloud deploy -e <环境ID> -s <服务名称> -p <端口号>
wxcloud deploy -e <环境ID> -s <服务名称> -p <端口号> --dryRun
```

Options from the docs:

- `-e, --envId`: environment ID
- `-s, --serviceName`: service name
- `-p, --port`: service port, default `3000`
- `--dryRun`: do not execute the actual deployment

## Environments

List environments:

```bash
wxcloud env:list
wxcloud env:list --json
wxcloud env:list --region ap-shanghai
```

Regions documented by the CLI: `ap-shanghai`, `ap-guangzhou`, `ap-beijing`.

## Object Storage

Upload:

```bash
wxcloud storage:upload <PATH> --envId <env-id> --mode storage --remotePath /
```

List:

```bash
wxcloud storage:list <prefix> --envId <env-id> --mode storage --json
```

Delete by object:

```bash
wxcloud storage:delete --envId <env-id> --mode storage -o test.json -o demo/temp.json
```

Delete by prefix:

```bash
wxcloud storage:delete --envId <env-id> --mode storage -p demo/
```

Static storage cache purge:

```bash
wxcloud storage:purge --envId <env-id> --region ap-shanghai
```
