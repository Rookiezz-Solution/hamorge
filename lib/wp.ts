const WP_API = process.env.NEXT_PUBLIC_WP_API_URL!;
const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function wcAuth() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

// ── WordPress Posts ──────────────────────────────────────

export async function getPosts() {
  const res = await fetch(`${WP_API}/posts?_embed`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

// ── WooCommerce Products ─────────────────────────────────

export async function getProducts(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${WC_API}/products${query ? `?${query}` : ''}`, {
    headers: wcAuth(),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProduct(id: number) {
  const res = await fetch(`${WC_API}/products/${id}`, {
    headers: wcAuth(),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

// ── WooCommerce Product Variations (per-size stock) ──────

export const SIZES = ['S', 'M', 'L', 'XL'];

interface WCVariation {
  stock_status?: string;
  stock_quantity?: number | null;
  attributes?: { option: string }[];
}

export async function getProductVariations(productId: number): Promise<WCVariation[]> {
  const res = await fetch(`${WC_API}/products/${productId}/variations?per_page=100`, {
    headers: wcAuth(),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error('Failed to fetch product variations');
  return res.json();
}

/** Map each known size to whether it's currently orderable, from WooCommerce variation stock. */
export function buildSizeAvailability(variations: WCVariation[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const size of SIZES) {
    const variation = variations.find(v =>
      v.attributes?.some(a => a.option?.toLowerCase() === size.toLowerCase())
    );
    map[size] = variation
      ? variation.stock_status !== 'outofstock' && variation.stock_quantity !== 0
      : true;
  }
  return map;
}

// ── WooCommerce Product Reviews ──────────────────────────

export async function getProductReviews(productId: number) {
  const res = await fetch(
    `${WC_API}/products/reviews?product=${productId}&status=approved&per_page=50`,
    { headers: wcAuth(), next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

// ── WooCommerce Orders ───────────────────────────────────

export async function createOrder(body: Record<string, unknown>) {
  const res = await fetch(`${WC_API}/orders`, {
    method: 'POST',
    headers: { ...wcAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create order');
  return res.json();
}

export async function getOrders(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${WC_API}/orders${query ? `?${query}` : ''}`, {
    headers: wcAuth(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}
