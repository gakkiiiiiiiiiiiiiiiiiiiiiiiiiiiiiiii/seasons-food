import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../../..')
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraSeedPath = path.resolve(__dirname, '../data/produce.extra.json')
const manifestPath = path.resolve(__dirname, '../data/image-candidates.json')
const missingManifestPath = path.resolve(__dirname, '../data/missing-image-candidates.json')
const outputDir = path.resolve(rootDir, 'apps/web/public/assets/real')
const execFileAsync = promisify(execFile)

const limitArg = Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || 20)
const slugArg = process.argv.find(arg => arg.startsWith('--slugs='))?.split('=')[1]
const wantedSlugs = slugArg ? new Set(slugArg.split(',').map(item => item.trim()).filter(Boolean)) : null
const missingOnly = process.argv.includes('--missing')

const blockedTitleWords = [
  'tree',
  'flower',
  'leaf',
  'leaves',
  'plant',
  'seedling',
  'salad',
  'dish',
  'cooked',
  'soup',
  'cake',
  'dessert',
  'market',
  'shop',
  'packaging',
  'logo',
  'icon',
  'drawing',
  'illustration',
  'clipart',
  'diagram',
  'slice',
  'sliced',
  'cut',
  'basket',
  'field'
]

const queryBySlug = {
  yangmei: ['Myrica rubra fruit', 'Chinese bayberry fruit'],
  lizhi: ['Lychee fruit'],
  taozi: ['Peach fruit'],
  lizi: ['Plum fruit'],
  pipa: ['Loquat fruit'],
  xigua: ['Watermelon fruit'],
  caomei: ['Strawberry fruit'],
  putao: ['Grape fruit bunch'],
  yingtao: ['Cherry fruit'],
  mangguo: ['Mango fruit'],
  xiangjiao: ['Banana fruit'],
  li: ['Pear fruit'],
  pingguo: ['Apple fruit'],
  chengzi: ['Orange fruit'],
  mihoutao: ['Kiwifruit'],
  lanmei: ['Blueberry fruit'],
  youzi: ['Pomelo fruit'],
  ganju: ['Mandarin orange fruit'],
  ningmeng: ['Lemon fruit'],
  huanggua: ['Cucumber vegetable'],
  sigua: ['Luffa vegetable'],
  maodou: ['Edamame pods'],
  kongxincai: ['Water spinach vegetable'],
  xihongshi: ['Tomato fruit'],
  qiukui: ['Okra vegetable'],
  qiezi: ['Eggplant vegetable'],
  xiancai: ['Amaranth greens', 'Chinese spinach vegetable', 'Amaranthus tricolor vegetable'],
  shengcai: ['Lettuce vegetable'],
  bocai: ['Spinach vegetable', 'Spinacia oleracea leaves', 'fresh spinach bunch'],
  lianou: ['Lotus root vegetable', 'Lotus root rhizome', 'Nelumbo nucifera rhizome', 'renkon lotus root'],
  xilanhua: ['Broccoli vegetable'],
  baicai: ['Chinese cabbage vegetable'],
  huluobo: ['Carrot vegetable'],
  tudou: ['Potato tuber'],
  xianggu: ['Shiitake mushroom'],
  yumi: ['Corn cob'],
  dasuan: ['Garlic bulb'],
  kugua: ['Bitter melon vegetable'],
  donggua: ['Winter melon vegetable', 'Wax gourd fruit'],
  nangua: ['Pumpkin vegetable'],
  foshougua: ['Chayote vegetable'],
  wandou: ['Pea pods'],
  sidou: ['Green bean pods'],
  canchai: ['Broad bean pods', 'Fava bean pods'],
  youmaicai: ['Chinese lettuce vegetable', 'Celtuce leaves'],
  xiangcai: ['Coriander leaves'],
  jiucai: ['Garlic chives vegetable', 'Chinese chives vegetable', 'Allium tuberosum vegetable'],
  cong: ['Scallion vegetable', 'Spring onion vegetable', 'green onion bunch'],
  yangcong: ['Onion bulb'],
  baicaitai: ['Choy sum vegetable', 'Chinese flowering cabbage'],
  bailuobo: ['Daikon radish vegetable'],
  hongshu: ['Sweet potato tuber'],
  shanyao: ['Chinese yam tuber'],
  sunzi: ['Bamboo shoots vegetable'],
  lusun: ['Asparagus spears vegetable'],
  jiaobai: ['Zizania latifolia stem', 'Wild rice stem vegetable', 'water bamboo vegetable'],
  oujian: ['Lotus root shoots vegetable', 'Lotus stem vegetable'],
  qincai: ['Celery stalks vegetable'],
  huanghuacai: ['Daylily buds vegetable', 'Dried daylily buds'],
  cauliflower: ['Cauliflower vegetable'],
  qingjiao: ['Green bell pepper vegetable', 'Green capsicum vegetable', 'green sweet pepper'],
  lajiao: ['Chili pepper vegetable'],
  shengjiang: ['Ginger rhizome'],
  longyan: ['Longan fruit', 'Dimocarpus longan fruit', 'dragon eye fruit'],
  huangpi: ['Wampee fruit', 'Clausena lansium fruit', 'Clausena lansium berries'],
  fanliuzhi: ['Guava fruit', 'Psidium guajava fruit'],
  baixiangguo: ['Passion fruit', 'Passiflora edulis fruit', 'purple passion fruit'],
  hongmaodan: ['Rambutan fruit', 'Nephelium lappaceum fruit'],
  shijia: ['Sugar apple fruit', 'Annona squamosa fruit'],
  niuyouguo: ['Avocado fruit'],
  yezi: ['Coconut fruit', 'Cocos nucifera fruit', 'fresh coconut fruit'],
  boluomi: ['Jackfruit fruit'],
  shanzhu: ['Mangosteen fruit', 'Garcinia mangostana fruit'],
  renshenguo: ['Pepino melon fruit', 'Solanum muricatum fruit', 'pepino dulce fruit'],
  shepiguo: ['Salak fruit', 'snake fruit', 'Salacca zalacca fruit'],
  ganlan: ['Chinese olive fruit', 'Canarium album fruit'],
  qingmei: ['Green plum fruit', 'Prunus mume fruit', 'Japanese apricot fruit'],
  nai: ['Nai plum fruit', 'Chinese plum fruit', 'Prunus salicina fruit'],
  ximei: ['Prune plum fruit'],
  youtao: ['Nectarine fruit'],
  hongsu: ['Red pear fruit'],
  haitangguo: ['Crabapple fruit'],
  shaguo: ['Crab apple fruit'],
  cili: ['Rosa roxburghii fruit'],
  shaji: ['Sea buckthorn berries'],
  heimei: ['Blackberry fruit', 'Rubus fruticosus fruit'],
  heicujili: ['Blackcurrant fruit', 'Ribes nigrum fruit'],
  jielan: ['Chinese broccoli vegetable', 'Gai lan vegetable', 'Brassica oleracea alboglabra'],
  caixin: ['Choy sum vegetable', 'Yu choy vegetable', 'Chinese flowering cabbage vegetable'],
  tonghao: ['Garland chrysanthemum vegetable', 'Glebionis coronaria vegetable', 'chrysanthemum greens'],
  wawacai: ['baby napa cabbage', 'mini napa cabbage', 'Chinese baby cabbage'],
  zijinglan: ['Red cabbage vegetable', 'purple cabbage vegetable', 'Brassica oleracea red cabbage'],
  yuyiglan: ['Kale vegetable', 'curly kale vegetable', 'Brassica oleracea kale'],
  'baozi-ganlan': ['Brussels sprouts vegetable', 'Brassica oleracea gemmifera'],
  pilan: ['Kohlrabi vegetable', 'Brassica oleracea gongylodes'],
  wosun: ['Celtuce stem'],
  suanmiao: ['Garlic sprout vegetable'],
  helandou: ['Snow pea pods'],
  yutou: ['Taro root'],
  cigu: ['Arrowhead tuber vegetable'],
  shuiqincai: ['Water celery vegetable'],
  jizongjun: ['Termite mushroom'],
  songrong: ['Matsutake mushroom'],
  muer: ['Wood ear mushroom'],
  zhusun: ['Bamboo fungus'],
  xingbaogu: ['King oyster mushroom'],
  koucai: ['Button mushroom']
}

