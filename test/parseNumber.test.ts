import { describe, it, expect } from 'vitest';
import { parseNumber } from '../lib/scraper';

describe('parseNumber', () => {
  it('parses plain numbers', () => {
    expect(parseNumber('123.45')).toBeCloseTo(123.45);
  });

  it('parses currency with $ and commas', () => {
    expect(parseNumber('$1,234.56')).toBeCloseTo(1234.56);
  });

  it('parses K/M/B suffixes', () => {
    expect(parseNumber('1.5k')).toBeCloseTo(1500);
    expect(parseNumber('2M')).toBeCloseTo(2_000_000);
    expect(parseNumber('3b')).toBeCloseTo(3_000_000_000);
  });

  it('parses percentages and negatives with parentheses', () => {
    expect(parseNumber('12.5%')).toBeCloseTo(12.5);
    expect(parseNumber('(5.2%)')).toBeCloseTo(-5.2);
  });

  it('handles empty and invalid input', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber(null as any)).toBe(0);
    expect(parseNumber('not a number')).toBe(0);
  });
});
