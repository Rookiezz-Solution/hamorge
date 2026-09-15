import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase-admin';

const WC_URL = process.env.NEXT_PUBLIC_WC_API_URL!;
const KEY = process.env.WC_CONSUMER_KEY!;
const SECRET = process.env.WC_CONSUMER_SECRET!;

function wcAuthHeader() {
  const token = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

/** Compares by last 10 digits so a stored "+91 98765 43210" matches Firebase's "+919876543210". */
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
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing sign-in token.' }, { status: 400 });
    }

    // Never trust a phone number the client claims — only what Firebase itself
    // has cryptographically confirmed via a completed SMS verification.
    const { phoneNumber } = await verifyFirebaseIdToken(idToken);
    const targetPhone = normalizePhone(phoneNumber);

    // WooCommerce's /customers search doesn't support filtering by phone —
    // same pragmatic "fetch and filter" approach used elsewhere in this app
    // (e.g. /api/orders for guest-order lookups by email).
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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error. Please try again.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
