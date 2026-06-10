# InSeason API

Local Express + SQLite backend for seasonal fruit and vegetable data.

## Scripts

```bash
npm run db:seed --workspace @inseason/api
npm run dev --workspace @inseason/api
```

## WeChat Cloud Run / 微信云托管

Cloud Run files live in this backend directory:

- `Dockerfile`
- `wxcloud.config.cjs`
- `.wxcloud.env` for local CLI login secrets, not committed

Before deploying, fill real values in `apps/api/.wxcloud.env`:

- `WX_CLOUD_APP_ID`
- `WX_CLOUD_PRIVATE_KEY`

Then deploy from `apps/api`:

```bash
set -a
source .wxcloud.env
set +a
wxcloud login --appId "$WX_CLOUD_APP_ID" --privateKey "$WX_CLOUD_PRIVATE_KEY"
wxcloud deploy -e <env-id> -s <service-name> -p 3001
```

The Docker image seeds `db/inseason.sqlite` during image build from the committed seed JSON files.

Object storage uses the same CLI login. Pass the target environment and region to the command:

```bash
wxcloud storage:upload ../web/public/assets --envId <env-id> --mode storage --remotePath /assets --region ap-shanghai --concurrency 8
wxcloud storage:list /assets --envId <env-id> --mode storage --region ap-shanghai --json
```

### Data enrichment

USDA FoodData Central is used for nutrition candidates. The script writes a
review report by default and only updates seed JSON when `--apply` is passed.

```bash
USDA_FDC_API_KEY=... npm run nutrition:usda --workspace @inseason/api -- --limit=20
USDA_FDC_API_KEY=... npm run nutrition:usda --workspace @inseason/api -- --slugs=pingguo,bocai --apply
```

Unsplash is used only as a reviewed image candidate source. The script records
photo attribution and `downloadLocation` metadata. It does not apply images to
produce records.

```bash
UNSPLASH_ACCESS_KEY=... npm run images:unsplash --workspace @inseason/api -- --missing --limit=20
UNSPLASH_ACCESS_KEY=... npm run images:unsplash --workspace @inseason/api -- --slugs=pingguo,lanmei --download
```

## Endpoints

- `GET /health`
- `GET /api/produce?category=fruit&month=6&q=杨梅`
- `GET /api/produce?category=fruit&month=6&availability=best`
- `GET /api/produce/:slug`
- `GET /api/seasons/:month`

Nutrition fields are stored per 100g edible portion. Month arrays use integers `1-12`.
The `month` filter checks `matureMonths` by default. Pass `availability=best` to filter by `bestMonths`.
