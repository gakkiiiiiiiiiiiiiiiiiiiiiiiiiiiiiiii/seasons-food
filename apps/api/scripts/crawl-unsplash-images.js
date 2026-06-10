import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './load-env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const manifestPath = path.resolve(__dirname, '../data/unsplash-image-candidates.json')
const outputDir = path.resolve(rootDir, 'apps/web/public/assets/real')

loadEnv()

const accessKey = process.env.UNSPLASH_ACCESS_KEY
const slugArg = process.argv.find(arg => arg.startsWith('--slugs='))?.split('=')[1]
const wantedSlugs = slugArg ? new Set(slugArg.split(',').map(item => item.trim()).filter(Boolean)) : null
const missingOnly = process.argv.includes('--missing')
const download = process.argv.includes('--download')
const limitArg = Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || 20)

if (!accessKey) {
  console.error('UNSPLASH_ACCESS_KEY is required. Create an Unsplash app key and run with UNSPLASH_ACCESS_KEY=...')
  process.exit(1)
}

const blockedWords = [
  'recipe',
  'dish',
  'plate',
  'salad',
  'soup',
  'cake',
  'dessert',
  'smoothie',
  'juice',
  'drink',
  'market',
  'basket',
  'person',
  'hand',
  'farm',
  'field',
  'flower',
  'tree',
  'leaf',
  'leaves'
]

const queryBySlug = {
  yangmei: ['chinese bayberry fruit close up', 'bayberry fruit isolated'],
  lizhi: ['lychee fruit close up'],
  taozi: ['fresh peach fruit isolated'],
  lizi: ['fresh plum fruit isolated'],
  pipa: ['loquat fruit close up'],
  xigua: ['whole watermelon fruit'],
  caomei: ['fresh strawberry fruit close up'],
  putao: ['fresh grapes bunch close up'],
  yingtao: ['fresh cherry fruit close up'],
  mangguo: ['fresh mango fruit isolated'],
  xiangjiao: ['banana fruit isolated'],
  li: ['fresh pear fruit isolated'],
  pingguo: ['fresh apple fruit isolated'],
  chengzi: ['fresh orange fruit isolated'],
  mihoutao: ['kiwi fruit close up'],
  lanmei: ['blueberry fruit close up'],
  longyan: ['longan fruit close up'],
  huangpi: ['wampee fruit close up'],
  fanliuzhi: ['guava fruit close up'],
  baixiangguo: ['passion fruit close up'],
  hongmaodan: ['rambutan fruit close up'],
  shijia: ['sugar apple fruit close up'],
  niuyouguo: ['avocado fruit isolated'],
  yezi: ['coconut fruit isolated'],
  boluomi: ['jackfruit fruit close up'],
  shanzhu: ['mangosteen fruit close up'],
  shepiguo: ['snake fruit salak close up'],
  heimei: ['blackberry fruit close up'],
  heicujili: ['blackcurrant fruit close up'],
  xiancai: ['fresh amaranth greens'],
  bocai: ['fresh spinach bunch'],
  lianou: ['fresh lotus root'],
  jiucai: ['fresh garlic chives'],
  cong: ['fresh scallion bunch'],
  jiaobai: ['water bamboo vegetable'],
  qingjiao: ['green bell pepper isolated'],
  caixin: ['fresh choy sum'],
  tonghao: ['fresh chrysanthemum greens'],
  wawacai: ['baby napa cabbage'],
  zijinglan: ['red cabbage vegetable'],
  yuyiglan: ['fresh kale bunch'],
  'baozi-ganlan': ['brussels sprouts vegetable'],
  pilan: ['kohlrabi vegetable'],
  wosun: ['celtuce vegetable'],
  helandou: ['snow peas pods'],
  yutou: ['taro root vegetable'],
  cigu: ['arrowhead tuber vegetable'],
  muer: ['wood ear mushroom'],
  xingbaogu: ['king oyster mushroom']
}

await fs.mkdir(outputDir, { recursive: true })

const baseSeed = JSON.parse(await fs.readFile(seedPath, 'utf8'))
const extraSeed = JSON.parse(await fs.readFile(extraPath, 'utf8'))
const selected = [...baseSeed, ...extraSeed]
  .filter(item => !wantedSlugs || wantedSlugs.has(item.slug))
  .filter(item => !missingOnly || !item.realImage)
  .slice(0, Number.isFinite(limitArg) ? limitArg : undefined)

