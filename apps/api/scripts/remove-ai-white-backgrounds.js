import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../../..')
const aiRealDir = path.resolve(repoRoot, 'apps/web/public/assets/ai-real')

const fuzz = process.argv.find(arg => arg.startsWith('--fuzz='))?.split('=')[1] || '7%'
const dryRun = process.argv.includes('--dry-run')

function runMagick(args, options = {}) {
  return execFileSync('magick', args, {
    encoding: 'utf8',
    stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
  })
}

function identify(filePath) {
  return runMagick(['identify', '-format', '%[channels] opaque=%[opaque] %wx%h', filePath]).trim()
}

if (!fs.existsSync(aiRealDir)) {
  throw new Error(`AI real image directory not found: ${aiRealDir}`)
}

const files = fs
  .readdirSync(aiRealDir)
  .filter(file => file.endsWith('-ai.png'))
  .sort()

console.log(`AI real images: ${files.length}`)
console.log(`Mode: ${dryRun ? 'dry run' : 'write transparent PNGs'}, fuzz=${fuzz}`)

let processed = 0
let transparent = 0

for (const file of files) {
  const sourcePath = path.join(aiRealDir, file)
  const tempPath = path.join(aiRealDir, `.${file}.tmp.png`)

  if (dryRun) {
    console.log(`${file}\t${identify(sourcePath)}`)
    continue
  }

  try {
    runMagick(
      [
        sourcePath,
        '-alpha',
        'set',
        '-bordercolor',
        'white',
        '-border',
        '1',
        '-fuzz',
        fuzz,
        '-fill',
        'none',
        '-draw',
        'color 0,0 floodfill',
        '-shave',
        '1x1',
        tempPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )

    fs.renameSync(tempPath, sourcePath)
    processed += 1

    const metadata = identify(sourcePath)
    if (metadata.includes('opaque=False')) {
      transparent += 1
    }
    console.log(`${file}\t${metadata}`)
  } catch (error) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    console.error(`Failed: ${file}`)
    throw error
  }
}

if (!dryRun) {
  console.log(`\nDone. Processed ${processed} files; ${transparent} now contain transparent pixels.`)
}
