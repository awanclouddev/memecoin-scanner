import { describe, it, expect } from 'vitest';
import { normalizeCoins } from '../lib/scraper';

describe('normalizeCoins', () => {
  it('normalizes a variety of shapes into Coin objects', () => {
    const input = [
      { address: 'a1', tokenName: 'Alpha', ticker: 'ALP', price: '$1.23', mcap: '2M', liq: '1k', volume: '500', change24h: '5%' },
      { pairAddress: 'b2', name: 'Beta', symbol: 'BET', priceUsd: '0.0001', market_cap: '100k', poolLiquidity: '2k', vol24h: '1k', delta24h: '-3%' }
    ];

    const out = normalizeCoins(input);
    expect(out.length).toBe(2);
    expect(out[0].pairAddress).toBe('a1');
    expect(out[0].name).toBe('Alpha');
    expect(out[0].symbol).toBe('ALP');
    expect(out[0].priceUsd).toBeGreaterThan(1);
    expect(out[1].pairAddress).toBe('b2');
    expect(out[1].priceUsd).toBeCloseTo(0.0001);
    expect(out[1].priceChange24h).toBe(-3);
  });
});
