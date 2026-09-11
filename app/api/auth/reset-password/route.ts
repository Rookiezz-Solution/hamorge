import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL!;

export async function POST(req: NextRequest) {
  const { key, login, password } = await req.json();

  if (!key || !login || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const res = await fetch(`${WP_URL}/wp-json/hamorge/v1/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, login, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.message ?? 'Reset failed. The link may have expired.' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
