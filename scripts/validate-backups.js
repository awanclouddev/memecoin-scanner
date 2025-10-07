#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const dataDir = path.resolve(process.cwd(), 'data')

function isBackupFile(name) {
  return name.startsWith('coins.json.bak.')
}

if (!fs.existsSync(dataDir)) {
  console.error('data directory not found:', dataDir)
  process.exit(2)
}
const files = fs.readdirSync(dataDir).filter(isBackupFile)
if (files.length === 0) {
  console.log('No backup files found')
  process.exit(0)
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
  } catch (e) {
    failures++
    console.error('[FAIL]', f, '-', e && e.message ? e.message : e)
  }
}

if (failures > 0) process.exit(3)
