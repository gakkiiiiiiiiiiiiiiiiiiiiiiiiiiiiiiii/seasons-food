import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './load-env.js'

loadEnv()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const publicDir = path.join(rootDir, 'apps/web/public')
const aiDir = path.join(publicDir, 'assets/ai-real')
const generatedDir = path.join(aiDir, 'agnes')

const options = parseArgs(process.argv.slice(2))
const apiKey = process.env.AGNES_API_KEY
const model = options.model || 'agnes-image-2.1-flash'
const size = options.size || '1024x1024'
const mode = options.mode || 'real-replacements'
const limit = Number(options.limit || 0)
const concurrency = Math.max(1, Math.min(Number(options.concurrency || 2), 4))
const overwrite = options.overwrite === 'true' || options.overwrite === true
const dryRun = options['dry-run'] === 'true' || options['dry-run'] === true
const slugFilter = new Set(String(options.slugs || options.slug || '').split(',').map(slug => slug.trim()).filter(Boolean))
const visualNotes = {
  lianwu: 'Visual identity: wax apple / rose apple / Syzygium samarangense. Show two or three glossy bell-shaped wax apples with a flared open calyx end, waxy smooth pink-red skin, squat campanula/bell silhouette, not pear-shaped, not apple-shaped, not yellow.',
}

if (!apiKey && !dryRun) {
  console.error('Missing AGNES_API_KEY. Add it to .env or the shell environment.')
  process.exit(1)
}

fs.mkdirSync(aiDir, { recursive: true })
fs.mkdirSync(generatedDir, { recursive: true })

const datasets = [
  { path: seedPath, data: JSON.parse(fs.readFileSync(seedPath, 'utf8')) },
  { path: extraPath, data: fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : [] },
]
const all = datasets.flatMap(dataset => dataset.data.map(record => ({ ...record, __dataset: dataset })))
const targets = selectTargets(all)
const selected = limit > 0 ? targets.slice(0, limit) : targets

console.log(`Mode: ${mode}`)
console.log(`Targets: ${selected.length}/${targets.length}`)
console.log(`Model: ${model}, size=${size}, concurrency=${concurrency}, overwrite=${overwrite}`)

if (dryRun) {
  for (const item of selected) {
    console.log(`${item.slug}\t${item.name}\t${item.category}\t${item.subCategory}`)
  }
  process.exit(0)
}

let completed = 0
let failed = 0
const failures = []

for (let index = 0; index < selected.length; index += concurrency) {
  const chunk = selected.slice(index, index + concurrency)
  await Promise.all(chunk.map(async item => {
    try {
      await generateOne(item)
      completed += 1
      console.log(`[${completed}/${selected.length}] ${item.slug} ${item.name}`)
    } catch (error) {
      failed += 1
      failures.push({ slug: item.slug, name: item.name, message: error.message })
      console.error(`[failed] ${item.slug} ${item.name}: ${error.message}`)
    }
  }))
}

for (const dataset of datasets) {
  fs.writeFileSync(dataset.path, JSON.stringify(dataset.data, null, 2) + '\n')
}

console.log(`\nDone. Generated ${completed}; failed ${failed}.`)
if (failures.length) {
  console.log(JSON.stringify(failures, null, 2))
  process.exitCode = 1
}

function selectTargets(records) {
  return records
    .filter(record => !slugFilter.size || slugFilter.has(record.slug))
    .filter(record => {
      if (mode === 'all') return overwrite || !record.aiImage
      if (mode === 'all-real') return Boolean(record.realImage)
      if (mode === 'real-replacements') return Boolean(record.realImage) && (overwrite || !record.aiImage)
      if (mode === 'missing-ai') return !record.aiImage
      return Boolean(record.realImage) && (overwrite || !record.aiImage)
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

async function generateOne(item) {
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

  const rawPath = path.join(generatedDir, `${item.slug}-agnes-source`)
  const outputPath = path.join(aiDir, `${item.slug}-ai.png`)

  if (image.b64_json) {
    fs.writeFileSync(rawPath, Buffer.from(image.b64_json, 'base64'))
  } else {
    const imageResponse = await fetch(image.url)
    if (!imageResponse.ok) throw new Error(`image download failed ${imageResponse.status}`)
    fs.writeFileSync(rawPath, Buffer.from(await imageResponse.arrayBuffer()))
  }

  execFileSync('magick', [
    rawPath,
    '-alpha',
    'set',
    '-resize',
    '768x768>',
    '-gravity',
    'center',
    '-background',
    'none',
    '-extent',
    '768x768',
    outputPath,
  ])

  fs.unlinkSync(rawPath)

  const record = item.__dataset.data.find(entry => entry.slug === item.slug)
  record.aiImage = `/assets/ai-real/${item.slug}-ai.png`
  record.aiImageSource = {
    provider: 'Agnes AI',
    model,
    type: 'ai-generated-realistic-reference',
    generatedAt: new Date().toISOString(),
    reviewed: false,
    prompt,
    revisedPrompt: image.revised_prompt || null,
    replacementForRealImage: item.realImage || null,
  }
}

function buildPrompt(item) {
  const category = item.category === 'vegetable' ? 'vegetable' : 'fruit'
  const visualNote = visualNotes[item.slug] || ''
  return [
    `Create a realistic product photography cutout of ${item.name}.`,
    `Subject: one clean, fresh, edible ${category}; ${item.englishName || item.name}; category ${item.subCategory || ''}.`,
    visualNote,
    'Transparent PNG background, isolated object, no white background, no floor patch, no studio paper backdrop.',
    'No text, no Chinese characters, no label, no watermark, no plate, no bowl, no basket, no hands, no knife, no cutting board, no cooked dish, no mixed ingredients.',
    'Keep the whole subject fully visible with generous padding, natural color, crisp detail, soft realistic daylight.',
  ].join(' ')
}


function parseArgs(args) {
  return args.reduce((acc, arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    acc[key] = rest.length ? rest.join('=') : true
    return acc
  }, {})
}
