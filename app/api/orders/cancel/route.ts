import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

// Backs the "Cancel this order" button in the customer order email. The proof of
// ownership is WooCommerce's own order key (the unguessable `wc_order_…` secret that
// is part of every order and already appears in WooCommerce's own customer links) —
// so it works for guests without an account, and the order number alone is useless.

const CANCELLABLE = ['pending', 'processing', 'on-hold'];

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

interface WCMeta { key: string; value: unknown }
interface WCOrder {
  id: number;
  status: string;
  total: string;
  date_created: string;
  payment_method: string;
  order_key: string;
  line_items: { name: string; quantity: number; meta_data?: WCMeta[] }[];
  meta_data: WCMeta[];
}

function keyMatches(actual: string, provided: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// A tracking/AWB value means a shipment already exists and the parcel may be with a
// courier — cancelling here wouldn't stop it, so those orders go to manual handling.
function hasShipment(order: WCOrder): boolean {
  return order.meta_data.some(m => /awb|tracking/i.test(m.key) && String(m.value ?? '').trim() !== '');
}

async function loadVerifiedOrder(id: string | null, key: string | null): Promise<WCOrder | null> {
  if (!id || !/^\d+$/.test(id) || !key) return null;
  const res = await fetch(`${WC_API}/orders/${id}`, { headers: authHeader(), cache: 'no-store' });
  if (!res.ok) return null;
  const order = (await res.json()) as WCOrder;
  // Same "not found" for a wrong key and a missing order, so neither is revealed.
  if (!order?.order_key || !keyMatches(order.order_key, key)) return null;
  return order;
}

function describe(order: WCOrder) {
  let canCancel = false;
  let reason: string | null = null;
  if (order.status === 'cancelled') reason = 'already-cancelled';
  else if (!CANCELLABLE.includes(order.status)) reason = 'not-cancellable';
  else if (hasShipment(order)) reason = 'shipped';
  else canCancel = true;

  return {
    id: order.id,
    status: order.status,
    total: order.total,
    prepaid: order.payment_method !== 'cod',
    items: order.line_items.map(i => {
      const size = i.meta_data?.find(m => /^size$/i.test(m.key))?.value;
      return { name: i.name, quantity: i.quantity, size: size ? String(size) : null };
    }),
    canCancel,
    reason,
  };
}

const NOT_FOUND = NextResponse.json({ error: 'We could not find this order. The link may be incorrect or incomplete.' }, { status: 404 });

export async function GET(req: NextRequest) {
  const order = await loadVerifiedOrder(req.nextUrl.searchParams.get('order'), req.nextUrl.searchParams.get('key'));
  if (!order) return NOT_FOUND;
  return NextResponse.json(describe(order));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const order = await loadVerifiedOrder(String(body?.order ?? ''), String(body?.key ?? ''));
  if (!order) return NOT_FOUND;

  const state = describe(order);
  if (state.reason === 'already-cancelled') return NextResponse.json({ ...state, cancelled: true });
  if (!state.canCancel) {
    return NextResponse.json({ ...state, error: 'This order can no longer be cancelled online.' }, { status: 409 });
  }

  const res = await fetch(`${WC_API}/orders/${order.id}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({
      status: 'cancelled',
      meta_data: [{ key: 'cancelled_by', value: 'customer_email_link' }],
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Could not cancel the order. Please contact us.' }, { status: 502 });
  }

  const note = state.prepaid
    ? 'Cancelled by the customer using the link in the order email. This was an ONLINE payment: issue the refund from the Razorpay dashboard, and cancel the shipment in Shiprocket if one was created.'
    : 'Cancelled by the customer using the link in the order email. Cancel the shipment in Shiprocket if one was created.';
  await fetch(`${WC_API}/orders/${order.id}/notes`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ note, customer_note: false }),
  }).catch(() => { /* the cancellation itself already succeeded */ });

  return NextResponse.json({ ...state, status: 'cancelled', canCancel: false, reason: 'already-cancelled', cancelled: true });
}
