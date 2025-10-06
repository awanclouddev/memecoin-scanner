import { scrapeDexscreener } from '../lib/scraper';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const minAge = process.env.MIN_PAIR_AGE_MINUTES ? parseInt(process.env.MIN_PAIR_AGE_MINUTES, 10) : undefined;
  console.log('Starting scraper (minPairAgeMinutes=', minAge, ')');
  const coins = await scrapeDexscreener(minAge ? { minPairAgeMinutes: minAge } : undefined);
  console.log('Scraped', coins.length, 'coins');
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.writeFile(path.join(process.cwd(), 'data', 'coins.json'), JSON.stringify({ lastUpdated: new Date().toISOString(), data: coins }, null, 2), 'utf-8');
    console.log('Wrote data/coins.json');
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
