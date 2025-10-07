import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const METRICS_PATH = path.join(process.cwd(), 'data', 'daemon-metrics.json');

export async function GET() {
  try {
    const raw = await fs.readFile(METRICS_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data, { status: 200, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: 'No metrics available' }, { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } });
  }
}
