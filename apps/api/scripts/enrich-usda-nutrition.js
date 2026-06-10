import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './load-env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const seedPath = path.resolve(__dirname, '../data/produce.seed.json')
const extraPath = path.resolve(__dirname, '../data/produce.extra.json')
const reportPath = path.resolve(__dirname, '../data/usda-nutrition-candidates.json')

loadEnv()

const apiKey = process.env.USDA_FDC_API_KEY || process.env.FDC_API_KEY || 'DEMO_KEY'
const apply = process.argv.includes('--apply')
const slugArg = process.argv.find(arg => arg.startsWith('--slugs='))?.split('=')[1]
const limitArg = Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || Infinity)
const wantedSlugs = slugArg ? new Set(slugArg.split(',').map(item => item.trim()).filter(Boolean)) : null

const nutrientIds = {
  energyKcal: [1008, 2047, 2048],
  carbohydrateG: [1005],
  fiberG: [1079],
  proteinG: [1003],
  fatG: [1004],
  vitaminCMg: [1162],
  potassiumMg: [1092]
}

const blockedDescriptionWords = [
  'juice',
  'drink',
  'beverage',
  'canned',
  'syrup',
  'frozen',
  'cooked',
  'boiled',
  'fried',
  'dried',
  'dehydrated',
  'powder',
  'babyfood',
  'restaurant',
  'prepared',
  'snack',
  'sauce',
  'soup',
  'pie',
  'cake'
]

const requiredDescriptionTerms = {
  yangmei: ['bayberry', 'myrica'],
  lizhi: ['litchi', 'lychee'],
  taozi: ['peach'],
  lizi: ['plum'],
  pipa: ['loquat'],
  xigua: ['watermelon'],
  putao: ['grape'],
  huanggua: ['cucumber'],
  sigua: ['dishcloth', 'towelgourd', 'luffa'],
  kongxincai: ['water spinach', 'water convolvulus'],
  xihongshi: ['tomato'],
  qiezi: ['eggplant'],
  pingguo: ['apple'],
  xiancai: ['amaranth'],
  bocai: ['spinach'],
  lianou: ['lotus root'],
  xianggu: ['shiitake'],
  dongzao: ['jujube'],
  kugua: ['balsam pear', 'bitter gourd'],
  cong: ['scallion', 'spring or scallions', 'green onion'],
  hongshu: ['sweet potato'],
  shanyao: ['yam'],
  jiaobai: ['zizania', 'wild rice stem', 'water bamboo'],
  oujian: ['lotus'],
  qingjiao: ['bell pepper', 'peppers, bell', 'sweet pepper'],
  lajiao: ['chili', 'hot pepper'],
  lianwu: ['wax jambu', 'rose apple'],
  shanzha: ['hawthorn'],
  heicujili: ['blackcurrant', 'currants, european black'],
  'man-yuemei': ['cranberry'],
  fupenzi: ['raspberry'],
  shaji: ['sea buckthorn'],
  youganzi: ['emblic', 'amla'],
  renshenguo: ['pepino'],
  shepiguo: ['salak', 'snake fruit'],
  ganlan: ['olive'],
  jinlingzi: ['balsam pear', 'bitter gourd'],
  shaguo: ['crabapple', 'crab apple'],
  luohanguo: ['monk fruit', 'luo han guo'],
  huangpi: ['wampee'],
  hongmaodan: ['rambutan'],
  shanzhu: ['mangosteen'],
  qingmei: ['plum', 'prunus mume', 'apricot'],
  nai: ['plum'],
  hongsu: ['pear'],
  caixin: ['choy sum', 'yu choy'],
  baicaitai: ['choy sum', 'flowering cabbage'],
  bailuobo: ['daikon', 'oriental radish'],
  jielan: ['gai lan', 'chinese broccoli', 'alboglabra'],
  tonghao: ['chrysanthemum'],
  wawacai: ['napa cabbage'],
  zijinglan: ['red cabbage', 'cabbage, red'],
  yuyiglan: ['kale'],
  'baozi-ganlan': ['brussels sprouts'],
  pilan: ['kohlrabi'],
  wosun: ['celtuce'],
  youmaicai: ['celtuce leaves', 'chinese lettuce', 'you mai cai'],
  suanmiao: ['garlic sprout', 'garlic scape'],
  wandoumiao: ['pea shoots', 'pea tips'],
  'muer-cai': ['malabar spinach'],
  luokui: ['ceylon spinach', 'malabar spinach'],
  'chayote-miao': ['chayote shoots'],
  baizhuo: ['lily bulb'],
  daodou: ['sword bean', 'jack bean'],
  cigu: ['arrowhead'],
  shuiqincai: ['water celery'],
  chuncai: ['water shield'],
  zicai: ['laver', 'nori'],
  jizongjun: ['termite mushroom'],
  songrong: ['matsutake'],
  muer: ['cloud ears', "jew's ear", 'wood ear'],
  zhusun: ['bamboo fungus'],
  chashugu: ['tea tree mushroom', 'agrocybe'],
  xingbaogu: ['oyster'],
  haixiangu: ['beech mushroom', 'shimeji', 'seafood mushroom'],
  koucai: ['button mushroom', 'white mushroom'],
  huanghuacai: ['daylily'],
  nanhuateng: ['pumpkin flower', 'squash blossoms'],
  bawanghua: ['night-blooming cereus', 'pitaya flower'],
  tianqicai: ['gynura'],
  huoxiang: ['agastache'],
  zisu: ['perilla'],
  baimicai: ['amaranth']
}

