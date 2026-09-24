import { NextRequest, NextResponse } from 'next/server';

/**
 * Temporary diagnostic webhook — WhatsApp Cloud API doesn't expose a way to
 * poll message delivery status; it only pushes status updates (sent,
 * delivered, read, failed) here. Logs are the only way to see why a message
 * "accepted" by the send call never actually reached a phone. Not part of
 * the OTP feature itself — safe to remove once delivery is confirmed working.
 */

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verification failed.' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  console.log('[whatsapp-webhook]', JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
