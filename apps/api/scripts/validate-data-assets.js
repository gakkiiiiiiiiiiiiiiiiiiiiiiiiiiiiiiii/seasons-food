import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const reportPath = path.resolve(__dirname, '../data/produce-asset-audit.json')

const base = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const extra = fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : []
const all = [...base, ...extra]

const errors = []
const warnings = []
const realImageRefs = new Map()
const aiImageRefs = new Map()
const previewImageRefs = new Map()
const imageHashes = new Map()
const manualMismatchNotes = {
  bocai: '熟菜/菜品图，不是菠菜实物主体。',
  xiancai: '主体不清且疑似非苋菜实物。',
  lianou: '餐桌菜品图，不适合作为莲藕实物图。',
  jiucai: '熟菜图，不是韭菜实物主体。',
  cong: '图片主体为金针菇，不是小葱。',
  jiaobai: '图片主体为彩椒/番茄，不是茭白。',
  oujian: '图片主体为粗短莲藕节，不是藕尖/藕带实物。',
  qingjiao: '图片主体为红色甜椒，不是青椒。'
}

for (const item of all) {
  validateRecord(item)
  if (!item.realImage) continue

  pushMap(realImageRefs, item.realImage, item.name)
  const absoluteImagePath = path.join(rootDir, 'apps/web/public', item.realImage)
  if (!fs.existsSync(absoluteImagePath)) {
    errors.push(`${item.slug}: real image file missing ${item.realImage}`)
    continue
  }
  const hash = crypto.createHash('sha1').update(fs.readFileSync(absoluteImagePath)).digest('hex')
  pushMap(imageHashes, hash, {
    name: item.name,
    slug: item.slug,
    realImage: item.realImage
  })
}

for (const item of all) {
  if (!item.aiImage) continue
  pushMap(aiImageRefs, item.aiImage, item.name)
  const absoluteImagePath = path.join(rootDir, 'apps/web/public', item.aiImage)
  if (!fs.existsSync(absoluteImagePath)) {
    errors.push(`${item.slug}: AI image file missing ${item.aiImage}`)
  }
}

for (const item of all) {
  if (!item.previewImage) continue
  pushMap(previewImageRefs, item.previewImage, item.name)
  const absoluteImagePath = path.join(rootDir, 'apps/web/public', item.previewImage)
  if (!fs.existsSync(absoluteImagePath)) {
    errors.push(`${item.slug}: preview image file missing ${item.previewImage}`)
  }
}

const duplicateRealRefs = [...realImageRefs.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([realImage, names]) => ({ realImage, names }))

const duplicateAiRefs = [...aiImageRefs.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([aiImage, names]) => ({ aiImage, names }))

const duplicatePreviewRefs = [...previewImageRefs.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([previewImage, names]) => ({ previewImage, names }))

const duplicateImageHashes = [...imageHashes.values()]
  .filter(items => items.length > 1)

const missingRealImages = all
  .filter(item => !item.realImage)
  .map(item => ({
    slug: item.slug,
    name: item.name,
    category: item.category,
    subCategory: item.subCategory
  }))

const manualMismatches = all
  .filter(item => manualMismatchNotes[item.slug])
  .map(item => ({
    slug: item.slug,
    name: item.name,
    status: item.realImage ? 'still_has_real_image' : 'removed_from_display',
    note: manualMismatchNotes[item.slug]
  }))

for (const group of duplicateRealRefs) {
  warnings.push(`duplicate realImage ref ${group.realImage}: ${group.names.join(' / ')}`)
}

for (const group of duplicateImageHashes) {
  warnings.push(`duplicate image bytes: ${group.map(item => `${item.name}(${item.realImage})`).join(' / ')}`)
}

const report = {
  generatedAt: new Date().toISOString(),
  total: all.length,
  byCategory: countBy(all, item => item.category),
  bySubCategory: countBy(all, item => `${item.category}:${item.subCategory}`),
  realImageCoverage: {
    withRealImage: all.length - missingRealImages.length,
    missingRealImage: missingRealImages.length,
    coverageRate: Number(((all.length - missingRealImages.length) / all.length).toFixed(3))
  },
  aiImageCoverage: {
    withAiImage: [...aiImageRefs.keys()].length,
    missingAiImage: all.length - [...aiImageRefs.keys()].length,
    coverageRate: Number(([...aiImageRefs.keys()].length / all.length).toFixed(3))
  },
  previewImageCoverage: {
    withPreviewImage: [...previewImageRefs.keys()].length,
    missingPreviewImage: all.length - [...previewImageRefs.keys()].length,
    coverageRate: Number(([...previewImageRefs.keys()].length / all.length).toFixed(3))
  },
  missingRealImages,
  duplicateRealRefs,
  duplicateAiRefs,
  duplicatePreviewRefs,
  duplicateImageHashes,
  manualMismatches,
  errors,
  warnings
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(`Validated ${all.length} records.`)
console.log(`Real image coverage: ${report.realImageCoverage.withRealImage}/${all.length}`)
console.log(`Missing real images: ${missingRealImages.length}`)
console.log(`Duplicate real refs: ${duplicateRealRefs.length}`)
console.log(`AI image coverage: ${report.aiImageCoverage.withAiImage}/${all.length}`)
console.log(`Duplicate AI refs: ${duplicateAiRefs.length}`)
console.log(`Preview image coverage: ${report.previewImageCoverage.withPreviewImage}/${all.length}`)
console.log(`Duplicate preview refs: ${duplicatePreviewRefs.length}`)
console.log(`Duplicate image hashes: ${duplicateImageHashes.length}`)
console.log(`Errors: ${errors.length}`)
console.log(`Warnings: ${warnings.length}`)
console.log(`Wrote ${reportPath}`)

if (errors.length) process.exitCode = 1

function validateRecord(item) {
  for (const key of ['slug', 'name', 'englishName', 'category', 'subCategory', 'regionNotes', 'bestUse', 'selectionTips']) {
    if (!item[key]) errors.push(`${item.slug || item.name}: missing ${key}`)
  }
  if (item.aliases && !Array.isArray(item.aliases)) errors.push(`${item.slug}: aliases must be an array`)
  if (!['fruit', 'vegetable'].includes(item.category)) errors.push(`${item.slug}: invalid category ${item.category}`)
  validateMonths(item, 'matureMonths')
  validateMonths(item, 'bestMonths')
  if (Array.isArray(item.bestMonths) && Array.isArray(item.matureMonths) && !item.bestMonths.every(month => item.matureMonths.includes(month))) {
    errors.push(`${item.slug}: bestMonths outside matureMonths`)
  }
  for (const key of ['energyKcal', 'carbohydrateG', 'fiberG', 'proteinG', 'fatG', 'vitaminCMg', 'potassiumMg']) {
    if (!Number.isFinite(Number(item.nutritionPer100g?.[key]))) errors.push(`${item.slug}: invalid nutrition ${key}`)
  }
  if (!Array.isArray(item.regionalSeasons) || !item.regionalSeasons.length) warnings.push(`${item.slug}: missing regionalSeasons`)
}

function validateMonths(item, key) {
  if (!Array.isArray(item[key]) || !item[key].length) {
    errors.push(`${item.slug}: invalid ${key}`)
    return
  }
  for (const month of item[key]) {
    if (!Number.isInteger(month) || month < 1 || month > 12) errors.push(`${item.slug}: ${key} out of range ${month}`)
  }
}

function pushMap(map, key, value) {
  if (!map.has(key)) map.set(key, [])
  map.get(key).push(value)
}

function countBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
}
