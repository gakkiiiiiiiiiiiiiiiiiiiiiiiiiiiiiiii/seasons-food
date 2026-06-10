import { parseJson } from './db.js'
import previewSpriteManifest from '../data/preview-sprite-manifest.json' with { type: 'json' }

const selectProduceSql = `
  SELECT
    p.*,
    n.energy_kcal,
    n.carbohydrate_g,
    n.fiber_g,
    n.protein_g,
    n.fat_g,
    n.vitamin_c_mg,
    n.potassium_mg,
    n.source as nutrition_source
  FROM produce p
  LEFT JOIN nutrition n ON n.produce_id = p.id
`

function mapProduce(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    englishName: row.english_name,
    aliases: parseJson(row.aliases, []),
    category: row.category,
    subCategory: row.sub_category,
    regionNotes: row.region_notes,
    realImage: row.real_image,
    imageSource: parseJson(row.image_source, null),
    previewImage: row.preview_image,
    previewImageSource: parseJson(row.preview_image_source, null),
    previewSprite: previewSpriteManifest[row.slug] || null,
    aiImage: row.ai_image,
    aiImageSource: parseJson(row.ai_image_source, null),
    matureMonths: parseJson(row.mature_months, []),
    bestMonths: parseJson(row.best_months, []),
    regionalSeasons: parseJson(row.regional_seasons, []),
    seasonTerms: parseJson(row.season_terms, []),
    storageDays: row.storage_days,
    tasteTags: parseJson(row.taste_tags, []),
    benefitTags: parseJson(row.benefit_tags, []),
    varieties: parseJson(row.varieties, []),
    nutritionPer100g: {
      energyKcal: row.energy_kcal,
      carbohydrateG: row.carbohydrate_g,
      fiberG: row.fiber_g,
      proteinG: row.protein_g,
      fatG: row.fat_g,
      vitaminCMg: row.vitamin_c_mg,
      potassiumMg: row.potassium_mg
    },
    nutritionSource: parseJson(row.nutrition_source, null),
    bestUse: row.best_use,
    selectionTips: row.selection_tips,
    sourceRefs: parseJson(row.source_refs, [])
  }
}

export function listProduce(db, filters = {}) {
  const clauses = []
  const params = {}

  if (filters.category && filters.category !== 'all') {
    clauses.push('p.category = @category')
    params.category = filters.category
  }

  if (filters.month) {
    const monthColumn = filters.availability === 'best' ? 'p.best_months' : 'p.mature_months'
    const regionalMonthColumn = filters.availability === 'best' ? 'bestMonths' : 'months'
    if (filters.region) {
      clauses.push(`(
        EXISTS (
          SELECT 1
          FROM json_each(p.regional_seasons) region,
               json_each(json_extract(region.value, '$.${regionalMonthColumn}')) month
          WHERE json_extract(region.value, '$.region') = @region
            AND month.value = @month
        )
        OR (
          NOT EXISTS (
            SELECT 1
            FROM json_each(p.regional_seasons) region
            WHERE json_extract(region.value, '$.region') = @region
          )
          AND EXISTS (SELECT 1 FROM json_each(${monthColumn}) WHERE value = @month)
        )
      )`)
      params.region = filters.region
    } else {
      clauses.push(`EXISTS (SELECT 1 FROM json_each(${monthColumn}) WHERE value = @month)`)
    }
    params.month = Number(filters.month)
  }

  if (filters.q) {
    const rawQuery = String(filters.q).trim()
    clauses.push(`(
      p.name LIKE @q OR
      p.english_name LIKE @q OR
      p.aliases LIKE @q OR
      p.varieties LIKE @q OR
      p.taste_tags LIKE @q OR
      p.benefit_tags LIKE @q
    )`)
    params.rawQ = rawQuery
    params.aliasExactQ = `%"${rawQuery}"%`
    params.q = `%${rawQuery}%`
  }

  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
  const order = filters.q
    ? ` ORDER BY
      CASE
        WHEN p.name = @rawQ THEN 0
        WHEN p.aliases LIKE @aliasExactQ THEN 1
        WHEN p.name LIKE @q THEN 2
        WHEN p.aliases LIKE @q THEN 3
        WHEN p.varieties LIKE @q THEN 4
        ELSE 5
      END,
      p.category,
      p.name`
    : ' ORDER BY p.category, p.name'
  return db.prepare(selectProduceSql + where + order).all(params).map(mapProduce)
}

export function getProduceBySlug(db, slug) {
  const row = db.prepare(`${selectProduceSql} WHERE p.slug = ?`).get(slug)
  return row ? mapProduce(row) : null
}

export function getSeasonSummary(db, month) {
  const rows = db.prepare(`
    SELECT
      category,
      COUNT(*) as mature_count,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM json_each(best_months) WHERE value = ?) THEN 1 ELSE 0 END) as best_count
    FROM produce
    WHERE EXISTS (SELECT 1 FROM json_each(mature_months) WHERE value = ?)
    GROUP BY category
  `).all(Number(month), Number(month))

  return {
    month: Number(month),
    counts: rows.reduce((acc, row) => {
      acc[row.category] = {
        mature: row.mature_count,
        best: row.best_count
      }
      return acc
    }, {})
  }
}
