# InSeason API

Local Express + SQLite backend for seasonal fruit and vegetable data.

## Scripts

```bash
npm run db:seed --workspace @inseason/api
npm run dev --workspace @inseason/api
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
