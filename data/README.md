This folder stores the latest scraped coins JSON at `coins.json`.

How to trigger a scrape locally:

1. Set `SCRAPE_SECRET` in your environment.
2. Start Next.js dev server: `npm run dev`.
3. Request the scraper endpoint: `http://localhost:3000/api/scrape?secret=YOUR_SECRET`

Note: In production, use Vercel Cron Jobs to hit the `/api/scrape` endpoint every 5 minutes with the secret.
