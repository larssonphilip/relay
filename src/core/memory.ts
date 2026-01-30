import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Message, StoredFact, ConversationContext } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../data/memory.db')

export class Memory {
  private db: Database.Database

  constructor() {
    this.db = new Database(DB_PATH)
    this.db.pragma('journal_mode = WAL')
    this.initSchema()
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `)

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS facts 
      USING fts5(content, timestamp UNINDEXED)
    `)
  }

  saveMessage(message: Message): void {
    const stmt = this.db.prepare(`
      INSERT INTO messages (role, content, timestamp)
      VALUES (?, ?, ?)
    `)
    stmt.run(message.role, message.content, message.timestamp)
  }

  getRecentMessages(limit: number = 20): Message[] {
    const stmt = this.db.prepare(`
      SELECT role, content, timestamp
      FROM messages
      ORDER BY id DESC
      LIMIT ?
    `)
    const rows = stmt.all(limit) as Message[]
    return rows.reverse()
  }

  getMessageCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM messages')
    const result = stmt.get() as { count: number }
    return result.count
  }


  saveFact(content: string): void {
    const existing = this.db.prepare(
      "SELECT rowid FROM facts WHERE content = ?"
    ).get(content)

    if (!existing) {
      const stmt = this.db.prepare(`
        INSERT INTO facts (content, timestamp)
        VALUES (?, ?)
      `)
      stmt.run(content, Date.now())
    }
  }

  searchFacts(query: string, limit: number = 10): StoredFact[] {
    const stmt = this.db.prepare(`
      SELECT rowid as id, content, timestamp
      FROM facts
      WHERE facts MATCH ?
      ORDER BY rank
      LIMIT ?
    `)
    return stmt.all(query, limit) as StoredFact[]
  }

  getAllFacts(limit: number = 50): StoredFact[] {
    const stmt = this.db.prepare(`
      SELECT rowid as id, content, timestamp
      FROM facts
      ORDER BY timestamp DESC
      LIMIT ?
    `)
    return stmt.all(limit) as StoredFact[]
  }

  getContext(query?: string): ConversationContext {
    const recentMessages = this.getRecentMessages(20)
    const relevantFacts = query
      ? this.searchFacts(query, 10)
      : this.getAllFacts(10)

    return {
      recentMessages,
      relevantFacts
    }
  }

  close(): void {
    this.db.close()
  }
}
