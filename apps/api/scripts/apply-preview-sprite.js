import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const publicDir = path.join(rootDir, 'apps/web/public')
const previewDir = path.join(publicDir, 'assets/preview')
const spriteDir = path.join(previewDir, 'sprites')

const options = parseArgs(process.argv.slice(2))

if (!options.sprite || !options.batch) {
  console.error('Usage: node scripts/apply-preview-sprite.js --batch=01 --sprite=/path/to/sprite.png --items=slug:名称,slug:名称')
  process.exit(1)
}

const items = parseItems(options.items)
if (!items.length || items.length > 16) {
  console.error('--items must contain 1-16 entries formatted as slug:名称')
  process.exit(1)
}

fs.mkdirSync(spriteDir, { recursive: true })
const spriteName = `preview-batch-${options.batch}.png`
const spriteTarget = path.join(spriteDir, spriteName)
fs.copyFileSync(path.resolve(options.sprite), spriteTarget)

const [width, height] = execFileSync('magick', ['identify', '-format', '%w %h', spriteTarget], { encoding: 'utf8' })
  .trim()
  .split(/\s+/)
  .map(Number)
const cellWidth = Math.floor(width / 4)
const cellHeight = Math.floor(height / 4)

items.forEach((item, index) => {
  const column = index % 4
  const row = Math.floor(index / 4)
  const output = path.join(previewDir, `${item.slug}.png`)
  execFileSync('magick', [
    spriteTarget,
    '-crop',
    `${cellWidth}x${cellHeight}+${column * cellWidth}+${row * cellHeight}`,
    '+repage',
    output
  ])
})

const sourceBase = {
  provider: 'OpenAI image generation',
  type: 'ai-generated-illustration-sprite',
  sprite: `/assets/preview/sprites/${spriteName}`,
  generatedAt: new Date().toISOString(),
  reviewed: true,
  reviewNote: 'Accepted from 4x4 AI-generated illustration sprite sheet as list preview image.'
}

let applied = 0
for (const dataPath of [seedPath, extraPath]) {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
  let changed = false

  for (const record of data) {
    const item = items.find(entry => entry.slug === record.slug)
    if (!item) continue
    record.previewImage = `/assets/preview/${record.slug}.png`
    record.previewImageSource = { ...sourceBase, cellName: item.name }
    changed = true
    applied += 1
  }

  if (changed) fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n')
}

const reviewPath = path.join(rootDir, `preview-batch-${options.batch}-review.jpg`)
execFileSync('magick', [
  'montage',
  ...items.map(item => path.join(previewDir, `${item.slug}.png`)),
  '-tile',
  '4x4',
  '-geometry',
  '160x160+10+10',
  '-background',
  '#fffaf1',
  reviewPath
])

console.log(`Copied sprite: ${path.relative(rootDir, spriteTarget)}`)
console.log(`Cut preview images: ${items.length}`)
console.log(`Applied records: ${applied}`)
console.log(`Review sheet: ${reviewPath}`)

function parseArgs(args) {
  return args.reduce((acc, arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    acc[key] = rest.join('=')
    return acc
  }, {})
}

function parseItems(value = '') {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const [slug, ...nameParts] = item.split(':')
      return { slug, name: nameParts.join(':') }
    })
    .filter(item => item.slug && item.name)
}
