import { type Browser } from 'puppeteer';
import * as cheerio from 'cheerio';
import { Coin } from './types';
import logger from './logger';
import fs from 'fs/promises';
import path from 'path';

let puppeteer: any;
let StealthPlugin: any;

async function initPuppeteer() {
  if (!puppeteer) {
    puppeteer = (await import('puppeteer-extra')).default;
    StealthPlugin = (await import('puppeteer-extra-plugin-stealth')).default;
    puppeteer.use(StealthPlugin());
  }
  return puppeteer;
}

const TARGET_URL = 'https://dexscreener.com/solana?rankBy=trendingScoreM5&order=desc&minLiq=10000&minMarketCap=10000&maxMarketCap=250000&min24HVol=50000&profile=1';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function randomMove(page: any): Promise<void> {
  const x = Math.floor(Math.random() * 800);
  const y = Math.floor(Math.random() * 600);
  await page.mouse.move(x, y);
  await sleep(Math.random() * 200);
}

async function simulateHumanBehavior(page: any): Promise<void> {
  // Random mouse movements
  for (let i = 0; i < 5; i++) {
    await randomMove(page);
  }
  
  // Random scrolling
  await page.evaluate(() => {
    window.scrollTo(0, Math.random() * 500);
  });
  await sleep(1000);
}

async function retry<T>(fn: () => Promise<T>, maxAttempts: number = 3, delay: number = 1000): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retry attempts reached');
}

export function parseNumber(text: string): number {
  if (text === null || text === undefined) return 0;
  let s = String(text).trim();
  if (s === '') return 0;

  // Detect percent sign separately (we keep numeric percent value: '12.5%' -> 12.5)
  const hasPercent = s.includes('%');

  // Handle enclosing parentheses as negative numbers: (1.2%) -> -1.2
  const isParenNegative = /^\(.*\)$/.test(s);
  s = s.replace(/^[\(\)\s]+|[\(\)\s]+$/g, '');

  // Remove currency symbol and commas
  s = s.replace(/[$,\s]/g, '');

  // Match number with optional suffix k/m/b
  const m = s.match(/^(-?[0-9]*\.?[0-9]+)([kKmMbB])?%?$/);
  let num = 0;
  if (m) {
    num = parseFloat(m[1]);
    const suffix = m[2];
    if (suffix) {
      if (/k/i.test(suffix)) num *= 1e3;
      else if (/m/i.test(suffix)) num *= 1e6;
      else if (/b/i.test(suffix)) num *= 1e9;
    }
  } else {
    // last-resort parse
    num = parseFloat(s.replace('%', '')) || 0;
  }

  if (isNaN(num) || !Number.isFinite(num)) return 0;
  if (isParenNegative) num = -num;

  // For percentages we return the numeric percent (e.g. '12.5%' -> 12.5)
  return num;
}

// Normalize various coin-like objects into Coin[] with numeric fields
function normalizeCoins(items: any[]): Coin[] {
  return (items || []).map((c: any) => {
    const pairAddress = (c.pairAddress || c.address || c.id || '') + '';
    const name = (c.name || c.tokenName || c.title || c.baseTokenName || '') + '';
    const symbol = (c.symbol || c.ticker || c.baseTokenSymbol || '') + '';

    const priceUsd = parseNumber(c.priceUsd ?? c.price ?? c.lastPrice ?? c.priceText ?? '0');
    const marketCap = parseNumber(c.marketCap ?? c.mcap ?? c.market_cap ?? c.mcapUsd ?? 0);
    const liquidity = parseNumber(c.liquidity ?? c.liq ?? c.poolLiquidity ?? 0);
    const volume24h = parseNumber(c.volume24h ?? c.vol24h ?? c.volume ?? c['24h'] ?? 0);
    const priceChange24h = parseNumber(c.priceChange24h ?? c.change24h ?? c.delta24h ?? c.change ?? 0);
    const dexscreenerUrl = (c.dexscreenerUrl || c.url || c.link || '') + '';

    return {
      pairAddress,
      name,
      symbol,
      priceUsd,
      liquidity,
      marketCap,
      volume24h,
      priceChange24h,
      dexscreenerUrl,
      timestamp: new Date().toISOString()
    } as Coin;
  });
}

