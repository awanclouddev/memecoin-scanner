import readline from 'readline';

// This is a helper to remind and optionally call Upstash to rotate tokens.
// It requires the Upstash REST URL and token to be set in env. Use with caution.

async function prompt(question: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log('This helper only prints instructions. It will not rotate tokens automatically.');
  const url = process.env.UPSTASH_REDIS_REST_URL || '';
  if (!url) {
    console.error('UPSTASH_REDIS_REST_URL missing');
    process.exit(1);
  }
  console.log(`Visit your Upstash console at ${url} to rotate tokens.`);
  const ans = await prompt('Open Upstash in browser now? (y/N) ');
  if (ans.toLowerCase().startsWith('y')) {
    try { require('open')(url); } catch (e) {}
  }
}

if (require.main === module) main().catch(console.error);
