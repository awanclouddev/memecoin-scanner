export async function sendAlert(title: string, body: string) {
  const url = process.env.ALERT_WEBHOOK_URL || '';
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, timestamp: new Date().toISOString() })
    });
  } catch (e) {
    // swallow errors — alerting must not break scraping
    console.error('Failed to send alert', e);
  }
}