async function getPageContent(): Promise<string | Coin[]> {
  let browser: Browser | null = null;
  
  try {
    const puppeteer = await initPuppeteer();
    const userAgent = getRandomUserAgent();
    
    logger.info('Launching browser');
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920x1080',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-features=site-isolation-trial-command-line',
        '--disable-web-security',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
      ],
      headless: false
    });

    const page = await browser!.newPage();
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1920, height: 1080 });

    // Randomize timezone and locale
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
      Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
    });

    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="119", "Not?A_Brand";v="24"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });
    
    // First navigate to homepage
    logger.info('Navigating to homepage');
    await page.goto('https://dexscreener.com', { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await sleep(5000);
    await simulateHumanBehavior(page);
    
    // Then navigate to target URL
    logger.info('Navigating to target URL');
    await page.goto(TARGET_URL, { 
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    logger.info('Simulating human behavior');
    await simulateHumanBehavior(page);
    
    // Check for Cloudflare or other bot detection
    const cloudflareDetected = await page.evaluate(() => {
      return document.body.textContent?.includes('Cloudflare') || false;
    });
    
    if (cloudflareDetected) {
      logger.info('Cloudflare detected, waiting longer');
      await sleep(10000);
    }

    await sleep(5000);
    
    // Try to extract data directly using JavaScript
    const jsData: Coin[] = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.table-wrap tr, [data-testid="pair-table"] tr, .token-list > div'));
      const now = new Date().toISOString();
      
      return rows
        .map(row => {
          const cells = Array.from(row.querySelectorAll('td, div[role="cell"]'));
          if (cells.length < 8) return null;

          // Extract pair address and URL
          const link = row.querySelector('a')?.href || '';
          const pairAddress = link.split('/').pop() || '';
          
          return {
            pairAddress,
            symbol: cells[1]?.textContent?.trim() || '',
            name: cells[2]?.textContent?.trim() || '',
            priceUsd: parseFloat((cells[3]?.textContent?.replace(/[$,]/g, '') || '0')),
            marketCap: parseFloat((cells[4]?.textContent?.replace(/[$,]/g, '') || '0')),
            liquidity: parseFloat((cells[5]?.textContent?.replace(/[$,]/g, '') || '0')),
            volume24h: parseFloat((cells[6]?.textContent?.replace(/[$,]/g, '') || '0')),
            priceChange24h: parseFloat((cells[7]?.textContent?.replace(/[%,]/g, '') || '0')),
            dexscreenerUrl: link,
            timestamp: now
          };
        })
        .filter(item => item && item.symbol) as any[];
    });
    logger.info(`JS-extracted ${jsData.length} coins`);

    if (jsData.length > 0) {
      // Normalize numeric fields and persist both raw and normalized data + artifacts
      const normalized = normalizeCoins(jsData as any[]);
      try {
        await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
        await fs.writeFile(path.join(process.cwd(), 'data', 'debug-js-extracted-raw.json'), JSON.stringify(jsData, null, 2), 'utf-8');
        await fs.writeFile(path.join(process.cwd(), 'data', 'debug-js-extracted.json'), JSON.stringify(normalized, null, 2), 'utf-8');

        // capture first N raw anchor rows innerHTML for debugging
        try {
          const rawRows: string[] = await page.$$eval('a.ds-dex-table-row', (els: any) => els.slice(0, 10).map((e: any) => e.innerHTML));
          await fs.writeFile(path.join(process.cwd(), 'data', 'debug-raw-rows.json'), JSON.stringify(rawRows, null, 2), 'utf-8');
        } catch (e) {
          // non-fatal
        }

        // screenshot and HTML
        try {
          await page.screenshot({ path: (path.join(process.cwd(), 'data', 'debug-screenshot.png') as `${string}.png`) });
        } catch (e) {}
        try {
          const content = await page.content();
          await fs.writeFile(path.join(process.cwd(), 'data', 'debug-page-content.html'), content, 'utf-8');
        } catch (e) {}
      } catch (e) {
        logger.error('Failed to write debug-js-extracted files', e);
      }

      await browser!.close();
      return normalized;
    }

    // Try to extract embedded JSON from script tags as a fallback
    try {
      const scriptExtracted = await tryExtractFromScripts(page);
      if (Array.isArray(scriptExtracted) && scriptExtracted.length > 0) {
        const normalized = normalizeCoins(scriptExtracted as any[]);
        try {
          await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
          await fs.writeFile(path.join(process.cwd(), 'data', 'debug-script-extracted-raw.json'), JSON.stringify(scriptExtracted, null, 2), 'utf-8');
          await fs.writeFile(path.join(process.cwd(), 'data', 'debug-script-extracted.json'), JSON.stringify(normalized, null, 2), 'utf-8');

          // raw rows and artifacts
          try {
            const rawRows: string[] = await page.$$eval('a.ds-dex-table-row', (els: any) => els.slice(0, 10).map((e: any) => e.innerHTML));
            await fs.writeFile(path.join(process.cwd(), 'data', 'debug-raw-rows.json'), JSON.stringify(rawRows, null, 2), 'utf-8');
          } catch (e) {}
          try { await page.screenshot({ path: (path.join(process.cwd(), 'data', 'debug-screenshot.png') as `${string}.png`) }); } catch(e){}
          try { const content = await page.content(); await fs.writeFile(path.join(process.cwd(), 'data', 'debug-page-content.html'), content, 'utf-8'); } catch(e){}
        } catch (e) {
          logger.error('Failed to write debug-script-extracted.json', e);
        }

        await browser!.close();
        return normalized;
      }
    } catch (e) {
      logger.info('No script-based extraction succeeded', e);
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: './debug-screenshot.png' });

    // Get page content as fallback
    const content = await page.content();
    logger.info(`Page content length: ${content.length} bytes`);
    
    try {
      await fs.writeFile(path.join(process.cwd(), 'data', 'debug-page-content.html'), content, 'utf-8');
    } catch (e) {
      logger.error('Failed to write debug-page-content.html', e);
    }

    await browser!.close();
    return content;
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

    // Try to find JSON data embedded in script tags and normalize into Coin[]
async function tryExtractFromScripts(page: any): Promise<Coin[]> {
  try {
    const scripts: string[] = await page.$$eval('script', (els: any) => els.map((s: any) => s.textContent || ''));

    // helper to search object recursively for arrays of candidate items
    function findArrays(obj: any, results: any[] = []) {
      if (!obj || typeof obj !== 'object') return results;
      if (Array.isArray(obj)) {
        // if array of objects and looks like coin entries
        if (obj.length > 0 && typeof obj[0] === 'object') results.push(obj);
        for (const item of obj) findArrays(item, results);
        return results;
      }
      for (const k of Object.keys(obj)) {
        try { findArrays(obj[k], results); } catch (e) {}
      }
      return results;
    }

    const candidates: any[] = [];
    for (const t of scripts) {
      if (!t || t.length < 100) continue;

      // attempt several JSON extraction patterns
      const patterns = [
        /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/, 
        /__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?/, 
        /window\.__DATA__\s*=\s*(\{[\s\S]*?\})\s*;?/, 
        /\bvar\s+initialState\s*=\s*(\{[\s\S]*?\})\s*;?/
      ];

      for (const p of patterns) {
        const m = t.match(p);
        if (m && m[1]) {
          try {
            const obj = JSON.parse(m[1]);
            const arrays = findArrays(obj, []);
            for (const arr of arrays) {
              // heuristics: array of objects with symbol/name/price
              if (arr.length > 0 && typeof arr[0] === 'object') {
                const sample = arr[0];
                if ('symbol' in sample || 'name' in sample || 'price' in sample || 'priceUsd' in sample) {
                  candidates.push(...arr);
                }
              }
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }

      // fallback: try to find large JSON blobs inside the script
      try {
        const jsonMatches = Array.from(t.matchAll(/(\{[\s\S]{500,}\})/g));
        for (const jm of jsonMatches) {
          try {
            const obj = JSON.parse(jm[1]);
            const arrays = findArrays(obj, []);
            for (const arr of arrays) {
              if (arr.length > 0 && typeof arr[0] === 'object') {
                const sample = arr[0];
                if ('symbol' in sample || 'name' in sample || 'price' in sample || 'priceUsd' in sample) {
                  candidates.push(...arr);
                }
              }
            }
          } catch (e) {
            // continue
          }
        }
      } catch (e) {}
    }

    // Normalize candidates into Coin[] using heuristics
    const coins: Coin[] = [];
    for (const c of candidates) {
      try {
        const pairAddress = c.pairAddress || c.address || c.id || '';
        const name = c.name || c.tokenName || c.title || '';
        const symbol = c.symbol || c.ticker || '';
        const priceUsd = parseFloat((c.priceUsd || c.price || c.lastPrice || 0) + '') || 0;
        const marketCap = parseFloat((c.marketCap || c.mcap || 0) + '') || 0;
        const liquidity = parseFloat((c.liquidity || c.liq || 0) + '') || 0;
        const volume24h = parseFloat((c.volume24h || c.vol24h || c.volume || 0) + '') || 0;
        const priceChange24h = parseFloat((c.priceChange24h || c.change24h || c.delta24h || 0) + '') || 0;
        const dexscreenerUrl = c.url || c.dexscreenerUrl || '';

        if (!symbol && !name) continue;

        coins.push({
          pairAddress: pairAddress + '',
          name: name + '',
          symbol: symbol + '',
          priceUsd,
          liquidity,
          marketCap,
          volume24h,
          priceChange24h,
          dexscreenerUrl: dexscreenerUrl + '',
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        // ignore
      }
    }

    // dedupe by pairAddress or symbol
    const seen = new Set<string>();
    const dedup: Coin[] = [];
    for (const c of coins) {
      const key = (c.pairAddress || c.symbol || c.name || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      dedup.push(c);
    }

    return dedup;
  } catch (e) {
    logger.error('tryExtractFromScripts failed', e);
    return [];
  }
}

function extractCoinData($: any): Coin[] {
  const coins: Coin[] = [];
  const genericSelectors = [
    '.token-list > div',
    '[data-testid="pair-table"] tr',
    '.table-wrap tr',
    '.token-info-row'
  ];

  logger.info('Trying to find coin data (anchor-based rows first)');

  // First try the anchor-based rows observed in debug HTML
  $('a.ds-dex-table-row').each((_idx: any, el: any) => {
    try {
      const $row = $(el);
      const link = $row.attr('href') || '';
      const pairAddress = link.split('/').pop() || '';

      // Token column
      const tokenCol = $row.find('.ds-table-data-cell.ds-dex-table-row-col-token');
      const symbol = tokenCol.find('.ds-dex-table-row-base-token-symbol').first().text().trim() || tokenCol.find('.ds-dex-table-row-base-token-name-text').first().text().trim();
      const name = tokenCol.find('.ds-dex-table-row-base-token-name-text').first().text().trim() || '';

      // Price
      const priceText = $row.find('.ds-table-data-cell.ds-dex-table-row-col-price').first().text().trim();
      const priceUsd = parseNumber(priceText);

      // Price change (try common classes)
      const changeText = $row.find('.ds-change-perc').first().text().trim() || $row.find('.ds-table-data-cell.ds-dex-table-row-col-price-change-h24').first().text().trim();
      const priceChange24h = parseNumber(changeText);

      // Liquidity and market cap
      const liquidity = parseNumber($row.find('.ds-table-data-cell.ds-dex-table-row-col-liquidity').first().text());
      const marketCap = parseNumber($row.find('.ds-table-data-cell.ds-dex-table-row-col-market-cap').first().text());

      // Volume (if available)
      const volume24h = parseNumber($row.find('.ds-table-data-cell.ds-dex-table-row-col-volume').first().text() || $row.find('.ds-table-data-cell.ds-dex-table-row-col-24h-volume').first().text());

      if (!symbol) return; // skip rows without symbol

      coins.push({
        pairAddress,
        symbol,
        name,
        priceUsd,
        marketCap,
        liquidity,
        volume24h,
        priceChange24h,
        dexscreenerUrl: link,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error parsing anchor row:', error);
    }
  });

  if (coins.length > 0) {
    logger.info(`Found ${coins.length} coins using anchor selector`);
    return coins;
  }

  logger.info('Falling back to generic selectors');

  for (const selector of genericSelectors) {
    $(selector).each((_idx: any, row: any) => {
      try {
        const $row = $(row);
        const cells = $row.find('div[role="cell"], td');
        if (cells.length < 4) return; // Skip header or invalid rows

        const link = $row.find('a').attr('href') || '';
        const pairAddress = link.split('/').pop() || '';

        const symbol = $(cells[1]).text().trim();
        if (!symbol) return; // Skip empty rows

        const name = $(cells[2]).text().trim();
        const priceUsd = parseNumber($(cells[3]).text());
        const marketCap = parseNumber($(cells[4]).text());
        const liquidity = parseNumber($(cells[5]).text());
        const volume24h = parseNumber($(cells[6]).text());
        const priceChange24h = parseNumber($(cells[7]).text());

        coins.push({
          pairAddress,
          symbol,
          name,
          priceUsd,
          marketCap,
          liquidity,
          volume24h,
          priceChange24h,
          dexscreenerUrl: link,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Error parsing row:', error);
      }
    });

    if (coins.length > 0) {
      logger.info(`Found ${coins.length} coins using selector: ${selector}`);
      break;
    }
  }

  return coins;
}

export async function scrapeDexscreener(): Promise<Coin[]> {
  logger.info('Starting Dexscreener scrape');
  
  try {
    const result = await retry(() => getPageContent(), 3, 5000);
    
    if (Array.isArray(result)) {
      return result;
    }
    
    const $ = cheerio.load(result as string);
    const coins = extractCoinData($);
    // persist parsed coins for debugging
    try {
      await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
      await fs.writeFile(path.join(process.cwd(), 'data', 'debug-parsed-coins.json'), JSON.stringify(coins, null, 2), 'utf-8');
    } catch (e) {
      logger.error('Failed to write debug-parsed-coins.json', e);
    }
    logger.info(`Scraped ${coins.length} coins`);
    return coins;
  } catch (error: unknown) {
    logger.error('Failed to scrape Dexscreener:', error);
    if (error instanceof Error) {
      console.error('Detailed error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}
