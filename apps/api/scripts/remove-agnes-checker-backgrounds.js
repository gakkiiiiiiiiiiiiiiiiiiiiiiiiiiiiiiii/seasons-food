import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const aiDir = path.join(rootDir, 'apps/web/public/assets/ai-real')
const dryRun = process.argv.includes('--dry-run')

const records = [
  ...JSON.parse(fs.readFileSync(seedPath, 'utf8')),
  ...(fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : []),
]

const targets = records
  .filter(item => item.aiImageSource?.provider === 'Agnes AI' && item.aiImage)
  .map(item => ({
    slug: item.slug,
    name: item.name,
    file: path.join(aiDir, `${item.slug}-ai.png`),
  }))

console.log(`Agnes AI images: ${targets.length}`)

let processed = 0
let transparent = 0

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    console.warn(`Missing ${target.slug}: ${target.file}`)
    continue
  }

  if (dryRun) {
    console.log(`${target.slug}\t${target.name}`)
    continue
  }

  const tempPath = path.join(aiDir, `.${target.slug}-checker-clean.tmp.png`)
  execFileSync('magick', [
    target.file,
    '-alpha',
    'set',
    '-channel',
    'A',
    '-fx',
    '((r>0.78&&g>0.78&&b>0.78&&abs(r-g)<0.055&&abs(r-b)<0.055&&abs(g-b)<0.055)?0:a)',
    '+channel',
    tempPath,
  ])
  fs.renameSync(tempPath, target.file)
  processed += 1

  const metadata = execFileSync('magick', ['identify', '-format', '%[channels] opaque=%[opaque]', target.file], { encoding: 'utf8' })
  if (metadata.includes('opaque=False')) transparent += 1
  console.log(`${target.slug}\t${target.name}\t${metadata}`)
}

if (!dryRun) {
  console.log(`\nDone. Processed ${processed}; transparent ${transparent}.`)
}