await fs.mkdir(outputDir, { recursive: true })

const baseSeed = JSON.parse(await fs.readFile(seedPath, 'utf8'))
const extraSeed = await fs.readFile(extraSeedPath, 'utf8')
  .then(text => JSON.parse(text))
  .catch(() => [])
const seed = [...baseSeed, ...extraSeed]
const selected = seed
  .filter(item => !wantedSlugs || wantedSlugs.has(item.slug))
  .filter(item => !missingOnly || !item.realImage)
  .slice(0, Number.isFinite(limitArg) ? limitArg : seed.length)

const manifest = []
const activeManifestPath = missingOnly ? missingManifestPath : manifestPath

for (const item of selected) {
  const candidates = await findCandidates(item)
  const downloaded = []

  for (const candidate of candidates.slice(0, 3)) {
    const file = await downloadCandidate(item, candidate, downloaded.length + 1).catch(error => ({
      error: error.message,
      source: candidate
    }))
    downloaded.push(file)
  }

  manifest.push({
    slug: item.slug,
    name: item.name,
    englishName: item.englishName,
    queries: buildQueries(item),
    candidates: downloaded
  })
  await fs.writeFile(activeManifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`${item.name}: ${downloaded.filter(item => item.localPath).length} candidates`)
  await delay(260)
}

