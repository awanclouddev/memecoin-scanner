import crypto from 'crypto';

function sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function sendAlert(title: string, body: string) {
  const url = process.env.ALERT_WEBHOOK_URL || '';
  if (!url) return { ok: false, error: 'No webhook configured' };

  const auth = process.env.ALERT_WEBHOOK_AUTH || '';
  const authName = process.env.ALERT_WEBHOOK_AUTH_NAME || 'memecoin-key';
  const hmacSecret = process.env.ALERT_WEBHOOK_HMAC_SECRET || '';
  const hmacHeaderName = process.env.ALERT_WEBHOOK_HMAC_NAME || 'x-hub-signature-256';

  const retryCount = Math.max(1, parseInt(process.env.ALERT_RETRY_COUNT || '3', 10));
  const baseMs = Math.max(100, parseInt(process.env.ALERT_RETRY_BASE_MS || '500', 10));

  const payload = JSON.stringify({ title, body, timestamp: new Date().toISOString() });
  const headers: any = { 'Content-Type': 'application/json' };
  if (auth) headers[authName] = auth;
  if (hmacSecret) {
    try {
      const sig = 'sha256=' + crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
      headers[hmacHeaderName] = sig;
    } catch (e) {
      // If HMAC fails, continue without it but log the issue
      console.error('Failed to compute HMAC for alert payload', e);
    }
  }

  let lastErr: any = null;
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: payload });
      let text = '';
      try { text = await res.text(); } catch (e) { /* ignore */ }
      const result = { ok: res.ok, status: res.status, body: text, attempts: attempt };
      if (res.ok) return result;
      lastErr = result;
      // if not last attempt, backoff
      if (attempt < retryCount) {
        const backoff = baseMs * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 100);
        await sleep(backoff + jitter);
      }
    } catch (e) {
      lastErr = { ok: false, error: String(e), attempts: attempt };
      if (attempt < retryCount) {
        const backoff = baseMs * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 100);
        await sleep(backoff + jitter);
      }
    }
  }

  // final failure
  return lastErr || { ok: false, error: 'Unknown error' };
}
