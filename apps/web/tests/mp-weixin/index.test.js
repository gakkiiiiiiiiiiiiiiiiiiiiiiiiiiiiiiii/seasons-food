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

  it('renders produce data from the active API source', async () => {
    await page.callMethod('selectTab', 'category')
    await page.waitFor('.category-page', 10000)
    await page.waitFor('.category-list button', 30000)

    const errorState = await page.$('.error-state')
    expect(errorState).toBeFalsy()

    const categoryItems = await page.$$('.category-list button')
    expect(categoryItems.length).toBeGreaterThan(0)
  })

  it('switches to the category tab', async () => {
    await page.callMethod('selectTab', 'category')
    await page.waitFor('.category-page', 10000)

    const categoryPage = await page.$('.category-page')
    expect(categoryPage).toBeTruthy()
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
