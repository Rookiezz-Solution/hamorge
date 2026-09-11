import { NextRequest, NextResponse } from 'next/server';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

export interface SavedAddress {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  createdAt?: number;
  lastUsedAt?: number;
}

// Resolve WC customer ID — use customerId if given, else look up by email
async function resolveCustomerId(customerId?: number, email?: string): Promise<number | null> {
  if (customerId) return customerId;
  if (!email) return null;
  const res = await fetch(`${WC_API}/customers?email=${encodeURIComponent(email)}&role=all&per_page=1`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0].id : null;
}

// Look up WC customer by email; if missing, create one. Used by writes only.
async function ensureCustomerId(
  customerId: number | undefined,
  email: string | undefined,
  hint?: { firstName?: string; lastName?: string },
): Promise<number | null> {
  const existing = await resolveCustomerId(customerId, email);
  if (existing) return existing;
  if (!email) return null;
  const res = await fetch(`${WC_API}/customers`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      email,
      username: email,
      first_name: hint?.firstName ?? '',
      last_name: hint?.lastName ?? '',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.id ?? null;
}

async function getAddresses(customerId: number): Promise<SavedAddress[]> {
  const res = await fetch(`${WC_API}/customers/${customerId}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json();
  const meta = (data.meta_data ?? []).find((m: { key: string }) => m.key === 'hamorge_saved_addresses');
  if (!meta?.value) return [];
  try {
    const parsed = typeof meta.value === 'string' ? JSON.parse(meta.value) : meta.value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAddresses(customerId: number, addresses: SavedAddress[]): Promise<boolean> {
  const res = await fetch(`${WC_API}/customers/${customerId}`, {
    method: 'PUT',
    headers: authHeader(),
    body: JSON.stringify({
      meta_data: [{ key: 'hamorge_saved_addresses', value: JSON.stringify(addresses) }],
    }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const customerId = parseInt(req.nextUrl.searchParams.get('customerId') ?? '0') || undefined;
  const email = req.nextUrl.searchParams.get('email') ?? undefined;
  const wcId = await resolveCustomerId(customerId, email);
  if (!wcId) return NextResponse.json({ addresses: [] });
  const addresses = await getAddresses(wcId);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const { customerId, email, address } = await req.json();
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });
  const wcId = await ensureCustomerId(customerId, email, {
    firstName: address.firstName,
    lastName: address.lastName,
  });
  if (!wcId) return NextResponse.json({ error: 'Customer not found and could not be created' }, { status: 500 });
  const existing = await getAddresses(wcId);
  const now = Date.now();
  const newAddress: SavedAddress = {
    ...address,
    id: `addr_${now}`,
    createdAt: now,
    lastUsedAt: now,
  };
  const updated = [...existing, newAddress];
  await saveAddresses(wcId, updated);
  return NextResponse.json({ addresses: updated, newAddress, customerId: wcId });
}

export async function PATCH(req: NextRequest) {
  const { customerId, email, addressId } = await req.json();
  if (!addressId) return NextResponse.json({ error: 'addressId required' }, { status: 400 });
  const wcId = await resolveCustomerId(customerId, email);
  if (!wcId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const existing = await getAddresses(wcId);
  const updated = existing.map(a => a.id === addressId ? { ...a, lastUsedAt: Date.now() } : a);
  await saveAddresses(wcId, updated);
  return NextResponse.json({ addresses: updated });
}

export async function DELETE(req: NextRequest) {
  const { customerId, email, addressId } = await req.json();
  if (!addressId) return NextResponse.json({ error: 'addressId required' }, { status: 400 });
  const wcId = await resolveCustomerId(customerId, email);
  if (!wcId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const existing = await getAddresses(wcId);
  const updated = existing.filter(a => a.id !== addressId);
  await saveAddresses(wcId, updated);
  return NextResponse.json({ addresses: updated });
}