await fs.writeFile(activeManifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Wrote ${activeManifestPath}`)

async function findCandidates(item) {
  const seen = new Set()
  const results = []

  for (const query of buildQueries(item)) {
    const pages = await commonsSearch(query)
    for (const page of pages) {
      if (!page.url || seen.has(page.url)) continue
      seen.add(page.url)
      if (!isCleanTitle(page.title)) continue
      results.push(page)
    }
    if (results.length >= 3) break
  }

  return results
}

function buildQueries(item) {
  const custom = queryBySlug[item.slug] || []
  return [
    ...custom,
    `${item.englishName} ${item.category === 'fruit' ? 'fruit' : 'vegetable'}`,
    `${item.name} ${item.category === 'fruit' ? 'fruit' : 'vegetable'}`
  ]
}

async function commonsSearch(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: query,
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '900',
    format: 'json',
    origin: '*'
  })

  const text = await curlText(url)
  if (!text.trim().startsWith('{')) {
    console.warn(`Skip query "${query}": ${text.slice(0, 80).replace(/\s+/g, ' ')}`)
    await delay(1200)
    return []
  }
  const data = JSON.parse(text)
  return Object.values(data.query?.pages || {})
    .map(page => {
      const image = page.imageinfo?.[0]
      return {
        title: page.title,
        url: image?.thumburl || image?.url,
        originalUrl: image?.url,
        mime: image?.mime,
        width: image?.thumbwidth || image?.width,
        height: image?.thumbheight || image?.height,
        license: image?.extmetadata?.LicenseShortName?.value || '',
        artist: stripHtml(image?.extmetadata?.Artist?.value || ''),
        credit: stripHtml(image?.extmetadata?.Credit?.value || '')
      }
    })
    .filter(page => page.url && /^image\/(jpeg|png|webp)$/.test(page.mime || ''))
    .filter(page => Math.min(page.width || 0, page.height || 0) >= 240)
}

function isCleanTitle(title) {
  const normalized = title.toLowerCase()
  return !blockedTitleWords.some(word => normalized.includes(word))
}

async function downloadCandidate(item, candidate, index) {
  const extension = candidate.mime === 'image/png' ? 'png' : candidate.mime === 'image/webp' ? 'webp' : 'jpg'
  const fileName = `${item.slug}-${index}.${extension}`
  const absolutePath = path.join(outputDir, fileName)
  const publicPath = `/assets/real/${fileName}`
  const buffer = await curlBuffer(candidate.url)
  if (isImageBuffer(buffer)) {
    await fs.writeFile(absolutePath, buffer)
  } else {
    const original = await curlBuffer(candidate.originalUrl)
    if (!isImageBuffer(original)) throw new Error('downloaded file is not an image')
    await fs.writeFile(absolutePath, original)
  }
  return {
    localPath: publicPath,
    absolutePath,
    ...candidate
  }
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

async function curlText(url) {
  const { stdout } = await execFileAsync('curl', [
    '-L',
    '-sS',
    '--compressed',
    '-e',
    'https://commons.wikimedia.org/',
    '-A',
    'InSeasonApp/0.1 image crawler',
    url
  ], { maxBuffer: 20 * 1024 * 1024 })
  return stdout
}

async function curlBuffer(url) {
  const { stdout } = await execFileAsync('curl', [
    '-L',
    '-sS',
    '--compressed',
    '-A',
    'InSeasonApp/0.1 image crawler',
    url
  ], { encoding: 'buffer', maxBuffer: 30 * 1024 * 1024 })
  return stdout
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
