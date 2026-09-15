import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/msg91';

const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

function wcAuthHeader() {
  const token = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

/** Compares by last 10 digits so a stored "+91 98765 43210" matches a typed "9876543210". */
function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').slice(-10);
}

interface WCCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  billing?: { phone?: string };
}

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required.' }, { status: 400 });
    }

    const result = await verifyOtp(phone, otp);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Invalid or expired OTP.' }, { status: 400 });
    }

    const targetPhone = normalizePhone(phone);

    // WooCommerce's /customers search only matches username/email/display name,
    // not billing phone — same pragmatic "fetch and filter" approach already
    // used in /api/orders for guest-order lookups by email.
    const wcRes = await fetch(`${WC_URL}/customers?per_page=100&orderby=registered_date&order=desc`, {
      headers: wcAuthHeader(),
      cache: 'no-store',
    });

    let customer: WCCustomer | null = null;
    if (wcRes.ok) {
      const customers = (await wcRes.json()) as WCCustomer[];
      customer = customers.find(c => normalizePhone(c.billing?.phone ?? '') === targetPhone) ?? null;
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'No account found with this phone number. Please log in with email, or register first.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      wcId: customer.id,
    });
  } catch {
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