const manifest = {
  generatedAt: new Date().toISOString(),
  source: 'Unsplash API',
  downloadedForReview: download,
  items: []
}

for (const item of selected) {
  const candidates = []
  const seen = new Set()
  for (const query of buildQueries(item)) {
    const results = await searchUnsplash(query)
    for (const result of results) {
      if (seen.has(result.id)) continue
      seen.add(result.id)
      if (!isCleanResult(result)) continue
      const candidate = toCandidate(item, result, query)
      if (download) {
        candidate.localPath = await downloadCandidate(item, candidate, candidates.length + 1)
      }
      candidates.push(candidate)
      if (candidates.length >= 4) break
    }
    if (candidates.length >= 4) break
  }

  manifest.items.push({
    slug: item.slug,
    name: item.name,
    englishName: item.englishName,
    queries: buildQueries(item),
    candidates
  })
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${item.name}: ${candidates.length} Unsplash candidates`)
  await delay(250)
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Wrote ${manifestPath}`)

function buildQueries(item) {
  return [
    ...(queryBySlug[item.slug] || []),
    `${item.englishName} ${item.category === 'fruit' ? 'fruit' : 'vegetable'} close up`,
    `${item.englishName} ${item.category === 'fruit' ? 'fruit' : 'vegetable'} isolated`
  ].filter(Boolean)
}

async function searchUnsplash(query) {
  const url = 'https://api.unsplash.com/search/photos?' + new URLSearchParams({
    query,
    per_page: '12',
    orientation: 'landscape',
    content_filter: 'high'
  })
  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1'
    }
  })
  if (!response.ok) throw new Error(`Unsplash search failed ${response.status}`)
  const data = await response.json()
  return data.results || []
}

function isCleanResult(result) {
  const text = [
    result.alt_description,
    result.description,
    result.user?.name
  ].filter(Boolean).join(' ').toLowerCase()
  return !blockedWords.some(word => text.includes(word))
}

function toCandidate(item, result, query) {
  return {
    provider: 'Unsplash',
    unsplashId: result.id,
    query,
    description: result.description || result.alt_description || '',
    altDescription: result.alt_description || '',
    width: result.width,
    height: result.height,
    color: result.color,
    blurHash: result.blur_hash,
    thumbUrl: result.urls?.thumb,
    smallUrl: result.urls?.small,
    regularUrl: result.urls?.regular,
    sourceUrl: `${result.links?.html || ''}${result.links?.html?.includes('?') ? '&' : '?'}utm_source=inseason_app&utm_medium=referral`,
    downloadLocation: result.links?.download_location || '',
    author: {
      name: result.user?.name || '',
      username: result.user?.username || '',
      profileUrl: result.user?.links?.html
        ? `${result.user.links.html}?utm_source=inseason_app&utm_medium=referral`
        : ''
    },
    imageSource: {
      provider: 'Unsplash',
      sourceUrl: result.links?.html || '',
      license: 'Unsplash License',
      artist: result.user?.name || '',
      unsplashId: result.id,
      downloadLocation: result.links?.download_location || '',
      reviewed: false,
      reviewNote: 'Unsplash candidate only; verify subject match before applying.'
    }
  }
}

async function downloadCandidate(item, candidate, index) {
  if (!candidate.downloadLocation) throw new Error(`Missing Unsplash download_location for ${candidate.unsplashId}`)
  const downloadInfo = await fetchJson(`${candidate.downloadLocation}?client_id=${accessKey}`)
  const imageResponse = await fetch(downloadInfo.url)
  if (!imageResponse.ok) throw new Error(`Unsplash image download failed ${imageResponse.status}`)
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  if (!isImageBuffer(buffer)) throw new Error('downloaded Unsplash file is not an image')
  const fileName = `${item.slug}-unsplash-${index}.jpg`
  const absolutePath = path.join(outputDir, fileName)
  await fs.writeFile(absolutePath, buffer)
  return `/assets/real/${fileName}`
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unsplash download tracking failed ${response.status}`)
  return response.json()
}

function isImageBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false
  const header = buffer.subarray(0, 12)
  return (
    (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) ||
    header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    header.subarray(0, 4).toString('ascii') === 'RIFF'
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
