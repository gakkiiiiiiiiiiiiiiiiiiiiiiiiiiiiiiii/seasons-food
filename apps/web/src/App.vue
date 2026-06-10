<template>
  <main class="shell" :class="`theme-${seasonTheme.key}`" :style="seasonTheme.style">
    <section ref="appScreenRef" class="app-screen">
      <section v-if="detailSlug" ref="detailPageRef" class="detail-page">
        <p v-if="detailLoading" class="empty">正在加载详情...</p>
        <p v-else-if="detailError" class="empty error-state">{{ detailError }}</p>
        <template v-else-if="detailItem">
          <header class="detail-page-head">
            <button type="button" aria-label="返回" @click="closeDetail">
              <Icon icon="solar:alt-arrow-right-linear" />
            </button>
            <span>{{ categoryName(detailItem.category) }} · {{ subCategoryName(detailItem.subCategory) }}</span>
            <i aria-hidden="true"></i>
          </header>

          <div class="detail-hero" :class="{ 'missing-photo': !detailItem.hasRealImage }">
            <img
              :src="detailItem.detailImage"
              :alt="detailItem.name"
              :class="{ 'fruit-outline-image': !detailItem.hasRealImage && detailItem.category === 'fruit', 'ai-preview-image': !detailItem.hasRealImage }"
            />
            <span>{{ detailItem.detailImageLabel }}</span>
          </div>

          <div class="detail-copy detail-page-copy" :class="`detail-copy--${detailItem.category}`">
            <span>{{ detailItem.englishName }}</span>
            <h2>{{ detailItem.name }}</h2>
            <div class="detail-tags">
              <b v-for="tag in detailItem.tags" :key="tag">{{ tag }}</b>
            </div>

            <div class="detail-facts">
              <article>
                <strong>{{ detailItem.season }}</strong>
                <span>成熟期</span>
              </article>
              <article>
                <strong>{{ detailItem.storageDays }}天</strong>
                <span>建议保存</span>
              </article>
              <article>
                <strong>{{ detailItem.bestNow ? '正佳' : '可尝鲜' }}</strong>
                <span>当前状态</span>
              </article>
            </div>

            <section class="detail-block">
              <h3>产地与时令</h3>
              <p>{{ detailItem.regionNotes }}</p>
              <div v-if="detailItem.regionalSeasons?.length" class="season-region-list">
                <article
                  v-for="season in detailItem.regionalSeasons"
                  :key="season.region"
                  :class="{ active: season.region === activeRegionName }"
                >
                  <strong>{{ season.region }}</strong>
                  <span>{{ formatMonths(season.months) }}</span>
                  <small>{{ season.note }}</small>
                </article>
              </div>
              <div v-if="detailItem.seasonTerms?.length" class="term-chips">
                <b v-for="term in detailItem.seasonTerms" :key="term">{{ term }}</b>
              </div>
            </section>

            <section class="detail-block">
              <h3>营养成分 / 100g</h3>
              <div class="nutrition-grid">
                <article v-for="row in nutritionRows(detailItem)" :key="row.label">
                  <strong>{{ row.value }}</strong>
                  <span>{{ row.label }}</span>
                </article>
              </div>
            </section>

            <section v-if="detailItem.varieties?.length" class="detail-block">
              <h3>常见品种</h3>
              <div class="variety-list variety-photo-list">
                <article v-for="variety in detailItem.varieties" :key="variety.name">
                  <img
                    :src="variety.image"
                    :alt="variety.name"
                    :class="{ 'fruit-outline-image': !variety.hasRealImage && detailItem.category === 'fruit', 'ai-preview-image': !variety.hasRealImage }"
                  />
                  <span v-if="!variety.hasRealImage" class="variety-image-badge">AI生成图</span>
                  <div>
                    <header>
                      <strong>{{ variety.name }}</strong>
                      <span>{{ variety.season }}</span>
                    </header>
                    <p>{{ variety.note }}</p>
                    <small>{{ variety.origin }}</small>
                    <div>
                      <b v-for="trait in variety.traits" :key="trait">{{ trait }}</b>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section class="detail-block">
              <h3>赏味建议</h3>
              <p>{{ detailItem.bestUse }}</p>
            </section>

            <section class="detail-block">
              <h3>挑选要点</h3>
              <p>{{ detailItem.selectionTips }}</p>
            </section>
          </div>
        </template>
      </section>

      <div v-else ref="scrollPageRef" class="scroll-page" @scroll="handleScrollPage">
        <section v-if="showsSearch" class="top-filter-stack" :class="{ 'with-category-tabs': activeTab === 'season' }">
          <label class="search-line">
            <Icon icon="solar:magnifer-linear" />
            <input v-model="query" type="search" :placeholder="searchPlaceholder" />
            <button v-if="query" type="button" aria-label="清空搜索" @click="query = ''">
              <Icon icon="solar:close-circle-bold" />
            </button>
          </label>

          <nav v-if="activeTab === 'season'" class="category-tabs" aria-label="分类">
            <button
              v-for="category in categories"
              :key="category.value"
              type="button"
              :aria-label="category.label"
              :title="category.label"
              :class="[`category-tabs__button--${category.value}`, { active: activeCategory === category.value }]"
              @click="event => selectCategory(category.value, event)"
            >
              <Icon :icon="category.icon" />
              <span>{{ category.label }}</span>
            </button>
          </nav>
        </section>

        <section v-if="activeTab === 'season'" class="quick-filters">
          <button class="select-pill" type="button" @click="showLocation = true">
            <Icon icon="solar:map-point-linear" />
            {{ activeLocation }}
            <Icon icon="solar:alt-arrow-down-linear" />
          </button>
          <button class="select-pill" type="button" @click="showMonth = true">
            <Icon icon="solar:calendar-linear" />
            {{ activeMonthLabel }}
            <Icon icon="solar:alt-arrow-down-linear" />
          </button>
        </section>

        <section
          v-if="activeTab === 'season'"
          class="season-card"
          :class="[`season-card--${seasonTheme.key}`, `season-card--${seasonTheme.art}`]"
          :style="seasonTheme.style"
        >
          <div class="season-badge">
            <Icon icon="solar:leaf-bold" />
            <span class="visually-hidden">当前季节</span>
          </div>
          <div class="season-copy">
            <strong>{{ seasonName }}</strong>
          </div>
          <p>
            <template v-if="seasonBestCount">
              <span class="season-summary-number">{{ seasonBestCount }}</span>
              {{ seasonSummaryText }}
            </template>
            <template v-else>{{ seasonSummaryText }}</template>
          </p>
          <Icon class="season-leaf one" icon="solar:leaf-linear" />
          <Icon class="season-leaf two" icon="solar:leaf-linear" />
          <div class="season-art" :class="`season-art--${seasonTheme.art}`" aria-hidden="true">
            <span class="season-art-main"></span>
            <span class="season-art-dot one"></span>
            <span class="season-art-dot two"></span>
          </div>
          <div class="season-wave"></div>
        </section>

        <section v-if="activeTab === 'category'" class="category-page">
          <p v-if="loading" class="empty">正在加载分类...</p>
          <p v-else-if="error" class="empty error-state">{{ error }}</p>
          <div v-else class="category-browser">
            <aside class="category-sidebar" aria-label="食材分类">
              <nav class="category-kind-switch" aria-label="切换水果蔬菜分类">
                <button
                  v-for="section in categorySidebarSections"
                  :key="section.value"
                  type="button"
                  :aria-label="section.label"
                  :title="section.label"
                  :class="{ active: activeSidebarCategory === section.value }"
                  @click="event => selectSidebarCategory(section.value, event)"
                >
                  <Icon :icon="section.icon" />
                </button>
              </nav>
              <section v-if="activeSidebarSection" ref="categorySidebarRef" :key="activeSidebarSection.value" class="category-sidebar-list">
                <button
                  v-for="group in activeSidebarSection.groups"
                  :key="group.key"
                  type="button"
                  :class="{ active: activeTypeGroup === group.key }"
                  @click="event => selectTypeGroup(group.key, event)"
                >
                  <PreviewImage :item="group" :class="{ 'fruit-outline-image': group.category === 'fruit' }" />
                  <span>{{ group.label }}</span>
                  <small>{{ group.items.length }}</small>
                </button>
              </section>
            </aside>

            <section ref="categoryContentRef" class="category-content">
              <div class="category-content-title" :class="`category-content-title--${activeTypeGroupMeta.category || 'produce'}`">
                <div>
                  <Icon :icon="activeTypeGroupMeta.icon" />
                  <h2>{{ activeTypeGroupMeta.label }}</h2>
                </div>
                <span>{{ activeTypeGroupItems.length }}</span>
              </div>

              <div class="category-list">
                <button
                  v-for="item in activeTypeGroupItems"
                  :key="item.slug"
                  type="button"
                  :class="{ active: item.inSeason }"
                  @click="openDetail(item)"
                >
                  <PreviewImage :item="item" />
                  <span>
                    <strong>{{ item.name }}</strong>
                    <small class="category-item-meta">
                      <em>{{ item.season }}</em>
                      <i>{{ item.reason }}</i>
                    </small>
                  </span>
                  <b v-if="item.inSeason">当季</b>
                </button>
              </div>
            </section>
          </div>
        </section>

        <section v-else-if="activeTab === 'map'" class="origin-map-page">
          <div class="page-title-line">
            <div>
              <Icon icon="inseason:origin-map" />
              <h2>产地地图</h2>
            </div>
            <div class="province-selector" :class="{ open: showProvincePicker }">
              <button
                type="button"
                class="province-selector__trigger"
                :aria-expanded="showProvincePicker"
                aria-haspopup="listbox"
                @click="toggleProvincePicker"
              >
                <span>{{ selectedProvince || '全国' }}</span>
                <Icon icon="solar:alt-arrow-down-linear" />
              </button>
              <div v-if="showProvincePicker" class="province-selector__menu">
                <label class="province-selector__search">
                  <Icon icon="solar:magnifer-linear" />
                  <input
                    v-model.trim="provinceSearch"
                    type="search"
                    placeholder="搜索省份"
                    @keydown.escape="showProvincePicker = false"
                  />
                </label>
                <div class="province-selector__options" role="listbox">
                  <button
                    v-for="profile in filteredProvinceOptions"
                    :key="profile.province"
                    type="button"
                    :class="{ active: selectedProvince === profile.province }"
                    role="option"
                    :aria-selected="selectedProvince === profile.province"
                    @click="selectOriginProvince(profile.province)"
                  >
                    <span>{{ profile.province }}</span>
                    <small>{{ profile.count || (profile.fruits.length + profile.vegetables.length) }} 种</small>
                  </button>
                  <p v-if="!filteredProvinceOptions.length">没有匹配省份</p>
                </div>
              </div>
            </div>
          </div>

          <section class="map-panel">
            <div ref="originMapRef" class="china-map" aria-label="中国蔬果产地地图"></div>
            <div class="map-tools">
              <button type="button" @click="resetOriginMap">
                <Icon icon="solar:map-point-linear" />
                全国
              </button>
              <span>拖动地图 · 双指缩放</span>
            </div>
          </section>

          <section class="province-produce-card">
            <header>
              <div>
                <strong>{{ selectedProvinceProfile.province }}</strong>
                <span>{{ selectedProvinceProfile.count }} 种代表蔬果</span>
              </div>
              <b>{{ selectedProvinceProfile.note }}</b>
            </header>
            <div class="province-produce-columns">
              <article class="province-produce-columns__group--fruit">
                <h3>
                  <Icon icon="solar:apple-bold" />
                  水果
                </h3>
                <div>
                  <button
                    v-for="item in selectedProvinceProfile.fruits"
                    :key="`fruit-${item.name}`"
                    type="button"
                    @click="item.item && openDetail(item.item)"
                  >
                    <PreviewImage :item="item" :class="{ 'fruit-outline-image': item.item?.category === 'fruit' }" />
                    <span>{{ item.name }}</span>
                  </button>
                </div>
              </article>
              <article class="province-produce-columns__group--vegetable">
                <h3>
                  <Icon icon="inseason:greens" />
                  蔬菜
                </h3>
                <div>
                  <button
                    v-for="item in selectedProvinceProfile.vegetables"
                    :key="`vegetable-${item.name}`"
                    type="button"
                    @click="item.item && openDetail(item.item)"
                  >
                    <PreviewImage :item="item" :class="{ 'fruit-outline-image': item.item?.category === 'fruit' }" />
                    <span>{{ item.name }}</span>
                  </button>
                </div>
              </article>
            </div>
          </section>
        </section>

        <section v-else-if="activeTab === 'ranking'" class="ranking-page">
          <div class="page-title-line">
            <div>
              <Icon icon="solar:ranking-bold" />
              <h2>营养成份排行</h2>
            </div>
            <span>{{ activeNutrientMeta.unit }}</span>
          </div>

          <nav class="ranking-category-toggle" aria-label="排行榜类别">
            <button
              v-for="category in rankingCategoryOptions"
              :key="category.value"
              type="button"
              :class="[`ranking-category-toggle__button--${category.value}`, { active: activeRankingCategory === category.value }]"
              @click="event => selectRankingCategory(category.value, event)"
            >
              <Icon :icon="category.icon" />
              <span>{{ category.label }}</span>
            </button>
          </nav>

          <nav class="nutrient-tabs" aria-label="营养成分">
            <button
              v-for="nutrient in nutrientOptions"
              :key="nutrient.key"
              type="button"
              :class="[`nutrient-tabs__button--${nutrient.key}`, { active: activeNutrient === nutrient.key }]"
              @click="event => selectNutrient(nutrient.key, event)"
            >
              <Icon :icon="nutrient.icon" />
              <span>{{ nutrient.label }}</span>
            </button>
          </nav>

          <div class="ranking-sections">
            <section :class="`ranking-sections__panel--${activeRankingCategory}`">
              <header>
                <div>
                  <Icon :icon="activeRankingCategoryMeta.icon" />
                  <span class="visually-hidden">{{ activeRankingCategoryMeta.label }}</span>
                </div>
                <span>Top {{ activeRankingItems.length }}</span>
              </header>
              <div class="ranking-list">
                <button
                  v-for="(item, index) in activeRankingItems"
                  :key="item.slug"
                  type="button"
                  @click="openDetail(item)"
                >
                  <b :class="`ranking-list__rank--${index + 1}`" :aria-label="rankingRankLabel(index)">
                    <Icon v-if="index < 3" :icon="rankingRankIcon(index)" />
                    <span v-else>{{ index + 1 }}</span>
                  </b>
                  <PreviewImage :item="item" />
                  <span>
                    <strong>{{ item.name }}</strong>
                    <small>{{ rankingCategoryLabel(item) }}</small>
                  </span>
                  <em>{{ nutrientValue(item) }}</em>
                </button>
              </div>
            </section>
          </div>
        </section>

        <section v-else class="produce-section">
          <p v-if="loading" class="empty">正在加载当季食材...</p>
          <p v-else-if="error" class="empty error-state">{{ error }}</p>

          <div v-else-if="showsSeparatedProduce" class="split-produce">
            <section
              v-for="group in produceCategorySections"
              :key="group.value"
              class="split-produce-section"
            >
              <div class="split-title">
                <div>
                  <Icon :icon="group.icon" />
                  <h3>{{ group.label }}</h3>
                </div>
                <span>{{ group.inSeasonCount }}/{{ group.items.length }}</span>
              </div>
              <div class="produce-grid">
                <ProduceCard
                  v-for="item in group.items"
                  :key="item.slug"
                  :item="item"
                  :highlight="activeTab === 'category' && item.inSeason"
                  @open="openDetail"
                />
              </div>
            </section>
          </div>

          <div v-else class="produce-grid">
            <ProduceCard
              v-for="item in visibleProduce"
              :key="item.slug"
              :item="item"
              :highlight="activeTab === 'category' && item.inSeason"
              @open="openDetail"
            />
          </div>

          <p v-if="!loading && !error && !visibleProduce.length" class="empty">{{ emptyText }}</p>
        </section>

      </div>

      <button
        v-if="showBackTopButton"
        type="button"
        class="back-top-button"
        aria-label="回到顶部"
        @click="scrollToTop"
      >
        <Icon icon="solar:alt-arrow-down-linear" />
      </button>

      <nav v-if="!detailSlug" class="tabbar" aria-label="底部导航">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          :class="[`tabbar__button--${tab.value}`, { active: activeTab === tab.value }]"
          @click="event => selectTab(tab.value, event)"
        >
          <Icon :icon="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>
    </section>

    <ChoiceSheet
      v-if="showLocation"
      title="选择地区"
      :options="locations"
      :value="activeLocation"
      @close="showLocation = false"
      @select="value => { activeLocation = value; showLocation = false }"
    />
    <ChoiceSheet
      v-if="showMonth"
      title="选择月令"
      :options="monthOptions.map(option => option.label)"
      :value="activeMonthLabel"
      @close="showMonth = false"
      @select="selectMonth"
    />
  </main>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const iconPaths = {
  'solar:map-point-bold': [
    ['path', { d: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z' }],
    ['circle', { cx: '12', cy: '10', r: '2.7', fill: 'currentColor', stroke: 'none' }]
  ],
  'solar:map-point-linear': [
    ['path', { d: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z' }],
    ['circle', { cx: '12', cy: '10', r: '2.6' }]
  ],
  'solar:alt-arrow-right-linear': [['path', { d: 'm9 6 6 6-6 6' }]],
  'solar:alt-arrow-down-linear': [['path', { d: 'm6 9 6 6 6-6' }]],
  'solar:magnifer-linear': [['circle', { cx: '11', cy: '11', r: '7' }], ['path', { d: 'm16.5 16.5 4 4' }]],
  'solar:close-circle-bold': [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'm9 9 6 6m0-6-6 6', stroke: '#fff' }]
  ],
  'inseason:rank-champion': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M7 4h10v3.4c0 2.6-1.7 4.8-4 5.45V16h2.9c.95 0 1.7.75 1.7 1.7V20H6.4v-2.3c0-.95.75-1.7 1.7-1.7H11v-3.15c-2.3-.65-4-2.85-4-5.45V4Z' }],
      ['path', { d: 'M5.7 5.7H3.5v1.35c0 1.6 1.1 2.95 2.7 3.25.42.08.8-.25.8-.68V7c0-.72-.58-1.3-1.3-1.3Zm12.6 0h2.2v1.35c0 1.6-1.1 2.95-2.7 3.25-.42.08-.8-.25-.8-.68V7c0-.72.58-1.3 1.3-1.3Z' }]
    ]
  },
  'inseason:rank-runner-up': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M7.15 2.9h3.35L12 6.08l1.5-3.18h3.35l-2.9 5.38A6.55 6.55 0 0 0 12 8c-.68 0-1.34.1-1.95.28L7.15 2.9Z' }],
      ['path', { d: 'M12 9.2a5.65 5.65 0 1 0 0 11.3 5.65 5.65 0 0 0 0-11.3Zm-2.2 7.72c2.78-1.92 3.58-2.52 3.58-3.5 0-.58-.44-.98-1.14-.98-.62 0-1.2.28-1.72.82l-1-1.14a3.55 3.55 0 0 1 2.86-1.24c1.72 0 2.88.98 2.88 2.36 0 1.18-.74 2.12-2.62 3.42h2.72v1.46H9.8v-1.2Z' }]
    ]
  },
  'inseason:rank-third': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M7.15 2.9h3.35L12 6.08l1.5-3.18h3.35l-2.9 5.38A6.55 6.55 0 0 0 12 8c-.68 0-1.34.1-1.95.28L7.15 2.9Z' }],
      ['path', { d: 'M12 9.2a5.65 5.65 0 1 0 0 11.3 5.65 5.65 0 0 0 0-11.3Zm.16 9.08c-1.28 0-2.22-.42-2.9-1.14l.86-1.16c.52.5 1.2.78 1.9.78.82 0 1.26-.34 1.26-.86 0-.58-.48-.82-1.42-.82h-.74v-1.34h.72c.78 0 1.26-.26 1.26-.78 0-.5-.4-.78-1.08-.78-.62 0-1.16.26-1.62.72l-.88-1.08c.68-.72 1.52-1.06 2.66-1.06 1.66 0 2.72.78 2.72 2.02 0 .72-.42 1.28-1.1 1.58.8.28 1.3.88 1.3 1.72 0 1.3-1.16 2.2-2.94 2.2Z' }]
    ]
  },
  'inseason:nutrient-vitamin-c': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M10.7 3.1c.38 1.58-.42 3.08-2.3 4.24-1.35.84-2.78 1.08-4.22.72.48-1.62 1.42-2.88 2.82-3.76 1.2-.76 2.44-1.16 3.7-1.2Z' }],
      ['path', { d: 'M13.2 6.4A7.7 7.7 0 1 0 13.2 21.8 7.7 7.7 0 0 0 13.2 6.4Zm0 2.05a5.65 5.65 0 1 1 0 11.3 5.65 5.65 0 0 1 0-11.3Z' }],
      ['path', { d: 'M13.2 10.05a4.05 4.05 0 0 0 0 8.1v-8.1Z' }]
    ]
  },
  'inseason:nutrient-fiber': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    paths: [
      ['path', { d: 'M12 21V4' }],
      ['path', { d: 'M12 8c-3.6-.2-5.8-1.7-6.6-4.5C9 3.6 11.2 5.1 12 8Z' }],
      ['path', { d: 'M12 12c-3.6-.2-5.8-1.7-6.6-4.5C9 7.6 11.2 9.1 12 12Z' }],
      ['path', { d: 'M12 16c-3.6-.2-5.8-1.7-6.6-4.5C9 11.6 11.2 13.1 12 16Z' }],
      ['path', { d: 'M12 8c3.6-.2 5.8-1.7 6.6-4.5C15 3.6 12.8 5.1 12 8Z' }],
      ['path', { d: 'M12 12c3.6-.2 5.8-1.7 6.6-4.5C15 7.6 12.8 9.1 12 12Z' }],
      ['path', { d: 'M12 16c3.6-.2 5.8-1.7 6.6-4.5C15 11.6 12.8 13.1 12 16Z' }]
    ]
  },
  'inseason:nutrient-protein': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M8.7 4.1c3.15 0 5.7 3.32 5.7 7.42 0 4.55-2.34 8.38-5.7 8.38S3 16.07 3 11.52C3 7.42 5.55 4.1 8.7 4.1Zm0 3.05c-1.48 0-2.68 1.68-2.68 3.75 0 2.25 1.08 4.12 2.68 4.12s2.68-1.87 2.68-4.12c0-2.07-1.2-3.75-2.68-3.75Z' }],
      ['path', { d: 'M16.8 6.45c2.34 0 4.2 2.34 4.2 5.22 0 3.22-1.76 5.88-4.2 5.88-1.16 0-2.18-.6-2.9-1.58.92-1.55 1.42-3.48 1.42-5.38 0-1.38-.26-2.7-.74-3.86.64-.2 1.38-.28 2.22-.28Z' }]
    ]
  },
  'inseason:nutrient-potassium': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2.1',
    paths: [
      ['path', { d: 'M5.2 13.2c4.6 4.3 11.1 4.15 14.2-.35-6.2 1.2-10.2-.95-12.5-6.45-.45 2.55-1.02 4.7-1.7 6.8Z' }],
      ['path', { d: 'M6.9 6.4 5.4 5.1M19.4 12.85l1.5-1.1' }]
    ]
  },
  'inseason:nutrient-calorie': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M12.65 2.7c.65 3.32-.4 5.35-2.08 7.18-.92 1-1.72 1.9-1.72 3.35 0 1.15.66 2.1 1.66 2.58-.2-1.45.34-2.68 1.14-3.66.58-.7 1.04-1.4 1.06-2.5 2.22 1.55 3.54 3.48 3.54 5.82 0 3.32-2.62 5.83-6.05 5.83-3.34 0-6.05-2.52-6.05-6.22 0-2.62 1.42-4.7 3.05-6.38 1.94-2 3.38-3.4 5.45-6Z' }],
      ['path', { d: 'M15.8 5.2c2.7 1.48 4.05 3.72 4.05 6.62 0 1.34-.38 2.52-1.1 3.5-.18-2.56-1.28-4.8-3.3-6.72.46-1.08.58-2.22.35-3.4Z' }]
    ]
  },
  'solar:calendar-linear': [
    ['rect', { x: '4', y: '5', width: '16', height: '15', rx: '3' }],
    ['path', { d: 'M8 3v4m8-4v4M4 10h16m-12 4h.01m4 0h.01m4 0h.01' }]
  ],
  'solar:leaf-bold': [['path', { d: 'M20 4C11 4 5 9.5 5 16.5c0 2.1 1.4 3.5 3.5 3.5C15.5 20 20 13 20 4zM4 20c3-5 7-8 12-10' }]],
  'solar:leaf-linear': [['path', { d: 'M20 4C11 4 5 9.5 5 16.5c0 2.1 1.4 3.5 3.5 3.5C15.5 20 20 13 20 4zM4 20c3-5 7-8 12-10' }]],
  'inseason:greens': {
    viewBox: '0 0 1170 1024',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M959.817 187.173c126.354 24.868 195.73 88.43 207.726 185.307 11.081 89.71-15.36 148.187-81.554 180.37-18.03-136.484-111.982-187.245-204.544-149.065-31.818-39.753-61.44-81.737-96.403-118.308-20.663-21.65-48.018-44.618-75.41-49.738-70.363-13.092-109.166-43.3-122.368-122.148-11.52-68.681 16.53-128 83.09-107.959 67.584 20.297 134.4 28.416 202.387 40.338 62.317 10.972 91.648 70.4 87.076 141.166zM378.405 947.017c-45.349 8.668-91.795 27.648-135.827 22.93-38.729-4.132-86.418-25.417-109.495-55.734-43.812-57.6-39.753-127.781 15.909-177.957 44.763-40.338 96.475-77.093 151.186-100.352 181.54-77.093 362.935-53.723 544.293 17.554-178.14 63.708-330.752 167.022-468.114 295.497l2.048-1.938zM654.263 762.039L897.755 660.48l5.084-14.629-186.222-70.473c48.933-38.985 103.278-81.188 156.38-124.964 35.291-29.075 70.912-48.86 116.297-23.625 44.653 24.868 75.556 63.158 69.668 114.834-6.692 58.953 15.068 103.022 41.18 151.588 18.395 34.122 29.33 78.958 26.039 117.395-4.901 57.417-41.07 68.169-90.698 39.607-17.005-9.802-38.034-14.629-57.746-16.53-78.263-7.498-151.04-57.857-235.959-24.394-22.308 8.777-57.49-16.932-86.784-26.843l-0.731-20.407zM537.088 242.688c77.458-15.067 155.685 0 232.448 69.376-99.474 8.192-147.785 81.189-209.774 135.131-30.061 26.186-66.194 67.475-103.68 3.548-3.913-6.693-23.625-6.583-35.328-4.937-60.27 8.594-96.914-25.82-96.292-87.15 0.183-18.578-7.059-41.618-18.944-55.186-45.349-51.603-54.711-112.53-21.724-172.215a160.695 160.695 0 0 1 176.823-79.836c61.111 13.532 116.517 69.852 115.017 128.366-0.548 21.65-25.417 42.642-38.546 62.903zM18.578 822.565c68.023 29.22 93.111 78.848 80.823 149.833L18.578 822.565z m357.779 126.39l104.301-43.593c-107.264 124.343-312.612 158.025-350.793 59.392 87.516 27.502 171.374 39.79 248.503-17.7l-2.011 1.901z m222.939-389.851c38.18-63.598 70.254-127.195 112.896-182.199 14.007-18.103 61.257-27.282 82.761-17.079 40.594 19.2 43.41 63.488 19.09 100.974-50.834 78.519-127.597 101.083-214.747 98.267z m90.624 350.647c-74.13 73.508-134.766-39.863-208.823-11.959l-6.144-13.824c43.557-29.733 86.236-61.074 131.401-87.918 9.107-5.412 27.758 6.035 41.948 9.875 36.388 9.837 77.348 35.84 108.251 26.55 84.188-25.234 156.16 23.187 234.752 26.442 44.91 1.828 54.93 34.45 22.492 66.45-20.334 20.004-51.274 38.656-78.154 39.79-69.12 2.852-138.898-2.341-207.872-9.436-12.544-1.28-22.747-26.77-37.851-45.97z m-21.504-536.32c-13.385 87.662-56.247 148.992-136.594 174.007-63.89 19.895-131.145 29.44-193.646 52.809-58.441 21.833-117.029 49.371-167.131 86.455-38.474 28.452-63.854 75.556-101.523 122.404-72.887 1.5-86.381-48.823-50.212-117.504 25.417-48.274 81.664-81.92 128.987-114.834 59.319-41.216 123.575-74.971 197.888-119.186 32.951 11.812 82.871 37.12 135.351 45.348 26.587 4.17 61.074-17.847 86.053-36.388 36.425-27.063 67.474-61.733 100.827-93.111z' }]
    ]
  },
  'solar:bowl-spoon-bold': [
    ['path', { d: 'M4 12h16c-.4 4.5-3.6 8-8 8s-7.6-3.5-8-8z' }],
    ['path', { d: 'M7 12c0-2 2-4 5-4s5 2 5 4M6 21h12M18 3c1.4 2 .8 4.2-1.5 5.5', fill: 'none' }]
  ],
  'inseason:produce-all': {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'none',
    paths: [
      ['path', { d: 'M17.35 5.7c1.65-1.42 3.22-1.76 4.65-1.02-.22 1.9-1.3 2.98-3.2 3.25-.55.08-1.02.05-1.46-.08.05.6-.02 1.18-.18 1.78-.52 1.82-1.78 2.86-3.78 3.12-.48-1.4-.32-2.74.5-4.02.78-1.2 1.96-1.94 3.47-3.03Z', fill: '#55A85E', transform: 'translate(1.65 -0.1)' }],
      ['path', { d: 'M10.38 7.72c-1.7-2.14-3.98-2.38-5.26-.95-1.5 1.68-.68 4.72 1.96 5.72 1.46.55 2.7-.02 3.56-.9.86.88 2.1 1.45 3.56.9 2.64-1 3.46-4.04 1.96-5.72-1.28-1.43-3.56-1.19-5.26.95h-.52Z', fill: '#D55E45', transform: 'rotate(-18 9.8 8.9) translate(-1.55 -0.15)' }],
      ['path', { d: 'M11.25 6.18c.24-1.7 1.58-2.86 3.52-3.08.04 1.92-1.26 3.08-3.52 3.08Z', fill: '#D55E45', transform: 'rotate(-18 9.8 8.9) translate(-1.55 -0.15)' }],
      ['path', { d: 'M1.7 9.85h20.6l-1.78 8.08a3.56 3.56 0 0 1-3.48 2.78H6.96a3.56 3.56 0 0 1-3.48-2.78L1.7 9.85Z', fill: '#D6A340' }],
      ['path', { d: 'M5.7 13.45h12.6M6.75 16.62h10.5', stroke: '#FFF4D8', 'stroke-width': '1.86', 'stroke-linecap': 'round' }]
    ]
  },
  'inseason:season-basket': {
    viewBox: '0 0 1024 1024',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M160.022528 320.585728c0 68.026368 55.345152 123.37152 123.37152 123.37152 68.009984 0 123.37152-55.345152 123.37152-123.37152 0-60.37504-43.646976-110.657536-101.00736-121.2416-0.049152-20.004864-1.80224-39.7312-7.04512-53.510144a16.433152 16.433152 0 0 0-21.184512-9.453568 16.416768 16.416768 0 0 0-9.453568 21.168128c3.571712 9.33888 4.882432 24.100864 4.947968 40.206336-63.193088 5.292032-113.000448 58.32704-113.000448 122.830848z m111.706112-89.751552a610.844672 610.844672 0 0 1-2.408448 25.526272 25.608192 25.608192 0 0 1-3.424256-1.441792 16.384 16.384 0 0 0-16.87552 28.082176c6.438912 3.93216 18.382848 8.224768 33.34144 8.224768l0.393216-0.016384 0.65536 0.049152c0.212992 0 0.4096-0.098304 0.638976-0.114688a82.57536 82.57536 0 0 0 31.752192-7.12704 16.384 16.384 0 1 0-13.172736-29.98272h-0.065536c0.688128-6.38976 1.39264-13.59872 1.96608-21.46304 39.763968 9.568256 69.46816 45.350912 69.46816 88.014848 0 49.9712-40.648704 90.60352-90.60352 90.60352-49.9712 0-90.60352-40.63232-90.60352-90.60352 0-45.989888 34.471936-84.000768 78.938112-89.751552z' }],
      ['path', { d: 'M385.695744 421.822464a16.384 16.384 0 0 0 10.911744 30.63808c244.1216-54.444032 255.492096-261.210112 259.76832-339.034112l0.08192-1.753088 0.016384-0.393216c1.47456-26.54208-11.55072-50.675712-32.27648-63.602688 3.653632-3.52256 7.798784-7.192576 13.008896-11.14112A16.384 16.384 0 0 0 617.34912 10.452992c-12.664832 9.633792-21.757952 18.8416-28.409856 27.394048-20.267008 0-38.66624 9.371648-55.62368 27.36128-23.42912 24.936448-35.274752 53.772288-33.292288 81.199104 15.024128 207.50336-109.051904 272.744448-114.343936 275.41504zM572.45696 75.464704c-3.293184 38.961152 40.943616 29.065216 32.571392 5.029888a18.0224 18.0224 0 0 1 0.622592-5.521408 37.35552 37.35552 0 0 1 17.85856 27.492352c-34.701312 25.198592-63.799296 9.58464-77.299712-1.114112 3.162112-4.66944 6.832128-9.25696 10.97728-13.68064 5.062656-5.357568 10.15808-9.371648 15.269888-12.222464z m-39.7312 68.583424c-0.278528-3.751936 0-7.634944 0.606208-11.55072 13.959168 9.191424 32.11264 16.580608 52.658176 16.580608 11.30496 0 23.330816-2.359296 35.71712-7.766016-6.144 74.186752-28.573696 192.83968-155.680768 253.362176 37.650432-46.44864 75.743232-125.386752 66.68288-250.626048z' }],
      ['path', { d: 'M850.952192 166.920192c-37.945344-15.302656-76.546048-2.015232-89.276416 26.836992L644.87424 458.91584H175.046656c-35.110912 0-59.71968 35.127296-47.5136 68.108288L214.040576 761.856a76.84096 76.84096 0 0 0 72.073216 50.21696h408.45312c31.9488 0 60.882944-20.15232 72.056832-50.167808l86.409216-234.881024a50.593792 50.593792 0 0 0-34.914304-66.469888l78.348288-212.189184c10.665984-27.820032-5.98016-65.142784-45.531136-81.461248zM822.31296 515.6864L735.903744 750.55104a44.285952 44.285952 0 0 1-41.304064 28.786688H286.130176a44.007424 44.007424 0 0 1-41.28768-28.737536L158.26944 515.670016a17.85856 17.85856 0 0 1 16.777216-23.986176h630.489088c12.304384 0 21.069824 12.320768 16.760832 24.00256z m43.515904-278.85568L783.81056 458.91584h-103.120896l110.968832-251.953152c5.586944-12.648448 27.93472-17.36704 46.94016-9.682944 16.580608 6.832128 32.964608 24.608768 27.19744 39.56736z' }],
      ['path', { d: 'M766.3616 537.8048a16.351232 16.351232 0 0 0-21.233664 9.25696l-54.181888 138.313728a16.384 16.384 0 1 0 30.490624 11.96032l54.198272-138.297344a16.384 16.384 0 0 0-9.273344-21.233664zM603.865088 357.859328c-3.702784 14.7456-13.205504 39.927808-21.79072 47.104a16.384 16.384 0 0 0 20.97152 25.165824c19.791872-16.515072 30.63808-56.426496 32.60416-64.258048a16.384 16.384 0 0 0-31.78496-8.011776z' }]
    ]
  },
  'solar:apple-bold': {
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M11.4 8.6c1.55-2.1 3.65-2.8 5.75-1.78 2.68 1.3 3.32 4.9 1.82 8.45-1.38 3.25-3.48 5.55-5.72 5.55-.78 0-1.42-.35-2.2-.35-.76 0-1.42.35-2.2.35-2.24 0-4.34-2.3-5.72-5.55-1.5-3.55-.86-7.15 1.82-8.45 2.1-1.02 4.18-.32 5.75 1.78h.7z' }],
      ['path', { d: 'M12.95 6.7c.34-1.95 1.86-3.3 4.08-3.54.04 2.27-1.48 3.62-4.08 3.54z' }]
    ]
  },
  'solar:home-2-bold': [['path', { d: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z' }]],
  'solar:widget-5-bold': [
    ['rect', { x: '4', y: '4', width: '7', height: '7', rx: '2' }],
    ['rect', { x: '13', y: '4', width: '7', height: '7', rx: '2' }],
    ['rect', { x: '4', y: '13', width: '7', height: '7', rx: '2' }],
    ['rect', { x: '13', y: '13', width: '7', height: '7', rx: '2' }]
  ],
  'solar:map-bold': [
    ['path', { d: 'M4 5.5 9 3l6 2.5 5-2.5v15.5l-5 2.5-6-2.5-5 2.5V5.5Z' }],
    ['path', { d: 'M9 3v15.5m6-13v15.5', fill: 'none', stroke: '#fff' }]
  ],
  'inseason:origin-map': {
    viewBox: '0 0 1117 1024',
    fill: 'currentColor',
    stroke: 'none',
    paths: [
      ['path', { d: 'M930.909091 139.636364H407.272727C377.018182 58.181818 300.218182 0 209.454545 0 109.381818 0 23.272727 72.145455 4.654545 167.563636 2.327273 181.527273 0 195.490909 0 209.454545v628.363637c0 102.4 83.781818 186.181818 186.181818 186.181818h744.727273c102.4 0 186.181818-83.781818 186.181818-186.181818V325.818182c0-102.4-83.781818-186.181818-186.181818-186.181818z m93.090909 186.181818v337.454545l-283.927273-100.072727L826.181818 232.727273H930.909091c51.2 0 93.090909 41.890909 93.090909 93.090909z m-293.236364-93.090909L651.636364 535.272727l-232.727273-81.454545V232.727273h311.854545zM93.090909 232.727273V209.454545c0-25.6 9.309091-51.2 23.272727-69.818181 20.945455-27.927273 53.527273-46.545455 93.090909-46.545455s72.145455 18.618182 93.09091 46.545455c13.963636 18.618182 23.272727 44.218182 23.272727 69.818181v449.163637c-32.581818-23.272727-74.472727-34.909091-116.363637-34.909091s-83.781818 13.963636-116.363636 34.909091V232.727273z m837.818182 698.181818H186.181818c-51.2 0-93.090909-41.890909-93.090909-93.090909v-6.981818c0-65.163636 51.2-116.363636 116.363636-116.363637s116.363636 51.2 116.363637 116.363637c0 25.6 20.945455 46.545455 46.545454 46.545454s46.545455-20.945455 46.545455-46.545454v-279.272728l605.090909 211.781819V837.818182c0 51.2-41.890909 93.090909-93.090909 93.090909z' }]
    ]
  },
  'solar:ranking-bold': [
    ['path', { d: 'M5 20V9h4v11H5Zm5 0V4h4v16h-4Zm5 0v-7h4v7h-4Z' }],
    ['path', { d: 'M4 20h16', fill: 'none' }]
  ],
  'solar:bolt-bold': [['path', { d: 'm13 2-8 12h6l-1 8 9-13h-6l0-7z' }]],
  'solar:chart-bold': [['path', { d: 'M4 19V5m0 14h16M8 15l3-4 3 2 5-7', fill: 'none' }]],
  'solar:check-circle-bold': [['circle', { cx: '12', cy: '12', r: '9' }], ['path', { d: 'm8 12 2.5 2.5L16 9', stroke: '#fff' }]],
  'solar:circle-linear': [['circle', { cx: '12', cy: '12', r: '9' }]]
}

const Icon = defineComponent({
  props: ['icon'],
  setup(props, { attrs }) {
    return () => {
      const iconDef = iconPaths[props.icon] || iconPaths['solar:circle-linear']
      const isConfigIcon = !Array.isArray(iconDef)
      const nodes = isConfigIcon ? iconDef.paths : iconDef
      return h('svg', {
        ...attrs,
        viewBox: isConfigIcon ? iconDef.viewBox : '0 0 24 24',
        fill: isConfigIcon ? iconDef.fill : 'none',
        stroke: isConfigIcon ? iconDef.stroke : 'currentColor',
        'stroke-width': isConfigIcon ? iconDef.strokeWidth : '1.9',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true'
      }, nodes.map(([tag, data]) => h(tag, data)))
    }
  }
})

const categories = [
  { label: '全部', value: 'all', icon: 'inseason:produce-all' },
  { label: '水果', value: 'fruit', icon: 'solar:apple-bold' },
  { label: '蔬菜', value: 'vegetable', icon: 'inseason:greens' }
]

const tabs = [
  { label: '当季', value: 'season', icon: 'inseason:season-basket' },
  { label: '分类', value: 'category', icon: 'solar:widget-5-bold' },
  { label: '产地', value: 'map', icon: 'inseason:origin-map' },
  { label: '排行', value: 'ranking', icon: 'solar:ranking-bold' }
]

const assetBySlug = {}

const realImageBySlug = {}

const locations = [
  '北京 · 华北',
  '天津 · 华北',
  '石家庄 · 华北',
  '太原 · 华北',
  '呼和浩特 · 华北',
  '沈阳 · 东北',
  '大连 · 东北',
  '长春 · 东北',
  '哈尔滨 · 东北',
  '上海 · 华东',
  '杭州 · 华东',
  '南京 · 华东',
  '合肥 · 华东',
  '福州 · 华东',
  '南昌 · 华东',
  '济南 · 华东',
  '青岛 · 华东',
  '郑州 · 华中',
  '武汉 · 华中',
  '长沙 · 华中',
  '广州 · 华南',
  '深圳 · 华南',
  '南宁 · 华南',
  '海口 · 华南',
  '香港 · 华南',
  '澳门 · 华南',
  '成都 · 西南',
  '重庆 · 西南',
  '贵阳 · 西南',
  '昆明 · 西南',
  '拉萨 · 西南',
  '西安 · 西北',
  '兰州 · 西北',
  '西宁 · 西北',
  '银川 · 西北',
  '乌鲁木齐 · 西北',
  '台北 · 华南'
]
const monthOptions = [
  { label: '1月 · 小寒', value: 1 },
  { label: '2月 · 立春', value: 2 },
  { label: '3月 · 惊蛰', value: 3 },
  { label: '4月 · 清明', value: 4 },
  { label: '5月 · 立夏', value: 5 },
  { label: '6月 · 芒种', value: 6 },
  { label: '7月 · 小暑', value: 7 },
  { label: '8月 · 立秋', value: 8 },
  { label: '9月 · 白露', value: 9 },
  { label: '10月 · 寒露', value: 10 },
  { label: '11月 · 立冬', value: 11 },
  { label: '12月 · 大雪', value: 12 }
]

const activeLocation = ref('上海 · 华东')
const activeMonth = ref(6)
const activeCategory = ref('fruit')
const activeSidebarCategory = ref('fruit')
const activeTypeGroup = ref('fruit:berry')
const activeTab = ref('season')
const activeNutrient = ref('vitaminCMg')
const activeRankingCategory = ref('fruit')
const selectedProvince = ref('山东')
const showProvincePicker = ref(false)
const provinceSearch = ref('')
const query = ref('')
const detailSlug = ref('')
const detailItem = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const showLocation = ref(false)
const showMonth = ref(false)
const produce = ref([])
const allProduce = ref([])
const loading = ref(true)
const error = ref('')
const appScreenRef = ref(null)
const scrollPageRef = ref(null)
const detailPageRef = ref(null)
const categorySidebarRef = ref(null)
const categoryContentRef = ref(null)
const originMapRef = ref(null)
const scrollPageTop = ref(0)
let originMapChart = null
let originMapRuntime = null
const savedScrollState = ref({
  page: 0,
  categorySidebar: 0,
  categoryContent: 0
})

const activeMonthLabel = computed(() => monthOptions.find(option => option.value === activeMonth.value)?.label || `${activeMonth.value}月`)
const activeRegionName = computed(() => activeLocation.value.split(' · ')[1] || activeLocation.value.split(' · ')[0] || '华东')
const showsSearch = computed(() => activeTab.value === 'season' || activeTab.value === 'category')
const searchPlaceholder = computed(() => '搜索当季果蔬')
const showBackTopButton = computed(() => !detailSlug.value && scrollPageTop.value > 520)

const visibleProduce = computed(() => {
  const source = activeTab.value === 'category'
    ? allProduce.value
    : produce.value

  const q = query.value.trim()
  return source.filter(item => {
    const categoryMatch = activeCategory.value === 'all' || item.category === activeCategory.value
    const queryMatch = !q || [
      item.name,
      item.englishName,
      item.regionNotes,
      item.bestUse,
      item.selectionTips,
      ...(item.aliases || []),
      ...(item.varieties || []).map(variety => variety.name),
      ...(item.seasonTerms || []),
      ...(item.regionalSeasons || []).flatMap(season => [season.region, season.note]),
      ...item.tags
    ].some(value => String(value || '').includes(q))
    return categoryMatch && queryMatch
  }).sort((a, b) => sortForSearch(a, b, q) || sortForCurrentSeason(a, b))
})

const showsSeparatedProduce = computed(() => activeCategory.value === 'all')

const produceCategorySections = computed(() => {
  const categoryOrder = [
    { value: 'fruit', label: '水果', icon: 'solar:apple-bold' },
    { value: 'vegetable', label: '蔬菜', icon: 'inseason:greens' }
  ]

  return categoryOrder
    .map(category => {
      const items = visibleProduce.value.filter(item => item.category === category.value)
      return {
        ...category,
        items,
        inSeasonCount: items.filter(item => item.inSeason).length
      }
    })
    .filter(group => group.items.length)
})

const categoryProduce = computed(() => {
  const q = query.value.trim()
  return allProduce.value
    .filter(item => {
      if (!q) return true
      return [
        item.name,
        item.englishName,
        item.regionNotes,
        item.bestUse,
        item.selectionTips,
        ...(item.aliases || []),
        ...(item.varieties || []).map(variety => variety.name),
        ...(item.seasonTerms || []),
        ...(item.regionalSeasons || []).flatMap(season => [season.region, season.note]),
        ...item.tags
      ].some(value => String(value || '').includes(q))
    })
    .sort((a, b) => sortForSearch(a, b, q) || sortForCurrentSeason(a, b))
})

const categorySidebarSections = computed(() => {
  const groups = new Map()
  categoryProduce.value.forEach(item => {
    const subCategory = item.subCategory || 'other'
    const key = `${item.category}:${subCategory}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        value: subCategory,
        category: item.category,
        label: subCategoryName(subCategory),
        icon: item.category === 'fruit' ? 'solar:apple-bold' : 'inseason:greens',
        image: item.image,
        previewSprite: item.previewSprite,
        items: []
      })
    }
    groups.get(key).items.push(item)
  })

  const grouped = [...groups.values()]
    .map(group => ({ ...group, items: group.items.sort(sortForCurrentSeason) }))
    .sort((a, b) => Number(b.items.some(item => item.inSeason)) - Number(a.items.some(item => item.inSeason)) || a.label.localeCompare(b.label, 'zh-Hans-CN'))

  return [
    {
      value: 'fruit',
      label: '水果',
      icon: 'solar:apple-bold',
      groups: grouped.filter(group => group.category === 'fruit')
    },
    {
      value: 'vegetable',
      label: '蔬菜',
      icon: 'inseason:greens',
      groups: grouped.filter(group => group.category === 'vegetable')
    }
  ].filter(section => section.groups.length)
})

const activeSidebarSection = computed(() => {
  return categorySidebarSections.value.find(section => section.value === activeSidebarCategory.value)
    || categorySidebarSections.value[0]
    || null
})

const activeTypeGroupMeta = computed(() => {
  return categorySidebarSections.value
    .flatMap(section => section.groups)
    .find(group => group.key === activeTypeGroup.value)
    || categorySidebarSections.value[0]?.groups[0]
    || { key: '', label: '分类', icon: 'inseason:produce-all', items: [] }
})

const activeTypeGroupItems = computed(() => activeTypeGroupMeta.value.items || [])

const emptyText = computed(() => {
  return '没有找到匹配的当季好物，换个关键词试试。'
})
const seasonName = computed(() => {
  const label = activeMonthLabel.value.split(' · ')[1]
  return label || '当令'
})
const seasonBestCount = computed(() => {
  return produce.value.filter(item => item.bestMonths.includes(activeMonth.value)).length
})
const seasonSummaryText = computed(() => {
  return seasonBestCount.value ? '样食材正值最佳赏味期' : '万物葱茏，尝鲜正当时'
})
const seasonThemes = {
  1: { key: 'winter', art: 'snowdrop', primary: '#86a8cf', accent: '#d8e8fb', blush: '#fff3f0', ink: '#38607d', glow: 'rgba(216, 232, 251, 0.72)', bg: '/assets/season-bg/01-xiaohan.svg' },
  2: { key: 'spring', art: 'peach', primary: '#8fcf9a', accent: '#f8c8d8', blush: '#f7f4c8', ink: '#497f52', glow: 'rgba(248, 200, 216, 0.55)', bg: '/assets/season-bg/02-lichun.svg' },
  3: { key: 'spring', art: 'sprout', primary: '#8fcf9a', accent: '#f7b7c8', blush: '#fff2b8', ink: '#4c8456', glow: 'rgba(247, 183, 200, 0.58)', bg: '/assets/season-bg/03-jingzhe.svg' },
  4: { key: 'spring', art: 'rain', primary: '#86cfa6', accent: '#ffd3a8', blush: '#f4f6bf', ink: '#3f7e5e', glow: 'rgba(255, 211, 168, 0.58)', bg: '/assets/season-bg/04-qingming.svg' },
  5: { key: 'summer', art: 'lotus', primary: '#88c9bd', accent: '#ffd58e', blush: '#dff5f0', ink: '#3a7b70', glow: 'rgba(255, 213, 142, 0.5)', bg: '/assets/season-bg/05-lixia.svg' },
  6: { key: 'summer', art: 'grain', primary: '#6fbea8', accent: '#ffc98f', blush: '#e4f6d9', ink: '#2f7566', glow: 'rgba(111, 190, 168, 0.42)', bg: '/assets/season-bg/06-mangzhong.svg' },
  7: { key: 'summer', art: 'melon', primary: '#7fbfd8', accent: '#ffe08a', blush: '#e4f7f6', ink: '#347489', glow: 'rgba(127, 191, 216, 0.42)', bg: '/assets/season-bg/07-xiaoshu.svg' },
  8: { key: 'autumn', art: 'leaf', primary: '#d4a76f', accent: '#ffc6a6', blush: '#f8eec7', ink: '#8a6131', glow: 'rgba(255, 198, 166, 0.56)', bg: '/assets/season-bg/08-liqiu.svg' },
  9: { key: 'autumn', art: 'pear', primary: '#c99a74', accent: '#f4c7a1', blush: '#f5edc9', ink: '#7e5a39', glow: 'rgba(244, 199, 161, 0.5)', bg: '/assets/season-bg/09-bailu.svg' },
  10: { key: 'autumn', art: 'persimmon', primary: '#c58f7e', accent: '#ffd3ad', blush: '#f6e5c8', ink: '#7b5547', glow: 'rgba(255, 211, 173, 0.52)', bg: '/assets/season-bg/10-hanlu.svg' },
  11: { key: 'winter', art: 'frost', primary: '#94abc8', accent: '#d7e7f4', blush: '#f8eadf', ink: '#526d8b', glow: 'rgba(215, 231, 244, 0.66)', bg: '/assets/season-bg/11-lidong.svg' },
  12: { key: 'winter', art: 'snow', primary: '#8da7c7', accent: '#dceafb', blush: '#f7eee6', ink: '#4f6988', glow: 'rgba(220, 234, 251, 0.68)', bg: '/assets/season-bg/12-daxue.svg' }
}
const seasonTheme = computed(() => {
  const theme = seasonThemes[activeMonth.value] || seasonThemes[6]
  return {
    key: theme.key,
    art: theme.art,
    style: {
      '--season-primary': theme.primary,
      '--season-accent': theme.accent,
      '--season-blush': theme.blush,
      '--season-ink': theme.ink,
      '--season-glow': theme.glow,
      '--season-bg-image': `url(${theme.bg})`
    }
  }
})

const provinceOriginProfiles = [
  { province: '山东', fruits: ['苹果', '梨', '葡萄'], vegetables: ['大蒜', '西红柿', '白菜', '黄瓜'], note: '北方果蔬供应大省' },
  { province: '河北', fruits: ['梨', '苹果', '葡萄'], vegetables: ['白菜', '西红柿', '黄瓜'], note: '环京津鲜食品类丰富' },
  { province: '河南', fruits: ['西瓜', '苹果', '葡萄'], vegetables: ['大蒜', '辣椒', '西红柿'], note: '中原瓜果与调味蔬菜' },
  { province: '江苏', fruits: ['杨梅', '桃子', '葡萄'], vegetables: ['莲藕', '毛豆', '青椒'], note: '江南水生菜和夏令果' },
  { province: '浙江', fruits: ['杨梅', '桃子', '葡萄'], vegetables: ['茭白', '毛豆', '丝瓜'], note: '梅雨季鲜果与水生菜' },
  { province: '安徽', fruits: ['梨', '桃子', '西瓜'], vegetables: ['毛豆', '莲藕', '空心菜'], note: '华东瓜果与夏季叶菜' },
  { province: '福建', fruits: ['荔枝', '龙眼', '柚子', '枇杷'], vegetables: ['空心菜', '丝瓜', '苦瓜'], note: '东南沿海亚热带风味' },
  { province: '广东', fruits: ['荔枝', '龙眼', '芒果', '香蕉'], vegetables: ['空心菜', '苦瓜', '冬瓜'], note: '岭南热带水果核心产区' },
  { province: '广西', fruits: ['芒果', '香蕉', '荔枝', '柚子'], vegetables: ['冬瓜', '苦瓜', '黄瓜'], note: '热带果香和瓜类集中' },
  { province: '海南', fruits: ['芒果', '香蕉', '菠萝', '莲雾'], vegetables: ['冬瓜', '苦瓜', '丝瓜'], note: '全年热带果蔬供应' },
  { province: '云南', fruits: ['芒果', '葡萄', '蓝莓'], vegetables: ['鲜花菜', '西红柿', '辣椒'], note: '高原果蔬与花菜特色' },
  { province: '四川', fruits: ['柑橘', '李子', '桃子'], vegetables: ['辣椒', '莴笋', '生姜'], note: '川西川南风味产区' },
  { province: '重庆', fruits: ['柑橘', '李子'], vegetables: ['辣椒', '莴笋', '生姜'], note: '山地柑橘与辛香蔬菜' },
  { province: '湖北', fruits: ['桃子', '西瓜', '葡萄'], vegetables: ['莲藕', '藕尖', '毛豆'], note: '湖区水生菜代表' },
  { province: '湖南', fruits: ['李子', '葡萄', '西瓜'], vegetables: ['辣椒', '空心菜', '丝瓜'], note: '辣椒和夏令蔬菜突出' },
  { province: '江西', fruits: ['柑橘', '杨梅', '西瓜'], vegetables: ['莲藕', '空心菜', '辣椒'], note: '赣鄱水生菜与柑橘' },
  { province: '贵州', fruits: ['李子', '猕猴桃', '葡萄'], vegetables: ['辣椒', '土豆', '生姜'], note: '山地果蔬与辣味产区' },
  { province: '陕西', fruits: ['苹果', '猕猴桃', '桃子'], vegetables: ['土豆', '大蒜', '青椒'], note: '苹果和猕猴桃优势明显' },
  { province: '甘肃', fruits: ['苹果', '梨', '葡萄'], vegetables: ['土豆', '洋葱', '胡萝卜'], note: '西北根茎类和耐储果' },
  { province: '新疆', fruits: ['葡萄', '哈密瓜', '甜瓜', '西瓜'], vegetables: ['洋葱', '胡萝卜', '番茄'], note: '日照强，瓜果糖分高' },
  { province: '内蒙古', fruits: ['西瓜', '甜瓜'], vegetables: ['土豆', '胡萝卜', '洋葱'], note: '北方耐储蔬菜产区' },
  { province: '辽宁', fruits: ['苹果', '梨', '樱桃'], vegetables: ['白菜', '黄瓜', '西红柿'], note: '东北南部果蔬供应' },
  { province: '吉林', fruits: ['苹果', '梨'], vegetables: ['白菜', '土豆', '玉米'], note: '寒地耐储蔬菜和玉米' },
  { province: '黑龙江', fruits: ['蓝莓', '苹果'], vegetables: ['土豆', '白菜', '玉米'], note: '寒地浆果和根茎类' },
  { province: '北京', fruits: ['桃子', '梨'], vegetables: ['黄瓜', '白菜', '西红柿'], note: '都市近郊鲜食供应' },
  { province: '天津', fruits: ['葡萄', '梨'], vegetables: ['黄瓜', '西红柿', '白菜'], note: '环渤海鲜食蔬菜' },
  { province: '上海', fruits: ['桃子', '葡萄'], vegetables: ['毛豆', '青菜', '茭白'], note: '本地夏令小菜与鲜果' },
  { province: '山西', fruits: ['苹果', '梨', '桃子'], vegetables: ['土豆', '胡萝卜', '辣椒'], note: '黄土高原耐储果蔬' },
  { province: '青海', fruits: ['西瓜'], vegetables: ['土豆', '胡萝卜', '油麦菜'], note: '高原冷凉蔬菜' },
  { province: '宁夏', fruits: ['葡萄', '西瓜'], vegetables: ['枸杞', '洋葱', '土豆'], note: '西北灌区瓜果' },
  { province: '西藏', fruits: ['苹果'], vegetables: ['土豆', '白菜', '胡萝卜'], note: '高原耐寒蔬菜' },
  { province: '台湾', fruits: ['芒果', '莲雾', '香蕉'], vegetables: ['苦瓜', '丝瓜', '空心菜'], note: '海岛热带风味' },
  { province: '香港', fruits: ['荔枝', '龙眼'], vegetables: ['菜心', '生菜'], note: '华南鲜食消费地' },
  { province: '澳门', fruits: ['香蕉', '芒果'], vegetables: ['生菜', '白菜'], note: '华南鲜食消费地' }
]

const nutrientOptions = [
  { key: 'vitaminCMg', label: '维C', unit: 'mg/100g', icon: 'inseason:nutrient-vitamin-c' },
  { key: 'fiberG', label: '膳食纤维', unit: 'g/100g', icon: 'inseason:nutrient-fiber' },
  { key: 'proteinG', label: '蛋白质', unit: 'g/100g', icon: 'inseason:nutrient-protein' },
  { key: 'potassiumMg', label: '钾', unit: 'mg/100g', icon: 'inseason:nutrient-potassium' },
  { key: 'energyKcal', label: '热量', unit: 'kcal/100g', icon: 'inseason:nutrient-calorie' }
]

const rankingCategoryOptions = [
  { value: 'fruit', label: '水果', icon: 'solar:apple-bold' },
  { value: 'vegetable', label: '蔬菜', icon: 'inseason:greens' }
]

const activeNutrientMeta = computed(() => nutrientOptions.find(item => item.key === activeNutrient.value) || nutrientOptions[0])
const activeRankingCategoryMeta = computed(() => rankingCategoryOptions.find(item => item.value === activeRankingCategory.value) || rankingCategoryOptions[0])
const provinceProfileByName = computed(() => new Map(provinceOriginProfiles.map(profile => [profile.province, profile])))
const provinceMapData = computed(() => provinceOriginProfiles.map(profile => ({
  name: profile.province,
  value: profile.fruits.length + profile.vegetables.length,
  itemStyle: {
    areaColor: originMapAreaColor(profile.fruits.length + profile.vegetables.length)
  }
})))
const selectedProvinceProfile = computed(() => buildProvinceProfile(selectedProvince.value || provinceOriginProfiles[0].province))
const filteredProvinceOptions = computed(() => {
  const keyword = provinceSearch.value.trim()
  if (!keyword) return provinceOriginProfiles
  return provinceOriginProfiles.filter(profile => profile.province.includes(keyword))
})
const activeRankingItems = computed(() => nutritionRanking(activeRankingCategory.value))

const produceMotionKey = computed(() => visibleProduce.value.map(item => item.slug).join('|'))
const categoryMotionKey = computed(() => activeTypeGroupItems.value.map(item => item.slug).join('|'))

watch([activeMonth, activeCategory, query, activeLocation], loadProduce)
watch([activeMonth, activeLocation], loadAllProduce)
watch(categorySidebarSections, sections => {
  if (!sections.some(section => section.value === activeSidebarCategory.value)) {
    activeSidebarCategory.value = sections[0]?.value || 'fruit'
  }
  const groups = activeSidebarSection.value?.groups || []
  if (groups.length && !groups.some(group => group.key === activeTypeGroup.value)) {
    activeTypeGroup.value = groups[0].key
  }
}, { immediate: true })
watch(activeSidebarCategory, () => {
  const groups = activeSidebarSection.value?.groups || []
  if (groups.length && !groups.some(group => group.key === activeTypeGroup.value)) {
    activeTypeGroup.value = groups[0].key
  }
  if (categorySidebarRef.value) categorySidebarRef.value.scrollTop = 0
  if (categoryContentRef.value) categoryContentRef.value.scrollTop = 0
})
watch([activeTab, activeCategory, produceMotionKey], () => animateListRefresh(), { flush: 'post' })
watch([activeTypeGroup, categoryMotionKey], () => animateCategoryBrowser(), { flush: 'post' })
watch(detailSlug, value => {
  if (value) animateDetailEntrance()
  else animateListRefresh()
}, { flush: 'post' })
watch(activeMonth, () => animateSeasonChange(), { flush: 'post' })
watch([activeTab, provinceMapData], () => {
  if (activeTab.value === 'map') renderOriginMap()
}, { flush: 'post' })
watch(selectedProvince, () => {
  if (activeTab.value === 'map') {
    updateOriginMapSelection()
    animateMapPanel()
  }
}, { flush: 'post' })

onMounted(async () => {
  syncDetailRoute()
  window.addEventListener('hashchange', syncDetailRoute)
  window.addEventListener('popstate', syncDetailRoute)
  window.addEventListener('resize', resizeOriginMap)
  await Promise.all([loadProduce(), loadAllProduce()])
  await nextTick()
  animateAppIntro()
  if (activeTab.value === 'map') renderOriginMap()
  else scheduleOriginMapWarmup()
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncDetailRoute)
  window.removeEventListener('popstate', syncDetailRoute)
  window.removeEventListener('resize', resizeOriginMap)
  if (appScreenRef.value) gsap.killTweensOf(appScreenRef.value.querySelectorAll('*'))
  originMapChart?.dispose()
})

async function loadProduce() {
  loading.value = true
  error.value = ''

  const params = new URLSearchParams({
    month: String(activeMonth.value),
    category: 'all',
    availability: 'mature',
    region: activeRegionName.value
  })
  if (query.value.trim()) params.set('q', query.value.trim())

  try {
    const response = await fetch(`${API_BASE}/api/produce?${params}`)
    if (!response.ok) throw new Error('produce api failed')
    const data = await response.json()
    produce.value = (data.items || []).map(normalizeProduce)
  } catch {
    error.value = '后端数据暂时连接不上，请确认 API 服务已启动。'
  } finally {
    loading.value = false
  }
}

async function loadAllProduce() {
  try {
    const params = new URLSearchParams({ category: 'all', availability: 'mature', region: activeRegionName.value })
    const response = await fetch(`${API_BASE}/api/produce?${params}`)
    if (!response.ok) throw new Error('all produce api failed')
    const data = await response.json()
    allProduce.value = (data.items || []).map(normalizeProduce)
  } catch {
    allProduce.value = []
  }
}

function normalizeProduce(item) {
  const tags = [...(item.tasteTags || []), ...(item.benefitTags || [])]
  const aliases = item.aliases || []
  const realImage = item.realImage || realImageBySlug[item.slug] || ''
  const aiImage = item.aiImage || ''
  const detailImage = aiImage || realImage || aiDetailImage(item)
  const usesAiDetailImage = Boolean(aiImage)
  const image = item.previewImage || assetBySlug[item.slug] || placeholderProduceImage(item)
  const normalized = {
    ...item,
    tags,
    aliases,
    image,
    previewSprite: item.previewSprite || null,
    aiImage,
    detailImage,
    detailImageLabel: usesAiDetailImage ? 'AI生成图' : realImage ? '实物图' : 'AI生成图',
    realImage,
    hasRealImage: Boolean(realImage) && !usesAiDetailImage,
    varieties: (item.varieties || []).map(variety => ({
      ...variety,
      image: variety.image || aiDetailImage({ ...item, slug: `${item.slug}-${variety.name}`, name: variety.name }),
      hasRealImage: Boolean(variety.image && !String(variety.image).startsWith('data:image/svg+xml'))
    })),
    season: formatMonths(item.matureMonths),
    inSeason: activeRegionalSeason(item)?.months?.includes(activeMonth.value) || item.matureMonths?.includes(activeMonth.value),
    bestNow: activeRegionalSeason(item)?.bestMonths?.includes(activeMonth.value) || item.bestMonths?.includes(activeMonth.value),
    reason: item.benefitTags?.[0] || item.tasteTags?.[0] || '当季尝鲜'
  }
  return normalized
}

function aiDetailImage(item) {
  return placeholderProduceImage({ ...item, detailPreview: true })
}

function placeholderProduceImage(item) {
  const isFruit = item.category === 'fruit'
  const palette = placeholderPalette(item)
  const fill = palette.fill
  const stroke = palette.stroke
  const soft = palette.soft
  const highlight = palette.highlight || '#ffffff'
  const shade = palette.shade || stroke
  const body = isFruit ? fruitPlaceholderBody(item) : vegetablePlaceholderBody(item)
  const signature = placeholderSignature(item)
  const gradientId = `paint-${signature}`
  const glowId = `glow-${signature}`
  const textureId = `paper-${signature}`
  const scale = item.detailPreview
    ? 1.18 + (signature % 5) * 0.016
    : 0.94 + (signature % 7) * 0.018
  const rotate = (signature % 13) - 6
  const shiftX = (signature % 9) - 4
  const shiftY = ((signature >> 3) % 9) - 4
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="${gradientId}" x1="42" y1="40" x2="160" y2="164" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${highlight}" stop-opacity="0.95"/>
          <stop offset="0.42" stop-color="${fill}"/>
          <stop offset="1" stop-color="${shade}" stop-opacity="0.46"/>
        </linearGradient>
        <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="${stroke}" flood-opacity="0.16"/>
        </filter>
        <filter id="${textureId}" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${signature % 97}" result="noise"/>
          <feColorMatrix in="noise" type="saturate" values="0"/>
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.035"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="200" height="200" rx="44" fill="none"/>
      <circle cx="100" cy="103" r="61" fill="${soft}" opacity="0.34"/>
      <circle cx="82" cy="76" r="30" fill="#fff" opacity="0.32"/>
      <metadata>placeholder-${signature}</metadata>
      <g transform="translate(${shiftX} ${shiftY}) rotate(${rotate} 100 100) scale(${scale}) translate(${(1 - scale) * 100} ${(1 - scale) * 100})" fill="url(#${gradientId})" stroke="${stroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#${glowId})">
        ${body}
      </g>
      <ellipse cx="82" cy="74" rx="16" ry="8" fill="#fff" opacity="0.38" transform="rotate(-24 82 74)"/>
      <rect width="200" height="200" rx="44" filter="url(#${textureId})" opacity="0.72"/>
    </svg>
  `)}`
}

function placeholderSignature(item) {
  return String(`${item.slug || ''}-${item.name || ''}-${item.subCategory || ''}`)
    .split('')
    .reduce((sum, char) => ((sum << 5) - sum + char.charCodeAt(0)) >>> 0, 0)
}

function placeholderPalette(item) {
  const palettes = {
    berry: { fill: '#f4d6ef', stroke: '#a971c7', soft: '#f7e8fb', highlight: '#fff4fb', shade: '#b987d0' },
    tropical: { fill: '#ffe2a8', stroke: '#d59747', soft: '#fff0c9', highlight: '#fff5d8', shade: '#dda65b' },
    melon: { fill: '#dff2c6', stroke: '#76b874', soft: '#edf8de', highlight: '#f7ffe9', shade: '#91c77a' },
    citrus: { fill: '#ffe1a4', stroke: '#dba14a', soft: '#fff0c8', highlight: '#fff7d8', shade: '#e4ac55' },
    pome: { fill: '#ffd8d3', stroke: '#df7d72', soft: '#ffe9e5', highlight: '#fff0ed', shade: '#e88c80' },
    'stone-fruit': { fill: '#ffd9bd', stroke: '#e28669', soft: '#ffead8', highlight: '#fff2e5', shade: '#e99576' }
  }
  if (item.category !== 'fruit') return vegetablePalette(item)
  return palettes[item.subCategory] || { fill: '#ffe5dc', stroke: '#ef7e61', soft: '#fff0ea', highlight: '#fff6ef', shade: '#f0947c' }
}

function vegetablePalette(item) {
  const bySlug = {
    xihongshi: { fill: '#ffd6cf', stroke: '#df6f61', soft: '#ffe9e6' },
    qiezi: { fill: '#e7d8f6', stroke: '#7c5da8', soft: '#f2eaf9' },
    qingjiao: { fill: '#d7efc8', stroke: '#5fa65b', soft: '#edf8e7' },
    lajiao: { fill: '#ffd4c9', stroke: '#d85f50', soft: '#ffe9e2' },
    huanggua: { fill: '#cfeec9', stroke: '#58a36a', soft: '#e8f8e8' },
    sigua: { fill: '#d7efc2', stroke: '#70a85c', soft: '#eef8df' },
    kugua: { fill: '#d8efcf', stroke: '#6da95e', soft: '#eef8e8' },
    nangua: { fill: '#ffd99b', stroke: '#d28a33', soft: '#fff0cf' },
    donggua: { fill: '#dcefe7', stroke: '#6aa592', soft: '#edf8f2' },
    foshougua: { fill: '#dff1c5', stroke: '#78aa50', soft: '#f0f8df' },
    huluobo: { fill: '#ffd9a8', stroke: '#db8b3d', soft: '#fff0d8' },
    bailuobo: { fill: '#f8f2df', stroke: '#a7a06a', soft: '#fff9ea' },
    lianou: { fill: '#f3dfcf', stroke: '#b98b69', soft: '#faefe8' },
    shanyao: { fill: '#f0dbc4', stroke: '#a67855', soft: '#f8eadf' },
    shengjiang: { fill: '#f0c89f', stroke: '#ad7042', soft: '#f8e5d2' },
    tudou: { fill: '#e8d4b0', stroke: '#9d7a4c', soft: '#f5ead8' },
    hongshu: { fill: '#f2c9a7', stroke: '#b06b48', soft: '#f8e6d8' },
    xilanhua: { fill: '#caebc4', stroke: '#5a9f54', soft: '#e8f7df' },
    cauliflower: { fill: '#f7f0dd', stroke: '#a8a06b', soft: '#fbf7e9' },
    baicai: { fill: '#e8f4cf', stroke: '#75a856', soft: '#f3f9e5' },
    baicaitai: { fill: '#ddefc8', stroke: '#6ba456', soft: '#f0f8e4' },
    shengcai: { fill: '#d7efc2', stroke: '#65a856', soft: '#eef8df' },
    bocai: { fill: '#cfecc9', stroke: '#579e5a', soft: '#edf8e8' },
    youmaicai: { fill: '#d7efc2', stroke: '#6aa852', soft: '#eef8e0' },
    xiangcai: { fill: '#d5efd6', stroke: '#55a060', soft: '#ecf8ed' },
    kongxincai: { fill: '#ccefcf', stroke: '#4f9d67', soft: '#e8f8eb' },
    xiancai: { fill: '#ead6df', stroke: '#a65f7a', soft: '#f7e8ef' },
    jiucai: { fill: '#c7ecc6', stroke: '#4f9b54', soft: '#e8f8e6' },
    cong: { fill: '#d9f0d3', stroke: '#5ca862', soft: '#eef9e9' },
    yangcong: { fill: '#ead9f5', stroke: '#936cb0', soft: '#f5ecfb' },
    dasuan: { fill: '#fbf0d9', stroke: '#b8a06b', soft: '#fff7e8' },
    qiukui: { fill: '#d8edc4', stroke: '#6aa052', soft: '#eef8df' },
    maodou: { fill: '#d7efbe', stroke: '#69a650', soft: '#eef8df' },
    wandou: { fill: '#d9f0c3', stroke: '#72a950', soft: '#eef8dc' },
    sidou: { fill: '#cdf0c6', stroke: '#58a75d', soft: '#e8f8e7' },
    canchai: { fill: '#dcecc2', stroke: '#799d4e', soft: '#f0f6df' },
    yumi: { fill: '#fff0a8', stroke: '#d7a942', soft: '#fff7cf' },
    huanghuacai: { fill: '#fff0a8', stroke: '#cda344', soft: '#fff8d8' },
    sunzi: { fill: '#f2d7a8', stroke: '#b98445', soft: '#f9ead2' },
    lusun: { fill: '#d2edc6', stroke: '#67a05b', soft: '#edf8e7' },
    jiaobai: { fill: '#e5f1d3', stroke: '#86a865', soft: '#f2f8e8' },
    oujian: { fill: '#d9efe8', stroke: '#68a697', soft: '#ecf8f4' },
    qincai: { fill: '#d5edc4', stroke: '#6aa056', soft: '#edf8e2' },
    xianggu: { fill: '#ead7c0', stroke: '#9b6f50', soft: '#f5eadf' },
    pinggu: { fill: '#eee2d5', stroke: '#8d7462', soft: '#f7f0ea' },
    jinzhengu: { fill: '#f7ecd7', stroke: '#b99a64', soft: '#fff6e5' },
    haixiangu: { fill: '#eadbc9', stroke: '#9c7b5f', soft: '#f6eee6' }
  }
  if (bySlug[item.slug]) return bySlug[item.slug]

  const bySubCategory = {
    gourd: { fill: '#dff1c5', stroke: '#75a95b', soft: '#f0f8df' },
    legume: { fill: '#d7efbe', stroke: '#69a650', soft: '#eef8df' },
    pod: { fill: '#d8edc4', stroke: '#6aa052', soft: '#eef8df' },
    'leafy-green': { fill: '#d5efcf', stroke: '#5fa65b', soft: '#edf8e8' },
    'fruit-vegetable': { fill: '#ffd8c7', stroke: '#d77c61', soft: '#ffede5' },
    cruciferous: { fill: '#dbeec6', stroke: '#69a55a', soft: '#eef8e0' },
    root: { fill: '#f2d8bd', stroke: '#af7b55', soft: '#f8eadf' },
    tuber: { fill: '#e8d0ad', stroke: '#9d744e', soft: '#f6e6d7' },
    mushroom: { fill: '#eadbc9', stroke: '#94745b', soft: '#f6eee6' },
    allium: { fill: '#eee1f3', stroke: '#8d70a8', soft: '#f8eefc' },
    stem: { fill: '#d7edc7', stroke: '#6ea15a', soft: '#eef8e4' },
    aquatic: { fill: '#d9efe8', stroke: '#68a697', soft: '#ecf8f4' },
    flower: { fill: '#fff0a8', stroke: '#cda344', soft: '#fff8d8' },
    grain: { fill: '#fff0a8', stroke: '#d7a942', soft: '#fff7cf' }
  }
  return bySubCategory[item.subCategory] || { fill: '#eaf5df', stroke: '#5f9f51', soft: '#eef8e8' }
}

function fruitPlaceholderBody(item) {
  const slug = item.slug
  const name = item.name || ''
  if (slug === 'caomei') {
    return '<path d="M101 58c33 18 52 47 50 78-2 27-22 43-50 43s-48-16-50-43c-2-31 17-60 50-78Z"/><path d="M78 58c17-16 33-16 48-1"/><path d="M52 69c18-14 39-13 59 1"/><path d="M102 58c-8-19-1-35 18-47"/><circle cx="83" cy="103" r="3" fill="#fff"/><circle cx="110" cy="96" r="3" fill="#fff"/><circle cx="125" cy="126" r="3" fill="#fff"/><circle cx="91" cy="137" r="3" fill="#fff"/>'
  }
  if (slug === 'putao') {
    return '<circle cx="93" cy="68" r="16"/><circle cx="120" cy="77" r="16"/><circle cx="74" cy="94" r="17"/><circle cx="103" cy="101" r="17"/><circle cx="132" cy="106" r="17"/><circle cx="88" cy="128" r="18"/><circle cx="119" cy="133" r="18"/><path d="M107 51c11-19 29-24 50-13"/><path d="M111 53c-7 15-14 26-22 38"/>'
  }
  if (slug === 'yingtao') {
    return '<circle cx="82" cy="125" r="27"/><circle cx="130" cy="127" r="27"/><path d="M82 98c7-29 22-50 46-64"/><path d="M130 100c-3-28 3-50 20-67"/><path d="M122 38c16-14 33-12 49 1"/>'
  }
  if (slug === 'mihoutao' || slug === 'qiyiguo') {
    return '<circle cx="100" cy="111" r="52"/><circle cx="100" cy="111" r="28" fill="#fff" opacity=".52"/><circle cx="100" cy="111" r="8"/><path d="M100 60v22M100 140v22M49 111h22M129 111h22M64 75l16 16M120 131l16 16M136 75l-16 16M80 131l-16 16"/>'
  }
  if (slug === 'shiliu') {
    return '<path d="M64 108c0-37 24-60 57-56 28 4 45 29 39 61-7 36-35 58-68 50-18-4-28-24-28-55Z"/><path d="M102 53l-15-18 21 8 18-14-2 23"/><circle cx="91" cy="112" r="5"/><circle cx="113" cy="97" r="5"/><circle cx="127" cy="122" r="5"/><circle cx="104" cy="137" r="5"/>'
  }
  if (slug === 'wuhuaguo') {
    return '<path d="M76 77c23-21 55-16 69 12 18 35-6 79-44 79-35 0-54-38-38-72 3-8 7-14 13-19Z"/><path d="M100 83c-18 19-22 49-5 78"/><path d="M94 58c13-16 30-17 45-4"/>'
  }
  if (slug === 'huolongguo') {
    return '<path d="M68 78c28-22 67-19 90 10 16 21 11 52-12 69-28 20-69 12-88-16-15-23-10-47 10-63Z"/><path d="M70 87l-22-9 15 25-25 8 29 10-7 29 26-14 19 25 9-31 30 7-17-25 20-19-30-1-10-30-17 24Z" fill="none"/><circle cx="91" cy="108" r="3" fill="#fff"/><circle cx="117" cy="119" r="3" fill="#fff"/><circle cx="132" cy="101" r="3" fill="#fff"/>'
  }
  if (slug === 'boluo') {
    return '<path d="M76 85c23-15 55-15 78 0 9 34 3 67-25 83-20 12-48 1-61-24-11-21-8-43 8-59Z"/><path d="M73 93l76 54M149 93l-76 54M80 118h67M91 79c-10-20-2-36 19-47M113 75c0-24 13-38 38-42M132 82c14-19 32-25 54-18"/>'
  }
  if (slug === 'mugua') {
    return '<path d="M74 141c-21-35-5-83 33-94 31-9 56 10 58 42 2 41-39 78-78 64-5-2-9-6-13-12Z"/><path d="M100 76c18 18 25 41 18 70"/><circle cx="105" cy="111" r="4"/><circle cx="119" cy="125" r="4"/><circle cx="94" cy="130" r="4"/>'
  }
  if (slug === 'yangtao') {
    return '<path d="M99 53l18 39 43-6-29 33 20 39-45-14-32 32-2-45-40-22 43-15 24-41Z"/><path d="M99 72l4 68"/>'
  }
  if (slug === 'longyan' || slug === 'huangpi') {
    return '<circle cx="77" cy="120" r="22"/><circle cx="110" cy="106" r="24"/><circle cx="139" cy="126" r="21"/><circle cx="97" cy="145" r="20"/><path d="M104 76c18-23 44-29 73-16"/><path d="M107 77c-9 17-17 30-25 42"/>'
  }
  if (slug === 'fanliuzhi') {
    return '<path d="M76 77c24-21 61-16 79 13 19 31 4 69-33 78-36 8-65-15-65-52 0-17 6-30 19-39Z"/><path d="M94 58c16-16 34-15 51 0"/><circle cx="95" cy="117" r="4"/><circle cx="116" cy="105" r="4"/><circle cx="129" cy="127" r="4"/>'
  }
  if (slug === 'baixiangguo') {
    return '<circle cx="101" cy="111" r="51"/><circle cx="101" cy="111" r="31" fill="#fff" opacity=".45"/><circle cx="87" cy="105" r="4"/><circle cx="103" cy="123" r="4"/><circle cx="120" cy="108" r="4"/><path d="M88 60c16-18 35-18 52-3"/>'
  }
  if (slug === 'hongmaodan') {
    return '<circle cx="102" cy="112" r="42"/><path d="M67 95l-27-12M74 74L55 50M100 69l-4-31M130 79l24-23M145 107l33-4M135 140l22 24M101 154l-2 34M71 137l-24 19M61 115l-33 4"/>'
  }
  if (slug === 'shijia') {
    return '<path d="M66 111c0-37 25-62 58-57 34 5 50 39 35 72-14 32-53 50-81 29-9-7-12-24-12-44Z"/><path d="M77 94c25 10 53 9 81-2M70 120c30 13 59 13 86 0M84 151c4-35 2-65-8-91M114 162c-3-41 0-76 11-104M142 145c-11-27-13-54-4-81"/>'
  }
  if (slug === 'niuyouguo') {
    return '<path d="M83 67c30-24 66 0 70 44 4 38-17 62-47 62-32 0-54-26-49-61 3-20 11-35 26-45Z"/><circle cx="107" cy="126" r="18"/><path d="M95 55c14-16 31-17 45-3"/>'
  }
  if (slug === 'yezi') {
    return '<circle cx="101" cy="115" r="48"/><path d="M73 82c25-18 60-18 86 0"/><circle cx="84" cy="103" r="4"/><circle cx="111" cy="98" r="4"/><circle cx="99" cy="123" r="4"/><path d="M88 62c17-18 37-20 58-6"/>'
  }
  if (slug === 'boluomi') {
    return '<ellipse cx="105" cy="115" rx="54" ry="43"/><path d="M64 95l81 49M147 94l-82 49M74 118h63M84 80c16-18 35-20 58-8"/><path d="M78 102l8 8m17-19 8 8m19-3 8 8m-52 35 8 8m30-18 8 8"/>'
  }
  if (slug === 'shanzhu') {
    return '<circle cx="101" cy="118" r="44"/><path d="M68 86c22-17 49-18 71-2"/><path d="M78 81l10-24 14 20 18-22 7 27 27-8-19 23"/><path d="M80 125c16 9 41 10 58 0"/>'
  }
  if (slug === 'shepiguo') {
    return '<path d="M75 73c33-18 70 4 74 42 4 34-22 58-55 51-30-6-44-35-33-65 3-11 8-20 14-28Z"/><path d="M69 94c23 7 49 7 77 0M62 118c28 9 57 9 86 0M76 146c20 6 40 6 60 0"/>'
  }
  if (slug === 'luohanguo') {
    return '<circle cx="101" cy="112" r="48"/><path d="M69 88c24-16 58-17 86-2M62 115c28 14 57 14 86 0M76 146c19 7 39 7 60 0"/><path d="M94 62c15-18 33-19 51-5"/>'
  }
  if (slug === 'xuelianguo') {
    return '<path d="M59 127c25-46 63-69 105-62-9 43-43 76-91 83-12 2-19-7-14-21Z"/><path d="M83 132c21-28 46-49 74-61"/>'
  }
  if (slug === 'lanmei') {
    return '<circle cx="74" cy="107" r="22"/><circle cx="105" cy="91" r="25"/><circle cx="128" cy="118" r="23"/><path d="M101 72l8 8m-8-8-8 8m8-8v12"/>'
  }
  if (slug === 'lianwu') {
    return '<path d="M72 75c22-16 45-7 48 23 4 34-17 50-36 48-18-2-32-22-25-46 3-10 7-18 13-25Z"/><path d="M114 76c23-15 44-3 47 27 3 29-15 44-33 43-14-1-25-12-28-29"/><path d="M75 57c18-13 36-11 52 3"/>'
  }
  if (slug === 'liulian') {
    return '<path d="M61 115c8-36 34-57 67-49 26 7 40 32 33 57-9 32-42 45-72 32-18-8-31-20-28-40Z"/><path d="M72 102l-18-10 20-4-10-17 21 7 1-22 15 17 14-19 5 23 23-8-12 20 22 8-21 11 15 18-24-2 5 23-19-14-14 18-4-23-23 7 12-20Z" fill="none"/>'
  }
  if (slug === 'mangguo') {
    return '<path d="M70 132c-20-31-3-75 35-84 35-8 60 19 58 50-2 34-37 61-70 52-9-2-17-8-23-18Z"/><path d="M98 54c13-17 31-19 47-8-11 15-27 22-47 8Z"/>'
  }
  if (slug === 'xiangjiao') {
    return '<path d="M56 119c38 25 78 17 105-24-9 51-55 72-100 48-16-9-20-20-5-24Z"/><path d="M153 91l15-12"/><path d="M57 119l-13 5"/>'
  }
  if (slug === 'tiangua' || slug === 'hamigua' || slug === 'xigua') {
    return '<ellipse cx="103" cy="108" rx="58" ry="41"/><path d="M57 108c24-21 68-25 104 0"/><path d="M57 108c24 21 68 25 104 0"/><path d="M103 68c-12 20-12 60 0 81"/><path d="M103 68c12 20 12 60 0 81"/>'
  }
  if (slug === 'xingzi' || slug === 'lizi' || slug === 'taozi' || name.includes('桃')) {
    return '<circle cx="101" cy="108" r="44"/><path d="M101 64c18 23 17 60-1 88"/><path d="M91 48c18-21 38-20 52-6-12 17-29 23-52 6Z"/>'
  }
  if (item.subCategory === 'berry') {
    const berryBodies = [
      '<circle cx="77" cy="112" r="24"/><circle cx="107" cy="90" r="24"/><circle cx="130" cy="119" r="23"/><path d="M101 68c13-15 29-16 42-5-10 14-24 19-42 5Z"/>',
      '<circle cx="70" cy="112" r="18"/><circle cx="95" cy="92" r="21"/><circle cx="121" cy="105" r="20"/><circle cx="111" cy="132" r="18"/><circle cx="145" cy="126" r="17"/><path d="M98 70c16-13 32-12 44 1-13 12-27 16-44-1Z"/>',
      '<path d="M69 117c0-31 20-52 48-52 30 0 51 23 48 54-3 32-29 51-61 47-23-3-35-20-35-49Z"/><path d="M91 76c13 22 15 51 6 82"/><path d="M122 70c-3 31 2 60 18 84"/><path d="M96 54c15-15 32-15 46-2-12 14-28 18-46 2Z"/>',
      '<circle cx="86" cy="100" r="25"/><circle cx="117" cy="99" r="24"/><circle cx="101" cy="130" r="26"/><path d="M82 78c17-22 42-26 68-11-18 19-40 23-68 11Z"/><path d="M80 124c18 9 43 10 65 1"/>'
    ]
    return berryBodies[placeholderSignature(item) % berryBodies.length]
  }
  if (item.subCategory === 'citrus') {
    return '<circle cx="88" cy="109" r="39"/><circle cx="127" cy="109" r="37"/><path d="M87 70c13 22 13 55 0 78"/><path d="M88 48c15-18 33-18 47-4-12 16-27 22-47 4Z"/>'
  }
  if (item.subCategory === 'pome') {
    const pomeBodies = [
      '<path d="M76 78c19-15 35 0 35 0s17-15 36 0c22 18 15 66-16 77-12 4-20-2-20-2s-9 6-21 2c-31-11-38-59-14-77Z"/><path d="M105 52c14-19 32-20 46-6-11 16-28 23-46 6Z"/>',
      '<path d="M101 59c29 8 48 34 45 65-3 30-22 48-45 48s-42-18-45-48c-3-31 16-57 45-65Z"/><path d="M101 57c-6 22-6 71 0 103"/><path d="M89 44c17-15 35-13 49 2-13 14-30 17-49-2Z"/>',
      '<path d="M70 96c9-29 32-46 61-38 27 8 40 34 31 63-9 32-38 53-68 42-24-9-33-38-24-67Z"/><path d="M112 50c16-14 34-13 47 2-14 13-30 15-47-2Z"/><path d="M75 118c24 10 55 7 83-9"/>',
      '<path d="M64 101c13-33 47-51 82-35 29 14 37 49 17 78-18 27-53 35-81 17-20-13-27-38-18-60Z"/><path d="M92 55c15-19 33-20 49-8-10 17-26 24-49 8Z"/><path d="M79 88c25 21 52 24 81 8"/>',
      '<path d="M80 83c16-13 29-3 35 4 8-9 24-15 40 2 21 23 7 62-21 73-11 4-21-1-21-1s-10 5-22 0c-28-12-34-59-11-78Z"/><path d="M107 52c12-17 29-18 43-6-10 15-25 21-43 6Z"/><path d="M86 113c16 9 41 9 57-1"/>'
    ]
    return pomeBodies[placeholderSignature(item) % pomeBodies.length]
  }
  return '<circle cx="88" cy="105" r="39"/><circle cx="126" cy="105" r="39"/><path d="M92 42c14-22 34-24 48-16-8 19-25 30-48 16Z"/>'
}

function vegetablePlaceholderBody(item) {
  const slug = item.slug
  const subCategory = item.subCategory
  if (slug === 'yangcong') {
    return '<path d="M75 106c0-31 18-51 40-51s40 20 40 51c0 35-18 55-40 55s-40-20-40-55Z"/><path d="M102 58c-7-22 0-38 20-50"/><path d="M88 86c-11 24-12 51-2 73M116 70c13 28 13 61 0 90M141 92c10 22 10 43 0 63"/>'
  }
  if (slug === 'oujian') {
    return '<path d="M54 130c39-37 78-53 118-49"/><path d="M66 148c33-35 69-53 108-54"/><path d="M81 125c14 7 28 7 42-1"/><path d="M116 107c13 6 26 6 39-1"/><circle cx="72" cy="140" r="6" fill="none"/><circle cx="104" cy="121" r="5" fill="none"/><circle cx="138" cy="102" r="5" fill="none"/>'
  }
  if (slug === 'jielan' || slug === 'caixin') {
    return '<path d="M88 158c2-42 7-76 16-104"/><path d="M120 158c-2-42 0-75 8-101"/><path d="M63 112c18-23 43-30 75-18"/><path d="M96 82c23-18 47-17 70 2"/><circle cx="134" cy="60" r="11"/><circle cx="154" cy="70" r="8"/>'
  }
  if (slug === 'tonghao') {
    return '<path d="M62 153c9-42 20-75 35-101"/><path d="M100 154c2-43 6-78 12-105"/><path d="M135 154c-7-39-10-70-6-95"/><path d="M54 86c23-21 49-24 78-8"/><path d="M90 68c26-16 51-12 74 10"/><path d="M71 122c27 10 55 10 83 0"/>'
  }
  if (slug === 'wawacai' || slug === 'naitangcai') {
    return '<path d="M70 139c-9-36 6-69 41-91 33 20 48 53 36 91-22 20-55 20-77 0Z"/><path d="M91 142c-10-35-4-65 20-94"/><path d="M122 142c14-34 10-65-11-94"/><path d="M72 111c24 13 54 14 78 0"/>'
  }
  if (slug === 'zijinglan') {
    return '<circle cx="104" cy="113" r="50"/><path d="M61 115c23-28 62-35 91-13"/><path d="M77 82c30 8 55 30 69 66"/><path d="M101 64c-13 31-13 63 0 96"/><path d="M129 78c-20 20-38 45-53 76"/>'
  }
  if (slug === 'yuyiglan') {
    return '<path d="M96 158c3-45 7-80 14-106"/><path d="M61 120c16-26 39-35 69-28"/><path d="M82 83c21-24 47-28 78-11"/><path d="M116 118c19-21 40-25 64-10"/><path d="M70 146c25 10 54 8 86-8"/>'
  }
  if (slug === 'baozi-ganlan') {
    return '<circle cx="76" cy="118" r="20"/><circle cx="110" cy="101" r="23"/><circle cx="138" cy="127" r="21"/><path d="M62 118c10-13 25-18 42-13M95 96c14-14 31-17 51-8M124 128c10-13 24-17 41-10"/>'
  }
  if (slug === 'pilan') {
    return '<circle cx="101" cy="118" r="43"/><path d="M101 75c-2-29 11-48 39-58"/><path d="M83 82c-18-19-39-25-63-17"/><path d="M124 84c20-20 43-24 70-11"/><path d="M78 121c15 7 34 7 55 0"/>'
  }
  if (slug === 'jie-cai' || slug === 'muer-cai' || slug === 'luokui' || slug === 'hongxiancai' || slug === 'baimicai') {
    return '<path d="M58 143c12-44 34-76 66-93 25 26 25 62 4 98-27 11-50 9-70-5Z"/><path d="M112 150c0-38 7-70 22-96"/><path d="M70 105c22 12 43 15 63 11"/><path d="M84 75c20 15 37 22 51 22"/>'
  }
  if (slug === 'zhimasai') {
    return '<path d="M66 153c11-45 27-80 49-106"/><path d="M105 154c-2-43 1-79 9-108"/><path d="M141 153c-9-40-11-74-6-103"/><path d="M58 91c20-17 38-19 56-6"/><path d="M92 70c20-15 41-12 61 8"/><path d="M118 105c19-13 38-12 57 4"/>'
  }
  if (slug === 'luomashengcai') {
    return '<path d="M58 133c5-44 24-73 58-88 31 19 45 49 37 88-28 24-67 24-95 0Z"/><path d="M84 134c1-32 11-61 32-86"/><path d="M118 137c12-31 11-60-2-89"/><path d="M60 104c27 13 60 14 91 0"/>'
  }
  if (slug === 'wosun') {
    return '<path d="M83 158c-3-44 2-79 16-106 20-5 35 0 46 13-2 37-13 68-33 93H83Z"/><path d="M67 82c20-19 42-22 67-9"/><path d="M116 57c23-13 43-10 60 9"/>'
  }
  if (slug === 'suanmiao' || slug === 'jiuhuang') {
    return '<path d="M60 154c9-43 16-78 23-107"/><path d="M91 154c2-42 5-78 8-111"/><path d="M121 154c-3-43-2-78 5-105"/><path d="M150 154c-8-39-11-70-7-93"/><path d="M68 77c19-17 39-20 61-9"/>'
  }
  if (slug === 'helandou' || slug === 'wandoumiao' || slug === 'daodou' || slug === 'hudou' || slug === 'biandou') {
    return '<path d="M48 124c31-44 84-62 120-38-23 45-85 64-120 38Z"/><circle cx="82" cy="113" r="8"/><circle cx="111" cy="103" r="8"/><circle cx="140" cy="94" r="8"/><path d="M64 134c35 5 74-8 108-44"/>'
  }
  if (slug === 'chayote-miao') {
    return '<path d="M72 154c7-42 17-76 30-101"/><path d="M111 154c-2-42 1-76 9-102"/><path d="M59 103c21-23 47-29 77-14"/><path d="M102 75c23-17 48-14 74 8"/><path d="M143 59c18-9 35-6 50 8"/>'
  }
  if (slug === 'baizhuo') {
    return '<path d="M70 126c2-33 20-57 45-73 25 16 43 40 45 73-16 25-35 37-45 37s-29-12-45-37Z"/><path d="M91 78c-5 28-3 56 9 83M121 78c8 31 8 58-4 83M71 116c22 11 51 12 88 0"/>'
  }
  if (slug === 'yutou' || slug === 'moyu' || slug === 'cigu') {
    return '<path d="M68 104c10-35 39-53 75-40 29 10 39 39 21 68-18 30-57 40-84 20-13-10-18-28-12-48Z"/><path d="M96 60c-1-21 12-35 39-44"/><circle cx="95" cy="111" r="5" fill="none"/><circle cx="126" cy="99" r="4" fill="none"/>'
  }
  if (slug === 'shuiqincai') {
    return '<path d="M67 154c8-39 12-75 12-108"/><path d="M100 154c1-42 4-78 9-108"/><path d="M132 154c-6-38-8-70-3-98"/><path d="M60 78c22-20 43-24 65-11"/><path d="M101 62c24-15 45-13 63 3"/>'
  }
  if (slug === 'chuncai') {
    return '<ellipse cx="82" cy="105" rx="31" ry="20"/><ellipse cx="128" cy="118" rx="34" ry="22"/><path d="M55 139c36-14 73-18 111-12"/><path d="M82 105c18 8 34 8 48-1"/>'
  }
  if (slug === 'haidai' || slug === 'zicai') {
    return '<path d="M58 154c15-36 13-70-1-103 27 16 41 43 38 81"/><path d="M104 154c-12-39-8-75 12-108 22 31 26 66 12 108"/><path d="M149 154c-17-36-18-70-1-101 24 31 30 65 1 101"/>'
  }
  if (slug === 'jiucaihua') {
    return '<path d="M78 154c2-43 7-79 16-109"/><path d="M112 154c-1-43 2-78 10-105"/><path d="M149 154c-8-39-11-70-7-93"/><circle cx="99" cy="54" r="9"/><circle cx="119" cy="58" r="8"/><circle cx="139" cy="70" r="7"/>'
  }
  if (slug === 'nanhuateng' || slug === 'bawanghua') {
    return '<circle cx="102" cy="106" r="16"/><path d="M102 58c12 23 12 44 0 64M102 58c-17 19-25 39-23 64M102 58c20 16 31 35 34 62M61 91c26 0 46 8 61 25M143 91c-24 2-44 11-61 25M76 143c16-19 35-29 57-30"/><path d="M102 122v35"/>'
  }
  if (slug === 'muer') {
    return '<path d="M57 105c12-32 47-44 71-22 26-12 52 0 58 27-21 35-69 47-111 24-12-7-19-17-18-29Z"/><path d="M87 101c23 12 48 14 75 5"/>'
  }
  if (slug === 'zhusun') {
    return '<path d="M81 156c4-38 6-70 6-96h31c0 27 2 59 6 96H81Z"/><path d="M63 61c19-31 62-38 91-12 16 14 8 31-17 33H80c-19 0-25-8-17-21Z"/><path d="M66 90c27 25 72 24 100-1"/>'
  }
  if (slug === 'jizongjun' || slug === 'songrong' || slug === 'chashugu' || slug === 'xingbaogu' || slug === 'koucai') {
    return '<path d="M58 92c10-31 71-44 103-9 12 14 4 30-18 31H77c-17 0-23-9-19-22Z"/><path d="M91 112c-8 17-10 32-3 45h35c8-14 6-29-3-45"/><path d="M76 94c21 9 50 10 76 1"/>'
  }
  if (slug === 'tianqicai' || slug === 'huoxiang' || slug === 'zijisu' || slug === 'luole') {
    return '<path d="M93 155c3-43 7-78 15-105"/><path d="M56 99c21-25 48-31 80-15-21 23-47 29-80 15Z"/><path d="M94 73c25-18 50-16 76 5-25 17-50 15-76-5Z"/><path d="M113 123c21-15 43-14 65 4-21 14-43 13-65-4Z"/>'
  }
  if (slug === 'huanggua') {
    return '<path d="M55 124c25-39 69-60 108-53 13 2 19 13 14 25-14 35-65 58-107 47-15-4-22-9-15-19Z"/><path d="M72 128c29-24 59-38 91-42"/><path d="M86 113l8 9m19-22 8 9m18-18 7 8m-73 44 7 7m25-15 7 7"/><path d="M160 73c12-11 25-12 38-2"/>'
  }
  if (slug === 'sigua') {
    return '<path d="M59 133c21-48 61-75 104-66 12 3 17 14 11 26-19 40-63 63-106 56-11-2-14-7-9-16Z"/><path d="M74 141c13-32 43-62 87-72"/><path d="M68 126c31 3 64-17 91-48"/><path d="M86 144c26-8 55-30 80-60"/><path d="M155 67c13-15 30-17 47-8"/>'
  }
  if (slug === 'maodou') {
    return '<path d="M45 123c30-47 88-65 121-37-25 48-90 67-121 37Z"/><ellipse cx="82" cy="113" rx="13" ry="10"/><ellipse cx="113" cy="102" rx="13" ry="10"/><ellipse cx="143" cy="91" rx="12" ry="9"/><path d="M60 134c34 6 75-8 112-45"/>'
  }
  if (slug === 'kongxincai') {
    return '<path d="M62 151c12-40 21-73 28-101"/><path d="M99 151c2-42 5-77 10-105"/><path d="M136 151c-4-38-4-70 0-97"/><path d="M54 83c23-20 47-23 73-9-19 22-45 26-73 9Z"/><path d="M92 61c28-17 54-14 76 8-24 16-50 13-76-8Z"/><path d="M95 129c18 8 37 8 56 0"/>'
  }
  if (slug === 'xiancai') {
    return '<path d="M60 142c13-43 34-72 63-89 23 25 23 59 4 95-26 10-49 8-67-6Z"/><path d="M121 142c-3-37 8-66 34-89 20 30 16 62-11 91-9 3-16 2-23-2Z"/><path d="M99 153c5-37 13-70 24-100"/><path d="M75 104c19 13 38 17 57 13"/><path d="M94 76c19 16 35 23 49 22"/>'
  }
  if (slug === 'xihongshi') {
    return '<circle cx="100" cy="112" r="43"/><path d="M78 70l19 10 18-14 7 20 23-1-16 16 9 20-24-6-14 18-9-20-24 1 17-18Z"/>'
  }
  if (slug === 'qiezi') {
    return '<path d="M62 129c9-42 39-71 73-67 28 4 44 28 34 56-12 35-60 53-92 34-10-6-17-13-15-23Z"/><path d="M126 55c14-15 33-14 45-1-12 16-27 20-45 1Z"/>'
  }
  if (slug === 'qingjiao' || slug === 'lajiao') {
    return '<path d="M78 76c19-16 44-12 54 10 13-12 36-7 43 12 8 23-13 50-45 54-39 5-68-18-65-48 1-12 5-21 13-28Z"/><path d="M107 64c9-16 23-19 39-9"/>'
  }
  if (slug === 'qiukui') {
    return '<path d="M78 59c29 13 48 45 48 92-36-9-58-42-48-92Z"/><path d="M122 62c31 10 49 39 43 82-33-6-55-35-43-82Z"/><path d="M83 80l38 58"/><path d="M128 83l27 48"/>'
  }
  if (slug === 'xilanhua' || slug === 'cauliflower') {
    return slug === 'cauliflower'
      ? '<circle cx="75" cy="96" r="22"/><circle cx="101" cy="79" r="27"/><circle cx="130" cy="97" r="24"/><circle cx="104" cy="114" r="28"/><path d="M103 124v34"/><path d="M76 143c20 13 42 14 65 0"/>'
      : '<circle cx="75" cy="94" r="23"/><circle cx="103" cy="74" r="27"/><circle cx="132" cy="96" r="25"/><circle cx="103" cy="112" r="30"/><path d="M103 122v35"/><path d="M82 154h43"/>'
  }
  if (slug === 'shengcai') {
    return '<path d="M58 128c8-42 28-65 58-78 25 15 40 40 36 78-28 22-65 22-94 0Z"/><path d="M81 126c2-27 13-50 35-73"/><path d="M113 132c10-26 18-51 5-80"/><path d="M60 103c25 15 59 17 91 2"/>'
  }
  if (slug === 'bocai' || slug === 'youmaicai' || slug === 'xiangcai') {
    return '<path d="M58 139c10-43 30-73 61-90 24 23 26 59 8 96-26 11-49 9-69-6Z"/><path d="M102 150c2-37 7-68 17-101"/><path d="M71 103c20 11 39 15 57 13"/><path d="M81 73c18 14 32 21 44 22"/>'
  }
  if (slug === 'baicai') {
    return '<path d="M66 132c-5-35 10-66 45-86 34 18 50 49 40 87-25 22-60 22-85-1Z"/><path d="M88 137c-9-34-2-62 23-90"/><path d="M122 137c13-34 10-62-11-90"/><path d="M68 105c25 15 58 17 84 1"/>'
  }
  if (slug === 'baicaitai') {
    return '<path d="M96 156c0-40 5-73 15-103"/><path d="M67 122c15-19 34-25 57-17"/><path d="M102 83c21-12 39-10 55 8"/><circle cx="129" cy="62" r="13"/><circle cx="151" cy="70" r="10"/>'
  }
  if (subCategory === 'mushroom') {
    if (slug === 'jinzhengu') return '<path d="M69 154c0-36 3-66 8-90"/><path d="M96 154c0-38 2-69 5-94"/><path d="M123 154c0-34 1-62 4-84"/><circle cx="78" cy="57" r="13"/><circle cx="102" cy="52" r="14"/><circle cx="128" cy="64" r="12"/>'
    if (slug === 'pinggu') return '<path d="M48 94c20-28 65-38 104-19 23 11 20 34-5 40-33 8-76 4-99-21Z"/><path d="M90 113c-8 19-10 34-5 45h33c9-15 10-30 1-45"/>'
    return '<path d="M59 92c9-31 72-44 103-9 12 14 4 30-18 31H77c-17 0-23-9-18-22Z"/><path d="M91 112c-7 17-9 32-2 45h32c8-14 6-29-2-45"/>'
  }
  if (slug === 'huluobo') {
    return '<path d="M82 65c38 10 59 32 67 65-28 20-58 25-91 15 0-35 7-62 24-80Z"/><path d="M92 58c-2-20 8-33 29-40"/><path d="M109 60c12-18 29-23 50-15"/>'
  }
  if (slug === 'bailuobo') {
    return '<path d="M82 61c38 10 59 33 65 68-23 24-51 29-85 16 0-36 7-64 20-84Z"/><path d="M95 57c-4-21 8-35 32-42"/><path d="M111 58c13-18 31-24 52-16"/><path d="M82 95c18 8 39 9 62 3"/>'
  }
  if (slug === 'tudou') {
    return '<path d="M61 107c4-31 30-53 66-48 35 5 55 30 48 59-7 31-42 48-77 38-26-8-40-25-37-49Z"/><circle cx="92" cy="102" r="5" fill="none"/><circle cx="124" cy="89" r="4" fill="none"/><circle cx="141" cy="121" r="5" fill="none"/><circle cx="101" cy="134" r="4" fill="none"/>'
  }
  if (slug === 'hongshu') {
    return '<path d="M58 122c15-42 54-69 94-60 20 5 29 24 20 43-15 34-58 57-95 51-17-3-25-15-19-34Z"/><path d="M80 131c24-24 52-43 83-58"/><path d="M123 58c16-14 33-16 51-6"/>'
  }
  if (slug === 'lianou') {
    return '<ellipse cx="102" cy="112" rx="58" ry="39"/><circle cx="78" cy="105" r="9" fill="none"/><circle cx="106" cy="96" r="9" fill="none"/><circle cx="129" cy="113" r="9" fill="none"/><circle cx="101" cy="127" r="8" fill="none"/>'
  }
  if (slug === 'shanyao') {
    return '<path d="M60 126c26-45 64-68 107-62-10 43-43 76-91 83-12 2-19-7-16-21Z"/><path d="M84 131c21-29 45-49 73-61"/>'
  }
  if (slug === 'shengjiang') {
    return '<path d="M56 122c17-19 34-21 52-10 8-23 27-33 52-25-2 24-14 38-36 42 1 20-11 34-36 38-1-18-9-28-32-45Z"/><path d="M83 121c21 5 39 8 58 4"/>'
  }
  if (subCategory === 'root' || subCategory === 'tuber') {
    return '<path d="M70 68c37-15 75-3 86 25 10 27-12 56-50 64-29 6-49-7-53-29-4-21 4-48 17-60Z"/><path d="M96 58c2-19 15-29 34-31"/><path d="M106 60c13-14 30-17 50-8"/>'
  }
  if (slug === 'kugua') {
    return '<ellipse cx="102" cy="112" rx="55" ry="35"/><path d="M53 112c22-28 72-31 98-2"/><path d="M67 91l10 10m16-20 9 12m18-13 7 12m16 2 7 10m-85 28 10 8m21 5 8 10m24-11 7 10"/>'
  }
  if (slug === 'donggua') {
    return '<ellipse cx="101" cy="112" rx="61" ry="39"/><path d="M47 112c28-18 76-21 110 0"/><path d="M58 93c22-10 55-12 88-2"/><path d="M62 132c24 10 55 10 88 0"/><path d="M98 73c-9 22-9 55 0 78"/><path d="M92 57c17-16 36-16 51-1"/>'
  }
  if (slug === 'nangua') {
    return '<ellipse cx="102" cy="112" rx="58" ry="43"/><path d="M63 112c14-32 64-34 80-1"/><path d="M102 70c-18 26-18 57 0 85"/><path d="M102 70c18 26 18 57 0 85"/><path d="M93 61c18-14 35-12 50 3"/>'
  }
  if (slug === 'foshougua') {
    return '<path d="M78 72c29-18 62-3 68 35 6 36-18 56-44 51-30-6-46-32-38-59 3-11 8-20 14-27Z"/><path d="M96 74c-9 26-8 56 4 82"/><path d="M116 77c9 24 8 51-4 76"/>'
  }
  if (subCategory === 'gourd') {
    return '<ellipse cx="102" cy="112" rx="58" ry="38"/><path d="M48 112c28-18 74-20 108 0"/><path d="M102 75c-10 19-10 55 0 75"/><path d="M90 57c17-16 36-16 51-1"/>'
  }
  if (slug === 'sidou') {
    return '<path d="M49 142c34-47 76-75 121-82"/><path d="M58 153c37-38 78-60 124-66"/><path d="M88 126l11 10m22-26 10 10m23-24 9 9"/>'
  }
  if (slug === 'canchai') {
    return '<path d="M53 119c28-37 76-52 113-31-20 43-77 61-113 31Z"/><ellipse cx="91" cy="108" rx="12" ry="9"/><ellipse cx="121" cy="99" rx="12" ry="9"/><ellipse cx="148" cy="91" rx="10" ry="8"/>'
  }
  if (slug === 'wandou') {
    return '<path d="M48 124c29-43 82-61 118-38-21 45-84 64-118 38Z"/><circle cx="83" cy="113" r="9"/><circle cx="111" cy="103" r="9"/><circle cx="139" cy="94" r="9"/><path d="M64 134c34 5 72-8 106-43"/>'
  }
  if (subCategory === 'legume' || subCategory === 'pod') {
    return '<path d="M51 125c28-44 83-62 115-39-21 43-81 63-115 39Z"/><circle cx="85" cy="113" r="8"/><circle cx="110" cy="103" r="8"/><circle cx="135" cy="94" r="8"/>'
  }
  if (slug === 'dasuan') {
    return '<path d="M70 113c0-28 18-49 45-59 28 10 46 31 46 59 0 30-21 46-46 46s-45-16-45-46Z"/><path d="M96 65c-2-19 5-34 22-49"/><path d="M91 91c-9 20-10 43-1 63"/><path d="M117 80c11 25 11 50 0 75"/><path d="M139 95c9 20 8 39-2 57"/>'
  }
  if (slug === 'jiucai' || slug === 'cong') {
    return '<path d="M61 154c8-42 14-76 20-105"/><path d="M91 154c1-42 2-78 6-110"/><path d="M121 154c-3-43-2-76 4-101"/><path d="M151 154c-9-39-12-69-8-92"/>'
  }
  if (subCategory === 'allium') {
    return '<path d="M77 105c0-28 18-47 38-47s38 19 38 47c0 31-18 52-38 52s-38-21-38-52Z"/><path d="M103 60c-7-19-2-34 13-45"/><path d="M121 61c11-17 27-22 46-15"/>'
  }
  if (slug === 'yumi') {
    return '<path d="M84 58c31 8 53 39 45 91-32-8-55-41-45-91Z"/><path d="M66 125c19-17 43-17 73 4"/><path d="M94 72v72"/><path d="M111 83l-25 39"/><path d="M82 99l42 20"/>'
  }
  if (subCategory === 'grain') {
    return '<path d="M80 59c35 10 56 40 48 86-35-9-57-41-48-86Z"/><path d="M65 118c23-10 50-7 74 14"/><path d="M93 72v72"/><path d="M75 91l45 27"/>'
  }
  if (slug === 'sunzi') {
    return '<path d="M83 158c-7-39 2-75 30-110 30 35 39 71 31 110H83Z"/><path d="M92 124h43"/><path d="M99 94h28"/><path d="M108 65h12"/>'
  }
  if (slug === 'lusun') {
    return '<path d="M81 154c4-43 8-78 14-105"/><path d="M116 154c-1-42 1-76 8-103"/><path d="M94 50c14-15 30-15 45-1"/><path d="M75 92c20-14 42-15 66-2"/>'
  }
  if (slug === 'jiaobai') {
    return '<path d="M73 154c12-37 17-70 18-102"/><path d="M102 154c1-43 3-76 7-103"/><path d="M131 154c-9-37-12-68-8-96"/><path d="M65 126c22 14 49 16 78 5"/>'
  }
  if (slug === 'qincai') {
    return '<path d="M71 154c7-39 10-75 10-107"/><path d="M103 154c1-42 3-78 8-106"/><path d="M134 154c-7-38-9-70-4-98"/><path d="M62 75c21-20 42-24 64-12"/><path d="M102 62c22-16 42-15 61 1"/>'
  }
  if (subCategory === 'stem' || subCategory === 'aquatic') {
    return '<path d="M74 154c4-40 9-75 18-105"/><path d="M105 154c-1-42 2-78 10-108"/><path d="M136 154c-5-36-6-68-2-96"/><path d="M61 83c20-18 44-20 70-8"/><path d="M88 55c20-12 39-11 58 2"/>'
  }
  if (slug === 'huanghuacai') {
    return '<path d="M72 151c15-39 31-69 50-91"/><path d="M112 153c6-39 13-70 23-94"/><path d="M89 83c18-13 34-11 46 3"/><path d="M126 76c16-10 31-7 42 8"/>'
  }
  if (subCategory === 'flower') {
    return '<circle cx="100" cy="108" r="19"/><circle cx="75" cy="100" r="20"/><circle cx="122" cy="91" r="21"/><circle cx="129" cy="121" r="18"/><path d="M100 127v30"/><path d="M78 155h44"/>'
  }
  return '<path d="M56 50c18-22 45-24 64-8-15 22-39 28-64 8Z"/><path d="M104 52c24-13 48-8 60 12-22 12-44 8-60-12Z"/><ellipse cx="96" cy="112" rx="58" ry="34"/><ellipse cx="120" cy="94" rx="48" ry="28"/>'
}

function activeRegionalSeason(item) {
  return (item.regionalSeasons || []).find(season => season.region === activeRegionName.value)
}

function findProduceByName(name) {
  return allProduce.value.find(item => item.name === name)
    || produce.value.find(item => item.name === name)
    || null
}

function enrichOriginProduce(name, category) {
  const item = findProduceByName(name)
  return {
    name,
    item,
    category,
    image: item?.image || placeholderProduceImage({ name, category, subCategory: category === 'fruit' ? 'pome' : 'leafy-green' }),
    previewSprite: item?.previewSprite || null
  }
}

function buildProvinceProfile(province) {
  const profile = provinceProfileByName.value.get(province) || provinceOriginProfiles[0]
  const fruits = profile.fruits.map(name => enrichOriginProduce(name, 'fruit'))
  const vegetables = profile.vegetables.map(name => enrichOriginProduce(name, 'vegetable'))
  return {
    ...profile,
    fruits,
    vegetables,
    count: fruits.length + vegetables.length
  }
}

function originMapAreaColor(count) {
  if (count >= 8) return '#4e9d78'
  if (count >= 6) return '#78b985'
  if (count >= 4) return '#bfe5b8'
  return '#edf7df'
}

async function renderOriginMap() {
  await nextTick()
  await waitForPaint()
  if (!originMapRef.value) return
  const { echarts, chinaGeoJson } = await loadOriginMapRuntime()
  if (originMapChart && originMapChart.getDom() !== originMapRef.value) {
    originMapChart.dispose()
    originMapChart = null
  }
  if (!originMapChart) {
    echarts.registerMap('inseason-china', chinaGeoJson)
    originMapChart = echarts.init(originMapRef.value, null, { renderer: 'canvas' })
    originMapChart.on('click', params => {
      if (params?.name) {
        selectedProvince.value = params.name
        showProvincePicker.value = false
        provinceSearch.value = ''
      }
    })
  }
  originMapChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: params => {
        const profile = provinceProfileByName.value.get(params.name)
        if (!profile) return `${params.name}<br/>暂无代表蔬果`
        return `${params.name}<br/>水果：${profile.fruits.join('、')}<br/>蔬菜：${profile.vegetables.join('、')}`
      }
    },
    series: [{
      type: 'map',
      map: 'inseason-china',
      roam: true,
      zoom: 1.18,
      scaleLimit: { min: 0.9, max: 6 },
      selectedMode: 'single',
      data: provinceMapData.value,
      emphasis: {
        label: { show: true, color: '#203028', fontWeight: 800 },
        itemStyle: { areaColor: '#ffd69a', borderColor: '#c98f54', borderWidth: 1.2 }
      },
      select: {
        label: { show: true, color: '#203028', fontWeight: 900 },
        itemStyle: { areaColor: '#ffc98f', borderColor: '#6f9f62', borderWidth: 1.4 }
      },
      label: { show: false },
      itemStyle: {
        borderColor: 'rgba(255,255,255,0.92)',
        borderWidth: 0.7,
        areaColor: '#eaf5df'
      }
    }]
  }, true)
  originMapChart.resize()
  updateOriginMapSelection()
  animateMapPanel()
}

function waitForPaint() {
  if (typeof window === 'undefined') return Promise.resolve()
  return new Promise(resolve => window.requestAnimationFrame(() => resolve()))
}

async function loadOriginMapRuntime() {
  if (originMapRuntime) return originMapRuntime
  const [
    echartsCore,
    mapChart,
    geoComponent,
    tooltipComponent,
    canvasRenderer,
    chinaMapModule
  ] = await Promise.all([
    import('echarts/core'),
    import('echarts/lib/chart/map/install.js'),
    import('echarts/lib/component/geo/install.js'),
    import('echarts/lib/component/tooltip/install.js'),
    import('echarts/lib/renderer/installCanvasRenderer.js'),
    import('china-map-geojson')
  ])
  const echartsApi = echartsCore
  echartsApi.use([
    mapChart.install,
    geoComponent.install,
    tooltipComponent.install,
    canvasRenderer.install
  ])
  const chinaMap = chinaMapModule.default || chinaMapModule
  originMapRuntime = {
    echarts: echartsApi,
    chinaGeoJson: chinaMap.ChinaData || chinaMap.default?.ChinaData
  }
  return originMapRuntime
}

function scheduleOriginMapWarmup() {
  if (typeof window === 'undefined' || originMapRuntime) return
  const warmup = () => loadOriginMapRuntime().catch(() => {})
  if ('requestIdleCallback' in window) window.requestIdleCallback(warmup, { timeout: 2500 })
  else window.setTimeout(warmup, 900)
}

function updateOriginMapSelection() {
  if (!originMapChart || !selectedProvince.value) return
  originMapChart.dispatchAction({ type: 'mapUnSelect', seriesIndex: 0 })
  originMapChart.dispatchAction({ type: 'mapSelect', seriesIndex: 0, name: selectedProvince.value })
}

function toggleProvincePicker() {
  showProvincePicker.value = !showProvincePicker.value
  if (showProvincePicker.value) provinceSearch.value = ''
}

function selectOriginProvince(province) {
  selectedProvince.value = province
  showProvincePicker.value = false
  provinceSearch.value = ''
}

function resetOriginMap() {
  selectedProvince.value = '山东'
  showProvincePicker.value = false
  provinceSearch.value = ''
  originMapChart?.dispatchAction({ type: 'restore' })
  renderOriginMap()
}

function resizeOriginMap() {
  originMapChart?.resize()
}

function nutritionRanking(category) {
  return allProduce.value
    .filter(item => item.category === category)
    .filter(item => Number.isFinite(Number(item.nutritionPer100g?.[activeNutrient.value])))
    .sort((a, b) => Number(b.nutritionPer100g[activeNutrient.value]) - Number(a.nutritionPer100g[activeNutrient.value]))
    .slice(0, 8)
}

function nutrientValue(item) {
  const value = item.nutritionPer100g?.[activeNutrient.value]
  const formatted = Number(value) >= 10 ? Number(value).toFixed(0) : Number(value).toFixed(1)
  return `${formatted}${activeNutrientMeta.value.unit.replace('/100g', '')}`
}

function rankingCategoryLabel(item) {
  return subCategoryName(item.subCategory)
}

function rankingRankIcon(index) {
  return ['inseason:rank-champion', 'inseason:rank-runner-up', 'inseason:rank-third'][index]
}

function rankingRankLabel(index) {
  return ['冠', '亚', '季'][index] || `${index + 1}`
}

function selectNutrient(value, event) {
  activeNutrient.value = value
  animatePress(event?.currentTarget)
  animateRankingList()
}

function selectRankingCategory(value, event) {
  activeRankingCategory.value = value
  animatePress(event?.currentTarget)
  animateRankingList()
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function motionTargets(selector, root = appScreenRef.value) {
  return root ? [...root.querySelectorAll(selector)] : []
}

async function animateAppIntro() {
  if (prefersReducedMotion()) return
  await nextTick()
  const root = appScreenRef.value
  if (!root) return
  const introTargets = [
    ...motionTargets('.search-line, .quick-filters, .season-card, .category-tabs, .page-title-line, .map-panel, .province-produce-card, .ranking-category-toggle, .nutrient-tabs', root),
    ...motionTargets('.produce-card', root).slice(0, 8),
    ...motionTargets('.ranking-list button', root).slice(0, 8),
    ...motionTargets('.tabbar button', root)
  ]
  gsap.fromTo(root, { autoAlpha: 0, y: 12, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, ease: 'power3.out', overwrite: 'auto' })
  gsap.fromTo(introTargets, { autoAlpha: 0, y: 16, scale: 0.98 }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.46,
    ease: 'power2.out',
    stagger: { each: 0.035, from: 'start' },
    overwrite: 'auto',
    delay: 0.06
  })
  animateSeasonChange()
}

async function animateListRefresh() {
  if (prefersReducedMotion() || detailSlug.value || loading.value) return
  await nextTick()
  const root = scrollPageRef.value
  if (!root) return
  const targets = activeTab.value === 'category'
    ? motionTargets('.category-content-title, .category-list button', root)
    : [
        ...motionTargets('.split-title, .produce-card, .empty', root),
        ...motionTargets('.section-title', root)
      ]
  if (!targets.length) return
  gsap.fromTo(targets, { autoAlpha: 0, y: 12, scale: 0.985 }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.34,
    ease: 'power2.out',
    stagger: { each: 0.025, from: 'start' },
    overwrite: 'auto'
  })
}

async function animateCategoryBrowser() {
  if (prefersReducedMotion() || activeTab.value !== 'category') return
  await nextTick()
  const sidebarItems = motionTargets('.category-sidebar button', scrollPageRef.value).slice(0, 10)
  const contentItems = motionTargets('.category-content-title, .category-list button', categoryContentRef.value)
  gsap.fromTo(sidebarItems, { autoAlpha: 0.72, x: -8 }, {
    autoAlpha: 1,
    x: 0,
    duration: 0.24,
    ease: 'power2.out',
    stagger: 0.015,
    overwrite: 'auto'
  })
  gsap.fromTo(contentItems, { autoAlpha: 0, y: 14, scale: 0.985 }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.34,
    ease: 'power2.out',
    stagger: 0.03,
    overwrite: 'auto'
  })
}

async function animateMapPanel() {
  if (prefersReducedMotion() || activeTab.value !== 'map') return
  await nextTick()
  const targets = motionTargets('.map-panel, .province-produce-card, .province-produce-columns button', scrollPageRef.value)
  gsap.fromTo(targets, { autoAlpha: 0, y: 14, scale: 0.985 }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.36,
    ease: 'power2.out',
    stagger: { each: 0.025, from: 'start' },
    overwrite: 'auto'
  })
}

async function animateRankingList() {
  if (prefersReducedMotion() || activeTab.value !== 'ranking') return
  await nextTick()
  const targets = motionTargets('.ranking-sections section, .ranking-list button', scrollPageRef.value)
  gsap.fromTo(targets, { autoAlpha: 0, y: 12, scale: 0.985 }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.34,
    ease: 'power2.out',
    stagger: { each: 0.02, from: 'start' },
    overwrite: 'auto'
  })
}

async function animateDetailEntrance() {
  if (prefersReducedMotion()) return
  await nextTick()
  const root = detailPageRef.value
  if (!root) return
  const blocks = motionTargets('.detail-page-head, .detail-hero, .detail-page-copy > *, .variety-photo-list article', root)
  gsap.fromTo(root, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power3.out', overwrite: 'auto' })
  gsap.fromTo(blocks, { autoAlpha: 0, y: 18, scale: 0.985 }, {
    autoAlpha: 1,
    y: 0,
    scale: 1,
    duration: 0.42,
    ease: 'power2.out',
    stagger: { each: 0.035, from: 'start' },
    overwrite: 'auto',
    delay: 0.04
  })
}

async function animateSeasonChange() {
  if (prefersReducedMotion() || activeTab.value !== 'season') return
  await nextTick()
  const card = appScreenRef.value?.querySelector('.season-card')
  if (!card) return
  const art = card.querySelector('.season-art')
  const leaves = card.querySelectorAll('.season-leaf')
  gsap.fromTo(card, { '--season-glint': 0, y: 4 }, { '--season-glint': 1, y: 0, duration: 0.54, ease: 'power2.out', overwrite: 'auto' })
  gsap.fromTo(art, { autoAlpha: 0.76, scale: 0.9, rotation: -4 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.5)', overwrite: 'auto' })
  gsap.to(leaves, {
    y: (index) => index ? -3 : 4,
    rotation: (index) => index ? 8 : -10,
    duration: 2.8,
    ease: 'sine.inOut',
    repeat: 1,
    yoyo: true,
    stagger: 0.12,
    overwrite: 'auto'
  })
}

function animatePress(target) {
  if (prefersReducedMotion() || !target) return
  gsap.fromTo(target, { scale: 0.94 }, { scale: 1, duration: 0.28, ease: 'back.out(2.4)', overwrite: 'auto' })
}

function clearFilters() {
  activeCategory.value = 'all'
  query.value = ''
}

function selectTab(value, event) {
  if (activeTab.value === value) {
    animatePress(event?.currentTarget)
    return
  }
  activeTab.value = value
  if (value !== 'season') query.value = ''
  animatePress(event?.currentTarget)
  if (value === 'map') renderOriginMap()
  if (value === 'ranking') animateRankingList()
}

function handleScrollPage(event) {
  scrollPageTop.value = event.currentTarget.scrollTop || 0
}

function scrollToTop() {
  scrollPageRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function selectCategory(value, event) {
  if (activeCategory.value === value) {
    animatePress(event?.currentTarget)
    return
  }
  activeCategory.value = value
  animatePress(event?.currentTarget)
}

function selectSidebarCategory(value, event) {
  if (activeSidebarCategory.value === value) {
    animatePress(event?.currentTarget)
    return
  }
  activeSidebarCategory.value = value
  animatePress(event?.currentTarget)
}

function selectTypeGroup(value, event) {
  if (activeTypeGroup.value === value) {
    animatePress(event?.currentTarget)
    return
  }
  activeTypeGroup.value = value
  activeSidebarCategory.value = value.split(':')[0] || activeSidebarCategory.value
  animatePress(event?.currentTarget)
}

async function openDetail(item) {
  rememberScrollState()
  detailItem.value = item
  detailSlug.value = item.slug
  if (window.location.hash !== `#/produce/${item.slug}`) {
    window.history.pushState(null, '', `#/produce/${item.slug}`)
  }

  await loadDetail(item.slug, item)
}

async function loadDetail(slug, fallback = null) {
  detailLoading.value = true
  detailError.value = ''
  if (fallback) detailItem.value = fallback

  try {
    const response = await fetch(`${API_BASE}/api/produce/${slug}`)
    if (!response.ok) throw new Error('detail api failed')
    const data = await response.json()
    detailItem.value = normalizeProduce(data.item)
  } catch {
    if (!fallback) {
      detailError.value = '详情暂时加载失败，请稍后再试。'
    }
    detailItem.value = fallback
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailSlug.value = ''
  detailItem.value = null
  detailError.value = ''
  if (window.location.hash.startsWith('#/produce/')) {
    window.history.pushState(null, '', window.location.pathname + window.location.search)
  }
  restoreScrollState()
}

function syncDetailRoute() {
  const match = window.location.hash.match(/^#\/produce\/([^/]+)$/)
  const nextSlug = match ? decodeURIComponent(match[1]) : ''
  if (nextSlug === detailSlug.value) return
  if (nextSlug) rememberScrollState()
  detailSlug.value = nextSlug
  detailItem.value = null
  detailError.value = ''
  if (nextSlug) loadDetail(nextSlug)
  else restoreScrollState()
}

function rememberScrollState() {
  savedScrollState.value = {
    page: scrollPageRef.value?.scrollTop || 0,
    categorySidebar: categorySidebarRef.value?.scrollTop || 0,
    categoryContent: categoryContentRef.value?.scrollTop || 0
  }
}

async function restoreScrollState() {
  const state = savedScrollState.value
  await nextTick()
  requestAnimationFrame(() => {
    if (scrollPageRef.value) scrollPageRef.value.scrollTop = state.page
    if (categorySidebarRef.value) categorySidebarRef.value.scrollTop = state.categorySidebar
    if (categoryContentRef.value) categoryContentRef.value.scrollTop = state.categoryContent
  })
}

function selectMonth(label) {
  const option = monthOptions.find(item => item.label === label)
  if (option) activeMonth.value = option.value
  showMonth.value = false
}

function categoryName(category) {
  return categories.find(item => item.value === category)?.label || '食材'
}

function subCategoryName(value) {
  const names = {
    berry: '浆果',
    tropical: '热带果',
    'stone-fruit': '核果',
    pome: '仁果',
    melon: '瓜果',
    citrus: '柑橘',
    gourd: '瓜类',
    legume: '豆类',
    'leafy-green': '叶菜',
    'fruit-vegetable': '茄果类',
    cruciferous: '十字花科',
    root: '根茎类',
    mushroom: '菌菇类',
    grain: '谷物类',
    allium: '葱蒜类',
    pod: '荚果类',
    tuber: '薯芋类',
    stem: '茎菜',
    aquatic: '水生菜',
    herb: '香草类',
    flower: '花菜类',
    other: '其他'
  }
  return names[value] || value
}

function nutritionRows(item) {
  const nutrition = item?.nutritionPer100g || {}
  return [
    { label: '热量', value: `${nutrition.energyKcal ?? '-'} kcal` },
    { label: '碳水', value: `${nutrition.carbohydrateG ?? '-'} g` },
    { label: '膳食纤维', value: `${nutrition.fiberG ?? '-'} g` },
    { label: '蛋白质', value: `${nutrition.proteinG ?? '-'} g` },
    { label: '维生素C', value: `${nutrition.vitaminCMg ?? '-'} mg` },
    { label: '钾', value: `${nutrition.potassiumMg ?? '-'} mg` }
  ]
}

function sortForCurrentSeason(a, b) {
  return Number(b.inSeason) - Number(a.inSeason)
    || Number(b.bestNow) - Number(a.bestNow)
    || a.category.localeCompare(b.category)
    || a.name.localeCompare(b.name, 'zh-Hans-CN')
}

function sortForSearch(a, b, q) {
  if (!q) return 0
  return searchRank(a, q) - searchRank(b, q)
}

function searchRank(item, q) {
  if (item.name === q) return 0
  if ((item.aliases || []).some(alias => alias === q)) return 1
  if (item.name?.includes(q)) return 2
  if ((item.aliases || []).some(alias => alias.includes(q))) return 3
  if ((item.varieties || []).some(variety => variety.name?.includes(q))) return 4
  if (item.englishName?.toLowerCase().includes(q.toLowerCase())) return 5
  return 6
}

function formatMonths(months = []) {
  if (!months.length) return '当季'
  const sorted = [...months].sort((a, b) => a - b)
  return `${sorted[0]}月-${sorted[sorted.length - 1]}月`
}

function previewSpriteStyle(sprite) {
  if (!sprite?.src) return {}
  return {
    backgroundImage: `url(${sprite.src})`,
    backgroundSize: sprite.backgroundSize || `${(sprite.columns || 1) * 100}% ${(sprite.rows || 1) * 100}%`,
    backgroundPosition: sprite.backgroundPosition || '0% 0%',
    backgroundRepeat: 'no-repeat'
  }
}

const PreviewImage = defineComponent({
  props: ['item'],
  setup(props, { attrs }) {
    return () => {
      const item = props.item || {}
      const rootAttrs = { ...attrs }
      delete rootAttrs.class
      const className = [
        'produce-preview-image',
        attrs.class,
        { 'fruit-outline-image': item.category === 'fruit' }
      ]

      if (item.previewSprite?.src) {
        return h('span', {
          ...rootAttrs,
          class: className,
          style: previewSpriteStyle(item.previewSprite),
          role: 'img',
          'aria-label': item.name || item.label || '食材预览图'
        })
      }

      return h('img', {
        ...rootAttrs,
        class: className,
        src: item.image,
        alt: item.name || item.label || '食材预览图',
        loading: 'lazy',
        decoding: 'async'
      })
    }
  }
})

const ProduceCard = defineComponent({
  props: ['item', 'highlight'],
  emits: ['open'],
  setup(props, { emit }) {
    return () => h('article', {
      class: ['produce-card', { 'fruit-card': props.item.category === 'fruit', 'in-season-card': props.highlight }],
      onClick: () => emit('open', props.item)
    }, [
      h(PreviewImage, { item: props.item }),
      h('div', { class: 'card-copy' }, [
        h('h3', props.item.name),
        h('span', props.item.season),
        h('p', { class: 'card-reason-tag' }, props.item.reason)
      ])
    ])
  }
})

const ChoiceSheet = defineComponent({
  props: ['title', 'options', 'value'],
  emits: ['close', 'select'],
  setup(props, { emit }) {
    return () => h('div', { class: 'sheet-backdrop', onClick: event => event.target.className === 'sheet-backdrop' && emit('close') }, [
      h('section', { class: 'choice-sheet' }, [
        h('div', { class: 'choice-title' }, [
          h('h2', props.title),
          h('button', { type: 'button', onClick: () => emit('close') }, [h(Icon, { icon: 'solar:close-circle-bold' })])
        ]),
        h('div', { class: 'choice-list' }, props.options.map(option => h('button', {
            key: option,
            type: 'button',
            class: { selected: props.value === option },
            onClick: () => emit('select', option)
          }, [
            h('span', option),
            h(Icon, { icon: props.value === option ? 'solar:check-circle-bold' : 'solar:circle-linear' })
          ])))
      ])
    ])
  }
})
</script>
