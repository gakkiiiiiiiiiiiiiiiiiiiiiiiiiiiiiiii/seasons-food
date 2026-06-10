import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './load-env.js'

loadEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const publicDir = path.join(rootDir, 'apps/web/public')
const outputDir = path.join(publicDir, 'assets/season-bg')
const sourceDir = path.join(rootDir, 'apps/api/generated/season-bg/agnes-source')

const options = parseArgs(process.argv.slice(2))
const apiKey = process.env.AGNES_API_KEY
const model = options.model || 'agnes-image-2.1-flash'
const size = options.size || '1024x768'
const overwrite = options.overwrite === 'true' || options.overwrite === true
const dryRun = options['dry-run'] === 'true' || options['dry-run'] === true
const monthFilter = new Set(String(options.months || options.month || '').split(',').map(value => Number(value.trim())).filter(Boolean))

const months = [
  { month: 1, term: '小寒', key: 'winter', palette: 'mist blue and warm grey only', motif: 'one small snowflake beside a bare branch' },
  { month: 2, term: '立春', key: 'spring', palette: 'soft leaf green and pale peach only', motif: 'one new sprout with two leaves' },
  { month: 3, term: '惊蛰', key: 'spring', palette: 'soft leaf green and mist blue only', motif: 'one sprout with three tiny rain drops' },
  { month: 4, term: '清明', key: 'spring', palette: 'tea green and pale cyan only', motif: 'one willow twig with a single rain curve' },
  { month: 5, term: '立夏', key: 'summer', palette: 'lotus green and pale aqua only', motif: 'one lotus leaf on two water ripple lines' },
  { month: 6, term: '芒种', key: 'summer', palette: 'rice green and pale wheat beige only', motif: 'two wheat awns and one simple field wave' },
  { month: 7, term: '小暑', key: 'summer', palette: 'cool aqua and melon green only', motif: 'one simple melon slice with one breeze line' },
  { month: 8, term: '立秋', key: 'autumn', palette: 'sage green and light amber only', motif: 'one falling leaf and one soft breeze arc' },
  { month: 9, term: '白露', key: 'autumn', palette: 'pear beige and muted green only', motif: 'one pear leaf with two dew drops' },
  { month: 10, term: '寒露', key: 'autumn', palette: 'soft persimmon orange and warm tan only', motif: 'one small persimmon and two dew drops' },
  { month: 11, term: '立冬', key: 'winter', palette: 'frost blue and warm grey only', motif: 'one thin frost branch and one pale circle' },
  { month: 12, term: '大雪', key: 'winter', palette: 'snow blue and pale lavender only', motif: 'one large soft snowflake and one tiny berry stem' },
]

if (!apiKey && !dryRun) {
  console.error('Missing AGNES_API_KEY. Add it to .env or the shell environment.')
  process.exit(1)
}

fs.mkdirSync(outputDir, { recursive: true })
fs.mkdirSync(sourceDir, { recursive: true })

const targets = months.filter(item => !monthFilter.size || monthFilter.has(item.month))
console.log(`Season backgrounds: ${targets.length}/${months.length}`)
console.log(`Model: ${model}, size=${size}, overwrite=${overwrite}`)

if (dryRun) {
  for (const item of targets) console.log(`${item.month}\t${item.term}\t${item.key}`)
  process.exit(0)
}

let completed = 0
let skipped = 0
let failed = 0
const failures = []

for (const item of targets) {
  const outputPath = path.join(outputDir, `${String(item.month).padStart(2, '0')}-${slugify(item.term)}.png`)
  if (!overwrite && fs.existsSync(outputPath)) {
    skipped += 1
    console.log(`[skip] ${item.month} ${item.term}`)
    continue
  }

  try {
    await generateOne(item, outputPath)
    completed += 1
    console.log(`[${completed}/${targets.length}] ${item.month} ${item.term}`)
  } catch (error) {
    failed += 1
    failures.push({ month: item.month, term: item.term, message: error.message })
    console.error(`[failed] ${item.month} ${item.term}: ${error.message}`)
  }
}

