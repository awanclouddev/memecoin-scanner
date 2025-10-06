import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a Redis instance for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create limiter for the scrape endpoint
export const scrapeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1m"), // 10 requests per minute for testing
  analytics: true,
  prefix: "ratelimit:scrape",
});

// Create limiter for the public coins endpoint
export const coinsLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1m"), // 30 requests per minute
  analytics: true,
  prefix: "ratelimit:coins",
});