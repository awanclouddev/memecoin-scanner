#!/usr/bin/env node
/**
 * validate-backups.ts
 * Simple script to validate that data/*.bak.* files are parseable JSON
 * and contain a top-level object with `data` array.
 */
import fs from 'fs'
import path from 'path'

const dataDir = path.resolve(process.cwd(), 'data')

function isBackupFile(name: string) {
  return name.startsWith('coins.json.bak.')
}

async function main() {
  if (!fs.existsSync(dataDir)) {
    console.error('data directory not found:', dataDir)
    process.exit(2)
  }
  const files = fs.readdirSync(dataDir).filter(isBackupFile)
  if (files.length === 0) {
    console.log('No backup files found')
    return
  }

  let failures = 0
  for (const f of files) {
    const p = path.join(dataDir, f)
    try {
      const raw = fs.readFileSync(p, 'utf8')
      const j = JSON.parse(raw)
      if (!j || typeof j !== 'object') throw new Error('Not an object')
      if (!Array.isArray(j.data)) throw new Error('Missing data array')
      console.log('[OK] ', f, '- entries:', j.data.length)
    } catch (e: any) {
      failures++
      console.error('[FAIL]', f, '-', e.message || e)
    }
  }

  if (failures > 0) process.exit(3)
}

main().catch(e => { console.error(e); process.exit(1) })
