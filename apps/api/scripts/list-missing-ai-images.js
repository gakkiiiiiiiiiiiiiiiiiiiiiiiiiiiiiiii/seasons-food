import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')

const batchSize = Number(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || 16)
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'missing-real-fallback'
const base = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const extra = fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : []
const records = [...base, ...extra]
const missing = records.filter(item => {
  if (mode === 'real-replacements') return Boolean(item.realImage) && !item.aiImage
  if (mode === 'all-missing-ai') return !item.aiImage
  return !item.realImage && !item.aiImage
})

const labels = {
  'missing-real-fallback': 'Missing real+AI images',
  'real-replacements': 'Real-image records still needing AI replacements',
  'all-missing-ai': 'Records still missing AI images',
}

console.log(`${labels[mode] || labels['missing-real-fallback']}: ${missing.length}`)

for (let index = 0; index < missing.length; index += batchSize) {
  const batch = missing.slice(index, index + batchSize)
  const batchNumber = Math.floor(index / batchSize) + 1
  console.log(`\nBatch ${batchNumber}`)
  for (const item of batch) {
    console.log(`${item.slug}\t${item.name}\t${item.category}\t${item.subCategory}`)
  }
}
