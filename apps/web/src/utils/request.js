const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const WX_CLOUD_ENV = 'prod-d1gsokwqi19ff8e6f'
const WX_CLOUD_SERVICE = 'prod'
const USE_TEST_FIXTURES = import.meta.env.VITE_TEST_FIXTURES === 'true'

export function initCloudContainer() {
  if (USE_TEST_FIXTURES) return

  // #ifdef MP-WEIXIN
  const cloud = getWeixinCloud()
  if (cloud?.init) {
    try {
      cloud.init({
        env: WX_CLOUD_ENV
      })
    } catch (error) {
      console.warn('WeChat cloud container init skipped:', error)
    }
  }
  // #endif
}

export async function requestApi(path, options = {}) {
  const method = options.method || 'GET'

  if (USE_TEST_FIXTURES) {
    return fixtureResponse(path)
  }

  // #ifdef MP-WEIXIN
  const cloud = getWeixinCloud()
  if (!cloud?.callContainer) {
    throw new Error('WeChat cloud container api unavailable')
  }

  return cloud.callContainer({
    config: {
      env: WX_CLOUD_ENV
    },
    path,
    header: {
      'X-WX-SERVICE': WX_CLOUD_SERVICE,
      'content-type': 'application/json',
      ...(options.header || {})
    },
    method,
    data: options.data ?? ''
  })
  // #endif

  // #ifndef MP-WEIXIN
  return uni.request({
    url: `${API_BASE}${path}`,
    method,
    data: options.data || undefined,
    header: {
      'content-type': 'application/json',
      ...(options.header || {})
    }
  })
  // #endif
}

function getWeixinCloud() {
  // #ifdef MP-WEIXIN
  return wx?.cloud
  // #endif

  // #ifndef MP-WEIXIN
  return null
  // #endif
}

function fixtureResponse(path) {
  const items = [
    fixtureProduce('caomei', '草莓', 'Strawberry', 'fruit', 'berry', ['酸甜', '多汁'], ['维C']),
    fixtureProduce('putao', '葡萄', 'Grape', 'fruit', 'berry', ['清甜'], ['花青素']),
    fixtureProduce('xihongshi', '西红柿', 'Tomato', 'vegetable', 'fruit-vegetable', ['酸甜'], ['番茄红素']),
    fixtureProduce('huanggua', '黄瓜', 'Cucumber', 'vegetable', 'gourd', ['清爽'], ['补水'])
  ]

  const detailMatch = path.match(/^\/api\/produce\/([^/?#]+)/)
  if (detailMatch) {
    const item = items.find(entry => entry.slug === detailMatch[1])
    return Promise.resolve({
      statusCode: item ? 200 : 404,
      data: item ? { item } : { error: 'not found' }
    })
  }

  return Promise.resolve({
    statusCode: 200,
    data: { items, filters: {} }
  })
}

function fixtureProduce(slug, name, englishName, category, subCategory, tasteTags, benefitTags) {
  return {
    slug,
    name,
    englishName,
    category,
    subCategory,
    aliases: [],
    matureMonths: [5, 6, 7],
    bestMonths: [6],
    tasteTags,
    benefitTags,
    storageDays: 3,
    regionNotes: `${name}在华东夏季供应稳定。`,
    bestUse: `${name}适合鲜食。`,
    selectionTips: `挑选${name}时看色泽和香气。`,
    regionalSeasons: [
      { region: '华东', months: [5, 6, 7], bestMonths: [6], note: '华东当令' }
    ],
    seasonTerms: ['芒种'],
    nutritionPer100g: {
      energyKcal: category === 'fruit' ? 45 : 18,
      carbohydrateG: category === 'fruit' ? 10 : 3.9,
      fiberG: 1.5,
      proteinG: 0.8,
      vitaminCMg: category === 'fruit' ? 45 : 14,
      potassiumMg: category === 'fruit' ? 160 : 237
    },
    varieties: slug === 'caomei'
      ? [{ name: '红颜', season: '12月-5月', note: '香气明显', origin: '华东', traits: ['甜香'] }]
      : []
  }
}
