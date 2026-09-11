import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { calculateTotal, InputLineItem } from '@/lib/wc-line-items';
import { validateCoupon } from '@/lib/coupons';

// Built on first use, not at module load. The Razorpay constructor throws when
// key_id is missing, and Next evaluates this module while collecting page data
// during `next build` — so constructing it eagerly makes the whole build fail on
// any host where the secret is only present at runtime.
let razorpayClient: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return razorpayClient;
}

export async function POST(req: NextRequest) {
  const { line_items, coupon } = await req.json() as { line_items: InputLineItem[]; coupon?: string };

  if (!Array.isArray(line_items) || line_items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 });
  }

  // Resolve prices server-side (including variation pricing) — never trust client amounts
  let total: number;
  try {
    total = await calculateTotal(line_items);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not calculate order total';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Re-validate the coupon here rather than trusting the discount the client saw on the
  // cart page — it may have expired or hit its usage limit since then. The authoritative
  // discount is still WooCommerce's own (applied via coupon_lines when the order is
  // created); this only decides what to actually charge via Razorpay right now.
  if (coupon) {
    const result = await validateCoupon(coupon, line_items);
    if (!result.valid) {
      return NextResponse.json({ error: result.error ?? 'This coupon is no longer valid.' }, { status: 400 });
    }
    total = Math.max(1, total - (result.discountAmount ?? 0));
  }

  if (total <= 0) {
    return NextResponse.json({ error: 'Could not calculate order total' }, { status: 400 });
  }

  const order = await getRazorpay().orders.create({
    amount: Math.round(total * 100), // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
  });

  return NextResponse.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
