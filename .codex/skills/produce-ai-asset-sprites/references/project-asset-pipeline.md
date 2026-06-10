# Project Asset Pipeline Reference

## Data Fields

- `realImage`: sourced photo path. Do not overwrite with AI images.
- `aiImage`: realistic AI-generated detail-page fallback under `/assets/ai-real/<slug>-ai.png`; final files must be transparent PNGs with no white background.
- `aiImageSource`: JSON source metadata for `aiImage`.
- `previewImage`: AI-generated illustrated preview under `/assets/preview/<slug>.png`; final files must be transparent PNGs with no white background.
- `previewImageSource`: JSON source metadata for `previewImage`.

The API maps these fields in `apps/api/src/repository.js`. The frontend uses `previewImage` before the generated SVG placeholder in `normalizeProduce()` inside `apps/web/src/App.vue`.

## Project Scripts

List records still missing realistic fallback images:

```bash
npm --prefix apps/api run images:ai:missing -- --batch-size=16
```

Apply a realistic AI sprite sheet:

```bash
npm --prefix apps/api run images:ai:apply-sprite -- \
  --batch=07 \
  --sprite="/absolute/path/to/generated.png" \
  --items='slug-a:名称A,slug-b:名称B'
```

Generate individual realistic AI images with Agnes for records that still use `realImage`:

```bash
npm --prefix apps/api run images:ai:agnes -- --mode=real-replacements --concurrency=2
```

Regenerate one item, for example after visual mismatch:

```bash
npm --prefix apps/api run images:ai:agnes -- --mode=real-replacements --slug=lianwu --overwrite=true --concurrency=1
```

Remove white backgrounds from AI realistic cut images and keep PNG alpha:

```bash
npm --prefix apps/api run images:ai:transparent-bg
npm --prefix apps/api run images:ai:agnes:clean-bg
```

Apply an illustrated preview sprite sheet:

```bash
npm --prefix apps/api run images:preview:apply-sprite -- \
  --batch=07 \
  --sprite="/absolute/path/to/generated.png" \
  --items='slug-a:名称A,slug-b:名称B'
```

Remove white backgrounds from illustrated preview cut images and keep PNG alpha:

```bash
npm --prefix apps/api run images:preview:transparent-bg
```

Validate, seed, and build:

```bash
npm --prefix apps/api run data:validate
npm --prefix apps/api run db:seed
npm --prefix apps/web run build
```

## Output Locations

- Realistic sprite sheets: `apps/web/public/assets/ai-real/sprites/ai-real-batch-<NN>.png`
- Realistic cut images: `apps/web/public/assets/ai-real/<slug>-ai.png`
- Realistic review sheets: `ai-real-batch-<NN>-review.jpg`
- Preview sprite sheets: `apps/web/public/assets/preview/sprites/preview-batch-<NN>.png`
- Preview cut images: `apps/web/public/assets/preview/<slug>.png`
- Preview review sheets: `preview-batch-<NN>-review.jpg`

## Prompt Template: Realistic Detail Fallback

```text
Use case: photorealistic-natural
Asset type: 4x4 sprite sheet of database fallback real-object images for a seasonal produce app
Primary request: Create one square transparent PNG sprite sheet with a strict 4 by 4 grid. Each cell contains exactly one realistic product photo subject, isolated as a cutout on transparent background whenever possible. If transparency is not supported for the sheet, use a clean warm off-white studio background that is easy to remove. No text, no labels, no numbers, no borders, no watermarks. Keep every subject fully visible with generous padding inside its cell.
Grid order, left to right, top to bottom:
1. 名称 / English: concrete visual description.
...
Style: realistic food photography, soft diffuse daylight, natural color, crisp detail, catalog-like clarity.
Background requirement: final per-item outputs must be transparent PNG cutouts with no white background. Avoid shadows or white floor patches that attach to the subject.
Avoid globally: text, Chinese characters, labels, plates, bowls, baskets, hands, knives, cutting boards, cooked food, mixed ingredients, decorative props, cartoon, illustration, SVG style, opaque white background.
```

## Prompt Template: Illustrated Preview

```text
Use case: illustration-story
Asset type: 4x4 sprite sheet of preview illustrations for a seasonal produce mobile app
Primary request: Create one square transparent PNG sprite sheet with a strict 4 by 4 grid. Each cell contains one distinct hand-drawn pastel produce illustration based on realistic produce characteristics, designed for app list preview thumbnails. No text, no labels, no numbers, no borders, no watermarks. Each illustration should have a unique silhouette and color palette, avoiding same-shape repetition. Keep subject fully visible with generous padding, isolated on transparent background whenever possible. If transparency is not supported for the sheet, use a very light warm off-white background that is easy to remove.
Visual style: refined soft marker and watercolor food illustration, clean contour lines, subtle paper texture, pastel but varied colors, playful yet accurate, no photorealism.
Grid order, left to right, top to bottom:
1. 名称: concrete visual description.
...
Background requirement: final per-item outputs must be transparent PNG cutouts with no white background.
Avoid globally: text, Chinese characters, labels, logos, realistic photos, plates, bowls, baskets, hands, knives, identical icon template, opaque white background.
```

## Choosing Items

For `aiImage`, target records with neither `realImage` nor `aiImage`.

For `previewImage`, target visually homogeneous groups first:

- Fruit: `citrus`, `pome`, `berry`, `melon`, `stone-fruit`, `tropical`.
- Vegetable: `leafy-green`, `pod`, `stem`, `tuber`, `aquatic`, `mushroom`, `herb`.

Prefer replacing an entire visually similar group rather than one item at a time.

## Gotchas

- The generated image tool saves to `/Users/pangyujie/.codex/generated_images/...`; copy the latest file into the project via the apply scripts rather than referencing the generated path directly.
- Batch numbers are just filenames. Use the next unused `preview-batch-<NN>` or `ai-real-batch-<NN>` number.
- The apply scripts assume a 4-column grid and crop cells by equal width/height.
- After applying an `aiImage` sprite, always run `npm --prefix apps/api run images:ai:transparent-bg`; it removes edge-connected white/off-white backgrounds while preserving white produce subjects conservatively.
- After Agnes generation, run both `images:ai:transparent-bg` and `images:ai:agnes:clean-bg`; Agnes may render fake transparent checkerboard pixels that must be removed from the final PNG.
- After applying a `previewImage` sprite, always run `npm --prefix apps/api run images:preview:transparent-bg`; it removes edge-connected white/off-white backgrounds while preserving inner highlights and strokes conservatively.
- If a generated sprite has a bad cell, regenerate the whole sheet or create a smaller partial sheet for only the failed records.
- Do not write API keys or generated prompt secrets into `.env` examples or final responses.
