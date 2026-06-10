const produce = require("../../data/produce")

const MONTHS = [
  "1月 · 小寒",
  "2月 · 立春",
  "3月 · 惊蛰",
  "4月 · 清明",
  "5月 · 立夏",
  "6月 · 芒种",
  "7月 · 小暑",
  "8月 · 立秋",
  "9月 · 白露",
  "10月 · 寒露",
  "11月 · 立冬",
  "12月 · 大雪"
]

const SUBCATEGORY_LABELS = {
  berry: "浆果",
  citrus: "柑橘",
  tropical: "热带果",
  pome: "仁果",
  stone: "核果",
  melon: "瓜果",
  nut: "坚果",
  leafy: "叶菜",
  "leafy-green": "叶菜",
  stem: "茎菜",
  root: "根茎类",
  tuber: "薯芋类",
  gourd: "瓜菜",
  allium: "葱蒜类",
  legume: "豆类",
  pod: "豆类",
  flower: "花菜",
  mushroom: "菌菇",
  grain: "谷物",
  aquatic: "水生菜"
}

const NUTRIENTS = [
  { key: "vitaminCMg", label: "维C", unit: "mg" },
  { key: "fiberG", label: "膳食纤维", unit: "g" },
  { key: "proteinG", label: "蛋白质", unit: "g" },
  { key: "potassiumMg", label: "钾", unit: "mg" },
  { key: "energyKcal", label: "热量", unit: "kcal" }
]

const PROVINCES = [
  { province: "山东", fruits: ["苹果", "梨", "葡萄"], vegetables: ["大蒜", "西红柿", "白菜", "黄瓜"], note: "北方果蔬供应大省" },
  { province: "云南", fruits: ["芒果", "葡萄", "蓝莓"], vegetables: ["鲜花菜", "西红柿", "辣椒"], note: "高原果蔬与花菜特色" },
  { province: "广东", fruits: ["荔枝", "龙眼", "芒果", "香蕉"], vegetables: ["空心菜", "苦瓜", "冬瓜"], note: "岭南热带水果核心产区" },
  { province: "新疆", fruits: ["葡萄", "哈密瓜", "甜瓜", "西瓜"], vegetables: ["洋葱", "胡萝卜", "番茄"], note: "日照强，瓜果糖分高" },
  { province: "上海", fruits: ["桃子", "葡萄"], vegetables: ["毛豆", "青菜", "茭白"], note: "本地夏令小菜与鲜果" }
]

function isInMonth(item, month) {
  return (item.bestMonths || []).includes(month) || (item.matureMonths || []).includes(month)
}

function itemReason(item) {
  return (item.benefitTags || [])[0] || "当季"
}

function labelForSubCategory(item) {
  return SUBCATEGORY_LABELS[item.subCategory] || "食材"
}

function formatSeason(item) {
  const months = item.matureMonths || []
  if (!months.length) return "全年"
  return `${months[0]}月-${months[months.length - 1]}月`
}

function normalizeItem(item, month) {
  return {
    ...item,
    subCategoryLabel: labelForSubCategory(item),
    seasonLabel: formatSeason(item),
    reason: itemReason(item),
    inSeason: isInMonth(item, month),
    badge: item.category === "fruit" ? "果" : "菜"
  }
}

