import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const outputPath = path.resolve(__dirname, '../data/preview-sprite-manifest.json')
const publicDir = path.join(rootDir, 'apps/web/public')
const spriteDir = path.join(publicDir, 'assets/preview/sprites/generated')
const columns = 4
const rows = 4
const cellSize = 313

const base = JSON.parse(fs.readFileSync(seedPath, 'utf8'))
const extra = fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : []
const items = [...base, ...extra].filter(item => item.previewImage)

fs.mkdirSync(spriteDir, { recursive: true })

const manifest = {}
const spriteCount = Math.ceil(items.length / (columns * rows))

for (let batchIndex = 0; batchIndex < spriteCount; batchIndex += 1) {
  const batch = items.slice(batchIndex * columns * rows, (batchIndex + 1) * columns * rows)
  const spriteName = `produce-preview-${String(batchIndex + 1).padStart(2, '0')}.png`
  const spritePath = path.join(spriteDir, spriteName)
  const sourceArgs = Array.from({ length: columns * rows }, (_, index) => {
    const item = batch[index]
    if (!item) return 'xc:transparent'
    return path.join(publicDir, item.previewImage)
  })

  execFileSync('magick', [
    'montage',
    ...sourceArgs,
    '-tile',
    `${columns}x${rows}`,
    '-geometry',
    `${cellSize}x${cellSize}+0+0`,
    '-background',
    'transparent',
    spritePath
  ])

  batch.forEach((item, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    manifest[item.slug] = {
      src: `/assets/preview/sprites/generated/${spriteName}`,
      columns,
      rows,
      index,
      x: column * cellSize,
      y: row * cellSize,
      width: cellSize,
      height: cellSize,
      sheetWidth: columns * cellSize,
      sheetHeight: rows * cellSize,
      backgroundSize: `${columns * 100}% ${rows * 100}%`,
      backgroundPosition: `${percentage(column, columns)}% ${percentage(row, rows)}%`
    }
  })
}

fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Generated ${spriteCount} preview sprite sheets in ${path.relative(rootDir, spriteDir)}`)
console.log(`Wrote ${Object.keys(manifest).length} preview sprite entries to ${outputPath}`)

function percentage(index, count) {
  if (count <= 1) return 0
  return Number(((index / (count - 1)) * 100).toFixed(4))
}