console.log(`\nDone. Generated ${completed}; skipped ${skipped}; failed ${failed}.`)
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2))
  process.exitCode = 1
}

async function generateOne(item, outputPath) {
  const prompt = buildPrompt(item)
  const response = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      extra_body: { response_format: 'url' },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Agnes request failed ${response.status}`)
  }

  const image = payload?.data?.[0]
  if (!image?.b64_json && !image?.url) {
    throw new Error('Agnes response did not include b64_json or url')
  }

  const sourceName = `${String(item.month).padStart(2, '0')}-${slugify(item.term)}-source.png`
  const rawPath = path.join(sourceDir, sourceName)
  if (image.b64_json) {
    fs.writeFileSync(rawPath, Buffer.from(image.b64_json, 'base64'))
  } else {
    const imageResponse = await fetch(image.url)
    if (!imageResponse.ok) throw new Error(`image download failed ${imageResponse.status}`)
    fs.writeFileSync(rawPath, Buffer.from(await imageResponse.arrayBuffer()))
  }

  const cropPath = path.join(sourceDir, `${String(item.month).padStart(2, '0')}-${slugify(item.term)}-decor-crop.png`)
  const maskPath = path.join(sourceDir, `${String(item.month).padStart(2, '0')}-${slugify(item.term)}-decor-mask.png`)
  const alphaPath = path.join(sourceDir, `${String(item.month).padStart(2, '0')}-${slugify(item.term)}-decor-alpha.png`)

  execFileSync('magick', [rawPath, '-resize', '1024x512^', '-gravity', 'center', '-extent', '1024x512', rawPath])
  execFileSync('magick', [rawPath, '-crop', '512x512+512+0', '+repage', cropPath])
  execFileSync('magick', ['-size', '512x512', 'gradient:black-white', '-sigmoidal-contrast', '6,38%', maskPath])
  execFileSync('magick', [cropPath, maskPath, '-alpha', 'off', '-compose', 'copy_opacity', '-composite', alphaPath])
  execFileSync('magick', ['-size', '1024x512', 'xc:none', alphaPath, '-geometry', '+512+0', '-compose', 'over', '-composite', '-strip', outputPath])

  fs.rmSync(cropPath, { force: true })
  fs.rmSync(maskPath, { force: true })
  fs.rmSync(alphaPath, { force: true })
}

function buildPrompt(item) {
  return [
    `Create a minimal seasonal line illustration for the Chinese solar term ${item.term}.`,
    'Style: quiet modern mobile app illustration, sparse hand-drawn line art, very light macaron fill, flat simple shapes, no watercolor wash, no poster layout.',
    `Use ${item.palette}. Do not introduce extra colors.`,
    `Draw only this motif: ${item.motif}.`,
    'Composition: 2:1 horizontal card art, the left 55% must be empty clean negative space, the small motif stays on the right 35%, no background scene.',
    'Use thin rounded strokes, subtle translucent fill, plenty of padding, calm and elegant.',
    'Absolutely no text, no Chinese characters, no numbers, no calligraphy, no title, no label, no watermark, no realistic photo, no complex flowers, no landscape, no clutter.',
  ].join(' ')
}

function slugify(value) {
  const map = {
    小寒: 'xiaohan',
    立春: 'lichun',
    惊蛰: 'jingzhe',
    清明: 'qingming',
    立夏: 'lixia',
    芒种: 'mangzhong',
    小暑: 'xiaoshu',
    立秋: 'liqiu',
    白露: 'bailu',
    寒露: 'hanlu',
    立冬: 'lidong',
    大雪: 'daxue',
  }
  return map[value] || String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseArgs(args) {
  return args.reduce((acc, arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    acc[key] = rest.length ? rest.join('=') : true
    return acc
  }, {})
}
