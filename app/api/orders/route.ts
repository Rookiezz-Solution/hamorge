import { NextRequest, NextResponse } from 'next/server';
import { resolveLineItems, InputLineItem } from '@/lib/wc-line-items';
import { sendPurchaseEvent } from '@/lib/meta-capi';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

interface WCOrder {
  id: number;
  date_created: string;
  billing?: { email?: string };
}

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer') ?? '';
  const email = req.nextUrl.searchParams.get('email') ?? '';

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const targetEmail = email.toLowerCase();

  // Run queries in parallel:
  // 1. Customer ID — server-side scoped to this user, trust the result.
  //    Catches orders linked via customer_id even when billing.email differs.
  // 2. Recent orders (200 most recent) — filter server-side by billing.email.
  //    Catches guest orders / legacy orders without customer_id.
  const customerIdFetch = customerId
    ? fetch(`${WC_API}/orders?customer=${encodeURIComponent(customerId)}&per_page=50&orderby=date&order=desc`,
        { headers: authHeader(), cache: 'no-store' })
    : null;

  const recentFetches = [
    fetch(`${WC_API}/orders?per_page=100&page=1&orderby=date&order=desc`,
      { headers: authHeader(), cache: 'no-store' }),
    fetch(`${WC_API}/orders?per_page=100&page=2&orderby=date&order=desc`,
      { headers: authHeader(), cache: 'no-store' }),
  ];

  const [customerIdRes, ...recentRes] = await Promise.all([customerIdFetch, ...recentFetches]);

  async function readJson(r: Response | null): Promise<WCOrder[]> {
    if (!r || !r.ok) return [];
    const json = await r.json();
    return Array.isArray(json) ? json : [];
  }

  const [customerOrders, ...recentSets] = await Promise.all([
    readJson(customerIdRes),
    ...recentRes.map(readJson),
  ]);

  const seen = new Set<number>();
  const merged: WCOrder[] = [];

  // Trust customer-ID matches unconditionally — these are scoped server-side
  for (const order of customerOrders) {
    if (!order?.id || seen.has(order.id)) continue;
    seen.add(order.id);
    merged.push(order);
  }

  // For the recent-orders bucket, filter strictly by billing email
  for (const order of recentSets.flat()) {
    if (!order?.id || seen.has(order.id)) continue;
    if (order.billing?.email?.toLowerCase() !== targetEmail) continue;
    seen.add(order.id);
    merged.push(order);
  }

  merged.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());

  return NextResponse.json(merged.slice(0, 20));
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Pulled out of the payload — WooCommerce must never see it.
  const metaEventId: string | undefined = body.metaEventId;
  delete body.metaEventId;

  if (Array.isArray(body.line_items) && body.line_items.length > 0) {
    try {
      body.line_items = await resolveLineItems(body.line_items as InputLineItem[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not resolve line items';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  const res = await fetch(`${WC_API}/orders`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  // Server-side Purchase — deduplicated against the browser Pixel by event id.
  if (res.ok && metaEventId) {
    await sendPurchaseEvent(data, metaEventId, req);
  }

  return NextResponse.json(data, { status: res.status });
}
