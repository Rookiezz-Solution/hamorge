import { NextRequest, NextResponse } from 'next/server';
import { findUserByPhone } from '@/lib/find-user-by-phone';
import { verifyOtp } from '@/lib/whatsapp-otp';

const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, otpToken, password } = await req.json();

    if (!phone || !otp || !otpToken || !password) {
      return NextResponse.json({ error: 'Phone, code, and new password are required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const verify = verifyOtp(phone, otp, otpToken);
    if (!verify.ok) {
      return NextResponse.json({ error: verify.error ?? 'Invalid or expired code.' }, { status: 400 });
    }

    const user = await findUserByPhone(phone);
    if (!user) {
      return NextResponse.json({ error: 'No account found with that phone number.' }, { status: 404 });
    }

    const wcAuth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
    const res = await fetch(`${WC_URL}/customers/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${wcAuth}` },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Could not reset the password. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
