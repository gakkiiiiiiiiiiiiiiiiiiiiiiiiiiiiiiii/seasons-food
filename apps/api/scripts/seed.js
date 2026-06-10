import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDatabase } from '../src/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.resolve(__dirname, '../db/inseason.sqlite')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraSeedPath = path.resolve(__dirname, '../data/produce.extra.json')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = openDatabase(dbPath)
const baseSeed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const extraSeed = fs.existsSync(extraSeedPath)
  ? JSON.parse(fs.readFileSync(extraSeedPath, 'utf8'))
  : []
const seenSlugs = new Set()
const seed = [...baseSeed, ...extraSeed].filter(item => {
  if (seenSlugs.has(item.slug)) return false
  seenSlugs.add(item.slug)
  return true
})

db.exec(`
  DROP TABLE IF EXISTS nutrition;
  DROP TABLE IF EXISTS produce;

  CREATE TABLE produce (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    english_name TEXT NOT NULL,
    aliases TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('fruit', 'vegetable')),
    sub_category TEXT NOT NULL,
    region_notes TEXT NOT NULL,
    real_image TEXT NOT NULL,
    image_source TEXT NOT NULL,
    preview_image TEXT NOT NULL,
    preview_image_source TEXT NOT NULL,
    ai_image TEXT NOT NULL,
    ai_image_source TEXT NOT NULL,
    mature_months TEXT NOT NULL,
    best_months TEXT NOT NULL,
    regional_seasons TEXT NOT NULL,
    season_terms TEXT NOT NULL,
    storage_days INTEGER NOT NULL,
    taste_tags TEXT NOT NULL,
    benefit_tags TEXT NOT NULL,
    varieties TEXT NOT NULL,
    best_use TEXT NOT NULL,
    selection_tips TEXT NOT NULL,
    source_refs TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produce_id INTEGER NOT NULL UNIQUE,
    energy_kcal REAL NOT NULL,
    carbohydrate_g REAL NOT NULL,
    fiber_g REAL NOT NULL,
    protein_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    vitamin_c_mg REAL NOT NULL,
    potassium_mg REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'null',
    basis TEXT NOT NULL DEFAULT 'per 100g edible portion',
    FOREIGN KEY (produce_id) REFERENCES produce(id) ON DELETE CASCADE
  );

  CREATE INDEX idx_produce_category ON produce(category);
`)

const insertProduce = db.prepare(`
  INSERT INTO produce (
    slug,
    name,
    english_name,
    aliases,
    category,
    sub_category,
    region_notes,
    real_image,
    image_source,
    preview_image,
    preview_image_source,
    ai_image,
    ai_image_source,
    mature_months,
    best_months,
    regional_seasons,
    season_terms,
    storage_days,
    taste_tags,
    benefit_tags,
    varieties,
    best_use,
    selection_tips,
    source_refs
  ) VALUES (
    @slug,
    @name,
    @englishName,
    @aliases,
    @category,
    @subCategory,
    @regionNotes,
    @realImage,
    @imageSource,
    @previewImage,
    @previewImageSource,
    @aiImage,
    @aiImageSource,
    @matureMonths,
    @bestMonths,
    @regionalSeasons,
    @seasonTerms,
    @storageDays,
    @tasteTags,
    @benefitTags,
    @varieties,
    @bestUse,
    @selectionTips,
    @sourceRefs
  )
`)

const insertNutrition = db.prepare(`
  INSERT INTO nutrition (
    produce_id,
    energy_kcal,
    carbohydrate_g,
    fiber_g,
    protein_g,
    fat_g,
    vitamin_c_mg,
    potassium_mg,
    source
  ) VALUES (
    @produceId,
    @energyKcal,
    @carbohydrateG,
    @fiberG,
    @proteinG,
    @fatG,
    @vitaminCMg,
    @potassiumMg,
    @source
  )
`)

const insertAll = db.transaction(items => {
  for (const item of items) {
    const result = insertProduce.run({
      ...item,
      aliases: JSON.stringify(item.aliases || []),
      realImage: item.realImage || '',
      imageSource: JSON.stringify(item.imageSource || null),
      previewImage: item.previewImage || '',
      previewImageSource: JSON.stringify(item.previewImageSource || null),
      aiImage: item.aiImage || '',
      aiImageSource: JSON.stringify(item.aiImageSource || null),
      matureMonths: JSON.stringify(item.matureMonths),
      bestMonths: JSON.stringify(item.bestMonths),
      regionalSeasons: JSON.stringify(item.regionalSeasons || []),
      seasonTerms: JSON.stringify(item.seasonTerms || []),
      tasteTags: JSON.stringify(item.tasteTags),
      benefitTags: JSON.stringify(item.benefitTags),
      varieties: JSON.stringify(item.varieties || []),
      sourceRefs: JSON.stringify(item.sourceRefs)
    })
    insertNutrition.run({
      produceId: result.lastInsertRowid,
      ...item.nutritionPer100g,
      source: JSON.stringify(item.nutritionSource || null)
    })
  }
})

insertAll(seed)

const counts = db.prepare('SELECT category, COUNT(*) as count FROM produce GROUP BY category').all()
console.log(`Seeded ${seed.length} produce records into ${dbPath}`)
console.table(counts)