Page({
  data: {
    tabs: [
      { value: "season", label: "当季", icon: "♨" },
      { value: "category", label: "分类", icon: "▦" },
      { value: "origin", label: "产地", icon: "▱" },
      { value: "ranking", label: "排行", icon: "▥" }
    ],
    categories: [
      { value: "all", label: "全部" },
      { value: "fruit", label: "水果" },
      { value: "vegetable", label: "蔬菜" }
    ],
    nutrients: NUTRIENTS,
    monthOptions: MONTHS,
    activeTab: "season",
    activeCategory: "fruit",
    activeMonth: 6,
    activeMonthIndex: 5,
    activeNutrient: "vitaminCMg",
    activeRankingCategory: "fruit",
    activeProvinceIndex: 0,
    query: "",
    heroTitle: "芒种",
    heroCount: 0,
    visibleItems: [],
    categoryGroups: [],
    rankingItems: [],
    provinceOptions: PROVINCES.map(item => item.province),
    provinceProfile: {},
    selectedDetail: null
  },

  onLoad() {
    this.refresh()
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.value }, () => this.refresh())
  },

  selectCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.value }, () => this.refresh())
  },

  onSearch(event) {
    this.setData({ query: event.detail.value }, () => this.refresh())
  },

  onMonthChange(event) {
    const index = Number(event.detail.value)
    this.setData({
      activeMonthIndex: index,
      activeMonth: index + 1
    }, () => this.refresh())
  },

  selectRankingCategory(event) {
    this.setData({ activeRankingCategory: event.currentTarget.dataset.value }, () => this.refreshRanking())
  },

  selectNutrient(event) {
    this.setData({ activeNutrient: event.currentTarget.dataset.value }, () => this.refreshRanking())
  },

  onProvinceChange(event) {
    this.setData({ activeProvinceIndex: Number(event.detail.value) }, () => this.refreshProvince())
  },

  openDetail(event) {
    const slug = event.currentTarget.dataset.slug
    const item = produce.find(entry => entry.slug === slug)
    this.setData({ selectedDetail: item ? normalizeItem(item, this.data.activeMonth) : null })
  },

  closeDetail() {
    this.setData({ selectedDetail: null })
  },

  noop() {},

  refresh() {
    const month = this.data.activeMonth
    const keyword = this.data.query.trim()
    const visibleItems = produce
      .filter(item => this.data.activeCategory === "all" || item.category === this.data.activeCategory)
      .filter(item => !keyword || [item.name, item.englishName, ...(item.aliases || []), ...(item.benefitTags || [])].join(" ").includes(keyword))
      .filter(item => this.data.activeTab !== "season" || isInMonth(item, month))
      .map(item => normalizeItem(item, month))
      .sort((a, b) => Number(b.inSeason) - Number(a.inSeason) || a.name.localeCompare(b.name, "zh-Hans-CN"))
      .slice(0, 20)

    this.setData({
      heroTitle: MONTHS[month - 1].split(" · ")[1],
      heroCount: produce.filter(item => isInMonth(item, month)).length,
      visibleItems,
      categoryGroups: this.buildCategoryGroups(month)
    })
    this.refreshRanking()
    this.refreshProvince()
  },

  buildCategoryGroups(month) {
    const groups = {}
    produce.forEach(item => {
      if (!groups[item.subCategory]) {
        groups[item.subCategory] = {
          key: item.subCategory,
          label: labelForSubCategory(item),
          category: item.category,
          items: []
        }
      }
      groups[item.subCategory].items.push(normalizeItem(item, month))
    })
    return Object.values(groups)
      .filter(group => this.data.activeCategory === "all" || group.category === this.data.activeCategory)
      .map(group => ({
        ...group,
        count: group.items.length,
        inSeasonCount: group.items.filter(item => item.inSeason).length,
        preview: group.items.slice(0, 4)
      }))
      .slice(0, 12)
  },

  refreshRanking() {
    const nutrient = NUTRIENTS.find(item => item.key === this.data.activeNutrient) || NUTRIENTS[0]
    const rankingItems = produce
      .filter(item => item.category === this.data.activeRankingCategory)
      .filter(item => Number.isFinite(Number(item.nutritionPer100g && item.nutritionPer100g[nutrient.key])))
      .sort((a, b) => Number(b.nutritionPer100g[nutrient.key]) - Number(a.nutritionPer100g[nutrient.key]))
      .slice(0, 8)
      .map((item, index) => ({
        ...normalizeItem(item, this.data.activeMonth),
        rank: index + 1,
        rankIcon: index === 0 ? "🏆" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`,
        nutrientValue: `${item.nutritionPer100g[nutrient.key]}${nutrient.unit}`
      }))
    this.setData({ rankingItems })
  },

  refreshProvince() {
    const profile = PROVINCES[this.data.activeProvinceIndex] || PROVINCES[0]
    const names = [...profile.fruits, ...profile.vegetables]
    this.setData({
      provinceProfile: {
        ...profile,
        count: names.length,
        items: names.map(name => {
          const item = produce.find(entry => entry.name === name)
          return item ? normalizeItem(item, this.data.activeMonth) : { name, slug: "", category: "vegetable", badge: "菜" }
        })
      }
    })
  }
})
