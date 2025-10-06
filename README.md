This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, set up your environment variables in `.env.local`:

```env
# Scraping secret key for protected endpoints
SCRAPE_SECRET=your-secret-here

# Upstash Redis configuration for rate limiting (get these from your Upstash dashboard)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Rate Limiting

The API endpoints are protected by rate limits:

- `/api/scrape`: Limited to 2 requests per 5 minutes
- `/api/coins`: Limited to 30 requests per minute

Rate limiting is implemented using Upstash Redis. Make sure to set up your Upstash configuration in the environment variables.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# MemeCoin Scanner

## Repo status

This repository contains an in-development scraper for DexScreener. Tests and helper scripts were added. To merge parsed coins into `data/coins.json`, run:

```bash
npx tsx scripts/merge-parsed-coins.ts
```

To run tests locally:

```bash
npm test
```

## How to push the workflow file

If you want to enable GitHub Actions CI, push the workflow file from a machine that has a PAT with `workflow` scope:

```bash
# re-add the workflow on that machine, then:
git add .github/workflows/ci.yml
git commit -m "ci: add workflow"
git push origin main
```
