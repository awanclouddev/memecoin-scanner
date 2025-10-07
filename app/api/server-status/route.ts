import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_PATH = path.join(DATA_DIR, 'coins.json')

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8')
    const payload = JSON.parse(raw)
    const hasData = Array.isArray(payload.data) && payload.data.length > 0
  // check backup availability
  let backups: string[] = []
  try { backups = await fs.readdir(DATA_DIR) } catch (e) { backups = [] }
  const hasBackup = backups.some(n => n.startsWith('coins.json.bak.'))
    return NextResponse.json({ ok: true, hasData, hasBackup })
  } catch (e) {
    // file missing or invalid
  let backups: string[] = []
  try { backups = await fs.readdir(DATA_DIR) } catch (e) { backups = [] }
  const hasBackup = backups.some(n => n.startsWith('coins.json.bak.'))
    return NextResponse.json({ ok: false, hasData: false, hasBackup })
  }
}
