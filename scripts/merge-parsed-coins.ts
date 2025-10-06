import fs from 'fs/promises';
import path from 'path';

async function run() {
  const dataDir = path.join(process.cwd(), 'data');
  const parsedPath = path.join(dataDir, 'debug-parsed-coins.json');
  const coinsPath = path.join(dataDir, 'coins.json');

  const parsedRaw = await fs.readFile(parsedPath, 'utf-8');
  const parsed = JSON.parse(parsedRaw);

  const coinsRaw = await fs.readFile(coinsPath, 'utf-8');
  const coinsJson = JSON.parse(coinsRaw);

  // backup
  await fs.writeFile(path.join(dataDir, `coins.json.bak.${Date.now()}`), coinsRaw, 'utf-8');

  const existing: Record<string, any>[] = coinsJson.data || [];

  const map = new Map(existing.map((c: any) => [c.pairAddress, c]));

  for (const p of parsed) {
    const key = p.pairAddress;
    if (!key) continue;
    const existingEntry = map.get(key);
    if (!existingEntry) {
      map.set(key, p);
      continue;
    }

    // Replace if parsed timestamp is newer
    const existingTs = new Date(existingEntry.timestamp || 0).getTime();
    const parsedTs = new Date(p.timestamp || 0).getTime();
    if (parsedTs >= existingTs) {
      map.set(key, { ...existingEntry, ...p });
    }
  }

  const merged = {
    lastUpdated: new Date().toISOString(),
    data: Array.from(map.values())
  };

  await fs.writeFile(coinsPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log('Merged parsed coins into data/coins.json');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
