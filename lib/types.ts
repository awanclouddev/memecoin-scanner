export type Coin = {
  pairAddress: string;
  name: string;
  symbol: string;
  priceUsd: number;
  liquidity: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  dexscreenerUrl: string;
  timestamp: string; // ISO 8601
};

export type ScrapeResult = {
  lastUpdated: string;
  data: Coin[];
};
