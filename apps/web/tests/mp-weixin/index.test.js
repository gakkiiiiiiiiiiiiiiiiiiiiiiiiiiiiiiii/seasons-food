describe('mp-weixin smoke', () => {
  let page

  beforeAll(async () => {
    page = await waitForCurrentPage()
    await page.waitFor('.season-card', 30000)
  })

  it('loads the seasonal home page', async () => {
    expect(page.path).toBe('pages/index/index')

    const seasonCard = await page.$('.season-card')
    expect(seasonCard).toBeTruthy()

    const seasonName = await page.$('.season-copy')
    expect(await seasonName.text()).toContain('芒种')
  })

  it('switches to the category tab', async () => {
    const categoryTab = await page.$('.tabbar__button--category')
    expect(categoryTab).toBeTruthy()

    await categoryTab.tap()
    await page.waitFor('.category-page', 10000)

    const activeCategoryTab = await page.$('.tabbar__button--category')
    expect(await activeCategoryTab.attribute('class')).toContain('active')
  })
})

async function waitForCurrentPage() {
  const deadline = Date.now() + 30000
  let lastError

  while (Date.now() < deadline) {
    try {
      const currentPage = await program.currentPage()
      if (currentPage?.path === 'pages/index/index') {
        return currentPage
      }
    } catch (error) {
      lastError = error
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw lastError || new Error('Mini program page did not become ready')
}
