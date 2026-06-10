import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const publicDir = path.join(rootDir, 'apps/web/public')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const dryRun = process.argv.includes('--dry-run')

const records = [
  ...JSON.parse(fs.readFileSync(seedPath, 'utf8')),
  ...(fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : []),
]

const targets = records
  .flatMap(item => (item.varieties || [])
    .filter(variety => variety.imageSource?.provider === 'Agnes AI' && variety.image)
    .map(variety => ({
      slug: item.slug,
      name: item.name,
      variety: variety.name,
      file: path.join(publicDir, variety.image.replace(/^\//, '')),
    })))

console.log(`Agnes variety images: ${targets.length}`)

let processed = 0
let transparent = 0

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    console.warn(`Missing ${target.slug} ${target.variety}: ${target.file}`)
    continue
  }

  if (dryRun) {
    console.log(`${target.slug}\t${target.name}\t${target.variety}`)
    continue
  }

  const tempPath = path.join(path.dirname(target.file), `.${path.basename(target.file, '.png')}-checker-clean.tmp.png`)
  execFileSync('magick', [
    target.file,
    '-alpha',
    'set',
    '-channel',
    'A',
    '-fx',
    '((r>0.72&&g>0.72&&b>0.72&&abs(r-g)<0.075&&abs(r-b)<0.075&&abs(g-b)<0.075)?0:a)',
    '+channel',
    tempPath,
  ])
  fs.renameSync(tempPath, target.file)
  processed += 1

  const metadata = execFileSync('magick', ['identify', '-format', '%[channels] opaque=%[opaque]', target.file], { encoding: 'utf8' })
  if (metadata.includes('opaque=False')) transparent += 1
  console.log(`${target.slug}\t${target.variety}\t${metadata}`)
}

if (!dryRun) {
  console.log(`\nDone. Processed ${processed}; transparent ${transparent}.`)
}
