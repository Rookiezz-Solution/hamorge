import { NextRequest, NextResponse } from 'next/server';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product');
  if (!productId) {
    return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${WC_API}/products/reviews?product=${productId}&status=approved&per_page=50`,
      { headers: authHeader() },
    );
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const { product_id, rating, review, reviewer, reviewer_email } = await req.json();

  const res = await fetch(`${WC_API}/products/reviews`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      product_id,
      rating,
      review: review || '',
      reviewer: reviewer || 'Customer',
      reviewer_email: reviewer_email || 'customer@hamorge.com',
      status: 'approved',
    }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
