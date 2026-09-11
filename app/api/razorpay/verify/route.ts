import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveLineItems, InputLineItem } from '@/lib/wc-line-items';
import { sendPurchaseEvent } from '@/lib/meta-capi';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function wcAuthHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

export async function POST(req: NextRequest) {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderPayload,
    metaEventId,
  } = await req.json();

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  }

  // Resolve real prices and variation IDs server-side before creating the order
  let lineItems = orderPayload.line_items ?? [];
  if (lineItems.length > 0) {
    try {
      lineItems = await resolveLineItems(lineItems as InputLineItem[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not resolve line items';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  // Create WooCommerce order as paid
  const wcOrder = {
    ...orderPayload,
    line_items: lineItems,
    payment_method: 'razorpay',
    payment_method_title: 'Razorpay',
    set_paid: true,
    transaction_id: razorpay_payment_id,
    meta_data: [
      { key: '_razorpay_order_id', value: razorpay_order_id },
      { key: '_razorpay_payment_id', value: razorpay_payment_id },
    ],
  };

  const res = await fetch(`${WC_API}/orders`, {
    method: 'POST',
    headers: wcAuthHeader(),
    body: JSON.stringify(wcOrder),
  });

  const data = await res.json();

  // Server-side Purchase — deduplicated against the browser Pixel by event id.
  if (res.ok && metaEventId) {
    await sendPurchaseEvent(data, metaEventId, req);
  }

  return NextResponse.json(data, { status: res.status });
}
