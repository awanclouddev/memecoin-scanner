import { scrapeDexscreener } from './lib/scraper.js';

async function test() {
  try {
    const coins = await scrapeDexscreener();
    console.log('Success! Found', coins.length, 'coins');
    console.log('First coin:', coins[0]);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

test();