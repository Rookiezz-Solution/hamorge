import { InputLineItem, ResolvedItemPrice, resolveItemPrices } from './wc-line-items';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

interface WCCoupon {
  code: string;
  amount: string;
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  date_expires: string | null;
  usage_limit: number | null;
  usage_count: number;
  minimum_amount: string;
  maximum_amount: string;
  product_ids: number[];
  excluded_product_ids: number[];
}

export interface CouponResult {
  valid: boolean;
  code?: string;
  discountAmount?: number;
  error?: string;
}

/** Coupon code auto-applied for first-time customers — must exist in WooCommerce (see lib/coupons.ts docs). */
export const FIRST_ORDER_COUPON_CODE = 'WELCOME10';

interface WCOrderStub { id: number; billing?: { email?: string } }

/**
 * Whether this customer has never placed an order before — used to auto-apply the
 * first-purchase discount. We don't rely solely on the coupon's own "usage limit per
 * user" (enforced by WooCommerce only when the real order is created) because by then
 * the Razorpay charge has already happened; if WooCommerce silently dropped the
 * discount at that point, the charge and the order total would disagree. Checking real
 * order history up front keeps the two in sync, mirroring how /api/orders GET already
 * looks up a customer's order history (by customer_id, or by billing email for guests).
 */
export async function isNewCustomer({ customerId, email }: { customerId?: number; email?: string }): Promise<boolean> {
  if (customerId) {
    const res = await fetch(`${WC_API}/orders?customer=${encodeURIComponent(customerId)}&per_page=1`, {
      headers: authHeader(),
      cache: 'no-store',
    });
    if (!res.ok) return false; // can't confirm eligibility — don't grant the discount
    const orders: WCOrderStub[] = await res.json();
    return orders.length === 0;
  }

  if (email) {
    const targetEmail = email.toLowerCase();
    const [page1, page2] = await Promise.all([
      fetch(`${WC_API}/orders?per_page=100&page=1&orderby=date&order=desc`, { headers: authHeader(), cache: 'no-store' }),
      fetch(`${WC_API}/orders?per_page=100&page=2&orderby=date&order=desc`, { headers: authHeader(), cache: 'no-store' }),
    ]);
    const [orders1, orders2]: WCOrderStub[][] = await Promise.all([
      page1.ok ? page1.json() : [],
      page2.ok ? page2.json() : [],
    ]);
    const hasPriorOrder = [...orders1, ...orders2].some(o => o.billing?.email?.toLowerCase() === targetEmail);
    return !hasPriorOrder;
  }

  return false;
}

async function fetchCoupon(code: string): Promise<WCCoupon | null> {
  const res = await fetch(`${WC_API}/coupons?code=${encodeURIComponent(code)}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Could not look up coupon');
  const coupons: WCCoupon[] = await res.json();
  return coupons[0] ?? null;
}

/**
 * Validate a coupon code against WooCommerce and compute the tax-inclusive discount
 * it produces on the given cart items — used both to show a discount on the cart page
 * and to reduce the Razorpay charge amount before the real WooCommerce order exists.
 *
 * This is an estimate on our side; the authoritative discount is the one WooCommerce
 * itself computes when the order is created with `coupon_lines: [{ code }]` (see
 * app/checkout/page.tsx buildOrderPayload). Percent discounts always match exactly —
 * scaling by a percentage commutes with the tax-inclusive/exclusive conversion. Fixed
 * amount coupons are treated as a flat rupee amount off the tax-inclusive price the
 * customer sees, which is the intuitive "₹100 off" behavior.
 */
export async function validateCoupon(code: string, items: InputLineItem[]): Promise<CouponResult> {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false, error: 'Enter a coupon code.' };

  let coupon: WCCoupon | null;
  try {
    coupon = await fetchCoupon(trimmed);
  } catch {
    return { valid: false, error: 'Could not validate coupon. Please try again.' };
  }
  if (!coupon) return { valid: false, error: 'This coupon code is not valid.' };

  if (coupon.date_expires && new Date(coupon.date_expires).getTime() < Date.now()) {
    return { valid: false, error: 'This coupon has expired.' };
  }
  if (coupon.usage_limit != null && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  let resolved: ResolvedItemPrice[];
  try {
    resolved = await resolveItemPrices(items);
  } catch {
    return { valid: false, error: 'Could not validate coupon for these items.' };
  }

  const cartSubtotal = resolved.reduce((sum, r) => sum + r.inclusiveUnitPrice * r.quantity, 0);

  const minAmount = parseFloat(coupon.minimum_amount || '0');
  if (minAmount > 0 && cartSubtotal < minAmount) {
    return { valid: false, error: `This coupon requires a minimum order of ₹${minAmount.toFixed(2)}.` };
  }
  const maxAmount = parseFloat(coupon.maximum_amount || '0');
  if (maxAmount > 0 && cartSubtotal > maxAmount) {
    return { valid: false, error: `This coupon applies to orders up to ₹${maxAmount.toFixed(2)}.` };
  }

  const hasProductRestriction = coupon.product_ids?.length > 0;
  const excludedIds = new Set(coupon.excluded_product_ids ?? []);
  const includedIds = new Set(coupon.product_ids ?? []);
  const eligible = resolved.filter(r =>
    !excludedIds.has(r.product_id) && (!hasProductRestriction || includedIds.has(r.product_id))
  );

  if (eligible.length === 0) {
    return { valid: false, error: 'This coupon does not apply to the items in your cart.' };
  }

  const eligibleSubtotal = eligible.reduce((sum, r) => sum + r.inclusiveUnitPrice * r.quantity, 0);
  const amount = parseFloat(coupon.amount || '0');

  let discountAmount = 0;
  if (coupon.discount_type === 'percent') {
    discountAmount = eligibleSubtotal * (amount / 100);
  } else if (coupon.discount_type === 'fixed_cart') {
    discountAmount = Math.min(amount, eligibleSubtotal);
  } else if (coupon.discount_type === 'fixed_product') {
    discountAmount = eligible.reduce((sum, r) => sum + Math.min(amount, r.inclusiveUnitPrice) * r.quantity, 0);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  if (discountAmount <= 0) {
    return { valid: false, error: 'This coupon does not apply any discount to your cart.' };
  }

  return { valid: true, code: coupon.code, discountAmount };
}
