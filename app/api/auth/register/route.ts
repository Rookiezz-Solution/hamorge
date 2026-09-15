import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL!;
const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, otp } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }

    // Verification is required only when a phone number is actually being
    // submitted — the full /account/register page always sends one (and its
    // OTP), but CheckoutGate's quick mid-checkout registration deliberately
    // never collects a phone at all, and shouldn't be forced through a
    // verification step that would just add friction to someone checking out.
    //
    // Interim measure while MSG91's DLT registration (required for any SMS to
    // Indian numbers, regardless of provider) is pending: verification runs
    // over email instead of phone for now. `phone` is still collected and
    // saved as before, just not itself verified yet — swap this back to a
    // phone-OTP check (verifyOtp from lib/msg91) once DLT clears.
    //
    // Checked here, atomically with account creation, rather than as a
    // separate step the client calls first — like MSG91, this has no
    // reusable "proof" token, only a one-shot email+code check, so verifying
    // and creating the account in the same request is what stops the code
    // being spent without an account to show for it if creation then failed
    // for an unrelated reason.
    if (phone) {
      if (!otp) {
        return NextResponse.json({ error: 'Email verification is required to register.' }, { status: 400 });
      }
      const verifyRes = await fetch(`${WP_URL}/wp-json/hamorge/v1/email-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
        cache: 'no-store',
      });
      const verifyData = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok) {
        return NextResponse.json({ error: verifyData?.message ?? 'Invalid or expired code.' }, { status: verifyRes.status });
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
