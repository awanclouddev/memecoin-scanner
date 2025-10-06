import { NextResponse } from 'next/server';
import { sendAlert } from '../../../lib/alerter';

export async function GET() {
  try {
    await sendAlert('Test Alert from Memecoin Scanner', 'This is a test alert triggered via /api/test-alert');
    return NextResponse.json({ status: 'ok', message: 'Test alert sent' });
  } catch (e) {
    return NextResponse.json({ status: 'error', message: 'Failed to send test alert' }, { status: 500 });
  }
}
