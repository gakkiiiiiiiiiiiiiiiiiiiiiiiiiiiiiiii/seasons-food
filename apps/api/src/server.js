import cors from 'cors'
import express from 'express'
import { openDatabase } from './db.js'
import { getProduceBySlug, getSeasonSummary, listProduce } from './repository.js'

const app = express()
const db = openDatabase()
const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || '0.0.0.0'

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'inseason-api' })
})

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'inseason-api' })
})

app.get('/api/count', (_req, res) => {
  const produceCount = db.prepare('SELECT COUNT(*) AS count FROM produce').get().count
  res.json({ count: produceCount })
})

app.get('/api/produce', (req, res) => {
  const { category = 'all', month, q, availability = 'mature', region } = req.query
  res.json({
    items: listProduce(db, { category, month, q, availability, region }),
    filters: { category, month: month ? Number(month) : null, q: q || '', availability, region: region || '' }
  })
})

app.get('/api/produce/:slug', (req, res) => {
  const item = getProduceBySlug(db, req.params.slug)
  if (!item) {
    res.status(404).json({ error: 'Produce item not found' })
    return
  }
  res.json({ item })
})

app.get('/api/seasons/:month', (req, res) => {
  const month = Number(req.params.month)
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'Month must be an integer from 1 to 12' })
    return
  }
  res.json(getSeasonSummary(db, month))
})

app.listen(port, host, () => {
  console.log(`InSeason API listening on http://${host}:${port}`)
})
