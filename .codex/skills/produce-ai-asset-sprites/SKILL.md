---
name: produce-ai-asset-sprites
description: Batch-generate, slice, apply, and validate AI sprite-sheet assets for this seasonal produce app. Use when Codex needs to replace missing produce real-object images, create differentiated list preview illustrations, audit homogeneous produce thumbnails, or update the produce database fields `aiImage` and `previewImage` from 4x4 AI-generated sprite sheets.
---

# Produce AI Asset Sprites

Use this skill for this repository's produce image pipeline. The app has two different asset types:

- `aiImage`: realistic AI-generated fallback images for detail pages when no sourced `realImage` exists. Final cut assets must be transparent PNGs with no white background.
- `previewImage`: AI-generated illustrated thumbnails for list, category, map, and ranking previews. Final cut assets must be transparent PNGs with no white background.

Do not confuse these with the old SVG placeholder generated in `apps/web/src/App.vue`; the goal of this workflow is to replace those placeholders with project assets under `apps/web/public/assets`.

## Workflow

1. Identify the target records from `apps/api/data/produce.seed.json` and `apps/api/data/produce.extra.json`.
2. Generate one strict 4x4 sprite sheet with `image_gen`; list cells left-to-right, top-to-bottom.
3. Inspect the generated sprite visually before applying it. Reject obvious name/subject mismatches, text, labels, plates, baskets, cooked dishes, or repeated same-shape icons.
4. Apply the sprite with the project script:
   - Realistic detail fallback: `npm --prefix apps/api run images:ai:apply-sprite -- --batch=<NN> --sprite=<png> --items='slug:名称,...'`
   - Illustrated preview thumbnail: `npm --prefix apps/api run images:preview:apply-sprite -- --batch=<NN> --sprite=<png> --items='slug:名称,...'`
   - Agnes individual realistic generation: `npm --prefix apps/api run images:ai:agnes -- --mode=real-replacements --concurrency=2`
5. For realistic detail fallback images, convert the cut AI images to transparent PNG:
   - `npm --prefix apps/api run images:ai:transparent-bg`
   - For Agnes outputs, also remove fake checkerboard pixels: `npm --prefix apps/api run images:ai:agnes:clean-bg`
6. For illustrated preview thumbnails, convert the cut preview images to transparent PNG:
   - `npm --prefix apps/api run images:preview:transparent-bg`
7. Run validation and rebuild:
   - `npm --prefix apps/api run data:validate`
   - `npm --prefix apps/api run db:seed`
   - `npm --prefix apps/web run build`
8. If the API server is already running, reseeding is enough. Refresh the browser page to confirm the new image paths render.

For schema details, prompt templates, and command examples, read [references/project-asset-pipeline.md](references/project-asset-pipeline.md).

## Prompt Rules

- For `aiImage`, request realistic product photography isolated on a clean transparent PNG background when possible. If the image generator cannot output transparency in the sprite sheet, use a clean warm off-white studio background that can be removed by the project's transparent-background script.
- For `previewImage`, request hand-drawn pastel food illustration with unique silhouettes and varied palettes, isolated on transparent background when possible.
- Always say: no text, no Chinese characters, no labels, no numbers, no borders, no watermarks.
- Keep every subject fully visible with generous padding inside each grid cell.
- Use partial 4x4 sheets for fewer than 16 items; unused cells should be empty warm off-white background.
- State that the grid order is left-to-right, top-to-bottom and make the `--items` order identical.
- For `aiImage`, final per-item files under `apps/web/public/assets/ai-real/` must remain PNG files with alpha transparency, not JPEGs and not opaque PNGs.
- For `previewImage`, final per-item files under `apps/web/public/assets/preview/` must remain PNG files with alpha transparency, not JPEGs and not opaque PNGs.

## Validation Criteria

Before final response, confirm:

- `data:validate` reports `Errors: 0`.
- `Duplicate AI refs` and `Duplicate preview refs` are `0`.
- AI fallback files produced in the batch have alpha transparency after `images:ai:transparent-bg`.
- Preview files produced in the batch have alpha transparency after `images:preview:transparent-bg`.
- `db:seed` succeeds.
- `build` succeeds if frontend data or rendering changed.
- The generated review sheet path exists, e.g. `preview-batch-07-review.jpg`.
