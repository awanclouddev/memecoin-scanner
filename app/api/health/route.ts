import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const COINS_PATH = path.join(process.cwd(), 'data', 'coins.json');

export async function GET() {
  try {
    const raw = await fs.readFile(COINS_PATH, 'utf-8');
    const obj = JSON.parse(raw);
    const lastUpdated = obj.lastUpdated || null;
    const coinCount = Array.isArray(obj.data) ? obj.data.length : 0;
    return NextResponse.json({ status: 'ok', lastUpdated, coinCount });
  } catch (e) {
    return NextResponse.json({ status: 'no-data', message: 'No coins data available' }, { status: 404 });
  }
}
