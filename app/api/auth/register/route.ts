import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/msg91';

const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, otp } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }
    // Phone verification is required only when a phone number is actually being
    // submitted — the full /account/register page always sends one (and its
    // OTP), but CheckoutGate's quick mid-checkout registration deliberately
    // never collects a phone at all, and shouldn't be forced through an OTP
    // step that would just add friction to someone checking out.
    //
    // MSG91's verify call is checked here, atomically with account creation,
    // rather than as a separate step the client calls first — MSG91 has no
    // reusable "proof" token like Firebase's ID tokens, only a one-shot
    // phone+code check, so verifying and creating the account in the same
    // request is what stops the code being spent without an account to show
    // for it (or reused across two different registration attempts).
    if (phone) {
      if (!otp) {
        return NextResponse.json({ error: 'Phone verification is required to register.' }, { status: 400 });
      }
      const result = await verifyOtp(phone, otp);
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? 'Invalid or expired OTP.' }, { status: 400 });
      }
    }

    const auth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');

    const res = await fetch(`${WC_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        email,
        username: email,
        password,
        first_name: firstName,
        last_name: lastName ?? '',
        billing: {
          first_name: firstName,
          last_name: lastName ?? '',
          email,
          phone: phone ?? '',
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.message ?? 'Registration failed.';
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json({
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      wcId: data.id,
    });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
