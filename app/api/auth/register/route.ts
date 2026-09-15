import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';

const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

/** Compares by last 10 digits so a stored "+91 98765 43210" matches Firebase's "+919876543210". */
function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').slice(-10);
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, firebaseIdToken } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
    }
    // Phone verification is required only when a phone number is actually being
    // submitted — the full /account/register page always sends one (and an
    // idToken to prove it), but CheckoutGate's quick mid-checkout registration
    // deliberately never collects a phone at all, and shouldn't be forced
    // through an OTP step that would just add friction to someone checking out.
    if (phone) {
      if (!firebaseIdToken) {
        return NextResponse.json({ error: 'Phone verification is required to register.' }, { status: 400 });
      }
      // Never trust the phone number the client claims in the form — only what
      // Firebase itself has cryptographically confirmed via a completed SMS
      // verification. This also stops someone verifying their own number, then
      // swapping in a different one in the request before it's saved.
      try {
        const { phoneNumber } = await verifyFirebaseIdToken(firebaseIdToken);
        if (normalizePhone(phoneNumber) !== normalizePhone(phone)) {
          return NextResponse.json({ error: 'Verified phone number does not match. Please try again.' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Phone verification could not be confirmed. Please verify again.' }, { status: 401 });
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
