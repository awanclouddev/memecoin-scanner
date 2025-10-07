import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'coins.json');

async function findLatestBackup() {
  try {
    const dir = path.join(process.cwd(), 'data');
    const names = await fs.readdir(dir);
    const bak = names
      .filter(n => n.startsWith('coins.json.bak.'))
      .map(n => ({ name: n, ts: Number(n.split('.').pop()) || 0 }))
      .sort((a, b) => b.ts - a.ts);
    if (bak.length === 0) return null;
    const raw = await fs.readFile(path.join(dir, bak[0].name), 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const payload = JSON.parse(raw);
    // if the canonical file exists but has empty data, try to return the latest backup
    if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
      const backup = await findLatestBackup();
      if (backup && Array.isArray(backup.data) && backup.data.length > 0) {
        return NextResponse.json({ ...backup, _fallback: 'backup' }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
        });
      }
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err) {
    return NextResponse.json({ lastUpdated: null, data: [] }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
    });
  }
}
