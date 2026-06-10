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
const outputDir = path.join(publicDir, 'assets/varieties')
const sourceDir = path.join(rootDir, 'apps/api/generated/varieties/agnes-source')

const options = parseArgs(process.argv.slice(2))
const apiKey = process.env.AGNES_API_KEY
const model = options.model || 'agnes-image-2.1-flash'
const size = options.size || '1024x1024'
const limit = Number(options.limit || 0)
const concurrency = Math.max(1, Math.min(Number(options.concurrency || 3), 4))
const overwrite = options.overwrite === 'true' || options.overwrite === true
const dryRun = options['dry-run'] === 'true' || options['dry-run'] === true
const slugFilter = new Set(String(options.slugs || options.slug || '').split(',').map(slug => slug.trim()).filter(Boolean))

if (!apiKey && !dryRun) {
  console.error('Missing AGNES_API_KEY. Add it to .env or the shell environment.')
  process.exit(1)
}

fs.mkdirSync(outputDir, { recursive: true })
fs.mkdirSync(sourceDir, { recursive: true })

const datasets = [
  { path: seedPath, data: JSON.parse(fs.readFileSync(seedPath, 'utf8')) },
  { path: extraPath, data: fs.existsSync(extraPath) ? JSON.parse(fs.readFileSync(extraPath, 'utf8')) : [] },
]

const targets = selectTargets()
const selected = limit > 0 ? targets.slice(0, limit) : targets

console.log(`Variety images: ${selected.length}/${targets.length}`)
console.log(`Model: ${model}, size=${size}, concurrency=${concurrency}, overwrite=${overwrite}`)

if (dryRun) {
  for (const target of selected) console.log(`${target.item.slug}\t${target.item.name}\t${target.variety.name}`)
  process.exit(0)
}

let completed = 0
let failed = 0
const failures = []

for (let index = 0; index < selected.length; index += concurrency) {
  const chunk = selected.slice(index, index + concurrency)
  await Promise.all(chunk.map(async target => {
    try {
      await generateOne(target)
      completed += 1
      console.log(`[${completed}/${selected.length}] ${target.item.slug} ${target.variety.name}`)
    } catch (error) {
      failed += 1
      failures.push({ slug: target.item.slug, variety: target.variety.name, message: error.message })
      console.error(`[failed] ${target.item.slug} ${target.variety.name}: ${error.message}`)
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

function selectTargets() {
  const targets = []
  for (const dataset of datasets) {
    for (const item of dataset.data) {
      if (item.category !== 'fruit') continue
      if (slugFilter.size && !slugFilter.has(item.slug)) continue
      for (const variety of item.varieties || []) {
        const outputPath = varietyOutputPath(item, variety)
        if (!overwrite && variety.image && fs.existsSync(path.join(publicDir, variety.image.replace(/^\//, '')))) continue
        if (!overwrite && fs.existsSync(outputPath)) {
          variety.image = publicPath(outputPath)
          variety.imageSource ||= buildImageSource(item, variety, null)
          continue
        }
        targets.push({ dataset, item, variety, outputPath })
      }
    }
  }
  return targets.sort((a, b) => a.item.slug.localeCompare(b.item.slug) || a.variety.name.localeCompare(b.variety.name, 'zh-Hans-CN'))
}

async function generateOne(target) {
  const { item, variety, outputPath } = target
  const prompt = buildPrompt(item, variety)
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

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  const rawPath = path.join(sourceDir, `${item.slug}-${safeFileName(variety.name)}-source`)
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
    '-fuzz',
    '8%',
    '-transparent',
    'white',
    '-resize',
    '640x640>',
    '-gravity',
    'center',
    '-background',
    'none',
    '-extent',
    '640x640',
    '-strip',
    outputPath,
  ])

  target.variety.image = publicPath(outputPath)
  target.variety.imageSource = buildImageSource(item, variety, prompt, image.revised_prompt || null)
}

function buildPrompt(item, variety) {
  return [
    `Create a realistic product photography cutout of the fruit variety ${variety.name}.`,
    `Parent fruit: ${item.name}; English name: ${item.englishName || item.name}; category: ${item.subCategory || 'fruit'}.`,
    `Visual traits to emphasize: ${(variety.traits || []).join(', ')}.`,
    `Show one to three clean fresh whole fruits of ${variety.name}; if the variety is usually recognized by inner flesh color, include one neatly cut half beside the whole fruit.`,
    'Transparent PNG background, isolated subject, fully visible, generous padding, natural daylight, crisp detail, accurate color and shape.',
    'No text, no Chinese characters, no label, no watermark, no plate, no bowl, no basket, no hands, no knife, no cutting board, no cooked dish, no mixed ingredients.',
  ].join(' ')
}

function varietyOutputPath(item, variety) {
  return path.join(outputDir, item.slug, `${item.slug}-${safeFileName(variety.name)}.png`)
}

function publicPath(outputPath) {
  return `/${path.relative(publicDir, outputPath).split(path.sep).join('/')}`
}

function safeFileName(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function buildImageSource(item, variety, prompt, revisedPrompt = null) {
  return {
    provider: 'Agnes AI',
    model,
    type: 'ai-generated-variety-reference',
    generatedAt: new Date().toISOString(),
    reviewed: false,
    prompt,
    revisedPrompt,
    parentSlug: item.slug,
    parentName: item.name,
    varietyName: variety.name,
  }
}

function parseArgs(args) {
  return args.reduce((acc, arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    acc[key] = rest.length ? rest.join('=') : true
    return acc
  }, {})
}
