import { DatabaseSync } from 'node:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { id, now } from './core.mjs'

const moduleDir = dirname(fileURLToPath(import.meta.url))

export function openDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(resolve(join(dataDir, 'foundationos.sqlite3')), { timeout: 5000 })
  db.exec('pragma foreign_keys = on; pragma journal_mode = wal; pragma busy_timeout = 5000;')
  db.exec('create table if not exists schema_migrations (version text primary key, applied_at text not null)')
  const migrations = [
    { version: '001-initial', file: join(moduleDir, 'migrations', '001-initial.sql') },
    { version: '002-stewardship', file: join(moduleDir, 'migrations', '002-stewardship.sql') },
  ]
  for (const migration of migrations) {
    if (!db.prepare('select 1 from schema_migrations where version = ?').get(migration.version)) {
      db.exec('begin immediate')
      try {
        db.exec(readFileSync(migration.file, 'utf8'))
        db.prepare('insert into schema_migrations (version, applied_at) values (?, ?)').run(migration.version, now())
        db.exec('commit')
      } catch (error) {
        db.exec('rollback')
        throw error
      }
    }
  }
  db.prepare('delete from sessions where expires_at <= ?').run(now())
  return db
}

export function transaction(db, callback) {
  db.exec('begin immediate')
  try {
    const result = callback()
    db.exec('commit')
    return result
  } catch (error) {
    db.exec('rollback')
    throw error
  }
}

export function audit(db, { actorId = null, action, objectType, objectId = null, summary = {}, requestId = null }) {
  db.prepare(`insert into audit_events
    (id, actor_id, action, object_type, object_id, summary_json, request_id, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id(), actorId, action, objectType, objectId, JSON.stringify(summary), requestId, now())
}

export function setupRequired(db) {
  return !db.prepare('select 1 from foundation where setup_completed_at is not null limit 1').get()
}
