import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNumber } from '../scraper';

describe('Scraper Tests', () => {
  it('parseNumber should handle various formats', () => {
    expect(parseNumber('$0.00012345')).toBe(0.00012345);
    expect(parseNumber('$25,000')).toBe(25000);
    expect(parseNumber('15k')).toBe(15000);
    expect(parseNumber('100k')).toBe(100000);
    expect(parseNumber('45.5%')).toBe(45.5);
    expect(parseNumber('-12.3%')).toBe(-12.3);
  });

  it('should parse sample HTML correctly', () => {
    const html = readFileSync(join(__dirname, '__fixtures__/sample-data.html'), 'utf-8');
    const $ = cheerio.load(html);
    const rows = $('table tbody tr');
    
    expect(rows.length).toBe(2);

    // Test first row
    const row1 = $(rows[0]);
    const name1 = row1.find('.pair-name').text();
    const symbol1 = row1.find('.pair-symbol').text();
    const price1 = parseNumber(row1.find('td').eq(2).text());
    
    expect(name1).toBe('Solana Doge');
    expect(symbol1).toBe('SDOG');
    expect(price1).toBe(0.00012345);

    // Test second row
    const row2 = $(rows[1]);
    const name2 = row2.find('.pair-name').text();
    const symbol2 = row2.find('.pair-symbol').text();
    const liquidity2 = parseNumber(row2.find('td').eq(3).text());
    const change2 = parseNumber(row2.find('td').eq(6).text());
    
    expect(name2).toBe('Moon Coin');
    expect(symbol2).toBe('MOON');
    expect(liquidity2).toBe(15000);
    expect(change2).toBe(-12.3);
  });
});