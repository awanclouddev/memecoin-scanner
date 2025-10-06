import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'coins.json');

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const payload = JSON.parse(raw);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ lastUpdated: null, data: [] });
  }
}
