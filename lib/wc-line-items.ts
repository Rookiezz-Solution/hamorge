const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

export interface InputLineItem {
  product_id: number;
  quantity: number;
  size?: string;
  meta_data?: { key: string; value: string }[];
  [key: string]: unknown;
}

export interface ResolvedLineItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  subtotal: string;
  total: string;
  meta_data: { key: string; value: string }[];
}

interface WCVariation {
  id: number;
  price: string;
  tax_status?: string;
  tax_class?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  attributes: { name?: string; slug?: string; option: string }[];
}

interface WCProduct {
  id: number;
  type: string;
  price?: string;
  regular_price?: string;
  tax_status?: string;
  tax_class?: string;
  stock_status?: string;
  stock_quantity?: number | null;
}

interface WCTaxRate {
  country: string;
  state: string;
  rate: string;
  class: string;
}

function getSize(item: InputLineItem): string {
  if (item.size) return item.size;
  const meta = item.meta_data?.find(m => m.key?.toLowerCase() === 'size');
  return meta?.value ?? '';
}

// Store-wide cache of tax rate % per tax class (e.g. "" for Standard, "reduced-rate", ...).
// Populated from WooCommerce itself so this stays correct if rates or classes change,
// rather than hardcoding "5%" in application code.
const taxRateCache = new Map<string, number>();

async function getTaxRatePercent(taxClass: string): Promise<number> {
  const wcClass = taxClass || 'standard';
  const cached = taxRateCache.get(wcClass);
  if (cached !== undefined) return cached;

  const res = await fetch(`${WC_API}/taxes?class=${encodeURIComponent(wcClass)}&per_page=100`, {
    headers: authHeader(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch tax rates for class "${wcClass}"`);
  }
  const rates: WCTaxRate[] = await res.json();

  // "Calculate tax based on: Shop base address" — the applicable rate never
  // depends on the customer, so filter to rows that apply store-wide (blank
  // country) or explicitly to the shop's country (IN).
  const applicable = rates.filter(r => !r.country || r.country === 'IN');
  const ratePercent = applicable.reduce((sum, r) => sum + (parseFloat(r.rate) || 0), 0);

  taxRateCache.set(wcClass, ratePercent);
  return ratePercent;
}

function resolveTaxClass(entityTaxClass: string | undefined, parentTaxClass: string | undefined): string {
  if (!entityTaxClass || entityTaxClass === 'parent') return parentTaxClass ?? '';
  return entityTaxClass;
}

export interface ResolvedItemPrice {
  product_id: number;
  variation_id?: number;
  quantity: number;
  meta_data: { key: string; value: string }[];
  /** Tax-inclusive unit price, as shown to the customer (store price display). */
  inclusiveUnitPrice: number;
  /** Tax-exclusive unit price — what WooCommerce's Orders API expects as line total/subtotal. */
  exclusiveUnitPrice: number;
}

/**
 * Resolve a cart item against WooCommerce so the order line carries the right
 * variation_id and price. Without this, variable products post with
 * variation_id=0 and the order email re-resolves to the parent (which has no
 * purchasable price), producing ₹0.00 emails.
 *
 * The store has "Prices entered with tax: Yes" — product/variation `price` from
 * the WooCommerce API is tax-INCLUSIVE. WooCommerce's Orders REST API treats a
 * manually supplied line_items[].total/subtotal as tax-EXCLUSIVE and calculates
 * tax on top of it, so the inclusive price must be converted back to its
 * tax-exclusive base here before it's used as an order line total.
 */
async function resolveItemPrice(item: InputLineItem): Promise<ResolvedItemPrice> {
  const productRes = await fetch(`${WC_API}/products/${item.product_id}`, {
    headers: authHeader(),
    next: { revalidate: 60 },
  });
  if (!productRes.ok) {
    throw new Error(`Could not fetch product ${item.product_id}`);
  }
  const product: WCProduct = await productRes.json();

  const size = getSize(item);
  const baseMeta = item.meta_data ?? (size ? [{ key: 'Size', value: size }] : []);

  let price = parseFloat(product.price ?? product.regular_price ?? '0');
  let variation_id: number | undefined;
  let taxStatus = product.tax_status ?? 'taxable';
  let taxClass = product.tax_class ?? '';

  if (product.type === 'variable') {
    if (!size) {
      throw new Error(`Size required for variable product ${item.product_id}`);
    }
    const varRes = await fetch(`${WC_API}/products/${item.product_id}/variations?per_page=100`, {
      headers: authHeader(),
      next: { revalidate: 60 },
    });
    if (!varRes.ok) {
      throw new Error(`Could not fetch variations for product ${item.product_id}`);
    }
    const variations: WCVariation[] = await varRes.json();
    const match = variations.find(v =>
      v.attributes?.some(a => a.option?.toLowerCase() === size.toLowerCase())
    );
    if (!match) {
      throw new Error(`No variation matches size "${size}" for product ${item.product_id}`);
    }
    if (match.stock_status === 'outofstock' || match.stock_quantity === 0) {
      throw new Error(`Size "${size}" is out of stock for product ${item.product_id}`);
    }
    variation_id = match.id;
    price = parseFloat(match.price ?? '0');
    taxStatus = match.tax_status ?? taxStatus;
    taxClass = resolveTaxClass(match.tax_class, taxClass);
  } else if (product.stock_status === 'outofstock' || product.stock_quantity === 0) {
    throw new Error(`Product ${item.product_id} is out of stock`);
  }

  if (!price || price <= 0) {
    throw new Error(`Could not resolve price for product ${item.product_id}`);
  }

  let exclusivePrice = price;
  if (taxStatus === 'taxable') {
    const ratePercent = await getTaxRatePercent(taxClass);
    if (ratePercent > 0) {
      exclusivePrice = price / (1 + ratePercent / 100);
    }
  }

  return {
    product_id: item.product_id,
    ...(variation_id ? { variation_id } : {}),
    quantity: item.quantity,
    meta_data: baseMeta,
    inclusiveUnitPrice: price,
    exclusiveUnitPrice: exclusivePrice,
  };
}

export async function resolveLineItem(item: InputLineItem): Promise<ResolvedLineItem> {
  const resolved = await resolveItemPrice(item);
  const lineTotal = (resolved.exclusiveUnitPrice * resolved.quantity).toFixed(2);

  return {
    product_id: resolved.product_id,
    ...(resolved.variation_id ? { variation_id: resolved.variation_id } : {}),
    quantity: resolved.quantity,
    subtotal: lineTotal,
    total: lineTotal,
    meta_data: resolved.meta_data,
  };
}

export async function resolveLineItems(items: InputLineItem[]): Promise<ResolvedLineItem[]> {
  return Promise.all(items.map(resolveLineItem));
}

/** Resolve cart items to their real WooCommerce prices — used by coupon validation to know each item's eligible price. */
export async function resolveItemPrices(items: InputLineItem[]): Promise<ResolvedItemPrice[]> {
  return Promise.all(items.map(resolveItemPrice));
}

/**
 * Tax-inclusive total the customer actually pays (used for the Razorpay charge
 * amount) — intentionally independent of resolveLineItems(), which returns
 * tax-EXCLUSIVE totals for WooCommerce's order line items.
 */
export async function calculateTotal(items: InputLineItem[]): Promise<number> {
  const resolved = await Promise.all(items.map(resolveItemPrice));
  return resolved.reduce((sum, r) => sum + r.inclusiveUnitPrice * r.quantity, 0);
}
