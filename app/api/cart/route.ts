import { NextRequest, NextResponse } from 'next/server';

const WC_STORE = `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wc/store/v1`;

export async function GET(req: NextRequest) {
  const cartToken = req.headers.get('x-cart-token') ?? '';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cartToken) headers['Cart-Token'] = cartToken;

  const res = await fetch(`${WC_STORE}/cart`, { headers, cache: 'no-store' });
  const data = await res.json();
  const newToken = res.headers.get('Cart-Token');

  return NextResponse.json(data, {
    headers: newToken ? { 'x-cart-token': newToken } : {},
  });
}

export async function POST(req: NextRequest) {
  const cartToken = req.headers.get('x-cart-token') ?? '';
  const body = await req.json();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cartToken) headers['Cart-Token'] = cartToken;

  const res = await fetch(`${WC_STORE}/cart/add-item`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const newToken = res.headers.get('Cart-Token');

  return NextResponse.json(data, {
    status: res.status,
    headers: newToken ? { 'x-cart-token': newToken } : {},
  });
}

export async function DELETE(req: NextRequest) {
  const cartToken = req.headers.get('x-cart-token') ?? '';
  const { key } = await req.json();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cartToken) headers['Cart-Token'] = cartToken;

  const res = await fetch(`${WC_STORE}/cart/remove-item`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key }),
  });
  const data = await res.json();

  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest) {
  const cartToken = req.headers.get('x-cart-token') ?? '';
  const body = await req.json();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cartToken) headers['Cart-Token'] = cartToken;

  const res = await fetch(`${WC_STORE}/cart/update-item`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  return NextResponse.json(data, { status: res.status });
}
