import { scrapeDexscreener } from '../lib/scraper';
import { sendAlert } from '../lib/alerter';
import fs from 'fs/promises';
import path from 'path';

const intervalMinutes = parseInt(process.env.SCRAPE_INTERVAL_MINUTES || process.env.MIN_PAIR_AGE_MINUTES || '5', 10) || 5;
const scrapeOnce = !!process.env.SCRAPE_ONCE;

let shuttingDown = false;
let consecutiveFailures = 0;
let lastSuccessAt: string | null = null;
const FAILURE_THRESHOLD = parseInt(process.env.SCRAPE_FAILURE_THRESHOLD || '3', 10) || 3;

process.on('SIGINT', () => { shuttingDown = true; console.log('Received SIGINT, shutting down...'); });
process.on('SIGTERM', () => { shuttingDown = true; console.log('Received SIGTERM, shutting down...'); });

async function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function runLoop() {
  console.log(`Scrape daemon starting (interval: ${intervalMinutes} minute(s)). scrapeOnce=${scrapeOnce}`);
  do {
    try {
      console.log(new Date().toISOString(), '-> running scrapeDexscreener()');
      const coins = await scrapeDexscreener();
      console.log(new Date().toISOString(), `<- scraped ${coins.length} coins`);
      // persist results so API and frontend can read latest data
      try {
        const DATA_PATH = path.join(process.cwd(), 'data', 'coins.json');
        await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
        // If the scraper returned nothing, do not overwrite canonical data
        if (!Array.isArray(coins) || coins.length === 0) {
          console.warn('Daemon scraped 0 coins — preserving existing data and writing debug marker');
          await fs.writeFile(path.join(process.cwd(), 'data', `debug-empty-scrape-${Date.now()}.json`), JSON.stringify({ lastAttempt: new Date().toISOString(), coinCount: 0 }, null, 2), 'utf-8');
        } else {
          // backup existing canonical file
          try {
            const existing = await fs.readFile(DATA_PATH, 'utf-8');
            await fs.writeFile(path.join(process.cwd(), 'data', `coins.json.bak.${Date.now()}`), existing, 'utf-8');
          } catch (e) {
            // ignore if file doesn't exist
          }
          const payload = { lastUpdated: new Date().toISOString(), data: coins };
          await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2), 'utf-8');
          console.log('Wrote data/coins.json (with backup)');
        }
        // update metrics on successful write
        try {
          lastSuccessAt = new Date().toISOString();
          const METRICS_PATH = path.join(process.cwd(), 'data', 'daemon-metrics.json');
          const metrics = {
            lastScrape: new Date().toISOString(),
            lastCount: coins.length,
            consecutiveFailures,
            lastSuccessAt
          };
          await fs.writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2), 'utf-8');
        } catch (e) {
          console.error('Failed to write daemon metrics after success', e);
        }
      } catch (e) {
        console.error('Failed to write data/coins.json from daemon', e);
      }
      // reset failures on success
      consecutiveFailures = 0;
      // Optionally send success alert, but only if we have at least ALERT_ON_SUCCESS_MIN_COUNT coins
      try {
        const alertOnSuccess = (process.env.ALERT_ON_SUCCESS || 'false').toLowerCase() === 'true';
        const minCount = Math.max(1, parseInt(process.env.ALERT_ON_SUCCESS_MIN_COUNT || '1', 10));
        if (alertOnSuccess && coins.length >= minCount) {
          const payload = `Successful scrape: ${coins.length} coins at ${new Date().toISOString()}`;
          const alertRes = await sendAlert('Scrape successful', payload);
          const safe = { ...alertRes } as any;
          if (safe && typeof safe.body === 'string') {
            safe.body = safe.body.length > 200 ? safe.body.slice(0, 200) + '...[truncated]' : safe.body;
          }
          if (safe && typeof safe.error === 'string') {
            safe.error = safe.error.length > 200 ? safe.error.slice(0, 200) + '...[truncated]' : safe.error;
          }
          console.log('Sent success alert', safe);
        } else {
          console.log(`Success alert suppressed (coins=${coins.length}, min=${minCount}, alertOnSuccess=${alertOnSuccess})`);
        }
      } catch (e) {
        console.error('Failed to send success alert', e);
      }
    } catch (err) {
      console.error('Scrape failed:', err);
      consecutiveFailures += 1;
      console.warn(`Consecutive scrape failures: ${consecutiveFailures}/${FAILURE_THRESHOLD}`);
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        try {
          const alertRes = await sendAlert('Scrape daemon failing', `Daemon has failed ${consecutiveFailures} times in a row. Error: ${String(err)}`);
          // Mask or truncate body for logs
          const safe = { ...alertRes } as any;
          if (safe && typeof safe.body === 'string') {
            safe.body = safe.body.length > 200 ? safe.body.slice(0, 200) + '...[truncated]' : safe.body;
          }
          if (safe && typeof safe.error === 'string') {
            safe.error = safe.error.length > 200 ? safe.error.slice(0, 200) + '...[truncated]' : safe.error;
          }
          console.log('Sent scrape failure alert', safe);
        } catch (e) {
          console.error('Failed to send scrape failure alert', e);
        }
        // avoid spamming; reset counter after alert
        consecutiveFailures = 0;
      }
      // write metrics on failure as well
      try {
        const METRICS_PATH = path.join(process.cwd(), 'data', 'daemon-metrics.json');
        const metrics = {
          lastScrape: new Date().toISOString(),
          lastCount: 0,
          consecutiveFailures,
          lastSuccessAt
        };
        await fs.mkdir(path.dirname(METRICS_PATH), { recursive: true });
        await fs.writeFile(METRICS_PATH, JSON.stringify(metrics, null, 2), 'utf-8');
      } catch (e) {
        console.error('Failed to write daemon metrics after failure', e);
      }
    }

    if (scrapeOnce) break;

    // wait for interval or until shutdown
    const waitMs = intervalMinutes * 60 * 1000;
    let waited = 0;
    const step = 1000;
    while (!shuttingDown && waited < waitMs) {
      await sleep(step);
      waited += step;
    }
  } while (!shuttingDown);

  console.log('Scrape daemon exiting');
}

if (require.main === module) {
  runLoop().catch(err => { console.error('Daemon error', err); process.exit(1); });
}
