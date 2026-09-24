import { NextRequest, NextResponse } from 'next/server';
import { findUserByPhone } from '@/lib/find-user-by-phone';
import { sendOtp } from '@/lib/whatsapp-otp';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || !/^\d{10}$/.test(String(phone).replace(/\D/g, ''))) {
      return NextResponse.json({ error: 'Enter a valid 10-digit phone number.' }, { status: 400 });
    }

    const user = await findUserByPhone(phone);
    if (!user) {
      return NextResponse.json({ error: 'No account found with that phone number.' }, { status: 404 });
    }

    const result = await sendOtp(phone);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Could not send the code.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, token: result.token });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
