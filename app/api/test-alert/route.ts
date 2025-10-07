import { NextResponse } from 'next/server';
import { sendAlert } from '../../../lib/alerter';

export async function GET() {
  try {
    const res = await sendAlert('Test Alert from Memecoin Scanner', 'This is a test alert triggered via /api/test-alert');
    console.log('Test alert response:', res);
    return NextResponse.json({ status: 'ok', message: 'Test alert sent', webhookResponse: res });
  } catch (e) {
    console.error('Test alert failed', e);
    return NextResponse.json({ status: 'error', message: 'Failed to send test alert', error: String(e) }, { status: 500 });
  }
}
