import { expect, test } from '@playwright/test'

const items = [
  produce({
    slug: 'caomei',
    name: '草莓',
    englishName: 'Strawberry',
    category: 'fruit',
    subCategory: 'berry',
    tasteTags: ['酸甜', '多汁'],
    benefitTags: ['维C'],
    nutritionPer100g: { energyKcal: 32, carbohydrateG: 7.7, fiberG: 2, proteinG: 0.7, vitaminCMg: 58, potassiumMg: 153 },
    varieties: [{ name: '红颜', season: '12月-5月', note: '香气明显', origin: '华东', traits: ['甜香'] }]
  }),
  produce({
    slug: 'putao',
    name: '葡萄',
    englishName: 'Grape',
    category: 'fruit',
    subCategory: 'berry',
    tasteTags: ['清甜'],
    benefitTags: ['花青素'],
    nutritionPer100g: { energyKcal: 69, carbohydrateG: 18, fiberG: 0.9, proteinG: 0.7, vitaminCMg: 10, potassiumMg: 191 }
  }),
  produce({
    slug: 'xihongshi',
    name: '西红柿',
    englishName: 'Tomato',
    category: 'vegetable',
    subCategory: 'fruit-vegetable',
    tasteTags: ['酸甜'],
    benefitTags: ['番茄红素'],
    nutritionPer100g: { energyKcal: 18, carbohydrateG: 3.9, fiberG: 1.2, proteinG: 0.9, vitaminCMg: 14, potassiumMg: 237 }
  }),
  produce({
    slug: 'huanggua',
    name: '黄瓜',
    englishName: 'Cucumber',
    category: 'vegetable',
    subCategory: 'gourd',
    tasteTags: ['清爽'],
    benefitTags: ['补水'],
    nutritionPer100g: { energyKcal: 15, carbohydrateG: 3.6, fiberG: 0.5, proteinG: 0.7, vitaminCMg: 2.8, potassiumMg: 147 }
  })
]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/produce/**', async route => {
    const slug = route.request().url().split('/api/produce/')[1]?.split(/[?#]/)[0]
    const item = items.find(entry => entry.slug === slug)
    await route.fulfill({
      status: item ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(item ? { item } : { error: 'not found' })
    })
  })

  await page.route('**/api/produce?**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, filters: {} })
    })
  })
})

test('loads the seasonal H5 home and opens produce detail', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('芒种', { exact: true })).toBeVisible()
  await expect(page.getByText('草莓').first()).toBeVisible()
  await expect(page.getByText('葡萄').first()).toBeVisible()

  await page.locator('.produce-card').filter({ hasText: '草莓' }).first().click()

  await expect(page.getByText('营养成分 / 100g')).toBeVisible()
  await expect(page.getByText('挑选要点')).toBeVisible()
  await expect(page.getByText('红颜')).toBeVisible()
})

test('filters by search and keeps the seasonal result focused', async ({ page }) => {
  await page.goto('/')

  await page.locator('.search-line input').fill('葡萄')

  await expect(page.getByText('葡萄').first()).toBeVisible()
  await expect(page.locator('.produce-card').filter({ hasText: '草莓' })).toHaveCount(0)
})

test('switches category, map, and ranking tabs', async ({ page }) => {
  await page.goto('/')

  await page.locator('.tabbar-item').filter({ hasText: '分类' }).click()
  await expect(page.getByText('浆果').first()).toBeVisible()

  await page.locator('.tabbar-item').filter({ hasText: '产地' }).click()
  await expect(page.getByText('产地地图')).toBeVisible()
  await expect(page.getByText('山东').first()).toBeVisible()

  await page.locator('.tabbar-item').filter({ hasText: '排行' }).click()
  await expect(page.getByText('营养成份排行')).toBeVisible()
  await expect(page.getByText('Top')).toBeVisible()
})

function produce(overrides) {
  return {
    slug: overrides.slug,
    name: overrides.name,
    englishName: overrides.englishName,
    category: overrides.category,
    subCategory: overrides.subCategory,
    aliases: [],
    matureMonths: [5, 6, 7],
    bestMonths: [6],
    tasteTags: overrides.tasteTags || [],
    benefitTags: overrides.benefitTags || [],
    storageDays: 3,
    regionNotes: `${overrides.name}在华东夏季供应稳定。`,
    bestUse: `${overrides.name}适合鲜食。`,
    selectionTips: `挑选${overrides.name}时看色泽和香气。`,
    regionalSeasons: [
      { region: '华东', months: [5, 6, 7], bestMonths: [6], note: '华东当令' },
      { region: '华南', months: [4, 5, 6], bestMonths: [5], note: '华南较早上市' }
    ],
    seasonTerms: ['芒种'],
    nutritionPer100g: overrides.nutritionPer100g,
    varieties: overrides.varieties || []
  }
}
