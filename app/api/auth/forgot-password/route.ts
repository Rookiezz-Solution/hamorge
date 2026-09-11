import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL!;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Fetch test cookie first — WP blocks form submissions without it
    const getRes = await fetch(`${WP_URL}/wp-login.php`, { method: 'GET', redirect: 'manual' });
    const setCookie = getRes.headers.get('set-cookie') ?? '';
    const testCookieMatch = setCookie.match(/wordpress_test_cookie=[^;]+/);
    const testCookie = testCookieMatch ? testCookieMatch[0] : 'wordpress_test_cookie=WP%20Cookie%20check';

    const body = new URLSearchParams({
      action: 'lostpassword',
      user_login: email,
      redirect_to: '',
      'wp-submit': 'Get New Password',
      testcookie: '1',
    });

    const res = await fetch(`${WP_URL}/wp-login.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: testCookie },
      body: body.toString(),
      redirect: 'manual',
    });

    // WP redirects (302) on success; returns 200 (page with error) on failure
    if (res.status === 302 || res.status === 301) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No account found with that email address.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
