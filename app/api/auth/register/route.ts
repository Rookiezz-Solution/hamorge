import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password } = await req.json();

    if (!email || !password || !firstName) {
      return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
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
