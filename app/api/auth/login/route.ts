import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL!;
const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const wcAuth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');

    // Phase 1: GET wp-login.php for the test cookie (required by WP to accept login POSTs)
    const getRes = await fetch(`${WP_URL}/wp-login.php`, { method: 'GET', redirect: 'manual' });
    const setCookie = getRes.headers.get('set-cookie') ?? '';
    const testCookieMatch = setCookie.match(/wordpress_test_cookie=[^;]+/);
    const testCookie = testCookieMatch ? testCookieMatch[0] : 'wordpress_test_cookie=WP%20Cookie%20check';

    const loginBody = new URLSearchParams({
      log: email,
      pwd: password,
      'wp-submit': 'Log In',
      redirect_to: '/wp-admin',
      testcookie: '1',
    });

    // Phase 2: POST login + WC customer lookup in parallel
    const [wpRes, wcRes] = await Promise.all([
      fetch(`${WP_URL}/wp-login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: testCookie },
        body: loginBody.toString(),
        redirect: 'manual',
      }),
      fetch(`${WC_URL}/customers?email=${encodeURIComponent(email)}&role=all&per_page=1`, {
        headers: { Authorization: `Basic ${wcAuth}` },
      }),
    ]);

    // WordPress redirects (3xx) on success; stays on login page (200) on failure
    if (wpRes.status !== 302 && wpRes.status !== 301) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    let wcCustomer: Record<string, unknown> | null = null;
    if (wcRes.ok) {
      const wcData = await wcRes.json();
      if (Array.isArray(wcData) && wcData.length > 0) wcCustomer = wcData[0];
    }

    // WP user exists but no WC customer record — create one so address-saving works.
    if (!wcCustomer) {
      try {
        const createRes = await fetch(`${WC_URL}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Basic ${wcAuth}` },
          body: JSON.stringify({ email, username: email }),
        });
        if (createRes.ok) wcCustomer = await createRes.json();
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({
      id: wcCustomer?.id ?? null,
      email: (wcCustomer?.email as string) ?? email,
      firstName: (wcCustomer?.first_name as string) ?? '',
      lastName: (wcCustomer?.last_name as string) ?? '',
      wcId: wcCustomer?.id ?? null,
    });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