const blockedDescriptionTermsBySlug = {
  putao: ['tomato', 'leaves'],
  pingguo: ['without skin', 'mammy apple', 'mamey', 'sugar apples', 'sweetsop', 'custard apple'],
  xigua: ['rind'],
  ningmeng: ['peel'],
  hongshu: ['leaves'],
  shanyao: ['mountain yam, hawaii'],
  cong: ['onions, red', 'onions, raw'],
  xianggu: ['enoki', 'oyster', 'white'],
  haixiangu: ['enoki', 'maitake', 'shiitake', 'oyster'],
  muer: ['pork'],
  qingjiao: ['hot chili'],
  lajiao: ['bell, green'],
  bailuobo: ['radishes, red'],
  baicaitai: ['bok choy'],
  youmaicai: ['romaine', 'cos'],
  lianou: ['lotus seeds'],
  oujian: ['root'],
  qingmei: ['black, with skin'],
  heicujili: ['plum, black'],
  'man-yuemei': ['cranberry beans', 'beans, cranberry'],
  jinlingzi: ['pear'],
  'muer-cai': ['spinach, raw'],
  luokui: ['spinach, raw'],
  'chayote-miao': ['chayote, fruit'],
  baizhuo: ['fennel'],
  daodou: ['fava'],
  nanhuateng: ['broccoli'],
  baimicai: ['mushrooms']
}

const queryBySlug = {
  yangmei: ['bayberries, raw', 'myrica rubra raw'],
  lizhi: ['litchis, raw', 'lychees, raw'],
  taozi: ['peaches, yellow, raw', 'peaches, raw'],
  lizi: ['plums, raw'],
  pipa: ['loquats, raw'],
  xigua: ['watermelon, raw'],
  caomei: ['strawberries, raw'],
  putao: ['grapes, raw'],
  yingtao: ['sweet cherries, raw', 'cherries, sweet, raw'],
  mangguo: ['mangos, raw'],
  xiangjiao: ['bananas, raw'],
  li: ['pears, raw'],
  pingguo: ['apples, raw, with skin'],
  chengzi: ['oranges, raw'],
  mihoutao: ['kiwifruit, green, raw', 'kiwifruit, raw'],
  lanmei: ['blueberries, raw'],
  dongzao: ['jujube, raw'],
  youzi: ['pummelo, raw', 'grapefruit, raw'],
  ganju: ['tangerines, raw', 'mandarin oranges, raw'],
  ningmeng: ['lemons, raw'],
  huolongguo: ['pitaya, raw', 'dragon fruit raw'],
  boluo: ['pineapple, raw'],
  mugua: ['papayas, raw'],
  shanzha: ['hawthorn fruit raw'],
  shizi: ['persimmons, native, raw', 'persimmons, japanese, raw'],
  sangshen: ['mulberries, raw'],
  longyan: ['longans, raw'],
  niuyouguo: ['avocados, raw'],
  yezi: ['coconut meat, raw'],
  boluomi: ['jackfruit, raw'],
  ganlan: ['olives, ripe, canned', 'olives, raw'],
  qingmei: ['plums, raw'],
  ximei: ['plums, raw'],
  heimei: ['blackberries, raw'],
  heicujili: ['currants, european black, raw'],
  youtao: ['nectarines, raw'],
  hongsu: ['pears, raw'],
  qiyiguo: ['kiwifruit, raw'],
  xuelianguo: ['yacon raw'],
  huanggua: ['cucumber, with peel, raw'],
  sigua: ['luffa, raw'],
  maodou: ['edamame, frozen, prepared', 'soybeans, green, raw'],
  kongxincai: ['water spinach, raw'],
  xihongshi: ['tomatoes, red, ripe, raw'],
  qiukui: ['okra, raw'],
  qiezi: ['eggplant, raw'],
  xiancai: ['amaranth leaves, raw'],
  shengcai: ['lettuce, green leaf, raw'],
  bocai: ['spinach, raw'],
  lianou: ['lotus root, raw'],
  xilanhua: ['broccoli, raw'],
  baicai: ['cabbage, chinese, raw', 'napa cabbage, raw'],
  huluobo: ['carrots, raw'],
  tudou: ['potatoes, flesh and skin, raw'],
  xianggu: ['mushrooms, shiitake, raw'],
  yumi: ['corn, sweet, yellow, raw'],
  dasuan: ['garlic, raw'],
  kugua: ['balsam-pear, bitter gourd, raw'],
  donggua: ['waxgourd, raw'],
  nangua: ['pumpkin, raw'],
  foshougua: ['chayote, fruit, raw'],
  wandou: ['peas, green, raw'],
  sidou: ['beans, snap, green, raw'],
  youmaicai: ['lettuce, raw'],
  xiangcai: ['coriander leaves, raw'],
  jiucai: ['chives, raw'],
  cong: ['onions, spring or scallions, raw'],
  yangcong: ['onions, raw'],
  baicaitai: ['choy sum, raw'],
  bailuobo: ['radishes, oriental, raw'],
  hongshu: ['sweet potato, raw'],
  shanyao: ['yam, raw'],
  sunzi: ['bamboo shoots, raw'],
  lusun: ['asparagus, raw'],
  jiaobai: ['zizania latifolia raw'],
  qincai: ['celery, raw'],
  cauliflower: ['cauliflower, raw'],
  qingjiao: ['peppers, sweet, green, raw'],
  lajiao: ['peppers, hot chili, raw'],
  shengjiang: ['ginger root, raw'],
  caixin: ['choy sum, raw'],
  tonghao: ['chrysanthemum greens, raw'],
  zijinglan: ['cabbage, red, raw'],
  yuyiglan: ['kale, raw'],
  'baozi-ganlan': ['brussels sprouts, raw'],
  pilan: ['kohlrabi, raw'],
  wosun: ['celtuce, raw'],
  helandou: ['peas, edible-podded, raw'],
  yutou: ['taro, raw'],
  cigu: ['arrowhead, raw'],
  shuiqincai: ['celery, raw'],
  muer: ['fungus, cloud ears, raw'],
  xingbaogu: ['mushrooms, oyster, raw']
}

