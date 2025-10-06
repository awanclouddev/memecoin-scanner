import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as cheerio from 'cheerio';
import { Coin } from '../lib/types';
import { parseNumber } from '../lib/scraper';

// Read the sample HTML
const html = readFileSync(join(__dirname, '../lib/__fixtures__/sample-data.html'), 'utf-8');
const $ = cheerio.load(html);

const coins: Coin[] = [];

// Parse the sample data
$('table tbody tr').each((_, el) => {
  const row = $(el);
  const tds = row.find('td');
  const nameCell = tds.eq(1);
  const name = nameCell.find('.pair-name').text();
  const symbol = nameCell.find('.pair-symbol').text();
  const link = nameCell.find('a').attr('href') || '';

  coins.push({
    pairAddress: link.split('/').pop() || '',
    name,
    symbol,
    priceUsd: parseNumber(tds.eq(2).text()),
    liquidity: parseNumber(tds.eq(3).text()),
    marketCap: parseNumber(tds.eq(4).text()),
    volume24h: parseNumber(tds.eq(5).text()),
    priceChange24h: parseNumber(tds.eq(6).text()),
    dexscreenerUrl: link ? new URL(link, 'https://dexscreener.com').toString() : '',
    timestamp: new Date().toISOString()
  });
});

// Write to coins.json
const output = {
  lastUpdated: new Date().toISOString(),
  data: coins
};

writeFileSync(
  join(__dirname, '../data/coins.json'),
  JSON.stringify(output, null, 2),
  'utf-8'
);

console.log('Sample data written to coins.json');

// placeholder script used by package.json:populate-test
console.log('populate-test-data placeholder');