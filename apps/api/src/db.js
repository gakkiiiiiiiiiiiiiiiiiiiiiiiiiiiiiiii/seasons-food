import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultDbPath = path.resolve(__dirname, '../db/inseason.sqlite')

export function openDatabase(dbPath = process.env.DATABASE_URL || defaultDbPath) {
  const db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
  return db
}

export function parseJson(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}
