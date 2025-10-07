import { scrapeDexscreener } from '../lib/scraper';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const minAge = process.env.MIN_PAIR_AGE_MINUTES ? parseInt(process.env.MIN_PAIR_AGE_MINUTES, 10) : undefined;
  console.log('Starting scraper (minPairAgeMinutes=', minAge, ')');
  // scrapeDexscreener currently does not accept options in this branch; call without args
  const coins = await scrapeDexscreener();
  console.log('Scraped', coins.length, 'coins');
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    const DATA_PATH = path.join(process.cwd(), 'data', 'coins.json');
    // do not overwrite with empty results
    if (!Array.isArray(coins) || coins.length === 0) {
      console.warn('Scraped 0 coins — preserving existing data and writing debug marker');
      await fs.writeFile(path.join(process.cwd(), 'data', `debug-empty-scrape-${Date.now()}.json`), JSON.stringify({ lastAttempt: new Date().toISOString(), coinCount: 0 }, null, 2), 'utf-8');
    } else {
      // backup existing file if present
      try {
        const existing = await fs.readFile(DATA_PATH, 'utf-8');
        await fs.writeFile(path.join(process.cwd(), 'data', `coins.json.bak.${Date.now()}`), existing, 'utf-8');
      } catch (e) {
        // ignore if file doesn't exist
      }
      await fs.writeFile(DATA_PATH, JSON.stringify({ lastUpdated: new Date().toISOString(), data: coins }, null, 2), 'utf-8');
      console.log('Wrote data/coins.json (with backup)');
    }
  } catch (e) {
    console.error('Failed to write coins.json', e);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Scraper error', err);
    process.exit(1);
  });
}
