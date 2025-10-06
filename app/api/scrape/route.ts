import { NextResponse } from 'next/server';
import { scrapeDexscreener } from '../../../lib/scraper';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'coins.json');

export async function GET(req: Request) {
  // simple protection via ?secret= token
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  if (!secret || secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const coins = await scrapeDexscreener();
    const payload = { lastUpdated: new Date().toISOString(), data: coins };
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    return NextResponse.json({ status: 'success', message: 'Data scraped successfully.', coinCount: coins.length });
  } catch (err) {
    const error = err as Error;
    console.error('Scrape error:', error);
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Failed to scrape data.',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }, { status: 500 });
    }
    return NextResponse.json({ status: 'error', message: 'Failed to scrape data.' }, { status: 500 });
  }
}
