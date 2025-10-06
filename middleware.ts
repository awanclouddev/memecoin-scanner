import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { scrapeLimiter, coinsLimiter } from './lib/rate-limit';

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes in production
  if (!request.nextUrl.pathname.startsWith('/api/') || process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-real-ip') || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    '127.0.0.1';

  // Apply different rate limits based on the endpoint
  if (request.nextUrl.pathname === '/api/scrape') {
    const { success, limit, reset, remaining } = await scrapeLimiter.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Too many scrape requests, please wait 5 minutes',
          limit,
          reset,
          remaining 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }
  } else if (request.nextUrl.pathname === '/api/coins') {
    const { success, limit, reset, remaining } = await coinsLimiter.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Too many requests, please wait a minute',
          limit,
          reset,
          remaining
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};