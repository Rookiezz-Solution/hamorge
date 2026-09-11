import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/coupons';
import { InputLineItem } from '@/lib/wc-line-items';

export async function POST(req: NextRequest) {
  const { code, items } = await req.json() as { code: string; items: InputLineItem[] };

  if (!code || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ valid: false, error: 'Missing coupon code or cart items.' }, { status: 400 });
  }

  const result = await validateCoupon(code, items);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
