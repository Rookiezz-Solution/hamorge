import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon, isNewCustomer, FIRST_ORDER_COUPON_CODE } from '@/lib/coupons';
import { InputLineItem } from '@/lib/wc-line-items';

export async function POST(req: NextRequest) {
  const { customerId, email, items } = await req.json() as {
    customerId?: number; email?: string; items: InputLineItem[];
  };

  if (!Array.isArray(items) || items.length === 0 || (!customerId && !email)) {
    return NextResponse.json({ eligible: false });
  }

  const eligible = await isNewCustomer({ customerId, email });
  if (!eligible) return NextResponse.json({ eligible: false });

  // Fails silently (eligible: false) if the coupon isn't set up in WooCommerce yet,
  // rather than surfacing an error on a page the customer didn't take any action on.
  const result = await validateCoupon(FIRST_ORDER_COUPON_CODE, items);
  if (!result.valid) return NextResponse.json({ eligible: false });

  return NextResponse.json({ eligible: true, code: result.code, discountAmount: result.discountAmount });
}
