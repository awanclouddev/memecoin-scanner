import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'coins.json');

function unauthorized() {
  return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
}

function checkSecret(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('secret');
    if (q && q === process.env.SCRAPE_SECRET) return true;
  } catch (e) {}
  try {
    const auth = (req.headers as any).get?.('authorization') || (req.headers as any).get?.('Authorization');
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length).trim();
      if (token === process.env.SCRAPE_SECRET) return true;
    }
  } catch (e) {}
  return false;
}

export async function GET(req: Request) {
  if (!checkSecret(req)) return unauthorized();

  try {
    const names = await fs.readdir(DATA_DIR);
    const backups = names.filter(n => n.startsWith('coins.json.bak.')).sort().reverse();
    return NextResponse.json({ status: 'ok', backups });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: 'Failed to list backups' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkSecret(req)) return unauthorized();

  try {
    const body = await req.json();
    const { filename } = body || {};
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ status: 'error', message: 'filename required' }, { status: 400 });
    }
    const src = path.join(DATA_DIR, filename);
    // ensure file exists and is a backup
    if (!filename.startsWith('coins.json.bak.')) {
      return NextResponse.json({ status: 'error', message: 'invalid backup file' }, { status: 400 });
    }
    try {
      const raw = await fs.readFile(src, 'utf-8');
      // backup current canonical file first
      try {
        const existing = await fs.readFile(DATA_PATH, 'utf-8');
        await fs.writeFile(path.join(DATA_DIR, `coins.json.bak.${Date.now()}`), existing, 'utf-8');
      } catch (e) {
        // ignore if not present
      }
      await fs.writeFile(DATA_PATH, raw, 'utf-8');
      return NextResponse.json({ status: 'ok', message: `Restored ${filename}` });
    } catch (e) {
      return NextResponse.json({ status: 'error', message: 'failed to read backup' }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json({ status: 'error', message: 'invalid request' }, { status: 400 });
  }
}
