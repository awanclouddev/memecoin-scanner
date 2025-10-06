import { expect, test, describe } from 'vitest';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { parseNumber } from '../lib/scraper';
import { Coin } from '../lib/types';

describe('Scraper', () => {
  test('parseNumber handles currency and suffixes', () => {
    expect(parseNumber('$1,234.56')).toBe(1234.56);
    expect(parseNumber('1.2k')).toBe(1200);
    expect(parseNumber('2.5m')).toBe(2500000);
    expect(parseNumber('45.5%')).toBe(45.5);
  });

  test('can parse fixture HTML', async () => {
    const html = await fs.readFile(
      path.join(__dirname, '__fixtures__/dexscreener.html'),
      'utf-8'
    );
    
    const $ = cheerio.load(html);
    const coins: Coin[] = [];
    
    $('table tbody tr').each((i, el) => {
      const row = $(el);
      const tds = row.find('td');
      const nameCell = tds.eq(1);
      const name = nameCell.find('.pair-name').text().trim();
      const symbol = nameCell.find('.pair-symbol').text().trim();
      const link = nameCell.find('a').attr('href') || '';
      
      coins.push({
        pairAddress: 'test-pair-address',
        name,
        symbol,
        priceUsd: parseNumber(tds.eq(2).text()),
        liquidity: parseNumber(tds.eq(3).text()),
        marketCap: parseNumber(tds.eq(4).text()),
        volume24h: parseNumber(tds.eq(5).text()),
        priceChange24h: parseNumber(tds.eq(6).text()),
        dexscreenerUrl: link ? new URL(link, 'https://dexscreener.com').toString() : '',
        timestamp: expect.any(String)
      });
    });
    
    expect(coins).toHaveLength(1);
    expect(coins[0]).toMatchObject({
      name: 'Test Coin',
      symbol: 'TST',
      priceUsd: 0.12345,
      liquidity: 15000,
      marketCap: 100000,
      volume24h: 75000,
      priceChange24h: 45.5
    });
  });
});