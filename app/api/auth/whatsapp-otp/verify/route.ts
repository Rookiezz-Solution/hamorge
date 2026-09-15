import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/whatsapp-otp';

/**
 * Standalone verification endpoint — used for testing the send/verify round
 * trip independently before wiring this into registration. Once confirmed
 * working with real credentials, /api/auth/register will call verifyOtp()
 * directly and atomically with account creation, the same pattern used for
 * MSG91 and the interim email-OTP flow (no reusable proof to spend without
 * an account to show for it).
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, otp, token } = await req.json();

    if (!phone || !otp || !token) {
      return NextResponse.json({ error: 'Phone, code, and token are required.' }, { status: 400 });
    }

    const result = verifyOtp(phone, otp, token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Invalid or expired code.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
