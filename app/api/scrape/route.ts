import { NextResponse } from 'next/server';
import { scrapeDexscreener } from '../../../lib/scraper';
import fs from 'fs/promises';
import path from 'path';
import { sendAlert } from '../../../lib/alerter';

const DATA_PATH = path.join(process.cwd(), 'data', 'coins.json');

export async function GET(req: Request) {
  // support ?secret= query or Authorization: Bearer <secret>
  let authorized = false;
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('secret');
    if (q && q === process.env.SCRAPE_SECRET) authorized = true;
  } catch (e) {}
  try {
    const auth = (req.headers as any).get?.('authorization') || (req.headers as any).get?.('Authorization');
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice('Bearer '.length).trim();
      if (token === process.env.SCRAPE_SECRET) authorized = true;
    }
  } catch (e) {}
  if (!authorized) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const coins = await scrapeDexscreener();

    // If the scraper returned no coins, do not overwrite the canonical data file.
    // Instead write a debug marker and metrics so the daemon / user can inspect what happened.
    if (!Array.isArray(coins) || coins.length === 0) {
      try {
        await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
        const debugPath = path.join(process.cwd(), 'data', `debug-empty-scrape-${Date.now()}.json`);
        await fs.writeFile(debugPath, JSON.stringify({ lastAttempt: new Date().toISOString(), coinCount: 0 }, null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to write debug-empty-scrape file', e);
      }

      // Update metrics to indicate a zero-result scrape (but preserve existing coins.json)
      try {
        const METRICS_PATH = path.join(process.cwd(), 'data', 'daemon-metrics.json');
        const metrics = {
          lastScrape: new Date().toISOString(),
          lastCount: 0,
          consecutiveFailures: 1,
          lastSuccessAt: null
        };
        await fs.mkdir(path.dirname(METRICS_PATH), { recursive: true });
        await fs.writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to write daemon metrics from /api/scrape (empty result)', e);
      }

      // Return an explicit response and do not overwrite existing data
      return NextResponse.json({ status: 'no_data', message: 'Scrape returned 0 coins; existing data preserved.', coinCount: 0 }, { status: 200 });
    }

    // write daemon metrics as the daemon would
    try {
      const METRICS_PATH = path.join(process.cwd(), 'data', 'daemon-metrics.json');
      const metrics = {
        lastScrape: new Date().toISOString(),
        lastCount: coins.length,
        consecutiveFailures: 0,
        lastSuccessAt: new Date().toISOString()
      };
      await fs.writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write daemon metrics from /api/scrape', e);
    }

    // Optionally send success alert
    try {
      const alertOnSuccess = (process.env.ALERT_ON_SUCCESS || 'false').toLowerCase() === 'true';
      const minCount = Math.max(1, parseInt(process.env.ALERT_ON_SUCCESS_MIN_COUNT || '1', 10));
      if (alertOnSuccess && coins.length >= minCount) {
        const alertPayload = `Successful scrape: ${coins.length} coins at ${new Date().toISOString()}`;
        const alertRes = await sendAlert('Scrape successful (manual)', alertPayload);
        const safe = { ...alertRes } as any;
        if (safe && typeof safe.body === 'string') {
          safe.body = safe.body.length > 200 ? safe.body.slice(0, 200) + '...[truncated]' : safe.body;
        }
        console.log('Sent success alert (manual)', safe);
      } else {
        console.log(`Success alert suppressed (coins=${coins.length}, min=${minCount}, alertOnSuccess=${alertOnSuccess})`);
      }
    } catch (e) {
      console.error('Failed to send success alert from /api/scrape', e);
    }

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