const baseSeed = JSON.parse(await fs.readFile(seedPath, 'utf8'))
const extraSeed = JSON.parse(await fs.readFile(extraPath, 'utf8'))
const selected = [...baseSeed, ...extraSeed]
  .filter(item => !wantedSlugs || wantedSlugs.has(item.slug))
  .slice(0, Number.isFinite(limitArg) ? limitArg : undefined)

const report = {
  generatedAt: new Date().toISOString(),
  applied: apply,
  apiKey: apiKey === 'DEMO_KEY' ? 'DEMO_KEY' : 'provided',
  selected: [],
  noMatch: [],
  errors: []
}

for (const item of selected) {
  try {
    const candidates = await findUsdaCandidates(item)
    const selectedCandidate = chooseCandidate(item, candidates)
    if (!selectedCandidate) {
      report.noMatch.push({ slug: item.slug, name: item.name, queries: buildQueries(item), candidates: summarizeCandidates(candidates) })
      console.log(`${item.name}: no clean USDA match`)
      await delay(220)
      continue
    }

    const nutrition = extractNutrition(selectedCandidate)
    if (!nutrition) {
      report.noMatch.push({ slug: item.slug, name: item.name, reason: 'missing required nutrient values', selectedCandidate: summarizeCandidate(selectedCandidate) })
      console.log(`${item.name}: USDA candidate missing nutrients`)
      await delay(220)
      continue
    }

    const source = {
      provider: 'USDA FoodData Central',
      fdcId: selectedCandidate.fdcId,
      description: selectedCandidate.description,
      dataType: selectedCandidate.dataType,
      publishedDate: selectedCandidate.publishedDate || '',
      sourceUrl: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${selectedCandidate.fdcId}/nutrients`,
      matchedQuery: selectedCandidate.matchedQuery,
      reviewed: false
    }

    report.selected.push({
      slug: item.slug,
      name: item.name,
      nutritionPer100g: nutrition,
      nutritionSource: source,
      previousNutritionPer100g: item.nutritionPer100g,
      candidates: summarizeCandidates(candidates)
    })

    if (apply) updateSeedItem(item.slug, nutrition, source)
    console.log(`${item.name}: ${selectedCandidate.description} (${selectedCandidate.fdcId})`)
  } catch (error) {
    report.errors.push({ slug: item.slug, name: item.name, error: error.message })
    console.warn(`${item.name}: ${error.message}`)
  }
  await delay(220)
}

if (apply) {
  await fs.writeFile(seedPath, JSON.stringify(baseSeed, null, 2) + '\n')
  await fs.writeFile(extraPath, JSON.stringify(extraSeed, null, 2) + '\n')
}
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(`Wrote ${reportPath}`)
if (apply) console.log('Applied USDA nutrition values to seed JSON files.')

async function findUsdaCandidates(item) {
  const candidates = []
  const seen = new Set()
  for (const query of buildQueries(item)) {
    const result = await searchFoods(query)
    for (const food of result.foods || []) {
      if (!food.fdcId || seen.has(food.fdcId)) continue
      seen.add(food.fdcId)
      candidates.push({ ...food, matchedQuery: query })
    }
    if (chooseCandidate(item, candidates)) break
  }
  return candidates
}

function buildQueries(item) {
  return [
    ...(queryBySlug[item.slug] || []),
    `${item.englishName}, raw`,
    `${item.englishName} raw`
  ].filter(Boolean)
}

async function searchFoods(query) {
  const url = 'https://api.nal.usda.gov/fdc/v1/foods/search?' + new URLSearchParams({
    api_key: apiKey,
    query,
    dataType: ['Foundation', 'SR Legacy'].join(','),
    pageSize: '12',
  })
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`USDA search failed ${response.status}`)
  return response.json()
}

function chooseCandidate(item, candidates) {
  return candidates
    .filter(candidate => isRelevantCandidate(item, candidate))
    .filter(candidate => !hasBlockedDescription(candidate.description))
    .filter(candidate => extractNutrition(candidate))
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0] || null
}

function isRelevantCandidate(item, candidate) {
  const description = normalizeText(candidate.description)
  const blockedTerms = blockedDescriptionTermsBySlug[item.slug] || []
  if (blockedTerms.some(term => description.includes(normalizeText(term)))) return false
  const requiredTerms = requiredDescriptionTerms[item.slug] || []
  if (requiredTerms.length) {
    return requiredTerms.some(term => description.includes(normalizeText(term)))
  }
  const tokens = relevanceTokens(item, candidate.matchedQuery)
  return tokens.some(token => description.includes(token))
}

function relevanceTokens(item, query = '') {
  const generic = new Set([
    'raw',
    'fruit',
    'fruits',
    'vegetable',
    'vegetables',
    'fresh',
    'with',
    'skin',
    'green',
    'yellow',
    'red',
    'sweet',
    'close',
    'isolated',
    'chinese',
    'common',
    'winter',
    'spring',
    'baby',
    'ripe',
    'slightly',
    'seedless',
    'peeled'
  ])
  return [
    ...normalizeText(query).split(/\s+/),
    ...normalizeText(item.englishName).split(/\s+/)
  ]
    .map(token => token.replace(/,$/, '').replace(/s$/, ''))
    .filter(token => token.length >= 4 && !generic.has(token))
}

function normalizeText(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function scoreCandidate(candidate) {
  const description = candidate.description?.toLowerCase() || ''
  return (
    (candidate.dataType === 'Foundation' ? 80 : 60) +
    (description.includes('raw') ? 20 : 0) +
    (description.includes('with skin') ? 4 : 0) -
    (description.includes('without skin') ? 5 : 0)
  )
}

function hasBlockedDescription(description = '') {
  const normalized = description.toLowerCase()
  return blockedDescriptionWords.some(word => normalized.includes(word))
}

function extractNutrition(food) {
  const source = Object.fromEntries((food.foodNutrients || [])
    .map(nutrient => [nutrient.nutrientId, Number(nutrient.value)]))
  const values = {}
  for (const [key, ids] of Object.entries(nutrientIds)) {
    const value = ids.map(id => source[id]).find(value => Number.isFinite(value))
    if (!Number.isFinite(value)) return null
    values[key] = round(value, key.endsWith('G') ? 2 : 1)
  }
  return values
}

function updateSeedItem(slug, nutrition, source) {
  const item = baseSeed.find(item => item.slug === slug) || extraSeed.find(item => item.slug === slug)
  if (!item) return
  item.nutritionPer100g = nutrition
  item.nutritionSource = source
  if (!item.sourceRefs.includes(source.sourceUrl)) item.sourceRefs.push(source.sourceUrl)
}

function summarizeCandidates(candidates) {
  return candidates.slice(0, 8).map(summarizeCandidate)
}

function summarizeCandidate(candidate) {
  return {
    fdcId: candidate.fdcId,
    description: candidate.description,
    dataType: candidate.dataType,
    matchedQuery: candidate.matchedQuery,
    score: scoreCandidate(candidate)
  }
}

function round(value, decimals) {
  const factor = 10 ** decimals
  return Math.round(Number(value) * factor) / factor
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
